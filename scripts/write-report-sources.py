"""Maintain anonymous subject reports. Personalized front matter is added separately."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INTRO = """Seyra is a working exam hall seating planner. A coordinator saves an exam session, its student roster and the rooms available for that sitting. Java generates a private draft, checks every placement and publishes a reviewed version. Students look up their roll number and see the exact A or B seat highlighted in the published room layout.

The problem is more specific than placing names in a rectangular grid. Two students may share a bench only when their years differ or their branches differ. Different sections alone do not make a pair eligible. A room may have seven benches in one row and five in another. Missing or damaged positions must not silently reappear, and an edited roster must not change an already published historical plan.

The completed system uses Java 21 for business rules and JDBC, H2 for the tested SQL database, a Node.js HTTP server for pages and API forwarding, and plain HTML, CSS and JavaScript for the browser interface. The hosted Render service exposes a shared fictional demonstration. Its temporary database resets on restart; the local workspace stores its own records separately.
"""
EXISTING = """A manual spreadsheet approach asks the coordinator to compare student groups, calculate capacity, place names, check duplicates and distribute a final list. This is the reference workflow being improved, not a measured study of a particular college's existing software.

Counting empty seats alone is insufficient. Consider 30 second-year AI_ML students and 10 second-year CSE students. There are 40 students, but the first group needs 30 separate benches. Twenty-four benches provide 48 physical seats and still fall six benches short under the sharing rule. A spreadsheet that divides the roster by two can therefore approve an impossible arrangement.

Copying a spreadsheet after each edit also makes the current publication unclear. A student may receive an older copy while the coordinator has a newer draft. Room changes can erase the layout associated with a previous sitting. Seyra addresses these problems through explicit publication, immutable plan snapshots and a student view tied to one current version.
"""
PROPOSED = """The coordinator follows five visible stages: save the session time, choose the student roster, select and configure rooms, generate and review a draft, then publish it. The interface explains what is missing before the next action. Unsaved form changes must be saved before generation so that the draft corresponds to stored inputs.

Each usable bench has positions A and B. The room editor accepts the actual bench count for every row; for example, 7, 5, 6 means three rows with those respective counts. It is not a 7:5:6 scale or screen aspect ratio. Whole benches can be excluded by room default or for a particular session. The map preserves their coordinates so a later bench is not renumbered into a damaged position.

The allocator groups students by year and branch, pairs eligible groups and allows single occupancy. A separate validator checks the resulting placements. Generated plans remain DRAFT until the coordinator explicitly publishes them. Publication checks current inputs and room conflicts again, then replaces the previous publication atomically. Students receive only the current published assignment and their assigned room geometry.

The scope is a small coordinator-managed examination workflow. The current rule concerns bench sharing; it does not promise separation between adjacent benches, optimal walking distance, accessible-seat placement or invigilation staffing. Those would require additional requirements and a different feasibility model.
"""
REQUIREMENTS = """### Software used

| Component | Tested configuration | Purpose |
| --- | --- | --- |
| Java | Temurin JDK 21.0.13+9 | HTTP API, allocation, validation, JDBC and optional Swing client |
| Node.js | 24.20.0; project engine accepts 20 or later | Static pages, API proxy and development scripts |
| Database | H2 2.4.240 | File persistence, SQL constraints, views and transactions |
| JSON | Jackson 2.18.3 | Java request and snapshot serialization |
| Browser | Chrome on Windows | Coordinator, student and print-preview checks |
| Hosting | Render free Docker web service | Fictional shared HTTPS demonstration |

### Hardware and installation

Development and testing used a Windows laptop. No measured minimum CPU, memory requirement or maximum supported workload is claimed. A laptop able to run Java 21, Node.js and a modern browser is sufficient to reproduce the recorded small synthetic examples. A network connection is needed to download libraries and use the hosted demonstration; the local application uses loopback HTTP.

Install Java 21 and Node.js, run `node scripts/download-libraries.mjs`, then `npm test` and `npm start` from the project directory. Open `http://127.0.0.1:3000`. The practice workspace is `/demo`. The Dockerfile builds the same application for Render. Local database files, credentials and generated submission reports are excluded from Git.

The repository also contains an optional MySQL schema and environment configuration path. A MySQL server was not exercised in the recorded tests. H2 is the verified database described in this report; SQL syntax and stored routines must not be presented as verified MySQL or Oracle PL/SQL implementations.
"""
RESULTS = """### Recorded verification

The final application test run on 2 November 2026 passed 3,068 Java assertions, including 1,000 exhaustive small group-count vectors, and seven Node tests. These are assertion and test counts, not a coverage percentage or 3,068 independent user scenarios. The exhaustive oracle recursively searches small partitions independently of the greedy allocator.

| Scenario | Observed result |
| --- | --- |
| 30 AI_ML plus 10 CSE students, same year | 30 benches needed; 10 pairs and 20 single occupants |
| The same roster with 24 usable benches | Generation refused with a six-bench shortage |
| Uneven rows and excluded positions | Only real usable coordinates receive assignments |
| Invalid or duplicate assignments | Independent validator rejects the candidate |
| Private draft and stale inputs | Draft remains private; stale publication is refused |
| Injected failure before publication commit | Old publication survives; replacement stays DRAFT |
| Two overlapping sessions selecting one room | Exactly one competing selection succeeds |
| Restricted SQL reader | Publication views readable; base-table access and writes denied |

