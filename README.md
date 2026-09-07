# Todo-CRUD-API

A simple beginner-friendly CRUD API for managing tasks. It uses Node.js, Express, and SQLite so tasks survive server restarts.

## Features

- Root and health-check endpoints
- Create, read, update, and delete tasks
- Input validation and clear JSON errors
- Interactive Swagger UI documentation
- SQLite persistence with automatic database setup

## Technology stack

- Node.js
- Express
- JavaScript
- swagger-ui-express
- OpenAPI 3.0
- SQLite via better-sqlite3

## Installation

```bash
npm install
```

## Start the server

```bash
node server.js
```

Server URL: <http://localhost:3000>

Swagger UI: <http://localhost:3000/docs>

## API endpoints

| Method | Endpoint | Purpose | Success status |
| --- | --- | --- | --- |
| GET | `/` | Show API name, version, and task endpoint | 200 |
| GET | `/health` | Check that the API is running | 200 |
| GET | `/tasks` | Get all tasks | 200 |
| GET | `/tasks/:id` | Get one task by ID | 200 |
| POST | `/tasks` | Create a task | 201 |
| PUT | `/tasks/:id` | Update a task title and/or completion state | 200 |
| DELETE | `/tasks/:id` | Delete a task | 204 |

## Status codes

| Status | Meaning |
| --- | --- |
| 200 | Request completed successfully. |
| 201 | A task was created successfully. |
| 204 | A task was deleted successfully; the response has no body. |
| 400 | The request body is missing or invalid. |
| 404 | The requested task does not exist. |

## Example request

```bash
curl -i http://localhost:3000/tasks/1
```

Example output:

```text
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"id":1,"title":"Learn Express","done":false}
```

## Swagger UI screenshot

The Swagger UI is available at <http://localhost:3000/docs> and displays the complete task CRUD API. It includes **Try it out** controls that send requests directly to the local Express server.

## SQLite database

SQLite was chosen because it is a single local file, needs no separate database server, and keeps task data after the API restarts. The database is stored in `tasks.db` at the project root.

`tasks.db` is ignored by Git so every clone starts fresh. When the server starts, it automatically creates the database and `tasks` table if they are missing, then seeds the three example tasks only when the table is empty.

## SQL exploration

During the SQLite exercise, this query returned the number of tasks currently stored in the database:

```sql
SELECT COUNT(*) FROM tasks;
```

It returned `4` before the update-and-delete exercise. The complete Stage 4 query record is in [SQL_EXPLORATION.md](SQL_EXPLORATION.md).

The API endpoint tests from Week 2 still pass because SQLite changes only the storage layer; the API request and response shapes remain the same.
