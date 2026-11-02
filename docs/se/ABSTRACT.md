Seyra prepares examination seating plans from a saved roster and actual room layouts. Students sharing a bench must differ in year or branch, while single occupancy remains valid. The system calculates the required number of benches, generates a deterministic draft and independently validates every placement before publication.

Requirements, design models and test evidence explain how the implemented workflow meets its stated scope. This report concentrates on useful UML views, data flow, traceability, failure cases and maintenance decisions.

The completed application uses Java 21, Node.js, HTML, CSS, JavaScript and H2 SQL. Published plan snapshots retain their own student and room facts. A student lookup shows only the matched current assignment and its room position. Automated allocation and SQL checks, focused local browser checks and live HTTPS checks support the reported behavior. The public Render service is a shared fictional demonstration with temporary storage.
