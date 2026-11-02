# Verification plan

Version 0.1, 2 November 2026. These are expected outcomes, not test results. Every application case below is NOT RUN because the application does not exist yet.

Use synthetic rolls such as `0001`, `0002`; keep names fictional. Test branch codes are canonical. A notation such as `A=30,B=10` describes distinct year-and-branch groups, not sections. Unless stated otherwise, all students may use all selected rooms and benches have two seats.

## Capacity and allocator cases

| Test | Requirements | Input | Expected outcome |
| --- | --- | --- | --- |
| A01 | R01,R02,R07 | A=4,B=4; 4 benches | 4 valid pairs, no singles; all 8 assigned once. |
| A02 | R01,R02,R07 | A=5,B=2; 5 benches | 2 pairs, 3 singles; minimum 5 benches. |
| A03 | R01,R02,R07 | A=3,B=2; 3 benches | 2 pairs, 1 single. |
| A04 | R01,R02,R07 | A=5 only; 5 benches | 5 singles; with 4 benches, shortage 1. |
| A05 | R01,R02,R07 | A=30,B=10; 24 benches | Reject generation; required 30, physical seats 48, shortage SIX BENCHES. |
| A06 | R01,R02,R07 | Same roster; 30 benches | 10 pairs and 20 singles, complete independent validation. |
| A07 | R02,R07 | A=2,B=2,C=2; 3 benches | 3 pairs; detects failure to maintain heap order/tie handling. |
| A08 | R07 | Empty roster | Clear validation error; no crash, draft or publication. |
| A09 | R01,R07 | One student; 1 bench | Seat A occupied, B empty; with 0 usable benches, shortage 1. |
| A10 | R02 | Same year/branch, sections A/B | Cannot share a bench. |
| A11 | R02 | Same year, different branches | May share. |
| A12 | R02 | Different years, same branch | May share. |
| A13 | R03,R05,R07 | Room X: 2x3, Room Y: 1x2, two excluded benches total; A=6,B=6 | 6 usable benches and 6 pairs; no excluded bench used. |
| A14 | R05,R07 | No selected rooms; then all benches excluded | Clear distinct capacity/input feedback; no saved incomplete plan. |
| A15 | R07,R10 | Same logical input in shuffled import/SQL order; regenerate | Identical placements under the specified sorting policy, separate version IDs, no duplicate assignment accumulation. |

After Java implementation, compare the greedy output against an independent brute-force minimum-bench oracle for small group-count vectors (for example up to 10 total students and up to 4 groups). Enumerate or search compatible pair/single partitions; do not merely reimplement the same greedy method. Assert the actual bench count equals the oracle optimum and the stated formula. This is a planned meaningful property check, not a completed proof by testing.

## Data, import, room and time cases

| Test | Requirements | Scenario | Expected outcome |
| --- | --- | --- | --- |
| D01 | R04 | `0001` imported and saved | Leading zeros survive Java, SQL, portal and raw CSV export. |
| D02 | R04 | Rolls ` ab01 ` and `AB01`, duplicate within file and saved master | Same canonical roll; duplicates visible; no silent overwrite. |
| D03 | R04 | Missing columns/name, invalid year, embedded roll whitespace, unknown branch | Row/field errors; no accepted batch until corrected. |
| D04 | R04,R10 | Valid quoted comma in name, UTF-8 text, optional blank section; malformed quote in another file | Valid CSV parses; malformed file reports error and changes no roster/publication. |
| D05 | R04,R10 | Another operation creates duplicate after preview | Commit recheck fails cleanly; entire batch rolls back. |
| D06 | R04 | Add same student to one roster twice, then to a different session | Same-session duplicate rejected; different-session membership allowed. |
| D07 | R05 | Room layouts with differing dimensions and exclusions | Correct stable coordinates, seat labels and usable counts. |
| D08 | R06 | End <= start or invalid date/time | Reject before save; no malformed reservation. |
| D09 | R06 | Same room 09:00-10:00 and 09:59-11:00, same date | Conflict rejected on saved room reservation and rechecked at publication. |
| D10 | R06 | Same room 09:00-10:00 and 10:00-11:00 | Allowed under [start,end) rule. |
| D11 | R06 | Identical times in different rooms; same clock time on different dates | Allowed. |
| D12 | R04,R11 | Edit student year/branch after draft; edit room layout after draft | Draft becomes stale; publication rejected until regeneration; prior publication unchanged. |
| D13 | R04,R11 | Roster/room-selection/exclusion edit after draft | Revision mismatch detected; old candidate cannot publish. |
| D14 | R06,R11 | Change working room selection while old publication uses old room | New room is checked/reserved; old published room remains reserved. |
| D15 | R06,R11 | Attempt schedule edit with current publication | Explain withdrawal requirement; published schedule remains unchanged. |

