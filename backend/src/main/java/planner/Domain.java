package planner;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Immutable domain snapshots: the allocator has no database or UI dependencies. */
public final class Domain {
    private Domain() {}
    public record Student(long id, String roll, String name, int year, String branch,
                          String section, int revision) {
        public String group() { return year + ":" + branch; }
    }
    public record Room(long id, String code, int rows, int benchesPerRow,
                       int revision, List<String> excluded, List<Integer> rowBenchCounts) {
        public Room {
            excluded = List.copyOf(excluded);
            // Older rectangular snapshots have no rowBenchCounts field. Preserve their geometry.
            rowBenchCounts = rowBenchCounts == null || rowBenchCounts.isEmpty()
                    ? Collections.nCopies(rows, benchesPerRow) : List.copyOf(rowBenchCounts);
            if (rowBenchCounts.size()!=rows || rowBenchCounts.stream().anyMatch(n -> n==null || n<1)
                    || rowBenchCounts.stream().mapToInt(Integer::intValue).max().orElse(0)!=benchesPerRow)
                throw new IllegalArgumentException("Room row counts must match its geometry.");
        }
        public Room(long id,String code,int rows,int benchesPerRow,int revision,List<String> excluded) {
            this(id,code,rows,benchesPerRow,revision,excluded,null);
        }
        public int benchesInRow(int row) { return row>=1 && row<=rows ? rowBenchCounts.get(row-1) : 0; }
        public int totalBenches() { return rowBenchCounts.stream().mapToInt(Integer::intValue).sum(); }
        public boolean usable(int row, int bench) {
            return row >= 1 && row <= rows && bench >= 1 && bench <= benchesInRow(row)
                    && !excluded.contains(row + ":" + bench);
        }
    }
    public record Input(long sessionId, int revision, String sessionName, String date,
                        String start, String end, List<Student> students, List<Room> rooms) {
        public Input { students = List.copyOf(students); rooms = List.copyOf(rooms); }
    }
    public record Seat(long studentId, long roomId, int row, int bench, String seat) {}
    public record Capacity(int students, int largestGroup, int usableBenches,
                           int physicalSeats, int requiredBenches, int shortage, int pairs, int singles) {}

    public static String roll(String value) {
        String r = Objects.requireNonNullElse(value, "").strip().toUpperCase(Locale.ROOT);
        if (!r.matches("[A-Z0-9][A-Z0-9_-]{0,39}"))
            throw new Problem(400, "Roll number must contain 1-40 letters, digits, hyphens or underscores, without spaces.");
        return r;
    }
    public static String branch(String value) {
        String b = Objects.requireNonNullElse(value, "").strip().toUpperCase(Locale.ROOT);
        return switch (b) {
            case "AI-ML", "AI & ML", "AIML", "AI ML", "AI_ML" -> "AI_ML";
            case "CSE", "ECE", "EEE", "MECH", "CIVIL", "IT", "CSE_DS" -> b;
            default -> throw new Problem(400, "Unknown branch. Choose a supported branch code.");
        };
    }
    public static String text(String value, String label, int max) {
        String s = Objects.requireNonNullElse(value, "").strip();
        if (s.isEmpty() || s.length() > max || s.chars().anyMatch(Character::isISOControl))
            throw new Problem(400, label + " is required, must be at most " + max + " characters and contain no control characters.");
        return s;
    }
    public static String hash(Input input) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(Json.write(input).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) { throw new IllegalStateException(e); }
    }
    public static final class Problem extends RuntimeException {
        public final int status;
        public Problem(int status, String message) { super(message); this.status = status; }
    }
}
