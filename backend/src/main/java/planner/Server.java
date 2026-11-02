package planner;

import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import static planner.Domain.*;

public final class Server {
    private final PlannerService service;
    private final PlannerService demoService;
    private final String token;
    public Server(PlannerService service,PlannerService demoService,String token) {this.service=service;this.demoService=demoService;this.token=token;}
    public static void main(String[] args) throws Exception {
        String directory=System.getenv().getOrDefault("PLANNER_DATA_DIR","data");
        String token=System.getenv("PLANNER_INTERNAL_TOKEN");
        if(token==null || token.length()<24) throw new IllegalStateException("Start using npm start so the internal access token is configured.");
        int port=Integer.parseInt(System.getenv().getOrDefault("JAVA_PORT","8081"));
        Database db=new Database(Path.of(directory));
        PlannerService demoService=new PlannerService(new Database(Path.of("tmp","demo-"+UUID.randomUUID()),true),false);
        demoService.publishedDemo();
        Server api=new Server(new PlannerService(db,"1".equals(System.getenv("PLANNER_TEST_MODE"))),demoService,token);
        HttpServer server=HttpServer.create(new InetSocketAddress("127.0.0.1",port),32);
        ThreadPoolExecutor pool=new ThreadPoolExecutor(4,8,30,TimeUnit.SECONDS,new ArrayBlockingQueue<>(64));
        server.setExecutor(pool);server.createContext("/",api::handle);
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {server.stop(1);pool.shutdown();}));
        server.start();System.out.println("Java backend ready on http://127.0.0.1:"+port+" (JDBC database connected)");
    }
    private void handle(HttpExchange exchange) throws IOException {
        int status=200;Object result;
        try {
            String path=exchange.getRequestURI().getPath(),method=exchange.getRequestMethod();
            if(!Objects.equals(exchange.getRequestHeaders().getFirst("X-Planner-Internal"),token)) throw new Problem(403,"Use the Node application entry point.");
            Map<String,Object> body=Map.of();
            if(Set.of("POST","PUT","DELETE").contains(method)) {
                if(!Objects.toString(exchange.getRequestHeaders().getFirst("Content-Type"),"").toLowerCase(Locale.ROOT).startsWith("application/json")) throw new Problem(415,"Use application/json.");
                byte[] bytes=exchange.getRequestBody().readNBytes(2_100_001);
                if(bytes.length>2_100_000) throw new Problem(413,"Request is too large.");
                body=bytes.length==0?Map.of():Json.object(new String(bytes,StandardCharsets.UTF_8));
            }
            result=route(method,path,exchange.getRequestURI().getRawQuery(),body);
        } catch(Problem e) {status=e.status;result=Map.of("error",e.getMessage());}
        catch(Exception e) {status=500;result=Map.of("error","Unexpected server error. Reload and check the local server log.");e.printStackTrace(System.err);}
        byte[] response=Json.write(result).getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type","application/json; charset=utf-8");
        exchange.getResponseHeaders().set("Cache-Control","no-store");exchange.getResponseHeaders().set("X-Content-Type-Options","nosniff");
        exchange.sendResponseHeaders(status,response.length);try(OutputStream out=exchange.getResponseBody()) {out.write(response);}
    }
    private Object route(String method,String path,String query,Map<String,Object> body) {
        PlannerService service=this.service;
        if(path.startsWith("/api/demo/")){service=demoService;path="/api/"+path.substring("/api/demo/".length());}
        if(method.equals("GET") && path.equals("/api/health")) return Map.of("status","ok","backend","Java 21","database","SQL/JDBC");
        if(method.equals("GET") && path.equals("/api/public/sessions")) return service.publicSessions();
        if(method.equals("GET") && path.matches("/api/public/sessions/\\d+/assignment")) {
            String raw="";
            if(query!=null) for(String pair:query.split("&")) {
                String[] kv=pair.split("=",2);if(kv[0].equals("roll")) raw=URLDecoder.decode(kv.length==2?kv[1]:"",StandardCharsets.UTF_8);
            }
            return service.lookup(PlannerService.id(path.split("/")[4]),raw);
        }
        if(!path.startsWith("/api/admin/")) throw new Problem(404,"API route not found.");
        if(method.equals("GET") && path.equals("/api/admin/state")) return service.state();
        if(method.equals("POST") && path.equals("/api/admin/demo")) return service.demo();
        if(method.equals("POST") && path.equals("/api/admin/import/preview")) return service.preview(PlannerService.str(body,"csv"));
        if(method.equals("POST") && path.equals("/api/admin/import/commit")) return Map.of("imported",service.importCsv(PlannerService.id(body.get("sessionId")),PlannerService.str(body,"csv")));
        String[] parts=path.split("/");String resource=parts.length>3?parts[3]:"";
        Long id=parts.length>4?PlannerService.id(parts[4]):null;
        if(resource.equals("students")) {
            if(method.equals("POST") && id==null) return Map.of("id",service.saveStudent(null,body));
            if(method.equals("PUT") && id!=null) return Map.of("id",service.saveStudent(id,body));
            if(method.equals("DELETE") && id!=null) {service.deleteStudent(id);return Map.of("ok",true);}
        }
        if(resource.equals("rooms")) {
            if(method.equals("POST") && id==null) return Map.of("id",service.saveRoom(null,body));
            if(method.equals("PUT") && id!=null) return Map.of("id",service.saveRoom(id,body));
            if(method.equals("DELETE") && id!=null) {service.deleteRoom(id);return Map.of("ok",true);}
        }
        if(resource.equals("sessions")) {
            if(method.equals("POST") && id==null) return Map.of("id",service.saveSession(null,body));
            if(method.equals("GET") && id!=null && parts.length==5) return service.session(id);
            if(method.equals("PUT") && id!=null && parts.length==5) return Map.of("id",service.saveSession(id,body));
            if(method.equals("POST") && id!=null && parts.length==6) {
                switch(parts[5]) {
                    case "roster" -> service.roster(id,PlannerService.list(body,"studentIds"));
                    case "rooms" -> service.selectRooms(id,PlannerService.list(body,"rooms"));
                    case "generate" -> {return Map.of("id",service.generate(id));}
                    case "withdraw" -> service.withdraw(id);
                    default -> throw new Problem(404,"Action not found.");
                }
                return Map.of("ok",true);
            }
        }
        if(resource.equals("plans") && id!=null) {
            if(method.equals("GET") && parts.length==5) return service.plan(id);
            if(method.equals("POST") && parts.length==6) {
                switch(parts[5]) {
                    case "publish" -> service.publish(id,Boolean.TRUE.equals(body.get("simulateFailure")));
                    case "discard" -> service.discard(id);
                    default -> throw new Problem(404,"Action not found.");
                }
                return Map.of("ok",true);
            }
        }
        throw new Problem(404,"API route or method not found.");
    }
}