Six focused local browser checks and seven live HTTPS browser checks passed for the student-portal repair and deployment. The live checks included sample lookup, exact A/B highlighting, generation, explicit publication, refresh to version 2 and print preview. These focused runs supplement earlier recorded interface checks; they are not a claim that every historical browser suite was rerun.

### Demonstration procedure

Open the hosted demo or local `/demo`. The initial example contains 40 fictional students and two rooms. In the student portal, enter `0001` to see seat A or `0031` to see seat B in ROOM-30 at row 1, bench 1. The map highlights one exact position and marks unavailable benches without exposing other students' identities. Shared-demo edits can change the current version, so use the reset practice action if the starter data has been changed.

To demonstrate publication, change fictional inputs, save them, generate a draft and review the coordinator output. Students continue to see the earlier publication until Publish succeeds. Return to the student portal and refresh to observe the new version. Withdraw the publication to show that an old assignment is cleared rather than left on screen.

### Boundaries of the evidence

The optional Swing sources compile, but native Swing interaction was not exercised. Physical printing, MySQL execution, large-scale load, a complete accessibility audit and durable production hosting were not verified. Browser print preview was checked. The public free Render service can sleep after inactivity and its fictional data resets on restart. These limits are separate from the passing local SQL and allocation checks.

![Student portal showing roll 0031 at Row 1 Bench 1 Seat B](../assets/student-room-map.jpg)

![Room editor with uneven rows and an unavailable bench](../assets/room-editor.png)

"""
CONCLUSION = """Seyra implements the complete path from saved exam inputs to a validated draft, explicit publication and student seat lookup. Its capacity calculation reflects the sharing rule, its layouts support uneven rows, and its publication snapshots keep earlier facts separate from mutable master data. The recorded tests support these behaviors for the stated model and synthetic cases.

Future work should start with agreed requirements: authenticated coordinator accounts, durable hosted storage, backup and restore checks, accessible seating constraints and institution-specific policies. Each addition needs matching validation and migration tests. The current shared demo is appropriate for explaining and examining the project, rather than holding live examination records.
"""

JAVA = """### Java module structure

The Java backend is deliberately small enough to trace during a lab demonstration. `Server` maps HTTP requests to service methods. `PlannerService` applies workflow rules and coordinates SQL operations. `Allocator` produces candidate seats, while `PlanValidator` checks those seats independently. `Database` owns JDBC connections, prepared statements and transaction boundaries. `Domain` defines records and the application exception. `Csv` handles quoted CSV import, and `Json` centralizes Jackson serialization. `SwingCoordinator` is an optional Java desktop client; `DbLab` demonstrates H2 routines and triggers in an isolated database.

This separation gives each class a concrete responsibility. A servlet container, Spring Boot and an ORM are not used. Java's built-in HTTP server accepts requests from the Node proxy; the business rules remain in Java rather than being duplicated as browser authority.

![Java service classes and their dependencies](../diagrams/class-model.png)

### Records and domain modeling

`Domain.Student` stores identity, roll, name, year, branch, section and revision. `Room` stores its identity and code, actual row counts, exclusions and revision. `Input` is a session snapshot containing time, roster and selected rooms. `Seat` identifies a student and one room, row, bench and A/B position. `Capacity` names the values displayed by the feasibility check instead of returning an unexplained array of numbers.

Records provide concise typed values and generated accessors. A record reference being final does not make a mutable collection deeply immutable. The implementation uses copied lists where appropriate, including `List.copyOf(seats)` for the allocation result. The room model preserves older snapshots that stored only a repeated rectangular count, while newer snapshots retain actual counts for every row.

An internal allocator `Group` contains a year, branch and `ArrayDeque<Student>`. It encapsulates the queue used while pairing. Meaningful inheritance appears in `Domain.Problem extends RuntimeException` and the optional Swing window extending `JFrame`. There is no artificial student-to-branch inheritance: a student's branch is data, not a subclass relationship.

![Typed domain records used during allocation](../diagrams/domain-records.png)

### Collections and capacity calculation

A `HashMap` counts students by the key formed from year and branch. Let N be the roster size and M the size of its largest such group. The minimum required number of benches is `max(ceil(N / 2), M)`. At least half as many benches as students are necessary because a bench holds at most two people. At least M benches are necessary because members of the largest group cannot share with one another.

The bound is sufficient for this model because students may use any selected usable bench, and any two different year/branch groups are compatible. There are no fixed seats, per-student room restrictions or half-bench exclusions. With a dominant group, pair its members with other groups and seat the remainder singly. With no dominant group, repeated pairing across groups reaches the half-roster bound. The implementation also tests the formula against an independent exhaustive search for small group counts.

The Java capacity code uses integer arithmetic `(n + 1) / 2` for the ceiling and `Math.max` for the two lower bounds. It counts actual usable benches by nested row/bench loops rather than multiplying the largest row length by the number of rows. Physical seats, required benches and shortage are distinct displayed values.

### Priority queue allocation

The allocator sorts students within a group by roll, then places groups in a `PriorityQueue`. Its comparator orders groups by decreasing remaining size, followed by year and branch. Each iteration removes the two largest groups, takes one student from each, and reinserts nonempty groups. Remaining students from a single group occupy separate benches. Groups are removed before their queue sizes change, so changing priorities does not invalidate the heap's ordering.

