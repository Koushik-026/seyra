# Student dashboard repair and Render deployment

The reported failure was reproduced on the practice student page: its fresh demo sitting had no publication, so the only lookup button was disabled. The demo now starts with an independently validated published example. Roll 0001 is ready at Seat A; roll 0031 is ready at Seat B. Normal exams still require explicit publication.

Student lookup now selects a sole published exam, offers demo sample-roll buttons, displays connection/ready/waiting states, and provides Refresh exam list. It refreshes on focus/visibility changes and every 30 seconds while visible. Changes or withdrawal of the shown publication clear the old assignment/map; refresh can recover without a page reload. A failed exam-list request disables lookup and clears the old seat until the current publication is checked.

Deployment keeps Java 21 as the allocator/API and H2 SQL/JDBC behind Node. The Docker build downloads the four pinned, checksum-verified JARs and compiles Java. Node binds to 0.0.0.0 only in PLANNER_PUBLIC_DEMO mode; Java remains on loopback. HTTPS browser origins work behind the host proxy. Public deployment exposes only the fictional practice APIs, redirects student/print URLs to practice mode, and blocks access to the normal workspace APIs. A reviewed 54-file source snapshot was pushed to the user-specified Koushik-026/seyra repository; no local database, credentials, JDK, generated outputs or private student records were copied.

Executed npm test: 3,068 Java assertions including 1,000 exhaustive allocation cases; seven Node tests pass. New tests cover fresh published demo A/B lookup, withdrawal, hosted root/student/print routing, HTTPS origins and normal-API isolation. Focused browser checks reproduced and verified immediate A/B lookup, refresh, withdrawal and replacement recovery. The optional standalone Playwright source was updated but not rerun in this repair.

Render target: confirmed My Workspace; free Docker web service in Singapore, seyra-exam-planner. Source commit b47cd32c00b44ee7462d32e8aab955a9daa643e7. Build/runtime/public-URL verification is recorded after the deployment finishes. Free-tier demo changes are temporary and reset with a service restart; this deployment is not durable college-record storage. The normal laptop workspace remains separate.

## Live deployment verification

The first Render Docker build became live successfully on 2 November 2026. Live browser verification passed for the published starter, exact A/B highlights, 30 actual bench positions, HTTPS coordinator generation, explicit publication, student refresh to version 2 and print preview. Seven live checks and six focused local checks are recorded in output/deployment/browser-results.json. Live HTTP checks verify Java 21/SQL readiness, published geometry, 403 for normal-workspace access and 403 for unrelated browser origins. A final web-only update clarifies shared-demo navigation; its Node checks passed and Render auto-deploys it from main.

Public URL: https://seyra-exam-planner.onrender.com
Student URL: https://seyra-exam-planner.onrender.com/student
Render service: srv-dbkar4jbc2fs73eu0g00
Source: https://github.com/Koushik-026/seyra

Final revision 359e3477b81d010f718ab777a3df65d1d7cf0643 became LIVE through Render auto-deploy (dep-dbkatqeq1p3s73bm5no0). Rechecked immediate Seat B lookup, 30 positions, public-demo HTML marker, accurate shared-demo links and Java/SQL health on that revision. The expected restart restored the starter to version 1. Final summary: output/deployment/final-deployment.json. The existing laptop workspace still contains its four students and one sitting; the local demo also has a published example.
