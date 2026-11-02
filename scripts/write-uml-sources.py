"""Maintain UML and database diagrams for the implemented Seyra application."""
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'docs'/'diagrams';OUT.mkdir(parents=True,exist_ok=True)
STYLE='''!pragma layout smetana
skinparam backgroundColor white
skinparam defaultFontName "Times New Roman"
skinparam defaultFontSize 17
skinparam shadowing false
skinparam roundcorner 0
skinparam ArrowColor #202020
skinparam LineColor #202020
skinparam classAttributeIconSize 0
skinparam classBackgroundColor #F5F7FA
skinparam classBorderColor #202020
skinparam componentBackgroundColor #F5F7FA
skinparam componentBorderColor #202020
skinparam stateBackgroundColor white
skinparam stateBorderColor #202020
skinparam actorStyle stickman
skinparam sequenceMessageAlign center
skinparam sequenceParticipantBackgroundColor #F5F7FA
skinparam sequenceParticipantBorderColor #202020
skinparam sequenceLifeLineBorderColor #505050
skinparam NoteBackgroundColor #FFFFFF
skinparam NoteBorderColor #707070
skinparam nodesep 35
skinparam ranksep 45
hide circle
'''
DIAGRAMS={
'use-case':r'''
left to right direction
actor Coordinator as C
actor Student as S
rectangle "Seyra" {
  usecase "Manage exam sitting" as UC1
  usecase "Manage appearing roster" as UC2
  usecase "Import CSV" as UCI
  usecase "Configure and select rooms" as UC3
  usecase "Generate private draft" as UC4
  usecase "Check capacity" as UCC
  usecase "Validate assignments" as UCV
  usecase "Review room-wise plan" as UC5
  usecase "Publish reviewed draft" as UC6
  usecase "Check freshness and conflicts" as UCF
  usecase "Print or export a version" as UC7
  usecase "Withdraw publication" as UC8
  usecase "Look up current seat" as UC9
}
C --> UC1
C --> UC2
C --> UC3
C --> UC4
C --> UC5
C --> UC6
C --> UC7
C --> UC8
S --> UC9
UCI .> UC2 : <<extend>>
UC4 .> UCC : <<include>>
UC4 .> UCV : <<include>>
UC6 .> UCV : <<include>>
UC6 .> UCF : <<include>>
note bottom of UC9
Only the current published plan is searchable.
The layout contains no other student's identity.
end note
''',
'class-model':r'''
top to bottom direction
class Server {
  - service: PlannerService
  - demoService: PlannerService
  + main(args): void
  - handle(exchange): void
}
class PlannerService {
  - db: Database
  - allocator: Allocator
  - validator: PlanValidator
  + generate(sessionId): long
  + publish(planId, testFailure): void
  + lookup(sessionId, roll): Map
  + withdraw(sessionId): void
}
class Database {
  + open(): Connection
  + reader(): Connection
  + read(work): T
  + transaction(work): T
}
class Allocator {
  + capacity(input): Capacity
  + allocate(input): List<Seat>
}
class PlanValidator {
  + validate(input, seats, session): List<String>
  + requireValid(input, seats, session): void
}
interface "Database.Work<T>" as Work {
  + run(connection): T
}
class Csv {
  {static} + parse(text): List<List<String>>
}
class Json {
  {static} + write(value): String
  {static} + read(text, type): T
}
Server --> PlannerService : delegates
PlannerService --> Database : uses
PlannerService *-- Allocator
PlannerService *-- PlanValidator
Database ..> Work : executes
PlannerService ..> Csv : import
Server ..> Json : HTTP encoding
PlannerService ..> Json : snapshots
note bottom of PlannerService
Selected fields and operations are shown.
Domain records are detailed separately.
end note
''',
'domain-records':r'''
top to bottom direction
class Input <<record>> {
  sessionId: long
  revision: int
  sessionName: String
  date, start, end: String
  students: List<Student>
  rooms: List<Room>
}
class Student <<record>> {
  id: long
  roll, name: String
  year: int
  branch, section: String
  revision: int
  + group(): String
}
class Room <<record>> {
  id: long
  code: String
  rows, benchesPerRow: int
  revision: int
  excluded: List<String>
  rowBenchCounts: List<Integer>
  + benchesInRow(row): int
  + usable(row, bench): boolean
}
class Seat <<record>> {
  studentId, roomId: long
  row, bench: int
  seat: String
}
class Capacity <<record>> {
  students, largestGroup: int
  usableBenches, physicalSeats: int
  requiredBenches, shortage: int
  pairs, singles: int
}
Input "1" --> "0..*" Student : roster values
Input "1" --> "0..*" Room : selected layouts
Seat ..> Student : studentId
Seat ..> Room : roomId
Capacity ..> Input : calculated from
note bottom of Room
rowBenchCounts defines actual positions.
benchesPerRow is the maximum row length.
end note
''',
'workflow':r'''
start
:Create or select one exam sitting;
:Add students and save appearing roster;
:Define layouts, select rooms, save exclusions;
if (Saved inputs complete?) then (yes)
else (no)
  :Show the next required step;
  stop
endif
if (Usable benches meet the group bound?) then (yes)
else (no)
  :Explain the bench shortage;
  :Keep the previous publication unchanged;
  stop
endif
:Allocate in Java;
:Independently validate actual placements;
if (Candidate is valid?) then (yes)
else (no)
  :Reject candidate without saving a partial plan;
  stop
endif
:Save immutable DRAFT and snapshots;
:Coordinator reviews every room;
if (Publish requested?) then (yes)
  :Lock writes and recheck freshness,
  conflicts and stored placements;
  if (All publication checks pass?) then (yes)
    :Commit status changes and current pointer together;
    :Enable current lookup and selected-version print;
  else (no)
    :Roll back and preserve the current publication;
  endif
else (no)
  :Keep draft private for later review;
endif
stop
''',
'allocation-sequence':r'''
autonumber
actor Coordinator as C
participant "Node / Java\nHTTP routing" as API
participant PlannerService as PS
participant Allocator as A
participant PlanValidator as V
database "H2 SQL\nvia Database" as DB
C -> API : POST generate(session)
API -> PS : generate(session)
PS -> DB : Begin consistent input read
DB --> PS : Input and source revisions
PS -> A : allocate(input)
A --> PS : Candidate seats
PS -> V : requireValid(input, seats, session)
V --> PS : Valid or exception
PS -> DB : Begin write transaction; lock guard
PS -> DB : Read current inputs and conflicts
DB --> PS : Current state
alt Fingerprint unchanged and room use valid
  PS -> DB : Insert DRAFT, snapshots, assignments
  PS -> DB : COMMIT
  DB --> PS : Plan identifier
  PS --> API : Draft identifier
  API --> C : Show validated private draft
else Inputs changed or a conflict exists
  PS -> DB : ROLLBACK
  PS --> API : Conflict or validation error
  API --> C : Explain correction; preserve current plan
end
note over API
The Node proxy and Java HTTP handler are condensed
into one transport lifeline in this interaction view.
end note
''',
'publication-sequence':r'''
autonumber
actor Coordinator as C
participant "Node / Java\nHTTP routing" as API
participant PlannerService as PS
participant PlanValidator as V
database "H2 SQL\nvia Database" as DB
C -> API : Confirm publish(plan)
API -> PS : publish(plan, false)
PS -> DB : BEGIN; lock coordinator_guard
PS -> DB : Read plan and owning session
DB --> PS : Status, snapshot and current pointer
alt Plan is already the current publication
  PS -> DB : COMMIT without a new version
  PS --> API : Success (idempotent)
else Plan is a fresh DRAFT
  PS -> DB : Re-read input revisions and room reservations
  DB --> PS : Current state
  PS -> V : requireValid(snapshot, storedSeats, session)
  V --> PS : Valid or exception
  alt Fresh, valid and no overlap
    PS -> DB : Old current plan -> SUPERSEDED, if present
    PS -> DB : Draft -> PUBLISHED; update current pointer
    PS -> DB : COMMIT all changes
    PS --> API : Publication confirmed
  else Stale, invalid or conflicting
    PS -> DB : ROLLBACK all changes
    PS --> API : Error; previous publication retained
  end
end
API --> C : Display final result
note over API
Node and Java HTTP routing are condensed here.
Service and SQL responsibilities remain separate.
end note
''',
'lookup-sequence':r'''
autonumber
actor Student as S
participant "student.js" as UI
participant "Node proxy" as N
participant "Java API /\nPlannerService" as J
database "Restricted SQL\npublication views" as DB
S -> UI : Select sitting and enter full roll
UI -> N : GET current assignment
N -> J : Forward request with internal token
J -> J : Normalize roll; preserve leading zeros
J -> DB : One join for current assignment\nand assigned-room geometry
alt A current assignment exists
  DB --> J : Matching seat and published bench positions
  J --> N : Assignment + roomLayout JSON
  N --> UI : JSON response
  UI -> UI : Highlight exact row, bench and A/B seat
  UI --> S : Show assignment and room map
else Unknown roll or no publication
  DB --> J : No matching row
  J --> N : 404 with useful message
  N --> UI : Error response
  UI -> UI : Clear any old map
  UI --> S : Explain no-result / waiting state
end
note over UI,DB
The map contains the matched room's saved geometry,
not other students' identities or seat occupancy.
end note
''',
'publication-state':r'''
[*] --> DRAFT : generate and validate
DRAFT --> PUBLISHED : publish [fresh and valid, no overlap]
DRAFT --> DISCARDED : discard
PUBLISHED --> SUPERSEDED : publish a replacement atomically
PUBLISHED --> WITHDRAWN : withdraw current publication
DISCARDED --> [*]
SUPERSEDED --> [*]
WITHDRAWN --> [*]
note right of DRAFT
Staleness is a derived input comparison,
not a separate stored status.
A stale draft cannot publish.
end note
note bottom of PUBLISHED
The session current pointer and PUBLISHED status
together determine public visibility.
Editing working inputs never rewrites this snapshot.
end note
note bottom
Terminal states end the version's lifecycle;
their records remain in history.
end note
''',
'architecture':r'''
top to bottom direction
package "Browser" {
  [Coordinator workspace] as CO
  [Student portal and seat map] as ST
}
component "Node HTTP server\nweb/server.mjs" as N
package "Java backend process" {
  [Server / JSON routing] as API
  [PlannerService] as PS
  [Allocator] as A
  [PlanValidator] as V
  [Database / JDBC] as JDBC
}
database "H2 relational database\nMasters, plan snapshots and views" as DB
CO --> N : HTTP / JSON
ST --> N : HTTP / JSON
N --> API : Loopback HTTP\ninternal token
API --> PS
PS --> A
PS --> V
PS --> JDBC
JDBC --> DB : Prepared SQL\ntransactions / restricted reads
note bottom of N
Node serves the pages and proxies APIs.
It contains no seating algorithm or direct SQL access.
end note
''',
'deployment':r'''
node "Coordinator browser" as CO
node "Student browser" as ST
cloud "Render Singapore" {
  node "Docker web service\nseyra-exam-planner\nFree compute plan" as CON {
    node "Node.js 24" as N {
      artifact "HTML / CSS / JS\nHTTP server and proxy" as W
    }
    node "Java 21 JRE" as J {
      artifact "Compiled planner classes\nH2 and Jackson JARs" as C
    }
    artifact "H2 practice database files\nEphemeral container storage" as DATA
  }
}
CO --> N : HTTPS
ST --> N : HTTPS
N --> J : HTTP on 127.0.0.1:8081
J --> DATA : JDBC file access
note bottom of CON
The public site exposes shared fictional practice data.
The normal laptop workspace is not uploaded.
A restart restores a published sample.
end note
''',
'object-model':r'''
object "exam : Input" as I {
  sessionId = 1
  sessionName = Synthetic Demo
}
object "aiStudent : Student" as S1 {
  id = 1
  roll = 0001
  year = 2
  branch = AI_ML
}
object "cseStudent : Student" as S2 {
  id = 31
  roll = 0031
  year = 2
  branch = CSE
}
object "hall : Room" as R {
  id = 2
  code = ROOM-30
  rowBenchCounts = [6,6,6,6,6]
}
object "placeA : Seat" as A {
  studentId = 1
  roomId = 2
  row = 1
  bench = 1
  seat = A
}
object "placeB : Seat" as B {
  studentId = 31
  roomId = 2
  row = 1
  bench = 1
  seat = B
}
I --> S1 : students
I --> S2 : students
I --> R : rooms
A ..> S1 : studentId
B ..> S2 : studentId
A ..> R : roomId
B ..> R : roomId
note bottom
One compatible pair from the actual fictional fixture.
The two years match; the branches differ, so sharing is valid.
end note
''',
'communication':r'''
object "coordinator : Browser" as C
object "proxy : NodeServer" as N
object "api : Server" as API
object "service : PlannerService" as PS
object "validator : PlanValidator" as V
object "store : Database" as DB
C --> N : 1: POST publish(plan)
N --> API : 1.1: forward HTTP request
API --> PS : 1.1.1: publish(plan, false)
PS --> DB : 1.1.1.1: lock and read\n1.1.1.3: switch statuses and commit
PS --> V : 1.1.1.2: validate stored placements
N --> C : 2: publication result
note bottom of PS
Numbered messages show ordering across object links.
Failure before commit rolls back the entire publication.
end note
''',
'er-model':r'''
top to bottom direction
entity branches {
  * code : VARCHAR(20) <<PK>>
  --
  label : VARCHAR(80)
}
entity students {
  * id : BIGINT <<PK>>
  --
  roll : VARCHAR(40) <<UQ>>
  name, study_year, section
  branch : VARCHAR(20) <<FK>>
  revision : INT
}
entity "exam_sessions" as sessions {
  * id : BIGINT <<PK>>
  --
  name, exam_date, start_time, end_time
  revision : INT
  current_plan_id : BIGINT <<nullable FK>>
}
entity "session_roster" as roster {
  * session_id : BIGINT <<PK, FK>>
  * student_id : BIGINT <<PK, FK>>
}
entity rooms {
  * id : BIGINT <<PK>>
  --
  code : VARCHAR(30) <<UQ>>
  row_count, benches_per_row, revision
}
entity "room_benches" as benches {
  * room_id : BIGINT <<PK, FK>>
  * row_no : INT <<PK>>
  * bench_no : INT <<PK>>
  --
  usable : BOOLEAN
}
entity "session_rooms" as selected {
  * session_id : BIGINT <<PK, FK>>
  * room_id : BIGINT <<PK, FK>>
}
entity "session_exclusions" as excluded {
  * session_id : BIGINT <<PK, FK>>
  * room_id : BIGINT <<PK, FK>>
  * row_no : INT <<PK>>
  * bench_no : INT <<PK>>
}
branches ||--o{ students
students ||--o{ roster
sessions ||--o{ roster
sessions ||--o{ selected
rooms ||--o{ selected
rooms ||--o{ benches
selected ||--o{ excluded : composite FK
note bottom of benches
One row per physical bench position.
Different row lengths do not create phantom positions.
end note
''',
'snapshot-er':r'''
top to bottom direction
entity "exam_sessions" as sessions {
  * id <<PK>>
  --
  current_plan_id <<nullable FK>>
}
entity plans {
  * id <<PK>>
  --
  session_id <<FK>>
  version_no, status, fingerprint
  snapshot, created_at, published_at
  UQ(session_id, version_no)
  UQ(session_id, id)
}
entity "plan_students" as ps {
  * plan_id <<PK, FK>>
  * student_id <<PK>>
  --
  roll, name, study_year, branch, section
  UQ(plan_id, roll)
}
entity "plan_rooms" as pr {
  * plan_id <<PK, FK>>
  * room_id <<PK>>
  --
  code, row_count, benches_per_row
}
entity "plan_benches" as pb {
  * plan_id <<PK, FK>>
  * room_id <<PK, FK>>
  * row_no <<PK>>
  * bench_no <<PK>>
  --
  usable : BOOLEAN
}
entity "assignments" as a {
  * plan_id <<PK, FK>>
  * student_id <<PK, FK>>
  --
  room_id, row_no, bench_no <<FK>>
  seat_label : A or B
  UQ(plan_id, room_id, row_no,
     bench_no, seat_label)
}
sessions ||--o{ plans : owns
plans ||--o{ ps
plans ||--o{ pr
pr ||--o{ pb : composite FK
ps ||--o| a : at most one assignment
pb ||--o{ a : 0..2 occupants (A/B)
note bottom of plans
The current pointer uses (session id, plan id)
to prevent a cross-session publication reference.
Historical student/room IDs have no master-data FK.
Guard and audit tables are operational and omitted here.
end note
''',
'dfd-context':r'''
left to right direction
rectangle Coordinator as C
usecase "0\nSeyra seating planner" as P
rectangle Student as S
C --> P : Roster, room layouts, sitting details,\nreview and publication commands
P --> C : Validation messages, drafts,\nversion history and exports
S --> P : Sitting and roll number
P --> S : Current assignment and room map\nor useful no-result message
note bottom of P
Context data-flow diagram, not a UML diagram.
Database details are inside the system boundary.
end note
''',
'dfd-level-one':r'''
top to bottom direction
rectangle Coordinator as C
rectangle Student as S
usecase "1.0\nManage saved inputs" as P1
usecase "2.0\nAllocate and validate" as P2
usecase "3.0\nReview and publish" as P3
usecase "4.0\nFind current seat" as P4
database "D1\nStudent, room and sitting relations" as D1
database "D2\nPlans and relational snapshots" as D2
database "D3\nCurrent-publication views" as D3
C --> P1 : Student / room / sitting changes
P1 --> D1 : Validated master and link rows
D1 --> P2 : Consistent saved input
P2 --> D2 : Validated private version
C --> P3 : Review / publish / withdraw
D2 --> P3 : Candidate and current plan
P3 --> D2 : Atomic lifecycle changes
P3 --> D3 : Current pointer drives views
S --> P4 : Sitting and roll
D3 --> P4 : Current assignment + saved geometry
P4 --> S : Seat and map / no result
note bottom
Logical data-flow view. D3 represents SQL views;
it is not a separate writable table or database.
end note
''',
}

