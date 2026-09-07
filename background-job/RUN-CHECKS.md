# Local verification evidence

Run on 2026-09-07 with the API on port 3200 and Inngest Dev Server on port 8288.

```text
POST /reports {"topic":"cats"}
202 Accepted in 18 ms
{"id":"946c32dd-7cde-40e3-80cc-7ef15d255ede","status":"pending"}

Immediate GET /reports/946c32dd-7cde-40e3-80cc-7ef15d255ede
{"status":"pending", "topic":"cats"}

GET after the 8-second background step
{"status":"done", "result":"Your background report about cats is ready."}

POST /reports {}
400 Bad Request
{"error":"topic is required"}
```

The local dashboard successfully registered the three functions at `http://localhost:8288`: `say-hello`, `make-report`, and `heartbeat`. Use topic `fail` to see the `make-report` retry configuration (two retries, three total attempts) in the dashboard.
