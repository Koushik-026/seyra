# Current design

Seyra is implemented as Java 21 business services and JDBC, H2 SQL storage, a built-in Node HTTP server, and HTML/CSS/JavaScript pages. It is deployed as a fictional shared demo on Render.

The current requirements, acceptance conditions and traceability matrix are in the [Software Engineering report](se/REPORT.md). Its figures describe the implemented responsibilities and publication lifecycle. See the [diagram index](diagrams/README.md) for editable sources, including ER and data-flow views. The [DBMS report](dbms/REPORT.md) explains the actual 15 tables and three publication views; the [API reference](api.md) describes the HTTP contract.

The earlier proposal has been consolidated into those reports. React, Django, JWT, separate RoomLayoutRevision/RoomReservation tables and a managed hosted database are not features of this implementation. Room conflicts and historical layouts are handled by the actual service protocol and plan snapshot tables. Future authentication, durable hosting and additional seating constraints need their own design and verification.