# Keep the printed views compact enough for the college's portrait page format.
DIAGRAMS['class-model']=r'''
top to bottom direction
class Server {
  - service: PlannerService
  - demoService: PlannerService
  + main(args): void
  - handle(exchange): void
}
class PlannerService {
  - db: Database
  - allocator: Allocator
  - validator: PlanValidator
  + generate(session): long
  + publish(plan, testFailure): void
  + lookup(session, roll): Map
  + withdraw(session): void
}
class Database {
  + open(): Connection
  + reader(): Connection
  + read(work): T
  + transaction(work): T
}
class Allocator {
  + capacity(input): Capacity
  + allocate(input): List<Seat>
}
class PlanValidator {
  + validate(input, seats, session): List
  + requireValid(input, seats, session): void
}
Server -down-> PlannerService : delegates
PlannerService -right-> Database : uses JDBC wrapper
PlannerService *-down- Allocator
PlannerService *-down- PlanValidator
'''
DIAGRAMS['use-case']=r'''
left to right direction
actor Coordinator as C
actor Student as S
rectangle "Seyra" {
 usecase "Prepare sitting inputs" as INPUT
 usecase "Generate private draft" as GEN
 usecase "Check bench capacity" as CAP
 usecase "Validate placements" as VALID
 usecase "Review room-wise plan" as REVIEW
 usecase "Publish reviewed draft" as PUB
 usecase "Check freshness\nand room conflicts" as FRESH
 usecase "Print or export a version" as OUT
 usecase "Withdraw publication" as WITHDRAW
 usecase "Look up current seat" as LOOK
}
C --> INPUT
C --> GEN
C --> REVIEW
C --> PUB
C --> OUT
C --> WITHDRAW
S --> LOOK
GEN .> CAP : <<include>>
GEN .> VALID : <<include>>
PUB .> VALID : <<include>>
PUB .> FRESH : <<include>>
'''
DIAGRAMS['workflow']=r'''
start
:Create or select exam sitting;
:Add students and save roster;
:Select rooms and save exclusions;
if (Saved inputs complete?) then (yes)
else (no)
 :Explain the next required step;
 stop
endif
if (Enough usable benches?) then (yes)
else (no)
 :Show shortage; preserve current plan;
 stop
endif
:Allocate and independently validate;
if (Candidate valid?) then (yes)
 :Save complete private DRAFT;
 :Review the room-wise layout;
else (no)
 :Reject; keep previous publication;
 stop
endif
stop
'''
DIAGRAMS['publication-activity']=r'''
start
:Coordinator reviews a saved draft;
if (Publish requested?) then (yes)
else (no)
 :Keep draft private;
 stop
endif
:Begin SQL write and lock guard;
:Read current inputs and reservations;
:Check fingerprint and stored placements;
if (Fresh, valid and no conflict?) then (yes)
 :Mark previous current as SUPERSEDED;
 :Mark draft PUBLISHED;
 :Switch the session current pointer;
 :Commit all changes;
 :Enable current lookup;
else (no)
 :Roll back all changes;
 :Explain error; preserve current plan;
endif
stop
'''
DIAGRAMS['lookup-sequence']=r'''
autonumber
actor Student as S
participant "Student UI" as UI
participant "Node proxy" as N
participant "Java API\nand service" as J
database "SQL views" as DB
S -> UI : Sitting and roll
UI -> N : GET assignment
N -> J : Forward + token
J -> J : Normalize roll
J -> DB : Read current seat\nand saved layout
alt Current match
 DB --> J : Seat + geometry
 J --> N : Assignment JSON
 N --> UI : Forward JSON
 UI -> UI : Highlight A/B seat
 UI --> S : Position and map
else No current match
 DB --> J : No row
 J --> N : 404 + message
 N --> UI : Error JSON
 UI -> UI : Clear old map
 UI --> S : Useful no-result state
end
'''
DIAGRAMS['dfd-context']=DIAGRAMS['dfd-context'].replace('left to right direction','top to bottom direction')
DIAGRAMS['architecture']=DIAGRAMS['architecture'].split('note bottom of N')[0]
DIAGRAMS['publication-state']=r'''
[*] --> DRAFT : generate
DRAFT --> PUBLISHED : publish\n[fresh, valid, no overlap]
DRAFT --> DISCARDED : discard
PUBLISHED --> SUPERSEDED : publish replacement
PUBLISHED --> WITHDRAWN : withdraw
DISCARDED --> [*]
SUPERSEDED --> [*]
WITHDRAWN --> [*]
note bottom of DRAFT
Stale inputs block publication.
Staleness is derived, not a stored status.
end note
note bottom
All terminal records remain in history.
end note
'''
DIAGRAMS['object-model']=DIAGRAMS['object-model'].replace('I --> S1','I -left-> S1').replace('I --> S2','I -right-> S2').replace('I --> R','I -down-> R').split('note bottom')[0]
DIAGRAMS['allocation-sequence']=DIAGRAMS['allocation-sequence'].replace('Begin consistent input read','Read consistent input').replace('Input and source revisions','Input + revisions').replace('Candidate seats','Seats').replace('requireValid(input, seats, session)','validate candidate').replace('Begin write transaction; lock guard','BEGIN; lock guard').replace('Read current inputs and conflicts','Recheck inputs / conflicts').replace('Fingerprint unchanged and room use valid','Fresh and no conflict').replace('Insert DRAFT, snapshots, assignments','Save DRAFT + snapshots').replace('Inputs changed or a conflict exists','Stale or conflicting').replace('Explain correction; preserve current plan','Show error; keep current').replace('Show validated private draft','Show private draft')
DIAGRAMS['publication-sequence']=DIAGRAMS['publication-sequence'].replace('Begin consistent input read','Read snapshot').replace('Read plan and owning session','Read plan + session').replace('Status, snapshot and current pointer','Status + snapshot + pointer').replace('Plan is already the current publication','Already current').replace('COMMIT without a new version','COMMIT; no new version').replace('Plan is a fresh DRAFT','DRAFT').replace('Re-read input revisions and room reservations','Recheck input / reservations').replace('requireValid(snapshot, storedSeats, session)','validate stored seats').replace('Fresh, valid and no overlap','Fresh, valid, no overlap').replace('Old current plan -> SUPERSEDED, if present','Old current -> SUPERSEDED').replace('Draft -> PUBLISHED; update current pointer','Publish + switch pointer').replace('Error; previous publication retained','Error; preserve current').replace('COMMIT all changes','COMMIT')

for name,body in DIAGRAMS.items():
    (OUT/f'{name}.puml').write_text('@startuml\n'+STYLE+body+'\n@enduml\n',encoding='utf-8')
print(f'Wrote {len(DIAGRAMS)} editable PlantUML sources.')
