import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { addEdge, Background, Controls, MiniMap, ReactFlow, useEdgesState, useNodesState } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./styles.css";
import { DecisionNode } from "./components/DecisionNode";
import { Button } from "./components/ui/button";

const START_NODES = [
  { id: "support", type: "decision", position: { x: 290, y: 40 }, data: { isStart: true, label: "Support request?", prompt: "Is this message asking for help with an existing product or account?" } },
  { id: "support-route", type: "decision", position: { x: 80, y: 270 }, data: { label: "Send to Support", prompt: "Should this issue be handled by the customer support team?" } },
  { id: "sales-route", type: "decision", position: { x: 510, y: 270 }, data: { label: "Send to Sales", prompt: "Is this message an interest in buying, pricing, or a product demo?" } }
];
const START_EDGES = [
  { id: "support-yes", source: "support", sourceHandle: "yes", target: "support-route", data: { outcome: "YES" }, label: "YES", className: "edge-yes", animated: false },
  { id: "support-no", source: "support", sourceHandle: "no", target: "sales-route", data: { outcome: "NO" }, label: "NO", className: "edge-no", animated: false }
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(JSON.parse(localStorage.getItem("workflow-nodes") || "null") || START_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(JSON.parse(localStorage.getItem("workflow-edges") || "null") || START_EDGES);
  const [selectedId, setSelectedId] = useState(null);
  const [input, setInput] = useState("I was charged twice and cannot download my invoice.");
  const [execution, setExecution] = useState(null);
  const [logs, setLogs] = useState([]);
  const [importText, setImportText] = useState("");

  useEffect(() => { localStorage.setItem("workflow-nodes", JSON.stringify(nodes)); }, [nodes]);
  useEffect(() => { localStorage.setItem("workflow-edges", JSON.stringify(edges)); }, [edges]);
  const nodeTypes = useMemo(() => ({ decision: DecisionNode }), []);
  const selected = nodes.find((node) => node.id === selectedId);

  const onConnect = useCallback((connection) => {
    const outcome = connection.sourceHandle === "yes" ? "YES" : "NO";
    setEdges((existing) => addEdge({ ...connection, id: `${connection.source}-${connection.sourceHandle}-${connection.target}-${Date.now()}`, label: outcome, data: { outcome }, className: outcome === "YES" ? "edge-yes" : "edge-no" }, existing));
  }, [setEdges]);
  const addNode = () => setNodes((current) => [...current, { id: `decision-${Date.now()}`, type: "decision", position: { x: 300 + current.length * 25, y: 500 + current.length * 20 }, data: { label: "New decision", prompt: "Does this message meet the condition?" } }]);
  const updateSelected = (field, value) => setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, [field]: value } } : node));
  const clearExecutionState = () => setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, active: false, completed: false } })));

  async function runWorkflow() {
    clearExecutionState(); setLogs([]); setExecution({ status: "queueing" });
    const response = await fetch("/api/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ graph: { nodes, edges }, input }) });
    const payload = await response.json();
    if (!response.ok) { setExecution({ status: "error", error: payload.error }); return; }
    setExecution({ id: payload.executionId, status: "queued" });
  }

  useEffect(() => {
    if (!execution?.id || ["completed", "failed"].includes(execution.status)) return undefined;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/executions/${execution.id}`);
      const next = await response.json();
      setExecution(next);
      if (next.logs) {
        setLogs(next.logs);
        setNodes((current) => current.map((node) => ({ ...node, data: { ...node.data, active: next.currentNodeId === node.id, completed: next.logs.some((log) => log.nodeId === node.id) } })));
        setEdges((current) => current.map((edge) => ({ ...edge, animated: next.logs.some((log) => log.from === edge.source && log.answer === edge.data?.outcome) })));
      }
    }, 700);
    return () => clearInterval(timer);
  }, [execution?.id, execution?.status, setEdges, setNodes]);

  function exportWorkflow() { navigator.clipboard.writeText(JSON.stringify({ nodes, edges }, null, 2)); setImportText("Workflow JSON copied to clipboard."); }
  function importWorkflow() { try { const graph = JSON.parse(importText); setNodes(graph.nodes); setEdges(graph.edges); setImportText("Workflow imported."); } catch { setImportText("Invalid workflow JSON."); } }

  return <main>
    <header><div><span className="eyebrow">INNGEST + REACT FLOW</span><h1>AI Workflow Studio</h1></div><div className="header-actions"><span className={`status ${execution?.status || "idle"}`}>{execution?.status || "ready"}</span><Button onClick={runWorkflow}>Run workflow</Button></div></header>
    <section className="toolbar"><Button variant="secondary" onClick={addNode}>+ Add decision</Button><Button variant="secondary" onClick={exportWorkflow}>Export JSON</Button><input value={importText} onChange={(event) => setImportText(event.target.value)} placeholder="Paste workflow JSON to import" /><Button variant="secondary" onClick={importWorkflow}>Import</Button></section>
    <section className="workspace">
      <aside className="panel inspector"><h2>Decision editor</h2>{selected ? <><label>Label<input value={selected.data.label} onChange={(e) => updateSelected("label", e.target.value)} /></label><label>YES / NO prompt<textarea value={selected.data.prompt} onChange={(e) => updateSelected("prompt", e.target.value)} /></label><label className="checkbox"><input type="checkbox" checked={!!selected.data.isStart} onChange={(e) => updateSelected("isStart", e.target.checked)} /> Start node</label><p className="hint">Connect the green bottom handle for YES and the red handle for NO.</p></> : <p className="hint">Select a node to edit its prompt.</p>}</aside>
      <div className="canvas"><ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeClick={(_, node) => setSelectedId(node.id)} fitView><Background /><MiniMap /><Controls /></ReactFlow></div>
      <aside className="panel run-panel"><h2>Execution</h2><label>Message<textarea value={input} onChange={(e) => setInput(e.target.value)} /></label><p className="hint">Each decision node receives this message and must answer YES or NO.</p><h3>Execution logs</h3><div className="logs">{logs.length ? logs.map((log, index) => <div key={index}><strong>{log.label}</strong><span>{log.answer} · {log.durationMs}ms</span></div>) : <p>No execution yet.</p>}</div></aside>
    </section>
  </main>;
}

createRoot(document.getElementById("root")).render(<App />);
