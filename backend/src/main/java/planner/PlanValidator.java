package planner;

import java.util.*;
import static planner.Domain.*;

/** Validates actual placements; it does not invoke or reproduce the greedy allocator. */
public final class PlanValidator {
    public List<String> validate(Input input, List<Seat> seats, long sessionId) {
        List<String> errors=new ArrayList<>();
        if (input.sessionId()!=sessionId) errors.add("Wrong session for this plan snapshot.");
        if (input.students().isEmpty()) errors.add("Empty roster cannot be published.");
        Map<Long,Student> students=new HashMap<>();
        for (Student s : input.students()) if (students.put(s.id(),s)!=null) errors.add("Duplicate roster student.");
        Map<Long,Room> rooms=new HashMap<>(); input.rooms().forEach(r -> rooms.put(r.id(),r));
        Set<Long> seen=new HashSet<>(); Set<String> positions=new HashSet<>();
        Map<String,List<Student>> benches=new HashMap<>();
        for (Seat s : seats) {
            Student student=students.get(s.studentId());
            if (student==null) errors.add("Student outside roster: " + s.studentId());
            if (!seen.add(s.studentId())) errors.add("Student assigned more than once: " + s.studentId());
            Room room=rooms.get(s.roomId());
            if (room==null || !room.usable(s.row(),s.bench())) errors.add("Unselected, excluded or invalid bench.");
            if (!Set.of("A","B").contains(s.seat())) errors.add("Invalid seat label.");
            String key=s.roomId()+":"+s.row()+":"+s.bench();
            if (!positions.add(key+":"+s.seat())) errors.add("Seat occupied more than once.");
            List<Student> occupants=benches.computeIfAbsent(key,k -> new ArrayList<>());
            occupants.add(student);
        }
        if (!seen.equals(students.keySet())) errors.add("Assigned students do not exactly match the roster.");
        for (List<Student> occupants : benches.values()) {
            if (occupants.size()>2) errors.add("More than two students on a bench.");
            if (occupants.size()==2 && occupants.get(0)!=null && occupants.get(1)!=null
                    && occupants.get(0).year()==occupants.get(1).year()
                    && occupants.get(0).branch().equals(occupants.get(1).branch()))
                errors.add("Same year and branch cannot share a bench (section does not override this).");
        }
        return List.copyOf(errors);
    }
    public void requireValid(Input input,List<Seat> seats,long sessionId) {
        List<String> failures=validate(input,seats,sessionId);
        if (!failures.isEmpty()) throw new Problem(409,"Plan validation failed: " + String.join(" ",failures));
    }
}
