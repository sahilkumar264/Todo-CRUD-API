import "dotenv/config";
import crypto from "node:crypto";
import express from "express";
import { serve } from "inngest/express";
import { inngest } from "./inngest.js";
import { executions, workflowFunction } from "./workflow.js";

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use("/api/inngest", serve({ client: inngest, functions: [workflowFunction] }));

app.post("/api/run", async (req, res) => {
  const { graph, input } = req.body || {};
  if (!graph?.nodes?.length || !Array.isArray(graph.edges) || typeof input !== "string" || !input.trim()) return res.status(400).json({ error: "graph and a non-empty input are required" });
  const executionId = crypto.randomUUID();
  executions.set(executionId, { id: executionId, status: "queued", currentNodeId: null, logs: [] });
  await inngest.send({ name: "workflow/run.requested", data: { executionId, graph, input } });
  res.status(202).json({ executionId });
});

app.get("/api/executions/:id", (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution) return res.status(404).json({ error: "Execution not found" });
  res.json(execution);
});

app.listen(3000, () => console.log("Workflow API: http://localhost:3000\nInngest serve endpoint: http://localhost:3000/api/inngest"));