```java
Group a = heap.remove(), b = heap.remove();
units.add(List.of(a.students.removeFirst(),
                  b.students.removeFirst()));
if (!a.students.isEmpty()) heap.add(a);
if (!b.students.isEmpty()) heap.add(b);
```

This is the actual pairing step from `Allocator.allocate`, formatted across lines for the report. The result is a list of one- or two-student units. A second traversal visits rooms sorted by code, actual rows and usable bench positions; it assigns the first occupant A and the second B. Deterministic tie breaking and ordering make the same stored input reproducible.

For N students, G groups and P enumerated room positions, the main costs are sorting students and rooms, queue pairing and traversing positions. A useful bound is O(N log N + N log G + R log R + P), where R is the number of selected rooms. This is an analysis of the code, not a measured latency guarantee. Memory includes the students, groups, units, seats and the input layout.

### Independent validation and exceptions

`PlanValidator` does not call the allocator. It builds maps of allowed students and rooms, sets of seen students and seat coordinates, and a map from each bench to its occupants. It checks exact roster coverage, duplicate students, unknown students, selected usable geometry, seat labels, duplicate positions, no more than two occupants and the year/branch rule. It also verifies that the snapshot belongs to the requested session.

Returning a list of errors permits a useful combined explanation. `requireValid` converts a failing result into `Domain.Problem` with HTTP conflict status. Expected domain errors retain their status through the database layer. SQL integrity errors are translated to a readable conflict; unexpected database failures return an unavailable response after rollback. Server logs retain the technical exception without presenting raw SQL details as normal user guidance.

![Draft generation through service, allocator and validator](../diagrams/allocation-sequence.png)

### Functional interfaces and JDBC resource management

`Database.Work<T>` is a functional interface whose `run(Connection)` method returns a typed result and can throw an exception. Service methods pass lambdas to `read` or `transaction`. This keeps connection handling in one place while the lambda expresses the particular SQL task. It is a practical use of generics, interfaces and lambda expressions in the project.

```java
@FunctionalInterface public interface Work<T> {
    T run(Connection c) throws Exception;
}
```

JDBC operations use `PreparedStatement` placeholders and bind values through `setObject`. Connections, statements and result sets are enclosed in try-with-resources blocks. This closes them on success and failure. An input roll is a bound value, not SQL text concatenated into a query. Result-set metadata is used to construct named row maps; SQL dates, times and CLOB values are converted for JSON responses.

Transactions disable auto-commit, set READ_COMMITTED and lock the coordinator guard row before decision reads. Successful work commits; exceptions roll back before the connection closes. Generation performs allocation outside the write lock, then reacquires the lock and checks that the saved input fingerprint still matches before storing the draft. This avoids holding a write lock during the whole algorithm without saving a result based on silently changed inputs.

### Concurrency and HTTP handling

The Java HTTP server uses a bounded thread-pool executor with four core threads, at most eight threads and a queue of 64 tasks. These are configuration choices, not a proven maximum concurrent-user capacity. Database serialization protects the room-selection and publication decisions that can conflict even when requests arrive on different HTTP threads.

Publication validates status, session ownership, freshness, reservations and placements within the protected workflow. The old version becomes SUPERSEDED, the replacement becomes PUBLISHED and the session's current pointer changes in one transaction. A repeated request for an already current publication is idempotent. A deliberately injected pre-commit failure in the test suite confirms that a failed replacement cannot leave two half-published states.

### Input processing and optional desktop client

The CSV parser supports quoted fields rather than splitting every line at commas. The service normalizes and validates imported rows before committing the batch; an invalid row does not leave a partly imported roster. Jackson handles JSON records and serialized plan inputs. A canonical fingerprint detects meaningful input changes, including support for historical snapshot forms.

The Swing coordinator demonstrates a Java GUI client and background event work while reusing the service architecture. It is optional: the recorded user workflow and deployment use the browser. Compilation of Swing classes is verified; no claim is made that its native window interactions were tested. The principal Java learning outcomes are therefore supported by executed backend code as well as inspectable GUI source.
"""

WEB = """### Browser and server responsibilities

The web laboratory part uses semantic HTML, responsive CSS, browser JavaScript and a Node.js server. The Java backend owns allocation and publication decisions. Node receives browser requests, serves the static interface and forwards API calls to Java. This is a useful demonstration of a web application that combines a Java business backend with Node.js infrastructure.

Node uses its built-in `http` module; Express and a front-end framework are not runtime dependencies. The implementation can therefore be followed from request routing to response without a framework-generated project structure. JavaScript is split into coordinator, student, print and shared seating-rendering modules so a print page does not run coordinator-only DOM code.

![Browser, Node, Java and SQL component boundaries](../diagrams/architecture.png)

### HTML forms and the visible workflow

The coordinator begins with an exam name, date, start time and end time. The student area needs roll, name, year, branch and optional section, or a valid CSV import. The room area needs a unique code, the actual number of benches per row and any unavailable positions. The review area reports both physical seat count and the rule-based bench requirement. Finally the coordinator generates a draft, inspects it and publishes it explicitly.

