# Seyra

Every seat, in harmony.

Java 21 HTTP backend, SQL/JDBC persistence, and HTML/CSS/JavaScript served by Node.js.

## Local setup

Install Java 21 and Node.js 24, then run:

```sh
node scripts/download-libraries.mjs
npm test
npm start
```

Open http://127.0.0.1:3000/demo. The practice starts with a published fictional example: roll 0001 is seat A, roll 0031 is seat B.

## Render

Deploy the root Dockerfile as a free web service. It builds Java and downloads checksum-verified JDBC/JSON libraries. The image defaults to PLANNER_PUBLIC_DEMO=1: only the fictional workspace is exposed. Normal saved laptop records are not included. The public demo is shared; do not enter personal records. Changes reset after a service restart. A free Render service sleeps when idle and does not provide persistent disk storage.

Root and student/print links retain practice mode. Java remains internal on loopback; Node listens on the Render PORT. The /api/health route reports backend readiness.
