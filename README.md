# Todo-CRUD-API

A simple beginner-friendly CRUD API for managing tasks. It uses Node.js and Express, with task data kept in a JavaScript array while the server is running.

## Features

- Root and health-check endpoints
- Create, read, update, and delete tasks
- Input validation and clear JSON errors
- Interactive Swagger UI documentation
- No database or persistent storage

## Technology stack

- Node.js
- Express
- JavaScript
- swagger-ui-express
- OpenAPI 3.0

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

## In-memory data

Task data is stored only in memory using a JavaScript array. Any created or updated tasks disappear when the server restarts.