Labels, help text and status messages explain these inputs where they are used. A notation such as rows 7, 5, 6 describes counts, not room dimensions or a ratio. Missing benches remain excluded coordinates, which is important for giving students recognizable directions. The workflow does not ask users to infer the meaning of a decorative number such as 3:4 before they can proceed.

The interface tracks unsaved changes. Actions that depend on the stored roster or room selection guide the user to save first. Shared create/edit form state clears the hidden record identifier when entering a new record, preventing the earlier edit-to-create bug. Server-side validation still applies even if browser constraints are bypassed.

![Coordinator activity from saved inputs to draft review](../diagrams/workflow.png)

### Fetch requests and response handling

Browser modules make same-origin requests through Node using the Fetch API. They serialize form data as JSON where appropriate, check response success and show the returned domain message when an operation fails. A network failure and an HTTP error both need handling: obtaining a Response object alone does not mean the operation succeeded.

The UI updates from the successful server response and reloads stored state when required. For example, generation produces a plan identifier and a private review result; it does not automatically announce that students can see the plan. Only a successful publication changes the published status. A shortage response preserves the earlier publication while explaining how many additional benches are needed.

Request helpers centralize error handling, while individual event handlers control the particular form or view. This keeps browser code focused on presentation and interaction. It does not authorize the client to decide that a stale draft is safe: Java rechecks that decision against SQL.

### Student portal state and refreshing

The student portal requests the list of published sessions and can select the only available exam automatically. A lookup requires a roll and a session. Its result includes the current publication version, room code, row, bench, A/B seat and the published geometry of that room. It does not download the full roster to search in the browser.

The page refreshes while visible at a 30-second interval, on returning to the page and when the user requests a refresh. A changed version causes a fresh lookup. Withdrawal, failed loading and an unknown roll clear an obsolete assignment or map, rather than leaving the earlier successful result looking current. The portal displays loading, empty, error and found states explicitly.

The fresh fictional demonstration gives `0001` seat A and `0031` seat B at the same bench. The repaired portal retains demo mode in its links and receives the hosted public-demo flag, so a student link does not accidentally open the protected normal workspace. This was verified on the deployed HTTPS service, not only on localhost.

![Lookup through the restricted publication reader](../diagrams/lookup-sequence.png)

### Rendering the room position safely

The shared seating module renders actual row lengths, preserved bench numbers and the two A/B positions on a usable bench. It distinguishes an unavailable bench from an empty seat. The highlight compares the complete room, row, bench and seat identity, so A is not highlighted when the student belongs at B. The room front and row labels help the student interpret the result as directions.

The public map represents the student's room geometry, not a list of classmates. Only the matched roll and assignment are returned; neighboring students' identities and occupancy are not exposed by the student lookup. Displayed strings are escaped before they enter generated markup. Node tests exercise escaping and exact-seat highlighting so a visually convincing room cannot mask an incorrect position comparison.

Because publication stores room geometry, the map stays consistent with the assignment even if the coordinator later edits the room master. This is a browser feature backed by SQL snapshots. A responsive grid alone would not preserve that history.

### CSS presentation and accessibility considerations

The visual system uses a restrained Seyra wordmark, layered surfaces, soft colors and translucent panels. The header remains at the top of the document flow rather than following the entire page while scrolling. Glass effects and movement are presentation choices; status labels, form labels and workflow controls carry the operational meaning.

Layouts adapt to narrow screens with wrapping controls and readable form sections. Shared theme and seating styles keep coordinator, student and print views consistent. Animation respects reduced-motion preferences. These measures improve usability, but the recorded evidence is not a full accessibility certification. Keyboard, screen-reader and contrast checks would need a dedicated audit for production adoption.

The print view uses the shared layout without coordinator controls. Print-specific CSS and the browser preview produce a room-oriented output. Actual printer operation and browser print-dialog automation were not tested, so the report distinguishes preview rendering from physical printing.

### Node.js request routing and trust boundaries

The public Node listener uses Render's assigned PORT, while Java listens on loopback inside the container. Node serves only intended web assets and proxies intended API paths. The server checks same-origin behavior for state-changing requests, including the deployed HTTPS host. A private backend token is added at the proxy boundary rather than placed in public browser scripts.

In public-demo mode, ordinary workspace APIs are refused and entry links lead to the fictional practice. Java repeats the relevant restrictions; a client cannot rely on merely changing a URL to reach saved local records. The public service uses temporary demo data, not the laptop's database directory. The hosted coordinator is a shared demonstration and is not a substitute for authenticated individual coordinator accounts.

![Docker deployment with one public listener](../diagrams/deployment.png)

### Web testing and reproducible demonstration

The seven Node tests inspect assets, JavaScript syntax, workflow order, shared room geometry, theme behavior and hosted routing/origin behavior. Focused browser tests then exercise the DOM, Java API responses and published SQL result together. This combination catches failures that a static screenshot or syntax check would miss, such as a working button with the wrong demo URL or a map that remains after withdrawal.

The live demonstration is available at `https://seyra-exam-planner.onrender.com`. The first request after inactivity may wait for the free service to wake. To reproduce the same application locally, download the locked Java libraries and run `npm start`. No Node runtime packages need installation. The source, tests and Dockerfile describe the same deployed design.
"""

DBMS = """### Relational design and table groups

