import type { Project } from "@/engine/types";
import { chapter1 } from "./csharp-api/ch1.ts";
import { chapter2 } from "./csharp-api/ch2.ts";
import { chapter3 } from "./csharp-api/ch3.ts";
import { chapter4 } from "./csharp-api/ch4.ts";
import { chapter5 } from "./csharp-api/ch5.ts";
import { cs } from "./csharp-api/util.ts";

/**
 * Crux Desk: the booking platform behind a chain of climbing gyms, built by hand in the .NET style.
 *
 * How it works (see docs/ARCHITECTURE.md, "Server languages"):
 *  - The program is a top-level-statements file. Lesson 1 carries the provided `Board` and `Capture`
 *    helpers under the divider (engine/compose.ts): `Board.Show("key", value)` prints one `@scene {json}`
 *    line that the console and the lesson checks read as `scene.key`.
 *  - `setup` is the program's stdin: a recorded traffic capture in labelled sections (`## smoke`,
 *    `## routing` ...). Each lesson replays its own section; the last one replays `## day`. The tokens in
 *    the capture are signed with the course secret used in lesson 8.
 *  - Lesson 3 provides `Lab.Replay` and lesson 5 provides the `Platform` module list, so lessons 5 to 19
 *    grow the program by registering modules (services, middleware, routes) with a phase.
 *
 * Scene keys: requests response routes pipeline di endpointTable endpoints problems bookings rows minted
 * auth ratelimit buckets idempotency ledger caching ops telemetry health resilience outbox outboxQueue
 * rollout flags tests versions day report.
 */
