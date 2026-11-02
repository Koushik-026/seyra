# Lab evidence map

One integrated project has been approved for the four labs, with a separate report for each. The implemented stack is Java, HTML/CSS/JavaScript with Node.js, and H2 SQL. The reports describe that implementation rather than proposed frameworks.

## Java Programming

Records and composition model Student, Room, Input, Seat and Capacity. Collections implement deterministic grouping and priority-queue pairing. The backend demonstrates exceptions, functional interfaces, lambdas, file/CSV handling, bounded HTTP threading and JDBC resource management. The independent validator and SQL integration tests are executed evidence. The optional Swing client compiles; its native interaction is not part of the recorded browser run.

## Database Management Systems

`database/schema.sql` contains 15 application tables and three publication views. The DBMS report explains candidate/composite keys, foreign keys, checks, dependencies, normalization, historical snapshots, aggregation, joins, restricted reads and atomic publication. Executed H2 tests cover rollback, freshness, contention and history.

`node scripts/dbms-lab.mjs` runs stored Java aliases, JDBC ResultSet cursor traversal and INSERT/UPDATE/DELETE triggers in an isolated fictional database. The optional MySQL schema is not verified. H2 routines must not be relabeled as Oracle PL/SQL or MySQL stored programs.

## Web Technologies

The browser uses HTML forms, responsive CSS, JavaScript events, Fetch, loading/error states and shared room rendering. Node's built-in HTTP server serves pages and proxies the Java API. Student and coordinator workflows have been checked locally and on Render HTTPS. The implemented server does not use Express, React, Django or JWT. Roll lookup is a publication search, not a login.

## Software Engineering

The SE report provides requirements, acceptance conditions, nine useful UML diagram types, context and level-one DFDs, component/deployment design, traceability and test strategy. ER diagrams accompany the database report. PlantUML sources and rendered exports are maintained together.

## Scope of these reports

These four reports document the approved shared project. They do not claim to be completed records of every standalone experiment printed in the syllabus. For example, the shopping-cart exercise, applets, servlet/session programs and a second SE case study are separate exercises, rather than hidden features of this planner.

The supplied syllabus locations used during planning were Java lab pages 13-14, SE page 15, DBMS page 16 and Web pages 17-18 of the PDF. Current source and recorded outcomes take precedence over earlier proposal notes. See [verification results](verification-results.md) and [report preparation](reports.md).