The tested database is H2 2.4.240 accessed through JDBC. `database/schema.sql` defines 15 application tables and three publication views. Tables separate current editable inputs, plan-specific historical facts and operational records. This separation is essential: a later correction to a student's branch or a room row must not rewrite the facts used by an older plan.

| Group | Tables | Responsibility |
| --- | --- | --- |
| Master data | branches, students, rooms, room_benches | Current students and physical bench coordinates |
| Exam selection | exam_sessions, session_roster, session_rooms, session_exclusions | Time, roster, selected rooms and temporary exclusions |
| History | plans, plan_students, plan_rooms, plan_benches, assignments | Version state and immutable plan facts |
| Operations | coordinator_guard, audit_events | Serialized decisions and audit entries |

The live master entities and their junctions are shown separately from historical snapshots to keep each relationship readable. A plan student identifier refers to a student fact within that plan. It deliberately has no foreign key back to the mutable student master. The corresponding assignment instead references the composite plan-student key, preserving referential integrity within the historical version.

![Master data and exam-selection entity relationships](../diagrams/er-model.png)

![Plan snapshots and assignment composite keys](../diagrams/snapshot-er.png)

### Keys and integrity constraints

Student IDs and room IDs are surrogate primary keys. Student roll and room code are also unique, since duplicate human-facing identifiers would make lookup and room selection ambiguous. `study_year` is checked between 1 and 4. Room row count and maximum bench count are checked between 1 and 30. Exam start time must be earlier than end time.

`room_benches` has primary key `(room_id, row_no, bench_no)`. A session roster uses `(session_id, student_id)` and the selected-room relation uses `(session_id, room_id)`. These keys express membership directly and prevent duplicate entries without a fragile comma-separated list. Session exclusions reference the selected session-room pair, so an exclusion is not attached to an unrelated room selection.

`plans` has unique `(session_id, version_no)` and unique `(session_id, id)`. The exam's `(id, current_plan_id)` composite foreign key refers to `(session_id, id)` in plans. This prevents pointing a session at another session's plan. Status is constrained to DRAFT, PUBLISHED, SUPERSEDED, WITHDRAWN or DISCARDED. A foreign key alone does not check that the pointed plan is PUBLISHED; the transactional service enforces that state rule.

`assignments` has primary key `(plan_id, student_id)`, so one student cannot receive two positions in a plan. Its unique key on `(plan_id, room_id, row_no, bench_no, seat_label)` prevents two students occupying the same position. Composite foreign keys reference `plan_students` and `plan_benches`, and a CHECK permits only A or B. Cross-row rules such as compatible bench sharing and exact roster coverage remain the independent validator's responsibility.

```sql
PRIMARY KEY (plan_id, student_id),
UNIQUE (plan_id, room_id, row_no, bench_no, seat_label),
FOREIGN KEY (plan_id, student_id)
  REFERENCES plan_students(plan_id, student_id),
FOREIGN KEY (plan_id, room_id, row_no, bench_no)
  REFERENCES plan_benches(plan_id, room_id, row_no, bench_no)
```

This excerpt from the assignment definition demonstrates why the plan identifier belongs in historical keys. A student can have an assignment in more than one version, but only one per version. A bench coordinate is meaningful within a room and plan, not as a globally unique number.

### Functional dependencies and normalization

In the student master, `id -> roll, name, study_year, branch, section, revision`, and the unique roll is another candidate identifier. Branch descriptions are stored in `branches`, where `code -> label`, instead of repeating the label with every student. Room facts depend on room ID, while the usable flag of a particular bench depends on its full room-row-bench key.

The roster and selected-room tables represent many-to-many membership using composite keys and no descriptive non-key fields. A student master is therefore not copied once per sitting, and room descriptions are not duplicated in the membership table. These choices avoid update, insertion and deletion anomalies in the current-input model and follow third-normal-form reasoning for the stated dependencies.

Historical snapshot relations intentionally repeat the values that were true at generation time. A `plan_students` name depends on the pair `(plan_id, student_id)` because the same student may later have a corrected name. This is temporal data rather than an accidental current-master duplicate. The plan also stores serialized Input JSON in a CLOB for reconstruction and fingerprinting; it duplicates some relational snapshot facts deliberately. The report does not claim that a JSON document itself has been normalized into relational 3NF.

### Queries, joins and aggregation

Prepared statements bind session IDs and lookup rolls. A group-count query joins roster membership to students and groups by year and branch. HAVING filters aggregate groups after grouping, whereas WHERE chooses participating rows before grouping. The largest group determines one of the capacity lower bounds; the Java allocator does not infer capacity from raw seats alone.

```sql
SELECT st.study_year, st.branch, COUNT(*) AS n
FROM session_roster sr
JOIN students st ON st.id = sr.student_id
WHERE sr.session_id = ?
GROUP BY st.study_year, st.branch;
```

For the synthetic 30 AI_ML plus 10 CSE example, this relation produces the two counts 30 and 10. The lab demonstration also executes a correlated EXISTS query to list sessions that actually have roster rows. EXISTS checks membership without introducing an unnecessary student row into the outer result for each roster member.

The student lookup uses publication views and a single joined read for the matched assignment and its assigned-room geometry. It joins by plan and room code so geometry from a newer master layout cannot be combined with an older assignment. It does not fetch a mutable room and hope that it still matches the historical seating coordinates.

