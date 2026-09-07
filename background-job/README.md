# Your first background job

This independent Week 4/A7 project demonstrates the reliable background-job pattern: accept a report request quickly, process the slow work in Inngest, and poll a status endpoint until the report is ready.

## Run it

Install dependencies, then keep both commands running in separate terminals:

```bash
cd background-job
npm install
npm start
```

```bash
npm run dev:inngest
```

Open the local Inngest dashboard at <http://localhost:8288>.

## Endpoints

| Method | Route | Result |
| --- | --- | --- |
| `GET` | `/health` | Returns `{ "status": "ok" }` |
| `POST` | `/reports` | Accepts `{ "topic": "cats" }` and returns `202` immediately |
| `GET` | `/reports` | Lists in-memory report states |
| `GET` | `/reports/:id` | Polls `pending`, then `done` with a result |

## Functions

| Function | Trigger | Work |
| --- | --- | --- |
| `say-hello` | `test/hello` | Waits 5 seconds, then returns a greeting |
| `make-report` | `report/requested` | Waits 8 seconds, builds a report, retries twice on failure |
| `heartbeat` | `* * * * *` | Logs pending/done/failed counts each minute |

## Proof

```text
POST /reports {"topic":"cats"} -> 202 {"id":"...","status":"pending"} in under one second
GET /reports/:id -> {"status":"pending", ...}
~10 seconds later -> {"status":"done","result":"Your background report about cats is ready."}
```

Verified locally on 2026-09-07: `POST /reports` returned `202` in **18 ms**, the immediate poll was `pending`, and the later poll returned `done` with `Your background report about cats is ready.`

Missing `topic` returns `400` before any event is sent. By contrast, `topic: "fail"` deliberately throws inside the background step, and Inngest retries it twice (three attempts total) with backoff. Input errors should be rejected at the API door; temporary work failures are the cases that deserve retries.

The heartbeat uses `* * * * *` only for local testing. `0 8 * * *` runs daily at 08:00, and `0 22 * * 0` runs every Sunday at 22:00 (typically UTC unless configured otherwise).

The Inngest dashboard at <http://localhost:8288> displays the `say-hello`, `make-report`, and `heartbeat` functions, including sleep/run steps and failed retries. Start the Dev Server command above, then invoke `test/hello` from that dashboard to see its completed five-second run.

This project uses an in-memory map deliberately, so report states reset when the API server restarts. Production work would store state in a database.
