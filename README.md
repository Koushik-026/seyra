# Seyra

Seyra is an exam seating planner for coordinators and students. It turns a saved roster and room layout into a seating plan, checks the assignments, and publishes the version students can look up.

[Live demo](https://seyra-exam-planner.onrender.com) · [Student portal](https://seyra-exam-planner.onrender.com/student)

## Try it

The demo includes 40 fictional students and two rooms. Open the student portal and use **0001** or **0031** to see a seat highlighted in its room.

In the coordinator workspace, you can change the roster or rooms, generate a new draft, review it, and publish it. The public demo is shared and resets when the service restarts. Use fictional details only; the first visit after inactivity may take a little longer.

## Run locally

Install **Java 21** and **Node.js 20 or later**. Node.js 24 is the tested version.

```sh
git clone https://github.com/Koushik-026/seyra.git
cd seyra
node scripts/download-libraries.mjs
npm start
```

Open `http://127.0.0.1:3000`. The guided example is at `/demo`; your own saved workspace is at `/`. Local records are stored in `data/`.

On Windows, `scripts/setup.ps1` can set up the portable Java tools and libraries. After setup, `Start Planner.cmd` starts the app.

## How seating works

Each usable bench has two seats. Students may share a bench when their **years differ or their branches differ**. Students with the same year and branch sit on different benches, even if their sections differ. A student can sit alone.

Rooms can have different bench counts in each row. Damaged or missing benches can be excluded. The planner checks bench capacity, validates every assignment, and keeps drafts separate from published plans. Changing the inputs does not rewrite an older publication.

## Stack

- **Java:** allocation, validation, HTTP API and JDBC.
- **Node.js:** page serving and the API proxy.
- **HTML, CSS and JavaScript:** coordinator workspace, student lookup and room maps.
- **H2 SQL:** local persistence, constraints, transactions and publication views.

The Dockerfile runs the same Java and Node application on Render. The hosted version exposes the fictional demo; local exam records are kept separately.

## Tests

```sh
npm test
```

The tests cover allocation against an exhaustive oracle, malformed inputs, uneven rooms, SQL integrity, publication rollback, stale drafts, concurrent room reservations and web routes. Browser and live-deployment evidence is recorded in the documentation.

## Documentation

- [Java](docs/java/REPORT.md)
- [Web Technologies](docs/web/REPORT.md)
- [DBMS](docs/dbms/REPORT.md)
- [Software Engineering](docs/se/REPORT.md)
- [API](docs/api.md) and [verification results](docs/verification-results.md)
- [Diagrams](docs/diagrams/README.md)

The four lab reports explain the same project from different subject perspectives. [Report preparation](docs/reports.md) describes the editable sources and local Word/PDF build. Personalized submission copies stay outside the public repository.