### Views and restricted access

The three SQL views are `published_sessions`, `published_assignments` and `published_room_benches`. Each follows the session's current plan and requires its status to be PUBLISHED. A draft is not visible simply because assignment rows already exist for it. Replacing the current pointer changes which version the views expose.

The H2 `portal_reader` account is granted SELECT on these views only. Tests confirm that it cannot read base tables or write data. This is database-level least privilege in addition to HTTP route separation. Roll lookup is a way to find a published seat, not proof of a student's identity; it should not be described as a login or authentication mechanism.

The public response contains the matched roll and assignment plus the geometry needed to find the position. It omits other students' names and roll numbers. Geometry visibility does not imply that the endpoint returns other occupants. The optional MySQL setup requires separately provisioned users and has not been verified, so these executed privilege claims are specific to H2.

### ACID behavior and publication

Atomicity matters most when replacing a publication. In one JDBC transaction, the service verifies the candidate, marks the earlier plan SUPERSEDED, marks the new plan PUBLISHED and updates the session pointer. If an operation fails before commit, all those changes roll back. A deliberate failure test confirms that the old publication survives and the replacement remains DRAFT.

Consistency combines SQL constraints with service validation: keys prevent duplicate seats and dangling snapshot references, while Java checks compatibility, roster coverage and current-input freshness. Isolation uses READ_COMMITTED and an application-wide coordinator guard row locked by `SELECT ... FOR UPDATE` before decision reads. The guard serializes competing modifications; it is not a claim that READ_COMMITTED alone eliminates every multi-step race.

Durability is provided by H2's file-backed commit in the local workspace. The free hosted demonstration has ephemeral container storage, so an application restart can replace its fictional database. A successful database commit must not be confused with a guarantee that a hosting provider preserves a disposable filesystem across deployments.

![Atomic publication, rollback and idempotent retry](../diagrams/publication-sequence.png)

### Concurrency, snapshots and room conflicts

Generation reads a saved Input snapshot in a REPEATABLE_READ transaction, computes seats without holding the writer lock, then reacquires the lock and compares the canonical fingerprint before saving a complete DRAFT. A student or room edit in the meantime makes the old input stale. Publication repeats freshness and validity checks, since saving a draft does not reserve its assumptions forever.

Room reservations include both the working selected rooms and the rooms of the current publication. Removing a room from the editable selection does not release it while students still have a published assignment there. Two sessions conflict when they share a room on the same date and their half-open time intervals overlap. End-to-start back-to-back sessions are allowed. The concurrency test starts competing selections and confirms that exactly one succeeds for a conflicting room.

History is retained as versioned rows, not recomputed from the current student and room masters. Published geometry therefore remains stable after a room edit. Withdrawal clears the current publication while preserving its historical plan record. Repeating publication of the already current version is treated as an idempotent request rather than making another version.

### Stored routines, cursor traversal and triggers

`database/lab-demonstrations.sql` and `planner.DbLab` run in a separate synthetic H2 database. H2 `CREATE ALIAS` connects SQL-callable routines to Java methods. `LAB_LARGEST_GROUP` returns a scalar; `LAB_GROUP_REPORT` returns a ResultSet containing grouped counts. Java traverses a JDBC ResultSet cursor using `while (cursor.next())` and copies each row into the returned report.

The lab creates INSERT, UPDATE and DELETE triggers on a separate demonstration contact table. `ContactAudit` implements H2's Trigger interface and writes the operation and record ID to `lab_audit`. The recorded run contains exactly three corresponding audit events. These triggers demonstrate the DBMS concept; the application does not claim that all business audit events are database triggers. Operational `audit_events` entries are written by the application.

Run `node scripts/dbms-lab.mjs` to reproduce the 30/10 counts, scalar result 30, published lookup and three trigger events. H2 Java aliases and JDBC cursors use H2/Java syntax; another DBMS needs its own routine implementation.
"""

SE = """### Scope, stakeholders and requirements

The coordinator maintains the sitting inputs, decides whether a draft is acceptable and publishes it. The student needs a current assignment and understandable directions within the room. Faculty reviewers need a design that can be traced to source and test evidence. Seyra supports these roles through one shared system, with separate subject reports describing the relevant implementation.

| ID | Functional requirement | Acceptance condition |
| --- | --- | --- |
| FR1 | Save an exam sitting | Valid date and start time earlier than end time |
| FR2 | Maintain its roster | Unique rolls; valid year and branch; no partial invalid import |
| FR3 | Configure actual rooms | Uneven row counts and unavailable benches preserved |
| FR4 | Generate a private draft | Sufficient usable benches and exact valid roster coverage |
| FR5 | Publish a reviewed version | Fresh inputs; no overlapping room conflict; atomic replacement |
| FR6 | Show student position | Current published assignment and exact A/B highlight |
| FR7 | Retain history and withdraw | Earlier facts stable; withdrawn lookup no longer shown |

Quality requirements are stated without invented numerical targets. Determinism means identical saved input produces the same placement order. Integrity means invalid assignments and inconsistent SQL references are rejected. Usability means the next required action and input meaning are visible. Privacy means the student endpoint exposes the matched assignment rather than the full roster. Performance and accessibility have no claimed production certification.

### Process and design decisions

