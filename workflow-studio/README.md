# AI Workflow Studio

A visual YES/NO AI workflow builder. React Flow edits the graph, Inngest executes one decision node at a time, and an OpenAI-compatible model decides each branch.

## Is it connected to the earlier assignment?

It is a separate application. It reuses the same safe LLM ideas from Week 7 (environment variables, strict output and timeout) but does not modify the Todo CRUD API.

## Run locally

```bash
cd workflow-studio
npm install
copy .env.example .env
npm run dev
```

Open the editor at `http://localhost:5173`. In another terminal run Inngest:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

`LLM_STUB=true` is the default and makes deterministic local YES/NO decisions without a key. For a real model, set `LLM_STUB=false` plus `OPENAI_API_KEY`, `OPENAI_BASE_URL`, and `OPENAI_MODEL` in the ignored `.env` file.

## Features

- React Flow decision canvas: add nodes, connect green YES / red NO handles, and edit prompts
- Inngest function maps every visited node to `step.run`
- Exact `YES` / `NO` enforcement for live LLM calls
- Visual active/completed nodes and animated selected edges
- Execution logs panel and order tracking
- Browser-local save/load plus JSON export/import
- Retry policy at the Inngest function level and API validation errors
