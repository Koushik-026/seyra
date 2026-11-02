package planner;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;

public final class Json {
    private Json() {}
    public static final ObjectMapper MAPPER = new ObjectMapper();
    public static String write(Object value) {
        try { return MAPPER.writeValueAsString(value); }
        catch (Exception e) { throw new IllegalStateException("Could not encode JSON", e); }
    }
    public static Map<String,Object> object(String value) {
        try { return MAPPER.readValue(value, new TypeReference<Map<String,Object>>() {}); }
        catch (Exception e) { throw new Domain.Problem(400, "Invalid JSON request."); }
    }
    public static <T> T read(String value, Class<T> type) {
        try { return MAPPER.readValue(value, type); }
        catch (Exception e) { throw new IllegalStateException("Invalid stored snapshot", e); }
    }
}
