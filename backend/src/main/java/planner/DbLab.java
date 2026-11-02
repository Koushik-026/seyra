package planner;

import java.sql.*;
import java.nio.file.*;
import org.h2.api.Trigger;
import org.h2.tools.SimpleResultSet;
import static planner.Database.*;

/** H2-specific procedure, JDBC cursor and trigger evidence in an isolated lab database. */
public final class DbLab {
    public static int largestGroup(Connection c,long session) throws SQLException {
        return ((Number)one(c,"SELECT COALESCE(MAX(n),0) AS biggest FROM (SELECT COUNT(*) n FROM session_roster sr JOIN students st ON st.id=sr.student_id WHERE sr.session_id=? GROUP BY st.study_year,st.branch)",session).get("biggest")).intValue();
    }
    public static ResultSet groupReport(Connection c,long session) throws SQLException {
        SimpleResultSet report=new SimpleResultSet();report.addColumn("STUDY_YEAR",Types.INTEGER,10,0);report.addColumn("BRANCH",Types.VARCHAR,20,0);report.addColumn("STUDENTS",Types.INTEGER,10,0);
        try(PreparedStatement p=c.prepareStatement("SELECT study_year,branch,COUNT(*) AS n FROM students st JOIN session_roster sr ON sr.student_id=st.id WHERE sr.session_id=? GROUP BY study_year,branch ORDER BY study_year,branch")) {
            p.setLong(1,session);
            try(ResultSet cursor=p.executeQuery()) {while(cursor.next())report.addRow(cursor.getInt(1),cursor.getString(2),cursor.getInt(3));}
        }
        return report;
    }
    public static final class ContactAudit implements Trigger {
        private String operation;
        @Override public void init(Connection c,String schema,String name,String table,boolean before,int type) {
            operation=type==Trigger.INSERT?"INSERT":type==Trigger.UPDATE?"UPDATE":"DELETE";
        }
        @Override public void fire(Connection c,Object[] oldRow,Object[] newRow) throws SQLException {
            Object[] source=newRow==null?oldRow:newRow;
            update(c,"INSERT INTO lab_audit(operation,record_id) VALUES(?,?)",operation,source[0]);
        }
    }
    public static void main(String[] args) throws Exception {
        Database db=new Database(Path.of("tmp","dbms-lab-"+java.util.UUID.randomUUID()));PlannerService service=new PlannerService(db,false);
        long session=((Number)service.demo().get("sessionId")).longValue();long draft=service.generate(session);service.publish(draft,false);
        try(Connection c=db.open()) {
            org.h2.tools.RunScript.execute(c,Files.newBufferedReader(Path.of("database/lab-demonstrations.sql")));
            System.out.println("H2 "+c.getMetaData().getDatabaseProductVersion()+" — isolated synthetic lab database");
            System.out.println("Aggregate/HAVING: "+Json.write(rows(c,"SELECT study_year,branch,COUNT(*) AS students FROM students GROUP BY study_year,branch HAVING COUNT(*)>=10 ORDER BY branch")));
            System.out.println("Procedure scalar (largest group = 30): "+Json.write(rows(c,"CALL LAB_LARGEST_GROUP(?)",session)));
            System.out.println("Stored procedure with ResultSet cursor: "+Json.write(rows(c,"CALL LAB_GROUP_REPORT(?)",session)));
            System.out.println("Correlated subquery: "+Json.write(rows(c,"SELECT s.id,s.name FROM exam_sessions s WHERE EXISTS(SELECT 1 FROM session_roster sr WHERE sr.session_id=s.id)")));
            System.out.println("Publication view sample: "+Json.write(rows(c,"SELECT roll,room_code,row_no,bench_no,seat_label FROM published_assignments WHERE roll='0001'")));
            System.out.println("Insert/update/delete triggers: "+Json.write(rows(c,"SELECT operation,record_id FROM lab_audit ORDER BY id")));
            if(rows(c,"SELECT * FROM lab_audit").size()!=3)throw new AssertionError("Expected three trigger events");
            System.out.println("PASS procedure, cursor, view, aggregate, correlated query and three trigger events.");
        }
    }
}
