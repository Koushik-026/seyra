package planner;

import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import static planner.Domain.*;
import static planner.Database.*;

/** Dependency-free executable checks; failures exit nonzero. No fabricated result counters. */
public final class CoreTests {
    private static int assertions=0,oracleCases=0;
    private static final Allocator allocator=new Allocator();
    private static final PlanValidator validator=new PlanValidator();
    private static void check(boolean condition,String message) {assertions++;if(!condition)throw new AssertionError(message);}
    private static void expectProblem(int status,Runnable work,String message) {
        try {work.run();throw new AssertionError("Expected rejection: "+message);}
        catch(Problem p) {check(p.status==status,message+": wrong status "+p.status);}
    }
    private static Input input(int[] counts,int benches) {
        String[] branches={"AI_ML","CSE","ECE","IT"};List<Student> students=new ArrayList<>();long id=0;
        for(int group=0;group<counts.length;group++)for(int n=0;n<counts[group];n++){id++;students.add(new Student(id,String.format("%04d",id),"Fictional "+id,2,branches[group],n%2==0?"A":"B",1));}
        return new Input(1,1,"Synthetic","2026-11-07","09:00:00","12:00:00",students,List.of(new Room(1,"R1",1,benches,1,List.of())));
    }
    // Independent exhaustive partition search. Tries a single and all legal partners.
    private static int oracle(int[] counts,Map<String,Integer> memo) {
        String key=Arrays.toString(counts);if(memo.containsKey(key))return memo.get(key);
        int first=-1;for(int i=0;i<counts.length;i++)if(counts[i]>0){first=i;break;}
        if(first<0)return 0;
        counts[first]--;int best=1+oracle(counts,memo);
        for(int j=first+1;j<counts.length;j++)if(counts[j]>0){counts[j]--;best=Math.min(best,1+oracle(counts,memo));counts[j]++;}
        counts[first]++;memo.put(key,best);return best;
    }
    private static void allocation() {
        Map<String,Integer> memo=new HashMap<>();
        for(int a=0;a<=10;a++)for(int b=0;b<=10-a;b++)for(int c=0;c<=10-a-b;c++)for(int d=0;d<=10-a-b-c;d++){
            if(a+b+c+d==0)continue;int[] counts={a,b,c,d};Input input=input(counts,10);
            List<Seat> seats=allocator.allocate(input);int used=(int)seats.stream().map(s->s.roomId()+":"+s.row()+":"+s.bench()).distinct().count();
            int optimal=oracle(counts,memo);check(used==optimal,"Greedy differs from exhaustive partition optimum: "+Arrays.toString(counts));
            check(used==allocator.capacity(input).requiredBenches(),"Formula differs from actual allocation");
            check(validator.validate(input,seats,1).isEmpty(),"Allocator failed independent validator");oracleCases++;
        }
        Input insufficient=input(new int[]{30,10},24);check(allocator.capacity(insufficient).shortage()==6,"30+10 needs six extra benches");
        expectProblem(409,()->allocator.allocate(insufficient),"48 physical seats still insufficient");
        Input enough=input(new int[]{30,10},30);List<Seat> plan=allocator.allocate(enough);
        check(plan.size()==40&&allocator.capacity(enough).pairs()==10&&allocator.capacity(enough).singles()==20,"30+10 expected pair/single counts");
        List<Student> reversed=new ArrayList<>(enough.students());Collections.reverse(reversed);
        check(plan.equals(allocator.allocate(new Input(1,1,"Synthetic",enough.date(),enough.start(),enough.end(),reversed,enough.rooms()))),"Order independent reproducibility");
        expectProblem(400,()->allocator.allocate(input(new int[]{0},1)),"Empty roster");
        Input same=input(new int[]{2},2);check(allocator.allocate(same).get(0).bench()!=allocator.allocate(same).get(1).bench(),"Sections cannot override same group");
        Input base=input(new int[]{2,2},5);Room r1=new Room(1,"R1",1,2,1,List.of("1:1")),r2=new Room(2,"R2",2,1,1,List.of());
        Input multiple=new Input(1,1,"Multi",base.date(),base.start(),base.end(),base.students(),List.of(r1,r2));
        check(validator.validate(multiple,allocator.allocate(multiple),1).isEmpty(),"Multiple layouts and excluded bench");
        Room uneven=new Room(7,"UNEVEN",3,7,1,List.of("1:7","3:6"),List.of(7,5,6));
        Input shaped=new Input(1,1,"Uneven rows",base.date(),base.start(),base.end(),input(new int[]{6,3},6).students(),List.of(uneven));
        check(allocator.capacity(shaped).usableBenches()==16,"Uneven row capacity is sum of existing usable benches, not 3*7");
        check(validator.validate(shaped,allocator.allocate(shaped),1).isEmpty(),"Allocation works on 7/5/6 rows");
        check(!uneven.usable(2,6)&&uneven.usable(1,6),"Short rows do not create phantom benches");
        String legacy=Json.write(base).replaceAll(",\"rowBenchCounts\":\\[[^]]*\\]","");
        check(hash(Json.read(legacy,Input.class)).equals(hash(base)),"Legacy rectangular snapshots canonicalize without changing their meaning");
        System.out.println("PASS allocator: "+oracleCases+" count vectors compared to independent exhaustive oracle; 30+10, ordering, exclusions, empty/single groups.");
    }
    private static void validation() {
        Input i=input(new int[]{2,2},2);List<Seat> valid=allocator.allocate(i);
        List<List<Seat>> bad=new ArrayList<>();bad.add(valid.subList(1,valid.size()));
        List<Seat> duplicate=new ArrayList<>(valid);duplicate.add(valid.getFirst());bad.add(duplicate);
        List<Seat> outside=new ArrayList<>(valid);outside.set(0,new Seat(999,1,1,1,"A"));bad.add(outside);
        List<Seat> wrongRoom=new ArrayList<>(valid);wrongRoom.set(0,new Seat(valid.getFirst().studentId(),99,1,1,"A"));bad.add(wrongRoom);
        List<Seat> wrongSeat=new ArrayList<>(valid);wrongSeat.set(0,new Seat(valid.getFirst().studentId(),1,1,1,"C"));bad.add(wrongSeat);
        bad.add(List.of(new Seat(1,1,1,1,"A"),new Seat(2,1,1,1,"B"),new Seat(3,1,1,2,"A"),new Seat(4,1,1,2,"B")));
        bad.add(List.of(new Seat(1,1,1,1,"A"),new Seat(3,1,1,1,"A"),new Seat(2,1,1,1,"B"),new Seat(4,1,1,2,"B")));
        for(List<Seat> seats:bad)check(!validator.validate(i,seats,1).isEmpty(),"Corrupted assignments must fail validation");
        check(!validator.validate(i,valid,2).isEmpty(),"Wrong session rejected");
        Input excluded=new Input(1,1,i.sessionName(),i.date(),i.start(),i.end(),i.students(),List.of(new Room(1,"R1",1,2,1,List.of("1:1"))));
        check(!validator.validate(excluded,valid,1).isEmpty(),"Excluded placement rejected");
        check(roll("  ab001 ").equals("AB001")&&roll("0001").equals("0001"),"Roll normalization preserves zeros");
        check(branch("AI-ML").equals(branch("AI_ML")),"Canonical branches");
        expectProblem(400,()->roll("AB 01"),"Embedded roll whitespace");
        check(Csv.parse("roll,name\r\n0001,\"A, B\"\r\n").get(1).get(1).equals("A, B"),"Quoted comma");
        check(Csv.parse("a,b\n1,\"A\"\"B\"\n").get(1).get(1).equals("A\"B"),"Escaped quotes");
        expectProblem(400,()->Csv.parse("a,b\n1,\"oops"),"Malformed CSV");
        System.out.println("PASS independent validator: missing/duplicate/unknown students, invalid rooms/seats, incompatible pairs, overfull/duplicate seats, excluded bench and wrong session; normalization/CSV checks.");
    }
    @SuppressWarnings("unchecked") private static void database() throws Exception {
        Path path=Path.of("tmp","java-tests-"+UUID.randomUUID());Database db=new Database(path);PlannerService service=new PlannerService(db,true);
        long session=((Number)service.demo().get("sessionId")).longValue();
        check(service.publicSessions().isEmpty(),"Draft/unpublished sessions hidden");
        long plan=service.generate(session);check(service.publicSessions().isEmpty(),"Saved draft hidden");
        db.transaction(c -> {
            String old=(String)one(c,"SELECT snapshot FROM plans WHERE id=?",plan).get("snapshot");
            update(c,"UPDATE plans SET snapshot=?,fingerprint=? WHERE id=?",old.replaceAll(",\"rowBenchCounts\":\\[[^]]*\\]",""),"0".repeat(64),plan);return null;
        });
        service.publish(plan,false);check(!Boolean.TRUE.equals(service.plan(plan).get("stale")),"Legacy draft can publish with unchanged canonical inputs");
        check(service.lookup(session,"0001").get("roll").equals("0001"),"Reader account lookup");
        Map<String,Object> lookup=service.lookup(session,"0001");
        check(((List<?>)lookup.get("roomLayout")).size()==30,"Public lookup includes only the assigned room's 30 snapshot bench positions");
        check(!lookup.containsKey("name")&&!Json.write(lookup).contains("Sample Student")&&!Json.write(lookup).contains("0002"),"Public map does not return other student identities");
        try(Connection reader=db.reader()) {
            try {rows(reader,"SELECT * FROM students");throw new AssertionError("Reader should not read master");}catch(SQLException expected){assertions++;}
            try {update(reader,"DELETE FROM students");throw new AssertionError("Reader should not write");}catch(SQLException expected){assertions++;}
        }
        long replacement=service.generate(session);expectProblem(503,()->service.publish(replacement,true),"Failed transaction rollback");
        check(((Number)service.lookup(session,"0001").get("plan_id")).longValue()==plan,"Old current pointer survives rollback");
        check(service.plan(plan).get("status").equals("PUBLISHED")&&service.plan(replacement).get("status").equals("DRAFT"),"Plan states roll back together");
        service.publish(replacement,false);check(service.plan(plan).get("status").equals("SUPERSEDED"),"Replacement supersedes atomically");
        service.publish(replacement,false);check(service.publicSessions().size()==1,"Repeated publish idempotent");
        long stale=service.generate(session);Map<String,Object> master=((List<Map<String,Object>>)service.state().get("students")).getFirst();
        service.saveStudent(((Number)master.get("id")).longValue(),Map.of("roll","0001","name","Changed after publication","year",3,"branch","CSE","section","A"));
        expectProblem(409,()->service.publish(stale,false),"Student edits stale draft");
        Input historical=Json.MAPPER.convertValue(service.plan(replacement).get("input"),Input.class);
        check(historical.students().getFirst().name().equals("Sample Student 1")&&historical.students().getFirst().year()==2,"Historical snapshot unchanged");
        int before=((List<?>)service.state().get("students")).size();
        String invalid="roll_number,name,year,branch,section\n0099,Valid,2,CSE,A\n0001,Duplicate,2,CSE,A";
        expectProblem(409,()->service.importCsv(session,invalid),"Invalid import rejected atomically");
        check(((List<?>)service.state().get("students")).size()==before,"No partial CSV insert");
        long room=((Number)((List<Map<String,Object>>)service.state().get("rooms")).stream().filter(r->r.get("code").equals("ROOM-30")).findFirst().orElseThrow().get("id")).longValue();
        long overlap=service.saveSession(null,Map.of("name","Overlap","date","2026-11-07","start","11:00","end","12:00"));
        expectProblem(409,()->service.selectRooms(overlap,List.of(Map.of("roomId",room,"excluded",List.of()))),"Overlap rejected");
        long adjacent=service.saveSession(null,Map.of("name","Adjacent","date","2026-11-07","start","12:00","end","13:00"));
        service.selectRooms(adjacent,List.of(Map.of("roomId",room,"excluded",List.of())));assertions++;
        service.selectRooms(session,List.of());expectProblem(409,()->service.selectRooms(overlap,List.of(Map.of("roomId",room,"excluded",List.of()))),"Published room remains reserved after working deselection");
        service.withdraw(session);expectProblem(404,()->service.lookup(session,"0001"),"Withdrawn hidden");
        service.selectRooms(overlap,List.of(Map.of("roomId",room,"excluded",List.of())));assertions++;
        // Actual concurrent writers: one room selection succeeds, the other rechecks after lock.
        long first=service.saveSession(null,Map.of("name","Race A","date","2026-11-08","start","09:00","end","10:00"));
        long second=service.saveSession(null,Map.of("name","Race B","date","2026-11-08","start","09:00","end","10:00"));
        ExecutorService pool=Executors.newFixedThreadPool(2);CountDownLatch latch=new CountDownLatch(1);
        List<Future<Boolean>> attempts=new ArrayList<>();for(long target:List.of(first,second)) attempts.add(pool.submit(()->{latch.await();try{service.selectRooms(target,List.of(Map.of("roomId",room,"excluded",List.of())));return true;}catch(Problem p){if(p.status!=409)throw p;return false;}}));
        latch.countDown();int success=0;for(Future<Boolean> attempt:attempts)if(attempt.get(20,TimeUnit.SECONDS))success++;pool.shutdown();check(success==1,"Concurrent reservations: exactly one succeeds");
        System.out.println("PASS real H2/JDBC: restricted reader, draft hiding, publication/replacement/retry, injected rollback, stale draft, history, atomic CSV, overlap/back-to-back, published-room hold, withdrawal and two-thread contention.");
    }
    @SuppressWarnings("unchecked") private static void irregularPersistence() throws Exception {
        Database db=new Database(Path.of("tmp","irregular-tests-"+UUID.randomUUID()));PlannerService service=new PlannerService(db,false);
        long session=service.saveSession(null,Map.of("name","Uneven rows test","date","2026-11-21","start","09:00","end","12:00"));
        List<Object> students=new ArrayList<>();
        for(int i=1;i<=9;i++) students.add(service.saveStudent(null,Map.of("roll",String.format("%04d",i),"name","Fictional "+i,"year",2,"branch",i<=6?"AI_ML":"CSE","section","A")));
        service.roster(session,students);
        long room=service.saveRoom(null,Map.of("code","UNEVEN","rows",3,"rowBenchCounts",List.of(7,5,6),"excluded",List.of("1:7")));
        Map<String,Object> master=((List<Map<String,Object>>)service.state().get("rooms")).getFirst();
        check(master.get("rowBenchCounts").equals(List.of(7,5,6)),"SQL round trip preserves row counts");
        expectProblem(400,()->service.saveRoom(null,Map.of("code","WRONG","rows",3,"rowBenchCounts",List.of(7,5))),"Every row needs a count");
        expectProblem(400,()->service.saveRoom(null,Map.of("code","WRONG","rows",2,"rowBenchCounts",List.of(7,0))),"Empty physical row rejected");
        expectProblem(400,()->service.saveRoom(null,Map.of("code","WRONG","rows",2,"rowBenchCounts",List.of(7,5),"excluded",List.of("2:6"))),"Cannot exclude beyond a shorter row");
        expectProblem(400,()->service.selectRooms(session,List.of(Map.of("roomId",room,"excluded",List.of("2:6")))),"Session exclusion must fit its actual row");
        service.selectRooms(session,List.of(Map.of("roomId",room,"excluded",List.of("2:5"))));
        Input input=db.read(c -> service.input(c,session));check(allocator.capacity(input).usableBenches()==16,"SQL-backed ragged capacity counts actual positions");
        long plan=service.generate(session);service.publish(plan,false);
        List<Map<String,Object>> publicLayout=(List<Map<String,Object>>)service.lookup(session,"0001").get("roomLayout");
        check(publicLayout.size()==18&&publicLayout.stream().filter(p->Boolean.FALSE.equals(p.get("usable"))).count()==2,"Public uneven map includes actual snapshot positions and both exclusions");
        check(publicLayout.stream().noneMatch(p->((Number)p.get("row")).intValue()==2&&((Number)p.get("bench")).intValue()>5),"Public map omits phantom benches");
        check(db.read(c -> ((Number)one(c,"SELECT COUNT(*) AS n FROM plan_benches WHERE plan_id=?",plan).get("n")).intValue())==18,"Snapshot contains 18 actual positions, not 21 rectangular ones");
        List<Seat> invalid=new ArrayList<>(allocator.allocate(input));Seat first=invalid.getFirst();invalid.set(0,new Seat(first.studentId(),room,2,6,"A"));
        check(!validator.validate(input,invalid,session).isEmpty(),"Independent validator rejects phantom positions in short rows");
        long draft=service.generate(session);
        expectProblem(409,()->service.saveRoom(room,Map.of("code","UNEVEN","rows",3,"rowBenchCounts",List.of(7,4,6),"excluded",List.of("1:7"))),"Cannot strand saved session exclusion during row shortening");
        service.selectRooms(session,List.of(Map.of("roomId",room,"excluded",List.of())));
        service.saveRoom(room,Map.of("code","UNEVEN","rows",3,"rowBenchCounts",List.of(7,4,6),"excluded",List.of("1:7")));
        expectProblem(409,()->service.publish(draft,false),"Layout changes invalidate drafts");
        Input old=Json.MAPPER.convertValue(service.plan(plan).get("input"),Input.class);
        check(old.rooms().getFirst().rowBenchCounts().equals(List.of(7,5,6)),"Published uneven layout remains unchanged after master edit");
        check(service.lookup(session,"0001").get("roll").equals("0001"),"Historical publication remains searchable after layout edit");
        check(((List<?>)service.lookup(session,"0001").get("roomLayout")).size()==18,"Public map keeps published geometry after master changes");
        System.out.println("PASS uneven rows: 7/5/6 geometry, SQL/snapshot persistence, actual capacity, invalid exclusions/phantom seats, guarded resizing, stale drafts and historical lookup.");
    }
    private static void readyDemo() throws Exception {
        PlannerService demo=new PlannerService(new Database(Path.of("tmp","ready-demo-"+UUID.randomUUID()),true),false);
        long session=demo.publishedDemo();
        check(demo.publicSessions().size()==1,"Fresh demo has a published sitting immediately");
        check(demo.lookup(session,"0001").get("seat_label").equals("A"),"Fresh demo student 0001 can immediately find seat A");
        check(demo.lookup(session,"0031").get("seat_label").equals("B"),"Fresh demo student 0031 can immediately find seat B");
        demo.withdraw(session);expectProblem(404,()->demo.lookup(session,"0001"),"Withdrawal still hides even a seeded demo publication");
        System.out.println("PASS demo readiness: published example, immediate A/B lookup, explicit withdrawal.");
    }
    public static void main(String[] args) throws Exception {
        allocation();validation();database();irregularPersistence();readyDemo();System.out.println("ALL JAVA CHECKS PASSED: "+assertions+" assertions; "+oracleCases+" exhaustive group-count cases.");
    }
}
