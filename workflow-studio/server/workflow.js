import OpenAI from "openai";
import { inngest } from "./inngest.js";

export const executions = new Map();

function answerStub(prompt, input) {
  const text = `${prompt} ${input}`.toLowerCase();
  if (/(not |no |sales|demo|pricing|buy)/.test(text) && /support request|existing product|account/.test(text)) return "NO";
  if (/(charged|invoice|refund|error|broken|cannot|support|help|account)/.test(text)) return "YES";
  return "NO";
}

async function decide(prompt, input) {
  if (process.env.LLM_STUB !== "false") return answerStub(prompt, input);
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, baseURL: process.env.OPENAI_BASE_URL, timeout: 30000, maxRetries: 0 });
  const response = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL,
    temperature: 0,
    messages: [
      { role: "system", content: "You are a workflow decision engine. Reply with exactly YES or NO. Never add punctuation or explanation." },
      { role: "user", content: JSON.stringify({ decision_prompt: prompt, input }) }
    ]
  });
  const answer = String(response.choices[0]?.message?.content || "").trim().toUpperCase();
  if (answer !== "YES" && answer !== "NO") throw new Error("Model did not return YES or NO");
  return answer;
}

export const workflowFunction = inngest.createFunction(
  { id: "execute-ai-workflow", retries: 2 },
  { event: "workflow/run.requested" },
  async ({ event, step }) => {
    const { executionId, graph, input } = event.data;
    const run = executions.get(executionId);
    const start = graph.nodes.find((node) => node.data?.isStart) || graph.nodes[0];
    if (!start) throw new Error("Workflow has no nodes");
    let current = start;
    const visited = new Set();
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      run.currentNodeId = current.id;
      run.status = "running";
      const started = Date.now();
      const answer = await step.run(`decision-${current.id}`, () => decide(current.data.prompt, input));
      const nextEdge = graph.edges.find((edge) => edge.source === current.id && edge.data?.outcome === answer);
      if (!run.logs.some((log) => log.nodeId === current.id)) {
        run.logs.push({ nodeId: current.id, label: current.data.label, answer, durationMs: Date.now() - started, from: current.id, to: nextEdge?.target || null });
      }
      current = nextEdge ? graph.nodes.find((node) => node.id === nextEdge.target) : null;
    }
    run.currentNodeId = null;
    run.status = "completed";
    return { executionId, order: run.logs.map((log) => log.nodeId) };
  }
);
