# Workflow and uneven-room review — 2 November 2026

## User-facing behavior

The coordinator now has five persistent steps: Session → Students → Rooms → Review draft → Publish. Its next action follows saved prerequisites and unsaved changes. Creating a session opens Students. Notes distinguish reusable student/room records from the roster and rooms selected for one exam. Continue/generate/publish controls block unsaved prerequisites; capacity shortages explain how many usable benches are missing. Draft generation remains separate from explicit publication. After publication, the guide recommends the published version rather than an older draft.

Room creation supports uniform rows or individual row counts. A visual map replaces coordinate entry for default and temporary unavailable benches. The live summary reports bench positions, unavailable benches, usable benches and seats. Maps use “Row 3, Bench 4”; inline help explains that the earlier `3:4` and `1:2` labels describe locations, never ratios or dimensions. A/B are two seats on the same bench. Missing internal positions can be excluded without shifting later numbering. These are numbered bench maps; aisles, distances and arbitrary spatial polygons are outside the model.

## Logic and persistence

`Room.rowBenchCounts` is the actual geometry. For rows 7/5/6 there are 18 positions, not a 3×7 rectangle. Capacity, allocation, independent validation, JSON snapshots, relational plan snapshots and both screen/print rendering use the actual positions. Exclusions must fall within the relevant row. Default and session exclusions combine as a set. Existing session exclusions prevent shortening a room past their saved positions until the exclusions are removed.

No SQL schema migration is required: `room_benches` already stores individual row/bench positions. `benches_per_row` retains the maximum row length for metadata and legacy clients. Old rectangular snapshots without `rowBenchCounts` deserialize into repeated uniform counts. Freshness compares canonical deserialized input, keeping old snapshots readable/publishable without modifying history. Published snapshots and lookup retain their original geometry after later layout edits.

The bench-sharing rule remains different year OR different branch; section is irrelevant. Minimum benches = max(ceil(N/2), largest year/branch group), under the existing assumptions of two seats per usable bench, all students eligible for all rooms, no fixed seats and whole-bench exclusions. Uneven rows change the available positions, not that formula. No adjacency or cheating-prevention guarantee is claimed.

## Executed evidence

- `npm test`: PASS, 3,059 Java assertions, including 1,000 exhaustive group-count oracle comparisons; five Node tests pass.
- Added real H2/JDBC checks for uneven geometry, capacity, snapshot persistence, invalid row counts/exclusions, phantom-seat rejection, guarded resizing, stale drafts and preserved publication lookup. Added old-JSON publication compatibility coverage.
- 16 focused CUA browser checks in `output/workflow-review/browser-results.json`, performed against an isolated fictional database on ports 3001/8184. The path included create sitting, add roster, save 7/5/6 room, default/session exclusions, dirty-state guidance, generate, review, explicit publish, student lookup, print and edit round trip.
- Screenshot: `output/workflow-review/room-editor.png` shows the per-row editor, bench toggles and expanded explanatory note.
- Browser testing caught a post-generation notification reference error and a next-action navigation callback reading a dataset after rerender; both were corrected and their affected flows retested successfully.
- The optional standalone Playwright regression source was adapted to the guided action and blocked-shortage behavior; it was not rerun in this review. No new physical-printer, mobile-runtime, Swing-window or MySQL claim is made.

The four lab Markdown reports link to this review. Existing exported report PDFs remain the earlier baseline; this file records the later implementation evidence.
