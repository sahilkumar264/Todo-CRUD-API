const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpecification = require("./openapi.json");
require("dotenv").config();
const { initializeDatabase, pool } = require("./taskRepository");

const app = express();
const PORT = 3000;

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpecification));

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

app.get("/tasks", async (req, res) => {
  const result = await pool.query("SELECT * FROM tasks ORDER BY id");
  res.json(result.rows);
});

app.get("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const result = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
  const task = result.rows[0];

  if (!task) {
    return res.status(404).json({ error: `Task ${req.params.id} not found` });
  }

  res.json(task);
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
