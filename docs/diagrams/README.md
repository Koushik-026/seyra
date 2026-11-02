# Diagrams

The figures describe the implemented Seyra application. Each has an editable `.puml` source, a vector `.svg`, and a high-resolution `.png`. The reports use selected figures for each subject; the Software Engineering report uses the broader design set.

| View | Files | Purpose |
| --- | --- | --- |
| Use case | `use-case` | Coordinator and student goals, required validation |
| Class | `class-model`, `domain-records` | Java responsibilities and immutable domain records |
| Activity | `workflow`, `publication-activity` | Saved inputs, draft preparation and publication decisions |
| Sequence | `allocation-sequence`, `publication-sequence`, `lookup-sequence` | Ordered calls, transaction boundaries and error paths |
| State machine | `publication-state` | Allowed plan lifecycle transitions |
| Component | `architecture` | Browser, Node, Java and SQL responsibilities |
| Deployment | `deployment` | The running Render Docker service and process boundaries |
| Object | `object-model` | One concrete compatible pair from the fictional fixture |
| Communication | `communication` | Numbered publication messages between objects |
| ER | `er-model`, `snapshot-er` | Current relational data and immutable plan snapshots |
| Data flow | `dfd-context`, `dfd-level-one` | System boundary and logical flows; these are not UML diagrams |

Regenerate after installing Python, Java 21 and Node.js:

```sh
node scripts/setup-documentation.mjs
python scripts/write-uml-sources.py
node scripts/render-uml.mjs
```

PlantUML 1.2026.9 runs locally with its built-in Smetana layout engine. Graphviz and an online rendering service are not required. The setup script verifies the downloaded JAR checksum. Java must be able to find a serif font; the report preparation environment uses Times New Roman.

Only useful views are included. Timing, profile and composite-structure diagrams would add notation without representing an implemented requirement here. In the interaction figures, the Node and Java HTTP transport may be condensed into one labelled lifeline; the accompanying caption makes that boundary explicit. Historical sketch sources are not the design authority for this revision.
