# Development record

This record describes the completed revisions. The current application and four maintained subject reports are the final reference; early proposals have been consolidated.

## Allocation and SQL baseline

Implemented the Java grouping and priority-queue allocator, independent validator, JDBC persistence, constraints, immutable plan snapshots and explicit publication. Verified the minimum bench formula with an exhaustive small-case oracle and tested SQL rollback, stale drafts, restricted readers and overlapping room reservations. The isolated DBMS exercise demonstrates H2 routines, cursor traversal and triggers.

## Interface and workflow

Reworked the coordinator and student pages, corrected shared create/edit state, and introduced visible steps with contextual input help. Room layouts now store actual counts per row such as 7/5/6, with default and session-specific exclusions. Allocation, validation, SQL snapshots and browser maps use those same positions. Focused browser checks accompanied each revision.

## Seyra and the student map

Added the Seyra identity, a guided fictional practice workspace, and the student's exact A/B position in the published room. The practice has a separate database from saved local exams. Historical room geometry remains stable after master edits.

## Student repair and deployment

Fresh practice starts with a published fictional example. Student links retain practice mode; loading, withdrawal and version changes clear stale maps. The Docker deployment runs Node publicly and Java on loopback, with H2 inside the container. Normal workspace APIs are blocked in the public demo. The free Render instance has temporary storage and can sleep when idle.

The final runtime checks passed 3,068 Java assertions including 1,000 exhaustive vectors, seven Node tests, six focused local browser checks and seven live HTTPS checks. Details and verification limits are in [verification-results.md](verification-results.md).

## Final documentation

Replaced accumulated proposal/addendum reports with four coherent subject reports. Updated the README using the compact description/setup/example/documentation pattern seen in Express and Flask. Added 17 locally rendered design figures with editable PlantUML sources, including nine UML types, two ER models and two DFDs. Prepared separate college-format Word and PDF submission copies with front matter and subject emphasis. Personalized files, private metadata, local execution logs and databases stay outside the public repository.

The runtime is locked for this documentation revision. Source synchronization retains the working deployment files and uses a documentation-only commit to avoid resetting the shared demo.
