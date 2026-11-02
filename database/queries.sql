-- H2 application data is private; execute these against an isolated lab copy.
-- JOIN: roster identity and grouping attributes.
SELECT s.name,st.roll,st.name,st.study_year,st.branch FROM exam_sessions s
JOIN session_roster sr ON sr.session_id=s.id JOIN students st ON st.id=sr.student_id ORDER BY s.id,st.roll;
-- Nested and correlated subquery: sessions with no current publication.
SELECT s.id,s.name FROM exam_sessions s WHERE NOT EXISTS(SELECT 1 FROM plans p WHERE p.id=s.current_plan_id AND p.status='PUBLISHED');
-- Aggregate, GROUP BY, HAVING.
SELECT study_year,branch,COUNT(*) AS students FROM students GROUP BY study_year,branch HAVING COUNT(*)>1;
-- UNION and INTERSECT operate on text roll numbers.
SELECT roll FROM students WHERE study_year=1 UNION SELECT roll FROM students WHERE branch='CSE';
SELECT roll FROM students WHERE study_year=2 INTERSECT SELECT roll FROM students WHERE branch='AI_ML';
-- ANY and ALL: group sizes compared to other group sizes.
SELECT branch,COUNT(*) AS n FROM students GROUP BY branch HAVING COUNT(*)>=ALL(SELECT COUNT(*) FROM students GROUP BY branch);
SELECT roll FROM students WHERE study_year=ANY(SELECT study_year FROM students WHERE branch='CSE');
-- Current-publication view contains neither drafts nor historical assignments.
SELECT * FROM published_assignments ORDER BY session_id,room_code,row_no,bench_no,seat_label;
-- DML examples: use explicit rollback to preserve the isolated fixture.
START TRANSACTION;
INSERT INTO students(roll,name,study_year,branch,section) VALUES('LAB001','Fictional SQL Record',2,'CSE','A');
UPDATE students SET section='B',revision=revision+1 WHERE roll='LAB001';
DELETE FROM students WHERE roll='LAB001';
ROLLBACK;
