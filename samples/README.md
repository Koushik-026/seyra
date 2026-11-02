# Synthetic fixtures

`web/public/sample-students.csv` is a valid quoted-comma/leading-zero example, available through the UI. `malformed-students.csv` deliberately contains duplicate/invalid records and should be rejected during preview.

The **Load synthetic demo** action creates the reproducible 30 AI-ML + 10 CSE case and 24/30-bench rooms in an empty database. Tests generate additional equal/unequal/odd/single-group, multi-room and corrupted fixtures in isolated databases.

No real student records are included.
