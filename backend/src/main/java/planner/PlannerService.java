package planner;

import java.sql.*;
import java.time.*;
import java.util.*;
import static planner.Domain.*;
import static planner.Database.*;

public final class PlannerService {
    public final Database db;
    private final Allocator allocator=new Allocator();
    private final PlanValidator validator=new PlanValidator();
    private final boolean testMode;
    public PlannerService(Database db,boolean testMode) {this.db=db;this.testMode=testMode;}

    public static String str(Map<String,Object> b,String key) {return Objects.toString(b.get(key),"");}
    public static int integer(Object value,String field,int min,int max) {
        try {
            int n=Integer.parseInt(Objects.toString(value,""));
            if(n<min || n>max) throw new NumberFormatException(); return n;
        } catch(NumberFormatException e) {throw new Problem(400,field+" must be an integer from "+min+" to "+max+".");}
    }
    public static long id(Object value) {
        try {long v=Long.parseLong(Objects.toString(value,""));if(v<1) throw new NumberFormatException();return v;}
        catch(NumberFormatException e) {throw new Problem(400,"Invalid record identifier.");}
    }
    @SuppressWarnings("unchecked") public static List<Object> list(Map<String,Object> b,String key) {
        Object v=b.get(key);if(!(v instanceof List<?>)) throw new Problem(400,"Expected a list: "+key);return (List<Object>)v;
    }
    private static long number(Map<String,Object> row,String key) {return ((Number)row.get(key)).longValue();}
    private static void changed(Connection c,long session) throws SQLException {
        update(c,"UPDATE exam_sessions SET revision=revision+1 WHERE id=?",session);
    }
    private static void audit(Connection c,String action,String detail) throws SQLException {
        update(c,"INSERT INTO audit_events(occurred_at,action,detail) VALUES(?,?,?)",Instant.now().toString(),action,detail);
    }
    private Student student(Map<String,Object> b,long studentId,int revision) {
        String section=str(b,"section").strip().toUpperCase(Locale.ROOT);
        if(!section.isEmpty()) section=text(section,"Section",20);
        return new Student(studentId,roll(str(b,"roll")),text(str(b,"name"),"Name",120),
                integer(b.get("year"),"Year",1,4),branch(str(b,"branch")),section,revision);
    }
    public Map<String,Object> state() {
        return db.read(c -> Map.of("students",rows(c,"SELECT id,roll,name,study_year AS \"year\",branch,section,revision FROM students ORDER BY roll"),
                "rooms",rooms(c),"sessions",rows(c,"SELECT s.*,p.version_no AS published_version FROM exam_sessions s LEFT JOIN plans p ON p.id=s.current_plan_id ORDER BY s.exam_date,s.start_time,s.id"),
                "branches",rows(c,"SELECT code,label FROM branches ORDER BY code")));
    }
    public long saveStudent(Long studentId,Map<String,Object> body) {
        Student s=student(body,0,0);
        return db.transaction(c -> {
            if(studentId==null) return insert(c,"INSERT INTO students(roll,name,study_year,branch,section) VALUES(?,?,?,?,?)",s.roll(),s.name(),s.year(),s.branch(),s.section());
            one(c,"SELECT id FROM students WHERE id=?",studentId);
            update(c,"UPDATE students SET roll=?,name=?,study_year=?,branch=?,section=?,revision=revision+1 WHERE id=?",s.roll(),s.name(),s.year(),s.branch(),s.section(),studentId);
            audit(c,"STUDENT_UPDATED","Student "+studentId);return studentId;
        });
    }
    public void deleteStudent(long studentId) {
        db.transaction(c -> {one(c,"SELECT id FROM students WHERE id=?",studentId);update(c,"DELETE FROM students WHERE id=?",studentId);return null;});
    }
    private List<Map<String,Object>> rooms(Connection c) throws SQLException {
        List<Map<String,Object>> values=rows(c,"SELECT id,code,row_count AS \"rows\",benches_per_row,revision FROM rooms ORDER BY code");
        for(Map<String,Object> r:values) {
            r.put("excluded",rows(c,"SELECT row_no,bench_no FROM room_benches WHERE room_id=? AND usable=FALSE ORDER BY row_no,bench_no",r.get("id"))
                    .stream().map(b -> b.get("row_no")+":"+b.get("bench_no")).toList());
            r.put("rowBenchCounts",rowCounts(c,number(r,"id")));
        }
        return values;
    }
    private List<Integer> rowCounts(Connection c,long room) throws SQLException {
        return rows(c,"SELECT row_no,MAX(bench_no) AS benches FROM room_benches WHERE room_id=? GROUP BY row_no ORDER BY row_no",room)
                .stream().map(r -> ((Number)r.get("benches")).intValue()).toList();
    }
    private List<String> exclusions(Object raw,List<Integer> rowCounts) {
        if(!(raw instanceof List<?> values)) throw new Problem(400,"Excluded benches must be a list of row:bench coordinates.");
        TreeSet<String> set=new TreeSet<>();
        for(Object value:values) {
            String[] pair=Objects.toString(value,"").split(":");
            if(pair.length!=2) throw new Problem(400,"Bench coordinates must use row:bench, for example 2:3.");
            int row=integer(pair[0],"Bench row",1,rowCounts.size()),bench=integer(pair[1],"Bench number in row "+row,1,rowCounts.get(row-1));
            set.add(row+":"+bench);
        }
        return List.copyOf(set);
    }
    public long saveRoom(Long roomId,Map<String,Object> b) {
        String code=text(str(b,"code"),"Room identifier",30).toUpperCase(Locale.ROOT);
        if(!code.matches("[A-Z0-9][A-Z0-9 _-]*")) throw new Problem(400,"Use letters, digits, spaces, hyphens or underscores for room identifiers.");
        int rowCount=integer(b.get("rows"),"Rows",1,30);
        List<Integer> counts;
        if(b.containsKey("rowBenchCounts")) {
            List<Object> supplied=list(b,"rowBenchCounts");
            if(supplied.size()!=rowCount) throw new Problem(400,"Enter one bench count for every row.");
            counts=supplied.stream().map(value -> integer(value,"Benches in a row",1,30)).toList();
        } else counts=Collections.nCopies(rowCount,integer(b.get("benchesPerRow"),"Benches per row",1,30));
        int perRow=counts.stream().mapToInt(Integer::intValue).max().orElseThrow();
        List<String> excluded=exclusions(b.getOrDefault("excluded",List.of()),counts);
        return db.transaction(c -> {
            long room;
            if(roomId==null) room=insert(c,"INSERT INTO rooms(code,row_count,benches_per_row) VALUES(?,?,?)",code,rowCount,perRow);
            else {
                room=roomId;one(c,"SELECT id FROM rooms WHERE id=?",room);
                // Avoid leaving an existing session exclusion outside the new geometry.
                for(Map<String,Object> position:rows(c,"SELECT row_no,bench_no FROM session_exclusions WHERE room_id=?",room)) {
                    int row=((Number)position.get("row_no")).intValue(),bench=((Number)position.get("bench_no")).intValue();
                    if(row>rowCount || bench>counts.get(row-1))
                        throw new Problem(409,"A saved session excludes a bench beyond the proposed row length. Remove that session exclusion before shortening the row.");
                }
                update(c,"UPDATE rooms SET code=?,row_count=?,benches_per_row=?,revision=revision+1 WHERE id=?",code,rowCount,perRow,room);
                update(c,"DELETE FROM room_benches WHERE room_id=?",room);
            }
            for(int r=1;r<=rowCount;r++) for(int bench=1;bench<=counts.get(r-1);bench++)
                update(c,"INSERT INTO room_benches(room_id,row_no,bench_no,usable) VALUES(?,?,?,?)",room,r,bench,!excluded.contains(r+":"+bench));
            return room;
        });
    }
    public void deleteRoom(long roomId) {
        db.transaction(c -> {
            one(c,"SELECT id FROM rooms WHERE id=?",roomId);
            if(!rows(c,"SELECT s.id FROM exam_sessions s JOIN plan_rooms pr ON pr.plan_id=s.current_plan_id WHERE pr.room_id=?",roomId).isEmpty())
                throw new Problem(409,"This room is used by a current publication.");
            update(c,"DELETE FROM room_benches WHERE room_id=?",roomId);update(c,"DELETE FROM rooms WHERE id=?",roomId);return null;
        });
    }
    public long saveSession(Long sessionId,Map<String,Object> b) {
        String name=text(str(b,"name"),"Session name",120); LocalDate date;LocalTime start,end;
        try {date=LocalDate.parse(str(b,"date"));start=LocalTime.parse(str(b,"start"));end=LocalTime.parse(str(b,"end"));}
        catch(Exception e) {throw new Problem(400,"Enter a valid date and times.");}
        if(!start.isBefore(end) || start.getSecond()!=0 || end.getSecond()!=0 || start.getNano()!=0 || end.getNano()!=0)
            throw new Problem(400,"Use same-day, minute-precision times with start before end.");
        return db.transaction(c -> {
            if(sessionId==null) return insert(c,"INSERT INTO exam_sessions(name,exam_date,start_time,end_time) VALUES(?,?,?,?)",name,date,start,end);
            Map<String,Object> old=one(c,"SELECT * FROM exam_sessions WHERE id=?",sessionId);
            if(old.get("current_plan_id")!=null) throw new Problem(409,"Withdraw the current publication before editing session details.");
            update(c,"UPDATE exam_sessions SET name=?,exam_date=?,start_time=?,end_time=?,revision=revision+1 WHERE id=?",name,date,start,end,sessionId);
            checkConflicts(c,sessionId,rows(c,"SELECT room_id FROM session_rooms WHERE session_id=?",sessionId).stream().map(r -> number(r,"room_id")).toList());
            return sessionId;
        });
    }
    public void roster(long session,List<Object> ids) {
        if(ids.size()>10000) throw new Problem(400,"At most 10,000 roster students are supported.");
        Set<Long> unique=new LinkedHashSet<>();for(Object value:ids) if(!unique.add(id(value))) throw new Problem(400,"Duplicate roster student.");
        db.transaction(c -> {
            one(c,"SELECT id FROM exam_sessions WHERE id=?",session);
            for(long studentId:unique) one(c,"SELECT id FROM students WHERE id=?",studentId);
            update(c,"DELETE FROM session_roster WHERE session_id=?",session);
            for(long studentId:unique) update(c,"INSERT INTO session_roster(session_id,student_id) VALUES(?,?)",session,studentId);
            changed(c,session);return null;
        });
    }
    @SuppressWarnings("unchecked") public void selectRooms(long session,List<Object> selected) {
        db.transaction(c -> {
            one(c,"SELECT id FROM exam_sessions WHERE id=?",session);
            List<Long> roomIds=new ArrayList<>();Map<Long,List<String>> excluded=new LinkedHashMap<>();
            for(Object raw:selected) {
                if(!(raw instanceof Map<?,?>)) throw new Problem(400,"Invalid room selection.");
                Map<String,Object> item=(Map<String,Object>)raw;long room=id(item.get("roomId"));
                if(roomIds.contains(room)) throw new Problem(400,"Duplicate selected room.");
                Map<String,Object> r=one(c,"SELECT * FROM rooms WHERE id=?",room);
                roomIds.add(room);excluded.put(room,exclusions(item.getOrDefault("excluded",List.of()),rowCounts(c,room)));
            }
            checkConflicts(c,session,roomIds);
            update(c,"DELETE FROM session_exclusions WHERE session_id=?",session);update(c,"DELETE FROM session_rooms WHERE session_id=?",session);
            for(long room:roomIds) {
                update(c,"INSERT INTO session_rooms(session_id,room_id) VALUES(?,?)",session,room);
                for(String position:excluded.get(room)) {String[] p=position.split(":");update(c,"INSERT INTO session_exclusions(session_id,room_id,row_no,bench_no) VALUES(?,?,?,?)",session,room,Integer.parseInt(p[0]),Integer.parseInt(p[1]));}
            }
            changed(c,session);return null;
        });
    }
    private void checkConflicts(Connection c,long session,List<Long> roomIds) throws SQLException {
        Map<String,Object> current=one(c,"SELECT * FROM exam_sessions WHERE id=?",session);
        for(long room:roomIds) {
            List<Map<String,Object>> conflicts=rows(c,"SELECT DISTINCT s.id,s.name FROM exam_sessions s WHERE s.id<>? AND s.exam_date=? AND s.start_time<? AND s.end_time>? AND (EXISTS(SELECT 1 FROM session_rooms sr WHERE sr.session_id=s.id AND sr.room_id=?) OR EXISTS(SELECT 1 FROM plan_rooms pr WHERE pr.plan_id=s.current_plan_id AND pr.room_id=?))",
                    session,current.get("exam_date"),current.get("end_time"),current.get("start_time"),room,room);
            if(!conflicts.isEmpty()) throw new Problem(409,"Room is reserved by overlapping session: "+conflicts.getFirst().get("name")+". Back-to-back sessions are allowed.");
        }
    }
    public Input input(Connection c,long session) throws SQLException {
        Map<String,Object> s=one(c,"SELECT * FROM exam_sessions WHERE id=?",session);
        List<Student> students=rows(c,"SELECT st.* FROM students st JOIN session_roster sr ON sr.student_id=st.id WHERE sr.session_id=? ORDER BY st.roll",session).stream()
                .map(r -> new Student(number(r,"id"),(String)r.get("roll"),(String)r.get("name"),((Number)r.get("study_year")).intValue(),(String)r.get("branch"),(String)r.get("section"),((Number)r.get("revision")).intValue())).toList();
        List<Room> rooms=new ArrayList<>();
        for(Map<String,Object> r:rows(c,"SELECT r.* FROM rooms r JOIN session_rooms sr ON sr.room_id=r.id WHERE sr.session_id=? ORDER BY r.code",session)) {
            long room=number(r,"id"); TreeSet<String> excluded=new TreeSet<>();
            for(Map<String,Object> p:rows(c,"SELECT row_no,bench_no FROM room_benches WHERE room_id=? AND usable=FALSE UNION SELECT row_no,bench_no FROM session_exclusions WHERE session_id=? AND room_id=?",room,session,room))
                excluded.add(p.get("row_no")+":"+p.get("bench_no"));
            rooms.add(new Room(room,(String)r.get("code"),((Number)r.get("row_count")).intValue(),((Number)r.get("benches_per_row")).intValue(),((Number)r.get("revision")).intValue(),List.copyOf(excluded),rowCounts(c,room)));
        }
        return new Input(session,((Number)s.get("revision")).intValue(),(String)s.get("name"),(String)s.get("exam_date"),(String)s.get("start_time"),(String)s.get("end_time"),students,rooms);
    }
    public Map<String,Object> session(long session) {
        return db.read(c -> {
            // One repeatable-read snapshot keeps input lists and their fingerprint consistent.
            c.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);c.setAutoCommit(false);
            Input input=input(c,session);Map<String,Object> result=new LinkedHashMap<>();
            result.put("input",input);result.put("capacity",allocator.capacity(input));
            result.put("session",one(c,"SELECT * FROM exam_sessions WHERE id=?",session));
            String fingerprint=hash(input);
            List<Map<String,Object>> plans=rows(c,"SELECT id,version_no,status,created_at,published_at,snapshot FROM plans WHERE session_id=? ORDER BY version_no DESC",session);
            // Canonicalize legacy rectangular JSON before comparing, without rewriting history.
            plans.forEach(p -> p.put("stale",!fingerprint.equals(hash(Json.read((String)p.remove("snapshot"),Input.class)))));result.put("plans",plans);
            result.put("roomSelections",rows(c,"SELECT sr.room_id,se.row_no,se.bench_no FROM session_rooms sr LEFT JOIN session_exclusions se ON se.session_id=sr.session_id AND se.room_id=sr.room_id WHERE sr.session_id=? ORDER BY sr.room_id,se.row_no,se.bench_no",session));
            c.commit();return result;
        });
    }
    public long generate(long session) {
        Input snapshot=db.read(c -> {c.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);c.setAutoCommit(false);Input i=input(c,session);c.commit();return i;});
        List<Seat> seats=allocator.allocate(snapshot);validator.requireValid(snapshot,seats,session);
        return db.transaction(c -> {
            String fingerprint=hash(snapshot);
            if(!fingerprint.equals(hash(input(c,session)))) throw new Problem(409,"Inputs changed during generation. Generate again.");
            checkConflicts(c,session,snapshot.rooms().stream().map(Room::id).toList());
            int version=((Number)one(c,"SELECT COALESCE(MAX(version_no),0)+1 AS next_version FROM plans WHERE session_id=?",session).get("next_version")).intValue();
            long plan=insert(c,"INSERT INTO plans(session_id,version_no,status,fingerprint,snapshot,created_at) VALUES(?,?,'DRAFT',?,?,?)",session,version,fingerprint,Json.write(snapshot),Instant.now().toString());
            for(Student s:snapshot.students()) update(c,"INSERT INTO plan_students(plan_id,student_id,roll,name,study_year,branch,section) VALUES(?,?,?,?,?,?,?)",plan,s.id(),s.roll(),s.name(),s.year(),s.branch(),s.section());
            for(Room r:snapshot.rooms()) {
                update(c,"INSERT INTO plan_rooms(plan_id,room_id,code,row_count,benches_per_row) VALUES(?,?,?,?,?)",plan,r.id(),r.code(),r.rows(),r.benchesPerRow());
                for(int row=1;row<=r.rows();row++) for(int b=1;b<=r.benchesInRow(row);b++) update(c,"INSERT INTO plan_benches(plan_id,room_id,row_no,bench_no,usable) VALUES(?,?,?,?,?)",plan,r.id(),row,b,r.usable(row,b));
            }
            for(Seat seat:seats) update(c,"INSERT INTO assignments(plan_id,student_id,room_id,row_no,bench_no,seat_label) VALUES(?,?,?,?,?,?)",plan,seat.studentId(),seat.roomId(),seat.row(),seat.bench(),seat.seat());
            audit(c,"DRAFT_GENERATED","Session "+session+", plan "+plan+", version "+version);return plan;
        });
    }
    private List<Seat> seats(Connection c,long plan) throws SQLException {
        return rows(c,"SELECT * FROM assignments WHERE plan_id=? ORDER BY room_id,row_no,bench_no,seat_label",plan).stream().map(r -> new Seat(number(r,"student_id"),number(r,"room_id"),((Number)r.get("row_no")).intValue(),((Number)r.get("bench_no")).intValue(),(String)r.get("seat_label"))).toList();
    }
    public Map<String,Object> plan(long plan) {
        return db.read(c -> {
            c.setTransactionIsolation(Connection.TRANSACTION_REPEATABLE_READ);c.setAutoCommit(false);
            Map<String,Object> p=one(c,"SELECT * FROM plans WHERE id=?",plan);Input snapshot=Json.read((String)p.remove("snapshot"),Input.class);
            p.remove("fingerprint");p.put("stale",!hash(snapshot).equals(hash(input(c,snapshot.sessionId()))));
            p.put("input",snapshot);p.put("assignments",seats(c,plan));p.put("capacity",allocator.capacity(snapshot));
            p.put("validationErrors",validator.validate(snapshot,seats(c,plan),snapshot.sessionId()));c.commit();return p;
        });
    }
    public void publish(long plan,boolean simulateFailure) {
        db.transaction(c -> {
            Map<String,Object> p=one(c,"SELECT * FROM plans WHERE id=?",plan);long session=number(p,"session_id");
            Map<String,Object> s=one(c,"SELECT * FROM exam_sessions WHERE id=?",session);
            if(Objects.equals(s.get("current_plan_id"),plan) && "PUBLISHED".equals(p.get("status"))) return null;
            if(!"DRAFT".equals(p.get("status"))) throw new Problem(409,"Only a draft can be published.");
            Input snapshot=Json.read((String)p.get("snapshot"),Input.class);
            if(!hash(snapshot).equals(hash(input(c,session)))) throw new Problem(409,"Draft is stale because inputs changed. Regenerate and review it before publishing.");
            checkConflicts(c,session,snapshot.rooms().stream().map(Room::id).toList());
            validator.requireValid(snapshot,seats(c,plan),session);
            if(s.get("current_plan_id")!=null) update(c,"UPDATE plans SET status='SUPERSEDED' WHERE id=?",s.get("current_plan_id"));
            update(c,"UPDATE plans SET status='PUBLISHED',published_at=? WHERE id=?",Instant.now().toString(),plan);
            update(c,"UPDATE exam_sessions SET current_plan_id=? WHERE id=?",plan,session);
            if(testMode && simulateFailure) throw new SQLException("TEST ONLY: forced failure before commit");
            audit(c,"PLAN_PUBLISHED","Session "+session+", plan "+plan);return null;
        });
    }
    public void withdraw(long session) {
        db.transaction(c -> {
            Map<String,Object> s=one(c,"SELECT * FROM exam_sessions WHERE id=?",session);
            if(s.get("current_plan_id")==null) throw new Problem(409,"This session has no current publication.");
            update(c,"UPDATE plans SET status='WITHDRAWN' WHERE id=?",s.get("current_plan_id"));
            update(c,"UPDATE exam_sessions SET current_plan_id=NULL WHERE id=?",session);audit(c,"PLAN_WITHDRAWN","Session "+session);return null;
        });
    }
    public void discard(long plan) {
        db.transaction(c -> {if(update(c,"UPDATE plans SET status='DISCARDED' WHERE id=? AND status='DRAFT'",plan)!=1) throw new Problem(409,"Only a draft can be discarded.");return null;});
    }
    public List<Map<String,Object>> publicSessions() {
        try(Connection c=db.reader()) {return rows(c,"SELECT * FROM published_sessions ORDER BY exam_date,start_time,id");}
        catch(Exception e) {throw failure(e);}
    }
    public Map<String,Object> lookup(long session,String rawRoll) {
        String normalized=roll(rawRoll);
        try(Connection c=db.reader()) {
            List<Map<String,Object>> result=rows(c,"SELECT a.*,b.layout_row,b.layout_bench,b.layout_usable FROM published_assignments a JOIN published_room_benches b ON b.plan_id=a.plan_id AND b.room_code=a.room_code WHERE a.session_id=? AND a.roll=? ORDER BY b.layout_row,b.layout_bench",session,normalized);
            if(result.isEmpty()) throw new Problem(404,"No current published assignment was found for that session and roll number.");
            Map<String,Object> assignment=new LinkedHashMap<>(result.getFirst());
            assignment.remove("layout_row");assignment.remove("layout_bench");assignment.remove("layout_usable");
            assignment.put("roomLayout",result.stream().map(position -> Map.of("row",position.get("layout_row"),"bench",position.get("layout_bench"),"usable",position.get("layout_usable"))).toList());
            return assignment;
        } catch(Problem e) {throw e;}catch(Exception e) {throw failure(e);}
    }
    public Map<String,Object> preview(String csv) {return db.read(c -> preview(c,csv));}
    private Map<String,Object> preview(Connection c,String csv) throws SQLException {
        List<List<String>> records=Csv.parse(csv);
        if(records.size()<2) throw new Problem(400,"CSV needs a header and at least one student record.");
        List<String> header=records.getFirst().stream().map(s -> s.strip().toLowerCase(Locale.ROOT)).toList();
        if(!header.equals(List.of("roll_number","name","year","branch","section")) && !header.equals(List.of("roll_number","name","year","branch")))
            throw new Problem(400,"CSV header must be roll_number,name,year,branch,section (section column may be omitted).");
        Set<String> saved=new HashSet<>();rows(c,"SELECT roll FROM students").forEach(r -> saved.add((String)r.get("roll")));
        Set<String> seen=new HashSet<>();List<Map<String,Object>> result=new ArrayList<>();boolean valid=true;
        for(int i=1;i<records.size();i++) {
            List<String> record=records.get(i);List<String> errors=new ArrayList<>();Map<String,Object> data=new LinkedHashMap<>();
            if(record.size()!=header.size()) errors.add("Wrong number of columns.");
            else {
                data.put("roll",record.get(0));data.put("name",record.get(1));data.put("year",record.get(2));data.put("branch",record.get(3));data.put("section",record.size()==5?record.get(4):"");
                try {
                    Student s=student(data,0,0);data.put("roll",s.roll());data.put("year",s.year());data.put("branch",s.branch());data.put("name",s.name());data.put("section",s.section());
                    if(!seen.add(s.roll())) errors.add("Duplicate roll within this file.");if(saved.contains(s.roll())) errors.add("Roll already exists in student master; add the saved student to the roster instead.");
                } catch(Problem e) {errors.add(e.getMessage());}
            }
            if(!errors.isEmpty()) valid=false;
            result.add(Map.of("record",i+1,"student",data,"errors",errors));
        }
        return Map.of("valid",valid,"rows",result);
    }
    @SuppressWarnings("unchecked") public int importCsv(long session,String csv) {
        return db.transaction(c -> {
            one(c,"SELECT id FROM exam_sessions WHERE id=?",session);
            Map<String,Object> preview=preview(c,csv);
            if(!Boolean.TRUE.equals(preview.get("valid"))) throw new Problem(409,"Import contains errors. Preview and correct them before committing; nothing was imported.");
            List<Map<String,Object>> records=(List<Map<String,Object>>)preview.get("rows");
            for(Map<String,Object> record:records) {
                Student s=student((Map<String,Object>)record.get("student"),0,0);
                long student=insert(c,"INSERT INTO students(roll,name,study_year,branch,section) VALUES(?,?,?,?,?)",s.roll(),s.name(),s.year(),s.branch(),s.section());
                update(c,"INSERT INTO session_roster(session_id,student_id) VALUES(?,?)",session,student);
            }
            changed(c,session);audit(c,"CSV_IMPORTED",records.size()+" synthetic records into session "+session);return records.size();
        });
    }
    public long publishedDemo() {
        long session=((Number)demo().get("sessionId")).longValue();
        publish(generate(session),false);
        return session;
    }
    public Map<String,Object> demo() {
        return db.transaction(c -> {
            if(!rows(c,"SELECT id FROM students").isEmpty() || !rows(c,"SELECT id FROM exam_sessions").isEmpty() || !rows(c,"SELECT id FROM rooms").isEmpty())
                throw new Problem(409,"Load demo data only into an empty database; existing work is preserved.");
            long session=insert(c,"INSERT INTO exam_sessions(name,exam_date,start_time,end_time) VALUES(?,?,?,?)","Semester I · Synthetic Demo",LocalDate.of(2026,11,7),LocalTime.of(9,0),LocalTime.of(12,0));
            for(int i=1;i<=40;i++) {
                long student=insert(c,"INSERT INTO students(roll,name,study_year,branch,section) VALUES(?,?,?,?,?)",String.format("%04d",i),"Sample Student "+i,2,i<=30?"AI_ML":"CSE",i%2==0?"A":"B");
                update(c,"INSERT INTO session_roster(session_id,student_id) VALUES(?,?)",session,student);
            }
            long selected=0;
            for(int n=0;n<2;n++) {
                int count=n==0?4:5;long room=insert(c,"INSERT INTO rooms(code,row_count,benches_per_row) VALUES(?,?,?)",n==0?"ROOM-24":"ROOM-30",count,6);
                for(int r=1;r<=count;r++) for(int b=1;b<=6;b++) update(c,"INSERT INTO room_benches(room_id,row_no,bench_no,usable) VALUES(?,?,?,TRUE)",room,r,b);
                if(n==1) selected=room;
            }
            update(c,"INSERT INTO session_rooms(session_id,room_id) VALUES(?,?)",session,selected);
            audit(c,"DEMO_LOADED","40 synthetic students, 24/30-bench rooms; nothing is published automatically.");
            return Map.of("sessionId",session,"message","Demo loaded: 30 AI-ML + 10 CSE students. Generate, review and publish explicitly.");
        });
    }
}