export const csharpApi: Project = {
  slug: "csharp-api",
  language: "csharp",
  prerequisites: ["csharp-delegates"],
  // stdin for the whole course: the recorded traffic, in labelled sections
  setup: cs`## smoke
0 GET /gyms/2
40 GET /gyms/2/slots?day=2031-06-14&level=beginner | X-Request-Id: r-17; Accept: application/json
75 POST /bookings | Content-Type: application/json | {"slotId":12,"climbers":2}
110 GET /slots/12
150 GET /gyms/2/slots?day=Sat%2014&note=a+b
## routing
10000 GET /gyms
10010 GET /gyms/2
10020 GET /gyms/leeds
10030 GET /gyms/search
10040 GET /Gyms/3/slots/
10050 GET /gyms/abc/slots
10060 GET /slots/2031-06-14
10070 GET /slots/12
10080 DELETE /gyms/2
10090 POST /gyms/2/slots
10100 GET /nowhere
## pipeline
20000 GET /gyms/2
20030 GET /boom
20060 GET /admin/ping | X-Admin-Key: wrong
20090 GET /admin/ping | X-Admin-Key: crux-ops
20120 GET /admin/other | X-Admin-Key: crux-ops
20150 DELETE /gyms/2
20180 GET /nowhere
## endpoints
30000 GET /gyms
30010 GET /gyms?city=Leeds
30020 GET /gyms/2
30030 GET /gyms/9
30040 GET /gyms/1/slots?day=2031-06-14
30050 GET /gyms/1/slots?day=tomorrow
30060 GET /slots/12
30070 POST /quotes | Content-Type: application/json | {"slotId":12,"climbers":3}
30080 POST /quotes | Content-Type: application/json | {"slotId":12,"climbers":
30090 POST /quotes
## problems
40000 POST /bookings/check | Content-Type: application/json | {"slotId":12,"climbers":2,"name":"Priya"}
40010 POST /bookings/check | Content-Type: application/json | {"slotId":0,"climbers":12,"name":"  "}
40020 POST /bookings/check | Content-Type: application/json | {"slotId":12,"climbers":2
40030 GET /drill/conflict
40040 GET /drill/crash
40050 GET /missing
40060 DELETE /drill/conflict
## bookings
50000 POST /bookings | Content-Type: application/json | {"slotId":21,"climbers":4,"name":"Priya"}
50010 POST /bookings | Content-Type: application/json | {"slotId":21,"climbers":3,"name":"Ben"}
50020 GET /bookings/1
50030 PUT /bookings/1 | Content-Type: application/json | {"version":1,"climbers":2}
50040 PUT /bookings/1 | Content-Type: application/json | {"version":1,"climbers":6}
50050 POST /bookings | Content-Type: application/json | {"slotId":21,"climbers":4,"name":"Ben"}
50060 GET /bookings/42
50070 POST /bookings | Content-Type: application/json | {"slotId":99,"climbers":1,"name":"Zed"}
## auth
60000 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys | Content-Type: application/json | {"slotId":31,"climbers":2,"name":"Mika"}
60100 GET /bookings/1 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys
60200 GET /bookings/1 | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0
60300 GET /bookings/1 | Authorization: Bearer eyJzdWIiOjExLCJyb2xlIjoic3RhZmYiLCJleHAiOjkwMDAwMDAwfQ.0h7ayhFhGoPQaBGNqORBkDgz8-Rd75OL54HWyC3Bj68
60400 GET /bookings/1
60500 GET /bookings/1 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjUwMH0.9pkz-aG-4ya51g5LQqvhCw0LUxH5b3pv3w-6kpEOArE
60600 GET /bookings/1 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJhZG1pbiIsImV4cCI6OTAwMDAwMDB9.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys
60700 GET /staff/slots/31/bookings | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0
60800 GET /staff/slots/31/bookings | Authorization: Bearer eyJzdWIiOjExLCJyb2xlIjoic3RhZmYiLCJleHAiOjkwMDAwMDAwfQ.0h7ayhFhGoPQaBGNqORBkDgz8-Rd75OL54HWyC3Bj68
60900 GET /gyms/2
## ratelimit
70000 GET /gyms | X-Client: a
70100 GET /gyms | X-Client: a
70200 GET /gyms | X-Client: a
70300 GET /gyms | X-Client: a
70400 GET /gyms | X-Client: a
70500 GET /gyms | X-Client: a
70600 GET /gyms | X-Client: a
70650 GET /gyms | X-Client: b
72000 GET /gyms | X-Client: a
72100 GET /gyms | X-Client: a
72200 GET /gyms | X-Client: a
72300 GET /gyms | X-Client: a
## idempotency
80000 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Idempotency-Key: k-100; Content-Type: application/json | {"slotId":11,"climbers":2,"name":"Priya"}
80050 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Idempotency-Key: k-100; Content-Type: application/json | {"slotId":11,"climbers":2,"name":"Priya"}
80100 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Idempotency-Key: k-100; Content-Type: application/json | {"slotId":11,"climbers":5,"name":"Priya"}
80150 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Content-Type: application/json | {"slotId":11,"climbers":2,"name":"Priya"}
80200 POST /bookings | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0; Idempotency-Key: k-100; Content-Type: application/json | {"slotId":11,"climbers":2,"name":"Priya"}
80250 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Idempotency-Key: k-101; Content-Type: application/json | {"slotId":99,"climbers":2,"name":"Priya"}
81500 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Idempotency-Key: k-101; Content-Type: application/json | {"slotId":99,"climbers":2,"name":"Priya"}
86000 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Idempotency-Key: k-100; Content-Type: application/json | {"slotId":11,"climbers":2,"name":"Priya"}
## caching
90000 GET /gyms/1/slots
91000 GET /gyms/1/slots | If-None-Match: "797a4fbbcb74ecb2"
92000 GET /gyms/1/slots | If-None-Match: "nope", W/"797a4fbbcb74ecb2"
93000 GET /gyms/1/slots | If-None-Match: *
94000 POST /gyms/1/close-slot/12 | Authorization: Bearer eyJzdWIiOjExLCJyb2xlIjoic3RhZmYiLCJleHAiOjkwMDAwMDAwfQ.0h7ayhFhGoPQaBGNqORBkDgz8-Rd75OL54HWyC3Bj68
95000 GET /gyms/1/slots | If-None-Match: "797a4fbbcb74ecb2"
96000 GET /gyms/1/slots | If-None-Match: "5ecb304f0a2cc6c5"
97000 GET /gyms/1/slots | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys
98000 GET /gyms/2
## ops
100000 GET /gyms/1 | X-Sim-Ms: 6
101000 GET /gyms/2/slots | X-Request-Id: web-4411; X-Sim-Ms: 18
102000 GET /gyms/3 | X-Sim-Ms: 4
103000 GET /gyms/1/slots | X-Sim-Ms: 480
104000 GET /gyms/zzz
105000 GET /drill/crash | X-Request-Id: web-4412; X-Sim-Ms: 30
106000 GET /gyms/1/slots | X-Sim-Ms: 70
107000 GET /gyms/2 | X-Sim-Ms: 9
108000 DELETE /gyms/2 | X-Sim-Ms: 3
109000 GET /gyms/9 | X-Sim-Ms: 8
110000 GET /gyms/1 | X-Sim-Ms: 12
## health
0 GET /health/live
100 GET /health/startup
200 GET /health/ready
1500 GET /health/startup
2500 GET /health/startup
3000 GET /health/ready
5500 GET /health/ready
5600 GET /health/live
6500 GET /health/ready
7500 GET /health/ready
## outbox
0 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Content-Type: application/json | {"slotId":31,"climbers":1,"name":"Ana"}
10 POST /bookings | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0; Content-Type: application/json | {"slotId":31,"climbers":1,"name":"Ben"}
20 POST /bookings | Authorization: Bearer eyJzdWIiOjUsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.GMznSu9Q8cZmlLRpjCDjgrFk4VY7bMKJeIzBuRVDX6U; Content-Type: application/json | {"slotId":31,"climbers":1,"name":"Cleo"}
30 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Content-Type: application/json | {"slotId":31,"climbers":1,"name":"bounce@nowhere"}
40 POST /bookings | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0; Content-Type: application/json | {"slotId":31,"climbers":1,"name":"Eli"}
50 POST /bookings | Authorization: Bearer eyJzdWIiOjUsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.GMznSu9Q8cZmlLRpjCDjgrFk4VY7bMKJeIzBuRVDX6U; Content-Type: application/json | {"slotId":31,"climbers":1,"name":"Fay"}
## flags
0 GET /me/flags | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys
1000 GET /me/flags | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0
2000 GET /me/flags | Authorization: Bearer eyJzdWIiOjUsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.GMznSu9Q8cZmlLRpjCDjgrFk4VY7bMKJeIzBuRVDX6U
3000 GET /me/flags | Authorization: Bearer eyJzdWIiOjExLCJyb2xlIjoic3RhZmYiLCJleHAiOjkwMDAwMDAwfQ.0h7ayhFhGoPQaBGNqORBkDgz8-Rd75OL54HWyC3Bj68
4000 GET /me/flags | Authorization: Bearer eyJzdWIiOjEsInJvbGUiOiJhZG1pbiIsImV4cCI6OTAwMDAwMDB9.WUe3tCaFYzVxLgGdpT9PE1xTODgV6jSQJEmmgjiZwJI
5000 GET /me/flags
## versions
0 GET /gyms/2/slots
1000 GET /v2/slots?pageSize=2
2000 GET /v2/slots?page=2&pageSize=2
3000 GET /v2/slots?page=3&pageSize=2
4000 GET /v2/slots?pageSize=500
5000 GET /v2/slots?gymId=1&pageSize=1
6000 GET /v2/slots?page=0&pageSize=2
7000 GET /v2/slots?page=x
## day
0 GET /health/startup
100 GET /health/live
500 GET /gyms | X-Client: web-1; X-Sim-Ms: 6
1500 GET /gyms | X-Client: web-1; If-None-Match: "79aa4e8b7a8531e9"; X-Sim-Ms: 3
2200 GET /health/startup
2300 GET /health/ready
2500 GET /gyms/2/slots?day=2031-06-14 | X-Client: web-2; X-Sim-Ms: 22
3000 GET /v2/slots?pageSize=2 | X-Client: web-2; X-Sim-Ms: 14
3500 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Idempotency-Key: d-1; Content-Type: application/json; X-Sim-Ms: 45 | {"slotId":11,"climbers":2,"name":"Mika"}
3600 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Idempotency-Key: d-1; Content-Type: application/json; X-Sim-Ms: 45 | {"slotId":11,"climbers":2,"name":"Mika"}
4000 POST /bookings | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0; Content-Type: application/json; X-Sim-Ms: 38 | {"slotId":21,"climbers":4,"name":"Noor"}
4500 POST /bookings | Authorization: Bearer eyJzdWIiOjUsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.GMznSu9Q8cZmlLRpjCDjgrFk4VY7bMKJeIzBuRVDX6U; Content-Type: application/json; X-Sim-Ms: 12 | {"slotId":21,"climbers":3,"name":"Tomas"}
5000 GET /bookings/1 | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0; X-Sim-Ms: 7
5200 GET /health/ready
5500 GET /bookings/1 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; X-Sim-Ms: 9
6000 GET /bookings/1 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; If-None-Match: "273c8e108076e161"; X-Sim-Ms: 8
6500 PUT /bookings/1 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Content-Type: application/json; X-Sim-Ms: 41 | {"version":1,"climbers":3}
7000 PUT /bookings/1 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Content-Type: application/json; X-Sim-Ms: 18 | {"version":1,"climbers":4}
7200 GET /health/ready
7500 POST /bookings | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys; Content-Type: application/json | {"slotId":11,"climbers":0,"name":"Mika"}
8000 POST /bookings | Content-Type: application/json | {"slotId":11,"climbers":1,"name":"Ghost"}
8500 GET /bookings/2 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJhZG1pbiIsImV4cCI6OTAwMDAwMDB9.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys
9000 GET /bookings/2 | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjUwMH0.9pkz-aG-4ya51g5LQqvhCw0LUxH5b3pv3w-6kpEOArE
9500 GET /staff/slots/21/bookings | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0
10000 GET /staff/slots/21/bookings | Authorization: Bearer eyJzdWIiOjExLCJyb2xlIjoic3RhZmYiLCJleHAiOjkwMDAwMDAwfQ.0h7ayhFhGoPQaBGNqORBkDgz8-Rd75OL54HWyC3Bj68; X-Sim-Ms: 27
10500 GET /me/flags | Authorization: Bearer eyJzdWIiOjMsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.tzLCL6GHS7gAViwJsIJUdXYFquJBWy4IughZU1nr9ys
11000 GET /drill/conflict | Authorization: Bearer eyJzdWIiOjEsInJvbGUiOiJhZG1pbiIsImV4cCI6OTAwMDAwMDB9.WUe3tCaFYzVxLgGdpT9PE1xTODgV6jSQJEmmgjiZwJI
11500 GET /drill/crash | X-Request-Id: web-9001; X-Sim-Ms: 30
12000 GET /gyms | X-Client: scraper
12050 GET /gyms | X-Client: scraper
12100 GET /gyms | X-Client: scraper
12150 GET /gyms | X-Client: scraper
12200 GET /gyms | X-Client: scraper
12250 GET /gyms | X-Client: scraper
12300 GET /gyms | X-Client: scraper
12350 GET /gyms | X-Client: scraper
13000 GET /gyms/zzz | X-Client: web-2
13100 DELETE /gyms/2 | X-Client: web-2
13500 POST /bookings | Authorization: Bearer eyJzdWIiOjUsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.GMznSu9Q8cZmlLRpjCDjgrFk4VY7bMKJeIzBuRVDX6U; Content-Type: application/json; X-Sim-Ms: 52 | {"slotId":31,"climbers":2,"name":"Tomas"}
14000 GET /gyms/1/slots | X-Client: web-1; X-Sim-Ms: 620
14500 POST /bookings | Authorization: Bearer eyJzdWIiOjQsInJvbGUiOiJtZW1iZXIiLCJleHAiOjkwMDAwMDAwfQ.qoBGzWJ64wxsaLXebj4a33RzYee0nxnMt7RxsxnF3b0; Content-Type: application/json; X-Sim-Ms: 33 | {"slotId":31,"climbers":1,"name":"bounce@invalid"}
15000 POST /bookings | Authorization: Bearer eyJzdWIiOjEsInJvbGUiOiJhZG1pbiIsImV4cCI6OTAwMDAwMDB9.WUe3tCaFYzVxLgGdpT9PE1xTODgV6jSQJEmmgjiZwJI; Content-Type: application/json; X-Sim-Ms: 29 | {"slotId":22,"climbers":2,"name":"Pia"}
15500 GET /v2/slots?page=2&pageSize=2 | X-Client: web-2; X-Sim-Ms: 11
`,
  title: "Crux Desk",
  tagline: "Build a climbing-gym booking API from the ground up: routing, middleware, DI, auth and resilience.",
  pitch:
    "Run the booking platform for a chain of climbing gyms by writing its HTTP stack yourself, in the .NET style. You start with a recorded day of raw requests and finish with a routed, validated, authenticated, rate-limited, cached, observable API with a transactional outbox and a request-day report. The operations console beside your editor shows requests flowing through your middleware lanes, your route table, your container, your health lights and your logs.",
  emoji: "🧗",
  difficulty: "Professional",
  hours: 9,
  sceneId: "csharp-api",
  accent: { from: "#8b5cf6", to: "#4c1d95" },
  controls: ["Run replays the recorded traffic through your platform", "Output / Scene data tabs", "Panels light up as you pass lessons"],
  skills: [
      "HTTP messages",
      "routing",
      "middleware",
      "dependency injection",
      "model binding",
      "validation",
      "problem details",
      "unit of work",
      "authentication",
      "rate limiting",
      "idempotency",
      "HTTP caching",
      "structured logging",
      "health checks",
      "resilience",
      "outbox pattern",
      "feature flags",
      "API testing",
      "pagination"
  ],
  features: [
      {
          "id": "ca-console",
          "title": "Console",
          "blurb": "Everything your program prints appears on the operations console.",
          "emoji": "🖥️"
      },
      {
          "id": "ca-requests",
          "title": "Request log",
          "blurb": "Each recorded request parsed into method, path, query and headers.",
          "emoji": "📥"
      },
      {
          "id": "ca-routes",
          "title": "Route table",
          "blurb": "Templates and constraints, and how every request was matched.",
          "emoji": "🛣️"
      },
      {
          "id": "ca-pipeline",
          "title": "Middleware lanes",
          "blurb": "The path each request took through your middleware.",
          "emoji": "🧅"
      },
      {
          "id": "ca-di",
          "title": "Container",
          "blurb": "Services, their lifetimes and what they depend on.",
          "emoji": "🕸️"
      },
      {
          "id": "ca-endpoints",
          "title": "Endpoints",
          "blurb": "Minimal endpoints and controllers, bound from the request.",
          "emoji": "🔌"
      },
      {
          "id": "ca-problems",
          "title": "Problem details",
          "blurb": "Validation errors and failures as RFC 7807 documents.",
          "emoji": "🚨"
      },
      {
          "id": "ca-store",
          "title": "Booking ledger",
          "blurb": "Rows, versions and optimistic concurrency.",
          "emoji": "📒"
      },
      {
          "id": "ca-auth",
          "title": "Access decisions",
          "blurb": "Who asked, who may, and why.",
          "emoji": "🔑"
      },
      {
          "id": "ca-ratelimit",
          "title": "Rate limits",
          "blurb": "A token bucket per client.",
          "emoji": "🚦"
      },
      {
          "id": "ca-idempotency",
          "title": "Idempotency ledger",
          "blurb": "Keys, replays and refused reuse.",
          "emoji": "🔁"
      },
      {
          "id": "ca-cache",
          "title": "Cache validators",
          "blurb": "200 and 304 with their ETags.",
          "emoji": "🗃️"
      },
      {
          "id": "ca-logs",
          "title": "Log stream",
          "blurb": "Structured events tied together by correlation ids.",
          "emoji": "📜"
      },
      {
          "id": "ca-latency",
          "title": "Latency histogram",
          "blurb": "Counters and a histogram of response times.",
          "emoji": "📊"
      },
      {
          "id": "ca-health",
          "title": "Health board",
          "blurb": "Live, ready and startup probes over time.",
          "emoji": "💓"
      },
      {
          "id": "ca-resilience",
          "title": "Upstream calls",
          "blurb": "Timeouts, retries and the circuit breaker.",
          "emoji": "🛡️"
      },
      {
          "id": "ca-outbox",
          "title": "Outbox",
          "blurb": "Pending, sent and dead messages, and the worker.",
          "emoji": "📤"
      },
      {
          "id": "ca-flags",
          "title": "Feature flags",
          "blurb": "Percentage rollouts and per-member decisions.",
          "emoji": "🚩"
      },
      {
          "id": "ca-tests",
          "title": "Test results",
          "blurb": "Your in-process request tests.",
          "emoji": "✅"
      },
      {
          "id": "ca-versions",
          "title": "Versions & paging",
          "blurb": "v2 pages with next links.",
          "emoji": "📄"
      },
      {
          "id": "ca-report",
          "title": "Day report",
          "blurb": "The whole request day, read back.",
          "emoji": "🏁"
      }
  ],
  chapters: [chapter1, chapter2, chapter3, chapter4, chapter5],
};
