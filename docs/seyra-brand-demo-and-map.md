
## Seyra brand, demo and student map

Seyra uses an original SVG S mark with a highlighted mint dot, paired with “Every seat, in harmony.” The mark appears in both navigation headers and as the favicon. The existing local Java/Node/SQL architecture remains the application stack.

The guided practice at `/demo` is preloaded with 40 fictional students, a sitting and two room layouts. Six stage buttons explain the sitting, roster, usable benches, draft, publication and student view while navigating the actual coordinator. It supports real Java allocation and SQL persistence in an isolated H2 database per server run. Normal records, public lookup, local session selection and print links are separated from practice mode. The demo is shared between local tabs for that run and starts fresh after a server restart.

Student lookup now includes a spatial bench map with the exact assigned A/B seat highlighted, front/back orientation, row/bench labels, unavailable positions and a jump-to-seat button. Only the matched room's published bench geometry is returned; other students and seat occupancy are omitted. The map clears before another lookup and on a failed result. Published snapshots, not mutable room masters, define the geometry.

Executed: `npm test` passed 3,064 Java assertions (including 1,000 exhaustive allocation cases) and six Node tests. Added SQL tests verify published map geometry, uneven rows/exclusions, preserved history and absence of other identities. Nine focused CUA browser checks cover practice navigation, shortage/correction, generation, explicit publication, exact B-seat highlighting, failed-result clearing and context-preserving print. API checks verified normal/demo separation and the existing normal publication's 24-position room map. Evidence is in `output/seyra/`. The optional standalone Playwright source was updated for the practice route; it was not rerun. Existing exported report PDFs predate this addendum.
