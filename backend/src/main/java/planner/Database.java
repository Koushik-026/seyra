package planner;

import java.nio.file.*;
import java.sql.*;
import java.util.*;
import org.h2.tools.RunScript;

public final class Database {
    public final String url;
    private final String adminPassword;
    private final String readerPassword;
    private final String adminUser;
    private final String readerUser;
    private final String readerUrl;
    public Database(Path directory) throws Exception {
        this(directory,false);
    }
    public Database(Path directory,boolean localOnly) throws Exception {
        String external=localOnly?null:System.getenv("PLANNER_DB_URL");
        if(external!=null && !external.isBlank()) {
            if(!external.startsWith("jdbc:mysql:")) throw new IllegalArgumentException("External database support is configured for MySQL; use the default H2 mode otherwise.");
            url=external;readerUrl=external;
            adminUser=required("PLANNER_DB_USER");adminPassword=required("PLANNER_DB_PASSWORD");
            readerUser=required("PLANNER_READER_USER");readerPassword=required("PLANNER_READER_PASSWORD");
            try(Connection c=open()) {one(c,"SELECT id FROM coordinator_guard WHERE id=1");}
            return; // External schema/users must be provisioned explicitly by the administrator.
        }
        Files.createDirectories(directory);
        adminUser="sa";readerUser="portal_reader";
        adminPassword=secret(directory.resolve("database-password"));
        readerPassword=secret(directory.resolve("reader-password"));
        url="jdbc:h2:file:"+directory.toAbsolutePath().resolve("planner").toString().replace('\\','/')+";DB_CLOSE_ON_EXIT=FALSE;LOCK_TIMEOUT=10000";
        readerUrl=url.substring(0,url.indexOf(';'));
        try(Connection c=open()) {
            RunScript.execute(c,Files.newBufferedReader(Path.of("database/schema.sql")));
            try(Statement s=c.createStatement()) {
                s.execute("CREATE USER IF NOT EXISTS portal_reader PASSWORD '"+readerPassword+"'");
                s.execute("GRANT SELECT ON published_assignments TO portal_reader");
                s.execute("GRANT SELECT ON published_sessions TO portal_reader");
                s.execute("GRANT SELECT ON published_room_benches TO portal_reader");
            }
        }
    }
    private static String required(String name) {
        String value=System.getenv(name);if(value==null || value.isBlank()) throw new IllegalArgumentException("Set "+name+" for MySQL mode.");return value;
    }
    private String secret(Path file) throws Exception {
        if(Files.exists(file)) return Files.readString(file).strip();
        String token=UUID.randomUUID().toString().replace("-","");
        Files.writeString(file,token,StandardOpenOption.CREATE_NEW); return token;
    }
    public Connection open() throws SQLException { return DriverManager.getConnection(url,adminUser,adminPassword); }
    public Connection reader() throws SQLException {
        // Admin-only URL settings are applied only on the owner connection.
        return DriverManager.getConnection(readerUrl,readerUser,readerPassword);
    }
    @FunctionalInterface public interface Work<T> { T run(Connection c) throws Exception; }
    public <T> T read(Work<T> work) {
        try(Connection c=open()) { return work.run(c); }
        catch(Domain.Problem e) { throw e; }
        catch(Exception e) { throw failure(e); }
    }
    public <T> T transaction(Work<T> work) {
        try(Connection c=open()) {
            c.setTransactionIsolation(Connection.TRANSACTION_READ_COMMITTED); c.setAutoCommit(false);
            try {
                try(Statement s=c.createStatement();ResultSet ignored=s.executeQuery("SELECT id FROM coordinator_guard WHERE id=1 FOR UPDATE")) { ignored.next(); }
                T result=work.run(c); c.commit(); return result;
            } catch(Exception e) { c.rollback(); throw e; }
        } catch(Domain.Problem e) { throw e; }
        catch(Exception e) { throw failure(e); }
    }
    public static RuntimeException failure(Exception e) {
        if(e instanceof SQLException sql && sql.getSQLState()!=null && sql.getSQLState().startsWith("23"))
            return new Domain.Problem(409,"This change conflicts with an existing or referenced record. Check duplicate rolls, room codes and memberships.");
        System.err.println(e.getClass().getSimpleName()+": "+e.getMessage());
        return new Domain.Problem(503,"The database operation failed. No partial change was committed; reload before retrying.");
    }
    public static int update(Connection c,String sql,Object...params) throws SQLException {
        try(PreparedStatement p=c.prepareStatement(sql)) { bind(p,params);return p.executeUpdate(); }
    }
    public static long insert(Connection c,String sql,Object...params) throws SQLException {
        try(PreparedStatement p=c.prepareStatement(sql,Statement.RETURN_GENERATED_KEYS)) {
            bind(p,params);p.executeUpdate();try(ResultSet r=p.getGeneratedKeys()) {r.next();return r.getLong(1);}
        }
    }
    public static void bind(PreparedStatement p,Object...params) throws SQLException {
        for(int i=0;i<params.length;i++) p.setObject(i+1,params[i]);
    }
    public static List<Map<String,Object>> rows(Connection c,String sql,Object...params) throws SQLException {
        try(PreparedStatement p=c.prepareStatement(sql)) {
            bind(p,params);try(ResultSet r=p.executeQuery()) {
                List<Map<String,Object>> out=new ArrayList<>();ResultSetMetaData md=r.getMetaData();
                while(r.next()) {
                    Map<String,Object> row=new LinkedHashMap<>();
                    for(int i=1;i<=md.getColumnCount();i++) {
                        Object v=r.getObject(i);
                        if(v instanceof Clob clob) v=clob.getSubString(1,(int)clob.length());
                        if(v instanceof java.sql.Date || v instanceof java.sql.Time || v instanceof java.sql.Timestamp) v=v.toString();
                        row.put(md.getColumnLabel(i).toLowerCase(Locale.ROOT),v);
                    }
                    out.add(row);
                }
                return out;
            }
        }
    }
    public static Map<String,Object> one(Connection c,String sql,Object...params) throws SQLException {
        List<Map<String,Object>> rows=rows(c,sql,params);
        if(rows.isEmpty()) throw new Domain.Problem(404,"Record not found."); return rows.getFirst();
    }
}
