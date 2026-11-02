# Optional MySQL configuration — not executed here

H2 2.4.240 is the working and tested database. MySQL JDBC support and a separate schema are supplied for a teacher-required MySQL environment; it must pass integration checks before being called verified.

1. Install the teacher's accepted MySQL 8.x version and create a dedicated `exam_planner` database.
2. Run `database/mysql-schema.sql` once as its administrator. Do not apply the H2 script.
3. Create separate coordinator and reader accounts with strong passwords. Grant coordinator SELECT/INSERT/UPDATE/DELETE on application tables. Grant the reader SELECT only on `published_assignments`, `published_sessions` and `published_room_benches`. Use a scoped view definer able to read the underlying tables.
4. Download the connector, then configure your own server-side credentials:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup.ps1 -MySql
$env:PLANNER_DB_URL = 'jdbc:mysql://127.0.0.1:3306/exam_planner'
$env:PLANNER_DB_USER = 'planner_coordinator'
$env:PLANNER_DB_PASSWORD = '<your coordinator password>'
$env:PLANNER_READER_USER = 'planner_reader'
$env:PLANNER_READER_PASSWORD = '<your reader password>'
npm start
```

The application checks an externally provisioned schema; it does not automatically create MySQL users or migrate it. Credentials are never browser values. Node still forwards to Java; Java opens the restricted lookup connection.

Review SQL modes, schema/index compatibility and grants on the actual version. H2 Java-alias procedures, triggers and ResultSet cursor examples are not MySQL stored programs. The current executable integration suite targets H2, so its passing result does not establish MySQL compatibility.
