const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpecification = require("./openapi.json");
require("dotenv").config();
const { initializeDatabase, pool } = require("./taskRepository");
const supabase = require("./supabaseClient");

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

app.post("/auth/signup", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    return res.status(400).json({ error: error.message });
  }

  res.status(201).json({ user: data.user });
});

app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return res.status(401).json({ error: "Invalid login credentials" });
  }

  res.json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });
});

app.get("/public/info", (req, res) => {
  res.json({ message: "Welcome stranger! This info is public." });
});

function requirePresentedToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access token required" });
  }

  const token = authorization.slice("Bearer ".length).trim();

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  req.accessToken = token;
  next();
}

app.get("/protected/profile", requirePresentedToken, (req, res) => {
  res.json({ message: "A token was provided." });
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

app.post("/tasks", async (req, res) => {
  const { title } = req.body;

  if (typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "Title is required and must be a non-empty string" });
  }

  const result = await pool.query(
    "INSERT INTO tasks (title, done) VALUES ($1, $2) RETURNING *",
    [title.trim(), false]
  );
  const newTask = result.rows[0];

  res.status(201).json(newTask);
});

app.put("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const taskResult = await pool.query("SELECT * FROM tasks WHERE id = $1", [id]);
  const task = taskResult.rows[0];

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
  const updatedDone = hasDone ? done : task.done;
  const updatedResult = await pool.query(
    "UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING *",
    [updatedTitle, updatedDone, id]
  );
  const updatedTask = updatedResult.rows[0];

  res.json(updatedTask);
});

app.delete("/tasks/:id", async (req, res) => {
  const id = Number(req.params.id);
  const result = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);

  if (result.rowCount === 0) {
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
