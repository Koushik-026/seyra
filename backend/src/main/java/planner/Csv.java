package planner;

import java.util.*;

/** Strict RFC-style quoted fields, including commas, newlines and escaped quotes. */
public final class Csv {
    private Csv() {}
    public static List<List<String>> parse(String source) {
        if(source==null || source.length()>2_000_000) throw new Domain.Problem(400,"CSV is empty or exceeds 2 MB.");
        String text=source.startsWith("\uFEFF")?source.substring(1):source;
        List<List<String>> rows=new ArrayList<>(); List<String> row=new ArrayList<>();
        StringBuilder field=new StringBuilder(); boolean quoted=false,closed=false;
        for(int i=0;i<text.length();i++) {
            char ch=text.charAt(i);
            if(quoted) {
                if(ch=='"') {
                    if(i+1<text.length() && text.charAt(i+1)=='"') {field.append('"');i++;}
                    else {quoted=false;closed=true;}
                } else field.append(ch);
            } else if(ch=='"') {
                if(!field.isEmpty() || closed) throw new Domain.Problem(400,"Unexpected quote in CSV record " +(rows.size()+1));
                quoted=true;
            } else if(ch==',' || ch=='\n' || ch=='\r') {
                row.add(field.toString());field.setLength(0);closed=false;
                if(ch!=',') {
                    if(ch=='\r' && i+1<text.length() && text.charAt(i+1)=='\n') i++;
                    if(!(row.size()==1 && row.getFirst().isBlank())) rows.add(List.copyOf(row));
                    row.clear();
                }
            } else {
                if(closed) throw new Domain.Problem(400,"Characters after a quoted field in CSV record " +(rows.size()+1));
                field.append(ch);
            }
        }
        if(quoted) throw new Domain.Problem(400,"Unclosed quoted CSV field.");
        if(!field.isEmpty() || !row.isEmpty() || closed) {row.add(field.toString());rows.add(List.copyOf(row));}
        if(rows.size()>10001) throw new Domain.Problem(400,"Import at most 10,000 students at a time.");
        return rows;
    }
}
