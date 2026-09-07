const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");
const { setTimeout: sleep } = require("node:timers/promises");
const OpenAI = require("openai");
const { TriageOutputSchema } = require("./schema");

const PROMPT_VERSION = "triage-v1";
const PROMPT_PATH = path.join(__dirname, "..", "..", "prompts", `${PROMPT_VERSION}.md`);
const QUARANTINE_PATH = path.join(__dirname, "..", "..", "logs", "quarantine.jsonl");
const MAX_ATTEMPTS = 4;
const CALL_TIMEOUT_MS = 30000;

class LlmGatewayError extends Error {
  constructor(message, { status, retryAfter, timeout = false } = {}) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
    this.timeout = timeout;
  }
}

function isEnabled() {
  return process.env.LLM_ENABLED !== "false";
}

function isStub() {
  return process.env.LLM_STUB === "1";
}

function fallback() {
  return {
    category: "other",
    urgency: "normal",
    confidence: 0,
    reason: "LLM triage is temporarily disabled."
  };
}

function stubTriage(text) {
  const normalized = text.toLowerCase();
  if (/(charged|invoice|refund|payment|subscription)/.test(normalized)) {
    return { category: "billing", urgency: "normal", confidence: 0.9, reason: "The message concerns an account charge or payment." };
  }
  if (/(error|broken|crash|cannot|can't|not working|fails|down|outage|blocked)/.test(normalized)) {
    return { category: "bug", urgency: /(urgent|down|outage|blocked)/.test(normalized) ? "high" : "normal", confidence: 0.9, reason: "The message describes unexpected product behaviour." };
  }
  if (/(add|would like|feature|request|please include)/.test(normalized)) {
    return { category: "feature", urgency: "low", confidence: 0.85, reason: "The message asks for a product capability." };
  }
  return { category: "other", urgency: "low", confidence: 0.3, reason: "The message does not clearly match a supported category." };
}

function parseJsonObject(rawText) {
  const text = String(rawText || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("Model response did not contain a JSON object");
  return JSON.parse(text.slice(start, end + 1));
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const date = Date.parse(value);
  return Number.isNaN(date) ? null : Math.max(0, date - Date.now());
}

function normalizeError(error) {
  const status = error.status || error.statusCode;
  const headers = error.headers || error.response?.headers;
  const retryAfter = headers?.get?.("retry-after") || headers?.["retry-after"];
  const timeout = error.name === "APIConnectionTimeoutError" || error.name === "AbortError" || error.code === "ETIMEDOUT";
  return new LlmGatewayError(error.message || "LLM request failed", { status, retryAfter: parseRetryAfter(retryAfter), timeout });
}

function shouldRetry(error) {
  return error.timeout || error.status === 429 || (error.status >= 500 && error.status <= 599);
}

async function loadPrompt() {
  return fs.readFile(PROMPT_PATH, "utf8");
}

function createClient() {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_API_KEY || !process.env.LLM_MODEL) {
    throw new LlmGatewayError("LLM provider is not configured. Set LLM_BASE_URL, LLM_API_KEY, and LLM_MODEL.");
  }
  return new OpenAI({
    baseURL: process.env.LLM_BASE_URL,
    apiKey: process.env.LLM_API_KEY,
    timeout: CALL_TIMEOUT_MS,
    maxRetries: 0
  });
}

function logUsage({ startedAt, response, repairCount }) {
  const usage = response.usage || {};
  console.log(JSON.stringify({
    event: "llm_call",
    prompt_version: PROMPT_VERSION,
    model: process.env.LLM_MODEL,
    input_tokens: usage.prompt_tokens ?? null,
    output_tokens: usage.completion_tokens ?? null,
    duration_ms: Date.now() - startedAt,
    repair_count: repairCount
  }));
}

async function callModel(messages, repairCount) {
  const client = createClient();
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const startedAt = Date.now();
    try {
      const response = await client.chat.completions.create({ model: process.env.LLM_MODEL, messages, temperature: 0 });
      logUsage({ startedAt, response, repairCount });
      return response.choices[0]?.message?.content || "";
    } catch (error) {
      const normalized = normalizeError(error);
      lastError = normalized;
      if (!shouldRetry(normalized) || attempt === MAX_ATTEMPTS) throw normalized;
      const exponentialDelay = 1000 * (2 ** (attempt - 1));
      const delay = normalized.retryAfter ?? exponentialDelay + Math.floor(Math.random() * 250);
      console.log(JSON.stringify({ event: "llm_retry", attempt, status: normalized.status ?? null, delay_ms: delay }));
      await sleep(delay);
    }
  }
  throw lastError;
}

async function quarantine({ input, rawOutput, error }) {
  await fs.mkdir(path.dirname(QUARANTINE_PATH), { recursive: true });
  await fs.appendFile(QUARANTINE_PATH, `${JSON.stringify({
    at: new Date().toISOString(),
    prompt_version: PROMPT_VERSION,
    input,
    raw_output: rawOutput,
    error
  })}\n`);
}

async function triageText(text) {
  if (!isEnabled()) return { kind: "fallback", output: fallback() };
  if (isStub()) return { kind: "stub", output: TriageOutputSchema.parse(stubTriage(text)) };

  const systemPrompt = await loadPrompt();
  const userMessage = JSON.stringify({ text });
  const firstOutput = await callModel([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ], 0);

  const firstResult = TriageOutputSchema.safeParse(safelyParse(firstOutput));
  if (firstResult.success) return { kind: "model", output: firstResult.data };

  const repairInstruction = [
    "Your previous answer was rejected for this reason:",
    zodError(firstResult.error),
    "Broken answer:",
    firstOutput,
    "Return only corrected JSON matching the schema."
  ].join("\n");
  const repairedOutput = await callModel([
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
    { role: "user", content: repairInstruction }
  ], 1);
  const repairedResult = TriageOutputSchema.safeParse(safelyParse(repairedOutput));
  if (repairedResult.success) return { kind: "model", output: repairedResult.data };

  await quarantine({ input: { text }, rawOutput: repairedOutput, error: zodError(repairedResult.error) });
  return { kind: "unprocessable", error: "The model response could not be validated after one repair attempt." };
}

function safelyParse(rawOutput) {
  try {
    return parseJsonObject(rawOutput);
  } catch (error) {
    return { __parse_error: error.message };
  }
}

function zodError(error) {
  return error.issues.map((issue) => `${issue.path.join(".") || "response"}: ${issue.message}`).join("; ");
}

function cacheKey(text) {
  return crypto.createHash("sha256").update(`${PROMPT_VERSION}:${text}`).digest("hex");
}

module.exports = { PROMPT_VERSION, LlmGatewayError, cacheKey, triageText };
