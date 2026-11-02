# Verification results

Recorded on 2 November 2026 for the working Seyra application.

## Current results

| Check | Observed result | Evidence |
| --- | --- | --- |
| Java allocation, validation and SQL suite | PASS: 3,068 assertions | `backend/src/test/java/planner/CoreTests.java`; local `output/tests/java-results.txt` |
| Independent exhaustive allocation oracle | PASS: 1,000 small group-count vectors, included above | Recursive partition search in `CoreTests.java` |
| Node assets, rendering and routing | PASS: seven tests | `tests/web.test.mjs` |
| Student repair browser checks | PASS: six focused local checks | Local `output/deployment/browser-results.json` |
| Live HTTPS browser workflow | PASS: seven focused checks | Local `output/deployment/` evidence; [repair review](student-repair-and-deployment.md) |
| Public HTTP health and isolation | PASS | Local `output/deployment/live-api-results.json` |
| DBMS routines, cursor and triggers | PASS, rerun during final documentation | `planner.DbLab`; local `output/tests/dbms-lab-results.txt` |

Assertion counts are not a code-coverage percentage or a count of independent end-to-end cases. The live and local focused checks supplement earlier interface checks; historical suites were not all rerun wholesale.

## Behavior exercised

The Java suite checks the bench-count formula against an independent oracle, the 30+10 example at 24 and 30 benches, deterministic allocation, same-year/branch restrictions, odd and single-group rosters, exact coverage, invalid placements, uneven 7/5/6 rows, exclusions and historical geometry.

Real H2/JDBC checks cover private drafts, restricted publication-view reads, denied base-table/write access, stale inputs, atomic publication and replacement, idempotent retry, deliberately injected rollback, immutable snapshots, all-or-nothing CSV import, overlapping and back-to-back sittings, retained published-room reservations, withdrawal and two-thread contention. The expected injected pre-commit SQLException in the log is part of the rollback test.

The live browser path covers fictional sample lookup, exact A/B highlighting, room layout, generation, explicit publication, refresh to version 2 and print preview. Public HTTP checks cover backend/SQL readiness, HTTPS origin handling and isolation of normal workspace APIs. A later service restart restores the starter fictional publication.

The isolated DBMS run returns 30 AI_ML and 10 CSE students, largest group 30, two group-report cursor rows, a correlated EXISTS result, a published assignment for roll 0001 and three INSERT/UPDATE/DELETE trigger events. The routines use H2 Java aliases and JDBC ResultSet traversal, not Oracle PL/SQL or MySQL procedure syntax.

## Environment and limits

Windows; Temurin JDK 21.0.13+9; Node.js 24.20.0; H2 2.4.240; Jackson 2.18.3. Application tests use synthetic isolated databases. The hosted service uses the root Dockerfile on Render and exposes a shared fictional workspace.

Native Swing interaction, physical printing, MySQL execution, large-load performance, backup/restore drills, a full accessibility audit and production security testing remain unverified. Swing classes compile and browser print preview was exercised. The free hosted service uses temporary storage and resets fictional data on restart.

Local logs and generated personalized submissions are excluded from GitHub. The maintained public reports are [Java](java/REPORT.md), [Web](web/REPORT.md), [DBMS](dbms/REPORT.md) and [Software Engineering](se/REPORT.md). Older interface review files are dated records of their respective revisions.
