import { Handle, Position } from "@xyflow/react";

export function DecisionNode({ data, selected }) {
  return <div className={`decision-node ${selected ? "selected" : ""} ${data.active ? "active" : ""} ${data.completed ? "completed" : ""}`}>
    <Handle type="target" position={Position.Top} />
    <div className="node-kicker">AI DECISION {data.isStart ? "• START" : ""}</div>
    <strong>{data.label || "Untitled decision"}</strong>
    <p>{data.prompt || "Add a YES/NO question"}</p>
    <div className="node-answer"><span>YES</span><span>NO</span></div>
    <Handle type="source" id="yes" position={Position.Bottom} style={{ left: "30%", background: "#22c55e" }} />
    <Handle type="source" id="no" position={Position.Bottom} style={{ left: "70%", background: "#ef4444" }} />
  </div>;
}
