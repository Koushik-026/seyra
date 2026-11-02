# Implementation and HTTP API contract

Implemented architecture, 2 November 2026: browser or optional Swing client -> Node HTTP entry point -> Java HttpServer -> Java services/JDBC -> SQL database. Java is the backend; Node has no allocator or direct database connection.

Node uses its built-in `http` module for static-file routing, streaming proxy, response headers and backend-unavailable handling. Plain HTML/CSS/JavaScript follows the user's clarified stack. React/Express/Django are not claimed.

## Routes

Bodies are JSON. Expected errors use `{ "error": "message" }`: 400 validation, 403 access boundary, 404 unknown/no-publication, 409 conflict/staleness, 413 oversized request, 415 incorrect media type, 503 unavailable database/backend.

| Method | Path | Request / result |
| --- | --- | --- |
| GET | `/api/health` | Readiness after JDBC schema initialization |
| GET | `/api/admin/state` | Students, rooms, sessions and canonical branches |
| POST | `/api/admin/demo` | Fictional records, only when database master/session/room tables are empty |
| POST / PUT | `/api/admin/students[/:id]` | `{roll,name,year,branch,section}` |
| DELETE | `/api/admin/students/:id` | Delete only without blocking live roster references |
| POST / PUT | `/api/admin/rooms[/:id]` | `{code,rows,benchesPerRow,excluded:["1:2"]}` |
| DELETE | `/api/admin/rooms/:id` | Current publications and working references are protected |
| POST / PUT | `/api/admin/sessions[/:id]` | `{name,date:"YYYY-MM-DD",start:"09:00",end:"12:00"}` |
| GET | `/api/admin/sessions/:id` | Input, capacity, working exclusions and plan summaries |
| POST | `/api/admin/sessions/:id/roster` | `{studentIds:[1,2]}` atomically replaces membership |
| POST | `/api/admin/sessions/:id/rooms` | `{rooms:[{roomId:1,excluded:["2:3"]}]}` |
| POST | `/api/admin/import/preview` | `{csv:"..."}` normalized records and errors |
| POST | `/api/admin/import/commit` | `{sessionId:1,csv:"..."}` rechecks and atomically imports |
| POST | `/api/admin/sessions/:id/generate` | New independently validated DRAFT version |
| GET | `/api/admin/plans/:id` | Snapshot, assignments, capacity, validation and staleness |
| POST | `/api/admin/plans/:id/publish` | Validation/freshness/overlap checks and atomic switch |
| POST | `/api/admin/plans/:id/discard` | DRAFT -> DISCARDED |
| POST | `/api/admin/sessions/:id/withdraw` | Clear current pointer and mark WITHDRAWN |
| GET | `/api/public/sessions` | Current-publication SQL view |
| GET | `/api/public/sessions/:id/assignment?roll=0001` | One snapshot position with version/time |

Node injects a randomly generated internal token while forwarding. Java rejects requests without it. This is a local service boundary, not student authentication. Node rejects cross-site browser requests and binds to loopback; the coordinator is for a trusted local laptop.

## Classes and source areas

`Domain.java` defines immutable records and normalization. `Allocator.java` handles capacity/heap pairing. `PlanValidator.java` checks placements independently. `Csv.java` parses quoted fields. `Database.java` owns JDBC and the transaction guard. `PlannerService.java` manages CRUD, snapshots and publication. `Server.java` exposes HTTP. `Json.java` wraps Jackson. `SwingCoordinator.java` is an optional desktop client. `DbLab.java` supplies isolated SQL demonstrations.

## Changes from the initial proposal

- Java is an actual HTTP backend, shared by the browser and Swing clients.
- Native Node HTTP and plain web assets replace the tentative React/Express proposal.
- Persistent H2 is the verified SQL default. MySQL is optional and unverified.
- Reservations are computed from working session-room links UNION rooms of the current published plan; no extra reservation table is required.
- Live rooms use revision counters and normalized bench rows; historical geometry is preserved in plan snapshots.
- Plans store immutable JSON input snapshots for rendering/validation plus relational snapshots for constraints and publication views. Both representations are written together, never edited by application routes. This deliberate history is not a second editable student master.

## Transactions

Every coordinator mutation starts READ COMMITTED and locks the pre-created guard row using `SELECT ... FOR UPDATE`. Decision reads follow the lock. Generate in memory after a consistent read, then reacquire the guard and compare the SHA-256 input fingerprint before saving the complete draft.

Publication repeats fingerprint, overlap and independent-validator checks, changes old/new plan states and current pointer in one commit. The fingerprint includes session metadata/revision, sorted student values/revisions and room layouts/revisions/exclusions. Date/time edits require withdrawal while a publication is current. Roster/working-room edits may prepare a replacement without changing the publication.

The restricted public view joins current pointer, PUBLISHED state, assignments and relational snapshots in one statement. SQL keys do not alone establish temporal non-overlap or all cross-row seating rules. Direct administrator writes can bypass the service protocol; destructive lab exercises use an isolated database.

## Uneven-row room request

Room writes may send `{code:"ROOM-A",rows:3,rowBenchCounts:[7,5,6],excluded:["1:7"]}`. There must be exactly one integer from 1–30 per row, with 1–30 rows. `benchesPerRow` remains accepted for uniform legacy requests; when `rowBenchCounts` is supplied it defines the geometry and the maximum is stored as metadata. Room reads and plan input expose `rowBenchCounts`. Exclusion `"3:4"` means Row 3, Bench 4, and must exist in that specific row. See [workflow and layout review](workflow-and-layout-review.md).

## Practice routes and student room map

`/demo` serves the normal coordinator with practice mode enabled. Requests use `/api/demo/admin/...` and `/api/demo/public/...`; Java dispatches them to a separate, preseeded local H2 service. No normal database IDs are shared. Each server start creates a fresh practice database under `tmp/demo-<UUID>`. The original normal APIs continue to address saved exams. Practice student/print links retain `?demo=1`.

Published assignment responses now include `roomLayout:[{row:1,bench:1,usable:true},...]`. This contains only the assigned room's bench positions from the current publication. It does not contain other students or seat occupancy. One SQL statement joins restricted publication views by plan and room; publication replacement therefore cannot mix assignment and geometry versions. An unsuccessful lookup returns no room geometry. `published_room_benches` is a SELECT-only view granted to the portal reader.
