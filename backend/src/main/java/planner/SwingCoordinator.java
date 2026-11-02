package planner;

import javax.swing.*;
import javax.swing.table.DefaultTableModel;
import java.awt.*;
import java.net.*;
import java.net.http.*;
import java.util.*;
import java.util.List;

/** Optional desktop coordinator client: all writes still go through the Java HTTP service. */
public final class SwingCoordinator extends JFrame {
    private final JComboBox<String> sessions=new JComboBox<>();
    private final List<Long> sessionIds=new ArrayList<>();
    private final DefaultTableModel table=new DefaultTableModel(new String[]{"Roll","Name","Year","Branch","Room","Row","Bench","Seat"},0) {
        @Override public boolean isCellEditable(int row,int col) {return false;}
    };
    private final JTextArea status=new JTextArea(5,40);
    private final String base=System.getenv().getOrDefault("PLANNER_WEB_URL","http://127.0.0.1:3000");
    private final List<JButton> buttons=new ArrayList<>();
    private long draft=0;
    public SwingCoordinator() {
        super("Exam Hall Seating Planner — Java Swing Coordinator");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);setSize(1050,650);setLocationByPlatform(true);
        JPanel top=new JPanel(new FlowLayout(FlowLayout.LEFT));top.add(new JLabel("Session:"));top.add(sessions);
        addButton(top,"Refresh",this::refresh);addButton(top,"Generate draft",this::generate);addButton(top,"Publish reviewed draft",this::publish);
        addButton(top,"Open full coordinator",()->{try{Desktop.getDesktop().browse(URI.create(base));}catch(Exception e){status.setText(e.getMessage());}});
        status.setEditable(false);status.setLineWrap(true);status.setWrapStyleWord(true);
        add(top,BorderLayout.NORTH);add(new JScrollPane(new JTable(table)),BorderLayout.CENTER);add(new JScrollPane(status),BorderLayout.SOUTH);
        refresh();
    }
    private void addButton(JPanel panel,String name,Runnable action) {JButton b=new JButton(name);b.addActionListener(e->action.run());buttons.add(b);panel.add(b);}
    private Map<String,Object> request(String path,boolean post) throws Exception {
        HttpRequest.Builder builder=HttpRequest.newBuilder(URI.create(base+"/api/admin/"+path)).timeout(java.time.Duration.ofSeconds(30));
        if(post) builder.header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString("{}"));
        HttpResponse<String> response=HttpClient.newHttpClient().send(builder.build(),HttpResponse.BodyHandlers.ofString());
        Map<String,Object> data=Json.object(response.body());if(response.statusCode()>=400)throw new Exception(Objects.toString(data.get("error")));return data;
    }
    @FunctionalInterface private interface Job {Map<String,Object> run() throws Exception;}
    private void background(Job job,java.util.function.Consumer<Map<String,Object>> done) {
        buttons.forEach(b->b.setEnabled(false));sessions.setEnabled(false);status.setText("Working in the background…");
        new SwingWorker<Map<String,Object>,Void>() {
            @Override protected Map<String,Object> doInBackground() throws Exception {return job.run();}
            @Override protected void done() {
                try {done.accept(get());}catch(Exception e){status.setText("Operation failed: "+(e.getCause()==null?e.getMessage():e.getCause().getMessage()));}
                finally {buttons.forEach(b->b.setEnabled(true));sessions.setEnabled(true);}
            }
        }.execute();
    }
    @SuppressWarnings("unchecked") private void refresh() {
        background(()->request("state",false),data->{sessions.removeAllItems();sessionIds.clear();draft=0;table.setRowCount(0);
            for(Map<String,Object> s:(List<Map<String,Object>>)data.get("sessions")){sessionIds.add(((Number)s.get("id")).longValue());sessions.addItem(s.get("name")+" · "+s.get("exam_date"));}
            status.setText("Connected to the Java backend through the Node entry point. Select a session, then generate a draft. Student/room management and printing are available in the full coordinator.");});
    }
    private long selected() {if(sessions.getSelectedIndex()<0)throw new Domain.Problem(400,"Create a session in the full coordinator first.");return sessionIds.get(sessions.getSelectedIndex());}
    @SuppressWarnings("unchecked") private void generate() {
        long session;try{session=selected();}catch(Exception e){status.setText(e.getMessage());return;}
        background(()->{Map<String,Object> result=request("sessions/"+session+"/generate",true);return request("plans/"+result.get("id"),false);},plan->{
            draft=((Number)plan.get("id")).longValue();table.setRowCount(0);
            Domain.Input input=Json.MAPPER.convertValue(plan.get("input"),Domain.Input.class);
            Map<Long,Domain.Student> students=new HashMap<>();input.students().forEach(s->students.put(s.id(),s));
            Map<Long,String> rooms=new HashMap<>();input.rooms().forEach(r->rooms.put(r.id(),r.code()));
            for(Map<String,Object> a:(List<Map<String,Object>>)plan.get("assignments")){Domain.Student s=students.get(((Number)a.get("studentId")).longValue());table.addRow(new Object[]{s.roll(),s.name(),s.year(),s.branch(),rooms.get(((Number)a.get("roomId")).longValue()),a.get("row"),a.get("bench"),a.get("seat")});}
            status.setText("Private draft v"+plan.get("version_no")+" generated and independently validated. Review this table before explicitly publishing. No student portal data changed.");
        });
    }
    private void publish() {
        if(draft==0){status.setText("Generate and review a draft first.");return;}
        if(JOptionPane.showConfirmDialog(this,"Publish this reviewed draft and replace the current plan?","Explicit publication",JOptionPane.YES_NO_OPTION)!=JOptionPane.YES_OPTION)return;
        background(()->request("plans/"+draft+"/publish",true),result->status.setText("Published successfully. Student lookup now uses this complete version."));
    }
    public static void main(String[] args) {SwingUtilities.invokeLater(()->new SwingCoordinator().setVisible(true));}
}
