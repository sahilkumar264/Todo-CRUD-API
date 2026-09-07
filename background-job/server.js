import crypto from "node:crypto";
import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest.js";
import { functions } from "./functions.js";
import { reports } from "./store.js";

const app = express();
const port = process.env.PORT || 3200;
app.use(express.json());
app.use("/api/inngest", serve({ client: inngest, functions }));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.post("/reports", async (req, res, next) => {
  const { topic } = req.body || {};
  if (typeof topic !== "string" || !topic.trim()) return res.status(400).json({ error: "topic is required" });
  const id = crypto.randomUUID();
  reports.set(id, { id, topic: topic.trim(), status: "pending", created_at: new Date().toISOString() });
  try {
    await inngest.send({ name: "report/requested", data: { id, topic: topic.trim() } });
    return res.status(202).json({ id, status: "pending" });
  } catch (error) {
    reports.set(id, { ...reports.get(id), status: "failed", error: "Could not enqueue report" });
    return next(error);
  }
});

app.get("/reports", (_req, res) => res.json([...reports.values()]));
app.get("/reports/:id", (req, res) => {
  const report = reports.get(req.params.id);
  if (!report) return res.status(404).json({ error: "Report not found" });
  res.json(report);
});

app.use((error, _req, res, _next) => {
  console.error("API error:", error.message);
  res.status(500).json({ error: "Could not enqueue report" });
});

app.listen(port, () => console.log(`Report API: http://localhost:${port}\nInngest endpoint: http://localhost:${port}/api/inngest`));