Development proceeded through a working allocation and SQL baseline, interface revisions, clearer workflow and uneven-room support, branding and student-map work, then student-portal repair and deployment. Each revision used focused regression checks. This is an account of the recorded incremental work, not a claim that a formal Scrum team, planned sprint schedule or fabricated effort estimate was followed.

The backend/frontend split was chosen to meet the four-lab project scope: Java owns rules and JDBC, Node serves the web application, SQL enforces relationships, and the SE view explains requirements, models and verification. The current code uses Java HttpServer, built-in Node HTTP and H2. React, Spring Boot, Django and JWT authentication are not implemented requirements of this completed version.

### Use case model

The use-case diagram separates coordinator operations from the student's published lookup. Generation includes feasibility and assignment validation. Publication includes freshness and reservation checks. The actor is the role performing an operation; a database is not an external human actor. The diagram states supported goals, not a navigation map for every browser button.

![Coordinator and student use cases](../diagrams/use-case.png)

### Structural and domain models

The class model shows implementation responsibilities and dependencies: HTTP Server to PlannerService, service to Database, Allocator and PlanValidator, and shared typed Domain records. The separate domain-record view expands Input, Student, Room, Seat and Capacity without hiding their data under an oversized single class box. These are views of the Java implementation rather than a proposed unrelated framework design.

![Core implementation class diagram](../diagrams/class-model.png)

![Domain records and allocation data](../diagrams/domain-records.png)

The object diagram is an illustrative instance at one moment: fictional rolls 0001 and 0031 share ROOM-30 row 1 bench 1, at A and B respectively. Object values make the static types concrete. They are synthetic demonstration records, not personal student data.

![Object snapshot of two compatible students and their bench](../diagrams/object-model.png)

### Activity and state models

The activity model makes the user procedure predictable. Saved session, roster and room inputs precede generation. A failed feasibility check returns to input correction; a valid draft proceeds to review and an explicit publish action. The separate publication activity expands the checks, commit and failure paths that would clutter the main coordinator workflow.

![Coordinator workflow activity diagram](../diagrams/workflow.png)

![Publication decision activity diagram](../diagrams/publication-activity.png)

The state model distinguishes a generated DRAFT from a current PUBLISHED plan. A replaced publication becomes SUPERSEDED, a removed publication WITHDRAWN, and an abandoned draft DISCARDED. This lifecycle explains why a saved candidate is not visible in the student portal and why an older result must not be silently edited into a new one.

![Plan publication state machine](../diagrams/publication-state.png)

### Interaction models

The generation sequence shows reading saved inputs, computing capacity and placement, independently validating and saving a complete candidate after a freshness check. The publication sequence shows the guarded transaction, status checks, rollback and idempotent retry. The student sequence follows a restricted read of the current assignment and matching room geometry.

![Draft generation sequence](../diagrams/allocation-sequence.png)

![Publication transaction sequence](../diagrams/publication-sequence.png)

![Student lookup sequence](../diagrams/lookup-sequence.png)

The communication diagram provides the publication interaction as numbered messages between collaborating objects. It answers which objects exchange requests, while the sequence view makes ordering and alternative outcomes easier to inspect. The HTTP transport is condensed in these interaction views so that the service decisions remain readable; the component and deployment models show the actual Node-to-Java boundary.

![Numbered publication communication diagram](../diagrams/communication.png)

### Components and deployment

The component view separates browser pages and shared rendering, the Node HTTP/proxy boundary, Java service modules and SQL persistence. The deployment view places browser clients outside a Render Docker service, with one public Node listener, a loopback Java backend and H2 files inside the service container. It records the deployed free-demo configuration, including ephemeral storage, rather than claiming a managed persistent database.

![Application component diagram](../diagrams/architecture.png)

![Render and local runtime deployment diagram](../diagrams/deployment.png)

### Data design and data flow

ER diagrams supplement UML by specifying the actual master, session and snapshot relations. They are provided in the DBMS report and the shared diagram directory. The context DFD shows information crossing the system boundary. Its level-one refinement separates input maintenance, generation, publication and lookup and identifies logical stores backed by the implemented SQL tables. DFDs and ER models are not mislabeled as UML diagrams.

![Context data flow diagram](../diagrams/dfd-context.png)

![Level one data flow diagram](../diagrams/dfd-level-one.png)

These selected diagrams cover nine useful UML types: use case, class, object, activity, state machine, sequence, communication, component and deployment. Timing and profile diagrams are not added merely to increase the count: the current application has no specified real-time protocol or custom UML metamodel requiring them. The editable PlantUML sources are included so reviewers can inspect and revise the models.

### Traceability and test design

| Requirement | Main implementation | Verification evidence |
| --- | --- | --- |
| FR1 and FR2 | PlannerService, Csv, schema constraints | Input validation and all-or-nothing import assertions |
| FR3 | Domain.Room, room_benches, seating.js | Uneven-row, exclusion and historical geometry checks |
| FR4 | Allocator and PlanValidator | Exhaustive oracle and malformed-candidate rejection |
| FR5 | Database.transaction and publish | Conflict race, stale draft, rollback and retry checks |
| FR6 | Published views and student modules | Restricted reader plus local/live A/B browser checks |
| FR7 | Plan snapshots and status transitions | Historical stability and withdrawal checks |

