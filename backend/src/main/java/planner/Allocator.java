package planner;

import java.util.*;
import static planner.Domain.*;

public final class Allocator {
    private static final class Group {
        final int year; final String branch; final ArrayDeque<Student> students;
        Group(List<Student> list) {
            year = list.getFirst().year(); branch = list.getFirst().branch();
            students = new ArrayDeque<>(list.stream().sorted(Comparator.comparing(Student::roll)).toList());
        }
    }
    public Capacity capacity(Input input) {
        Map<String,Integer> counts = new HashMap<>();
        input.students().forEach(s -> counts.merge(s.group(), 1, Integer::sum));
        int n = input.students().size(), m = counts.values().stream().mapToInt(i -> i).max().orElse(0);
        int b = input.rooms().stream().mapToInt(r -> {
            int usable = 0;
            for (int row=1; row<=r.rows(); row++) for (int bench=1; bench<=r.benchesInRow(row); bench++)
                if (r.usable(row,bench)) usable++;
            return usable;
        }).sum();
        int required = Math.max((n+1)/2,m), pairs = n-required;
        return new Capacity(n,m,b,2*b,required,Math.max(0,required-b),pairs,n-2*pairs);
    }
    public List<Seat> allocate(Input input) {
        Capacity c = capacity(input);
        if (c.students()==0) throw new Problem(400,"The session roster is empty. Add students before generating a plan.");
        if (input.rooms().isEmpty()) throw new Problem(400,"Select at least one room.");
        if (c.shortage()>0) throw new Problem(409,"Insufficient capacity: need " + c.requiredBenches()
                + " benches; available " + c.usableBenches() + ". Shortage: " + c.shortage() + " benches.");
        Map<String,List<Student>> grouped = new HashMap<>();
        input.students().forEach(s -> grouped.computeIfAbsent(s.group(), k -> new ArrayList<>()).add(s));
        PriorityQueue<Group> heap = new PriorityQueue<>(Comparator
                .comparingInt((Group g) -> g.students.size()).reversed()
                .thenComparingInt(g -> g.year).thenComparing(g -> g.branch));
        grouped.values().forEach(list -> heap.add(new Group(list)));
        List<List<Student>> units = new ArrayList<>();
        while (heap.size()>1) {
            // Remove entries before changing the counts used as heap priorities.
            Group a=heap.remove(), b=heap.remove();
            units.add(List.of(a.students.removeFirst(),b.students.removeFirst()));
            if (!a.students.isEmpty()) heap.add(a);
            if (!b.students.isEmpty()) heap.add(b);
        }
        if (!heap.isEmpty()) for (Student s : heap.remove().students) units.add(List.of(s));
        List<Seat> seats = new ArrayList<>(); int index=0;
        outer: for (Room r : input.rooms().stream().sorted(Comparator.comparing(Room::code)).toList())
            for (int row=1; row<=r.rows(); row++) for (int bench=1; bench<=r.benchesInRow(row); bench++) {
                if (!r.usable(row,bench)) continue;
                if (index==units.size()) break outer;
                List<Student> unit=units.get(index++);
                seats.add(new Seat(unit.getFirst().id(),r.id(),row,bench,"A"));
                if (unit.size()==2) seats.add(new Seat(unit.get(1).id(),r.id(),row,bench,"B"));
            }
        if (index!=units.size()) throw new IllegalStateException("Allocator did not map every bench unit");
        return List.copyOf(seats);
    }
}
