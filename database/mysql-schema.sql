-- Optional MySQL 8.x schema. NOT executed in this environment.
-- Create/use a dedicated database first; run once as its administrator.
-- Historical snapshots remain separate from mutable master data.
CREATE TABLE IF NOT EXISTS coordinator_guard (id INT PRIMARY KEY);
INSERT IGNORE INTO coordinator_guard(id) VALUES(1);
CREATE TABLE IF NOT EXISTS branches (code VARCHAR(20) PRIMARY KEY, label VARCHAR(80) NOT NULL);
INSERT IGNORE INTO branches(code,label) VALUES ('AI_ML','Artificial Intelligence & Machine Learning'),('CSE','Computer Science'),('ECE','Electronics & Communication'),('EEE','Electrical & Electronics'),('MECH','Mechanical'),('CIVIL','Civil'),('IT','Information Technology'),('CSE_DS','Computer Science - Data Science');
CREATE TABLE IF NOT EXISTS students (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 roll VARCHAR(40) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL,
 study_year INT NOT NULL CHECK(study_year BETWEEN 1 AND 4),
 branch VARCHAR(20) NOT NULL REFERENCES branches(code), section VARCHAR(20) NOT NULL DEFAULT '', revision INT NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS rooms (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, code VARCHAR(30) NOT NULL UNIQUE,
 row_count INT NOT NULL CHECK(row_count BETWEEN 1 AND 30), benches_per_row INT NOT NULL CHECK(benches_per_row BETWEEN 1 AND 30), revision INT NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS room_benches (
 room_id BIGINT NOT NULL REFERENCES rooms(id), row_no INT NOT NULL, bench_no INT NOT NULL, usable BOOLEAN NOT NULL,
 PRIMARY KEY(room_id,row_no,bench_no)
);
CREATE TABLE IF NOT EXISTS exam_sessions (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(120) NOT NULL,
 exam_date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
 revision INT NOT NULL DEFAULT 1, current_plan_id BIGINT, CHECK(start_time < end_time)
);
CREATE TABLE IF NOT EXISTS session_roster (
 session_id BIGINT NOT NULL REFERENCES exam_sessions(id), student_id BIGINT NOT NULL REFERENCES students(id), PRIMARY KEY(session_id,student_id)
);
CREATE TABLE IF NOT EXISTS session_rooms (
 session_id BIGINT NOT NULL REFERENCES exam_sessions(id), room_id BIGINT NOT NULL REFERENCES rooms(id), PRIMARY KEY(session_id,room_id)
);
CREATE TABLE IF NOT EXISTS session_exclusions (
 session_id BIGINT NOT NULL, room_id BIGINT NOT NULL, row_no INT NOT NULL, bench_no INT NOT NULL,
 PRIMARY KEY(session_id,room_id,row_no,bench_no), FOREIGN KEY(session_id,room_id) REFERENCES session_rooms(session_id,room_id)
);
CREATE TABLE IF NOT EXISTS plans (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, session_id BIGINT NOT NULL REFERENCES exam_sessions(id),
 version_no INT NOT NULL, status VARCHAR(20) NOT NULL CHECK(status IN ('DRAFT','PUBLISHED','SUPERSEDED','WITHDRAWN','DISCARDED')),
 fingerprint VARCHAR(64) NOT NULL, snapshot LONGTEXT NOT NULL, created_at VARCHAR(40) NOT NULL, published_at VARCHAR(40),
 UNIQUE(session_id,version_no), UNIQUE(session_id,id)
);
ALTER TABLE exam_sessions ADD CONSTRAINT fk_current_plan FOREIGN KEY(id,current_plan_id) REFERENCES plans(session_id,id);
CREATE TABLE IF NOT EXISTS plan_students (
 plan_id BIGINT NOT NULL REFERENCES plans(id), student_id BIGINT NOT NULL, roll VARCHAR(40) NOT NULL, name VARCHAR(120) NOT NULL,
 study_year INT NOT NULL, branch VARCHAR(20) NOT NULL, section VARCHAR(20) NOT NULL,
 PRIMARY KEY(plan_id,student_id), UNIQUE(plan_id,roll)
);
CREATE TABLE IF NOT EXISTS plan_rooms (
 plan_id BIGINT NOT NULL REFERENCES plans(id), room_id BIGINT NOT NULL, code VARCHAR(30) NOT NULL,
 row_count INT NOT NULL, benches_per_row INT NOT NULL, PRIMARY KEY(plan_id,room_id)
);
CREATE TABLE IF NOT EXISTS plan_benches (
 plan_id BIGINT NOT NULL, room_id BIGINT NOT NULL, row_no INT NOT NULL, bench_no INT NOT NULL, usable BOOLEAN NOT NULL,
 PRIMARY KEY(plan_id,room_id,row_no,bench_no), FOREIGN KEY(plan_id,room_id) REFERENCES plan_rooms(plan_id,room_id)
);
CREATE TABLE IF NOT EXISTS assignments (
 plan_id BIGINT NOT NULL, student_id BIGINT NOT NULL, room_id BIGINT NOT NULL, row_no INT NOT NULL, bench_no INT NOT NULL,
 seat_label CHAR(1) NOT NULL CHECK(seat_label IN ('A','B')),
 PRIMARY KEY(plan_id,student_id), UNIQUE(plan_id,room_id,row_no,bench_no,seat_label),
 FOREIGN KEY(plan_id,student_id) REFERENCES plan_students(plan_id,student_id),
 FOREIGN KEY(plan_id,room_id,row_no,bench_no) REFERENCES plan_benches(plan_id,room_id,row_no,bench_no)
);
CREATE TABLE IF NOT EXISTS audit_events (
 id BIGINT AUTO_INCREMENT PRIMARY KEY, occurred_at VARCHAR(40) NOT NULL,
 action VARCHAR(40) NOT NULL, detail VARCHAR(500) NOT NULL
);
CREATE OR REPLACE VIEW published_assignments AS
 SELECT s.id AS session_id, s.name AS session_name, s.exam_date, s.start_time, s.end_time,
 p.id AS plan_id,p.version_no,p.published_at,ps.roll,pr.code AS room_code,
 a.row_no,a.bench_no,a.seat_label
 FROM exam_sessions s JOIN plans p ON p.id=s.current_plan_id AND p.session_id=s.id AND p.status='PUBLISHED'
 JOIN assignments a ON a.plan_id=p.id JOIN plan_students ps ON ps.plan_id=a.plan_id AND ps.student_id=a.student_id
 JOIN plan_rooms pr ON pr.plan_id=a.plan_id AND pr.room_id=a.room_id;
CREATE OR REPLACE VIEW published_sessions AS
 SELECT s.id,s.name,s.exam_date,s.start_time,s.end_time,p.version_no,p.published_at
 FROM exam_sessions s JOIN plans p ON p.id=s.current_plan_id AND p.session_id=s.id AND p.status='PUBLISHED';
CREATE OR REPLACE VIEW published_room_benches AS
 SELECT p.id AS plan_id,pr.code AS room_code,pb.row_no AS layout_row,pb.bench_no AS layout_bench,pb.usable AS layout_usable
 FROM exam_sessions s JOIN plans p ON p.id=s.current_plan_id AND p.session_id=s.id AND p.status='PUBLISHED'
 JOIN plan_rooms pr ON pr.plan_id=p.id JOIN plan_benches pb ON pb.plan_id=pr.plan_id AND pb.room_id=pr.room_id;
