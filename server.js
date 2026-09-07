const express = require("express");
const Database = require("better-sqlite3");
const swaggerUi = require("swagger-ui-express");
const openapiSpecification = require("./openapi.json");
require("dotenv").config();
const { initializeDatabase } = require("./taskRepository");

const app = express();
const PORT = 3000;
const db = new Database("tasks.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    done INTEGER NOT NULL
  )
`);

const taskCount = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();

if (taskCount.count === 0) {
  const seedTask = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
  const seedTasks = db.transaction(() => {
    seedTask.run("Learn Express", 0);
    seedTask.run("Build CRUD API", 0);
    seedTask.run("Document API with Swagger", 0);
  });

  seedTasks();
}

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpecification));

function formatTask(task) {
  return { ...task, done: Boolean(task.done) };
}

app.get("/", (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"]
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/tasks", (req, res) => {
  const tasks = db.prepare("SELECT * FROM tasks").all().map(formatTask);
  res.json(tasks);
});

app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.json(formatTask(task));
});

app.post("/tasks", (req, res) => {
  const { title } = req.body;

  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "Title is required and must be a non-empty string" });
  }

  const result = db
    .prepare("INSERT INTO tasks (title, done) VALUES (?, ?)")
    .run(title.trim(), 0);
  const newTask = db
    .prepare("SELECT * FROM tasks WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json(formatTask(newTask));
});

app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  const { title, done } = req.body;
  const hasTitle = Object.prototype.hasOwnProperty.call(req.body, "title");
  const hasDone = Object.prototype.hasOwnProperty.call(req.body, "done");

  if (!hasTitle && !hasDone) {
    return res.status(400).json({ error: "Provide a title or done value to update" });
  }

  if (hasTitle && (typeof title !== "string" || title.trim() === "")) {
    return res.status(400).json({ error: "Title must be a non-empty string" });
  }

  if (hasDone && typeof done !== "boolean") {
    return res.status(400).json({ error: "Done must be a boolean" });
  }

  const updatedTitle = hasTitle ? title.trim() : task.title;
  const updatedDone = hasDone ? Number(done) : task.done;
  db
    .prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?")
    .run(updatedTitle, updatedDone, id);

  const updatedTask = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);

  res.json(formatTask(updatedTask));
});

app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(id);

  if (result.changes === 0) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.status(204).send();
});

async function startServer() {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Could not connect to PostgreSQL:", error.message);
  process.exit(1);
});