## Publication, database and portal cases

| Test | Requirements | Scenario | Expected outcome |
| --- | --- | --- | --- |
| P01 | R08,R09,R13 | Save valid draft; query portal | Draft absent from public sessions/assignments. |
| P02 | R09,R13 | Publish draft explicitly | Complete current plan visible with correct version. |
| P03 | R09,R10,R11 | Publish replacement | One current pointer; former plan SUPERSEDED; no mixed-version result. |
| P04 | R10 | Inject DB failure after status updates but before commit | Transaction rollback preserves old status/pointer/assignments/reservations. |
| P05 | R10 | DB failure while saving a new draft/import | No partially committed draft/import; old publication unchanged. |
| P06 | R06,R09,R10 | Two connections attempt overlapping room reservations/publications | Guard serializes writes; second sees committed conflict and fails or waits safely. |
| P07 | R10 | Duplicate publish click/retry; lost connection after commit attempt | No extra version/duplicate rows; reload authoritative current state before retry. |
| P08 | R11,R12,R13 | Edit student name/year/branch and room layout after publication | Existing plan/history/export remains the original snapshot; new draft uses new inputs. |
| P09 | R09,R13 | Withdraw current publication | Pointer cleared atomically; portal no longer returns assignment; history remains WITHDRAWN. |
| P10 | R13 | Unknown roll, malformed roll, unpublished/withdrawn session | Clear no-result/validation message, no draft data. |
| P11 | R13 | Publish while lookup runs | Response is one complete old or new version; next uncached lookup sees current. |
| P12 | R14 | Use Node DB credentials for view SELECT, base-table SELECT and INSERT/UPDATE/DELETE | Published view SELECT succeeds; other access denied. |
| P13 | R13,R14 | SQL-like input, server DB outage | Parameterized query treats input as data; useful 503 feedback; no SQL/secret exposure. |
| P14 | R12 | Multi-room print/export, draft/history/current versions | Correct status/version labels, all rooms represented, legible page boundaries, rolls preserved in raw data. |

## Independent validator rejection cases

Create separate deliberately corrupted candidate fixtures; do not rely only on database constraints rejecting them before the validator can be exercised.

| Test | Requirements | Corruption | Expected outcome |
| --- | --- | --- | --- |
| V01 | R08 | Omit a roster student | Reject incomplete roster coverage. |
| V02 | R08 | Assign one student twice | Reject duplicate student. |
| V03 | R08 | Add outside-roster student | Reject unknown membership. |
| V04 | R08 | Put two students in seat A or use seat C | Reject duplicate/invalid seat. |
| V05 | R01,R08 | Put three students on a bench | Reject occupancy above two. |
| V06 | R02,R08 | Same year/branch pair with different sections | Reject incompatible pair. |
| V07 | R05,R08 | Use unselected room, nonexistent bench or excluded bench | Reject each independently. |
| V08 | R08 | Mix another session/plan's assignment or snapshot reference | Reject ownership/version mismatch. |
| V09 | R08 | Forge assignment grouping attributes to conceal invalid pairing | Read authoritative student snapshot; reject pair. |

## UI and test evidence

- Swing: validate error placement, background responsiveness, EDT updates and recovery after failed work. No manual seat editor in v1.
- Browser: test keyboard-only use, meaningful form labels, loading/errors, small-screen layout and replacement/withdrawal handling.
- Integration: use the actual selected database version and restricted accounts; in-memory unit tests cannot establish locking/grants/rollback behavior.
- White-box evidence: exercise allocator loop with 0/1/2+ groups, validator failure branches, stale-input branch and transaction rollback/recovery paths.
- Black-box evidence: CSV-to-draft-to-publication-to-lookup flow, both 30+10 capacity cases and room conflicts.
- Print verification: inspect actual previews/printed PDF output when printing exists. Do not fabricate screenshots or timings.

For each executed test record commit/build, environment and DB version, input fixture, expected outcome, actual outcome, PASS/FAIL, relevant log/screenshot artifact, defect reference and retest. Keep expected outcomes separate from observed results. No performance benchmark threshold or passing count has been invented.