Equivalence classes include compatible and incompatible group pairs, empty and nonempty rosters, selected and unselected rooms, and valid and malformed CSV. Boundary cases include odd student counts, exactly enough benches, one-group dominance and back-to-back exam intervals. Negative tests submit duplicate seats and unknown students directly to the validator. The oracle compares independent exhaustive results rather than merely restating the implementation.

System tests follow the whole browser-to-Node-to-Java-to-SQL path. An API success is checked against the visible student result and version. Failure injection before commit tests atomicity, and concurrent selection tests a race that a single-user walkthrough would not expose. Browser screenshots support visual review but are not treated as evidence that unseen server rules passed.

### Risks, change control and maintenance

The principal remaining deployment risk is temporary hosted storage. The public service therefore contains fictional data and states that restart resets it. Authentication, durable hosting and backup/restore must be designed before live exam use. Room geometry currently models discrete bench positions, not measured floor plans; accommodating accessible places or fixed seats requires changes to both the algorithm and its feasibility proof.

Configuration and checksum-pinned dependencies are versioned, while passwords, local databases and generated personalized reports are ignored. Changes should update code, tests and affected diagrams together. A runtime release should pass allocation, SQL and browser checks appropriate to its change. Documentation-only synchronization can avoid restarting the shared demo.
"""

REFS = {
 'java': [('Java 21 API documentation', 'https://docs.oracle.com/en/java/javase/21/docs/api/'),('H2 documentation','https://h2database.com/html/main.html')],
 'web': [('Node.js 24 HTTP documentation','https://nodejs.org/docs/latest-v24.x/api/http.html'),('MDN Fetch API','https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch')],
 'dbms': [('H2 SQL commands','https://h2database.com/html/commands.html'),('Java 21 JDBC Connection API','https://docs.oracle.com/en/java/javase/21/docs/api/java.sql/java/sql/Connection.html')],
 'se': [('OMG UML 2.5.1 specification','https://www.omg.org/spec/UML/2.5.1/About-UML'),('PlantUML diagram documentation','https://plantuml.com/')]
}
SUBJECTS = {
 'java':('Java Programming', JAVA, 'Java objects, records, collections, exception handling, functional interfaces, HTTP concurrency and JDBC transactions implement the exam workflow. This report concentrates on those Java responsibilities and the independent verification of the allocator.'),
 'web':('Web Technologies', WEB, 'HTML, CSS, browser JavaScript and a Node.js server provide a guided coordinator workspace and a student portal. This report concentrates on forms, state handling, API requests, responsive layouts, safe room rendering and the deployed web path.'),
 'dbms':('Database Management Systems', DBMS, 'A relational H2 database stores editable exam inputs and immutable plan snapshots. This report concentrates on keys, dependencies, normalization, queries, views, restricted SQL access, transactions, concurrency and executed routines and triggers.'),
 'se':('Software Engineering', SE, 'Requirements, design models and test evidence explain how the implemented workflow meets its stated scope. This report concentrates on useful UML views, data flow, traceability, failure cases and maintenance decisions.')
}

def main():
    for key,(title,implementation,focus) in SUBJECTS.items():
        folder=ROOT/'docs'/key; folder.mkdir(exist_ok=True)
        abstract=f'Seyra prepares examination seating plans from a saved roster and actual room layouts. Students sharing a bench must differ in year or branch, while single occupancy remains valid. The system calculates the required number of benches, generates a deterministic draft and independently validates every placement before publication.\n\n{focus}\n\nThe completed application uses Java 21, Node.js, HTML, CSS, JavaScript and H2 SQL. Published plan snapshots retain their own student and room facts. A student lookup shows only the matched current assignment and its room position. Automated allocation and SQL checks, focused local browser checks and live HTTPS checks support the reported behavior. The public Render service is a shared fictional demonstration with temporary storage.\n'
        (folder/'ABSTRACT.md').write_text(abstract,encoding='utf-8')
        refs='\n'.join(f'{i+1}. [{label}]({url})' for i,(label,url) in enumerate(REFS[key]))
        text=f'# Seyra {title} Report\n\n{focus}\n\n## 1 INTRODUCTION\n\n{INTRO}\n## 2 EXISTING SYSTEM\n\n{EXISTING}\n## 3 PROPOSED SYSTEM\n\n{PROPOSED}\n## 4 HARDWARE AND SOFTWARE REQUIREMENTS\n\n{REQUIREMENTS}\n## 5 IMPLEMENTATION\n\n{implementation}\n## 6 RESULTS\n\n{RESULTS}\n## 7 CONCLUSION\n\n{CONCLUSION}\n### References\n\n{refs}\n3. [Project source and tests](https://github.com/Koushik-026/seyra)\n4. [Live fictional demonstration](https://seyra-exam-planner.onrender.com)\n\n### Source and evidence locations\n\nApplication source is under `backend/` and `web/`; SQL is under `database/`; automated tests are under `backend/src/test/` and `tests/`. The current verification record is [verification-results.md](../verification-results.md). Editable diagram sources and rendered figures are in [diagrams](../diagrams/README.md). Local execution logs and personalized submission copies are excluded from the public repository.\n'
        (folder/'REPORT.md').write_text(text,encoding='utf-8')
    print('Four anonymous subject reports and abstracts updated.')

if __name__=='__main__':main()
