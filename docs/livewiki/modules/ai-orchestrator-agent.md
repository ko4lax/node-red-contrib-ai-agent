---
path: modules/ai-orchestrator-agent.md
page-type: module
summary: Documentation for the AI Orchestrator Agent node – discovery companion that registers agent capabilities and executes zero-wire tasks.
tags: [orchestrator-agent, discovery, pipeline, zero-wire]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# AI Orchestrator Agent Module

The **AI Orchestrator Agent** node is the connective tissue between specialized AI agents and the [AI Orchestrator](ai-orchestrator.md). It travels ahead of the orchestrator in a flow, tagging each passing message with the node's identity and capabilities (called **Chain Discovery**) and exposes a direct `executeTask()` function that the orchestrator can call without additional wiring (**Zero-Wire Execution**).

## Purpose and Responsibilities

- **Pipeline Discovery**: Appends `{ id, name, capabilities, type }` objects to `msg.agents` so the orchestrator knows which teammates are available.
- **Direct Invocation**: Implements `executeTask(input, msg)` so the orchestrator can call the agent directly via Node-RED's runtime registry.
- **Capability Scoping**: Allows different orchestrators to have unique teams simply by wiring different discovery pipelines.
- **Status Reporting**: Updates node status (`tagging…`, `executing…`, `ready`) to give visual feedback while flows run.

## Message Contract

### Discovery Mode (default input/output)

```javascript
// Incoming msg
{
  payload: "Goal text or structured object",
  aiagent: { /* shared model config */ },
  agents: [
    { id: "...", name: "Coder", capabilities: ["coding"], type: "agent" }
  ]
}

// Outgoing msg
{
  payload: "Goal text or structured object",
  aiagent: { ... },
  agents: [
    { id: "node_1", name: "Coder", capabilities: ["coding"], type: "agent" },
    { id: "node_2", name: "Reviewer", capabilities: ["review"], type: "agent" }
  ]
}
```

### Execution Mode (invoked by orchestrator)

```javascript
const result = await agentNode.executeTask(task.input, msg);
// msg.aiagent must contain model + apiKey shared across the flow
```

The same `msg` that flowed through discovery is passed back into `executeTask`, providing shared `aiagent`, `aimemory`, and any other context required by the downstream AI call.

## Configuration

| Field | Description |
|-------|-------------|
| **Name** | Optional label used in the editor and `msg.agents`. Defaults to "AI Orchestrator Agent". |
| **Capabilities** | Comma‑separated list of skills (e.g., `coding, research, qa`). Each entry is lowercased and trimmed before being added to the manifest. |
| **System Prompt** | Instruction string used when the node performs zero-wire execution. |

## How Chain Discovery Works

1. Each AI Orchestrator Agent node initializes `msg.agents = msg.agents || []`.
2. The node pushes its manifest `{ id: node.id, name, capabilities, type: 'agent' }`.
3. The message is forwarded downstream (usually into another orchestrator agent or the AI Orchestrator).
4. By the time the message reaches the orchestrator, `msg.agents` lists the full team in wiring order, allowing the orchestrator to match tasks to capabilities.

> **Tip:** Order matters—place the nodes in the sequence you want the team manifest to reflect.

## Zero-Wire Execution Flow

1. The orchestrator selects a task whose `type` matches one of the agent's `capabilities`.
2. `RED.nodes.getNode(agentInfo.id)` returns the instantiated orchestrator agent node.
3. The orchestrator calls `await agentNode.executeTask(task.input, msg);`
4. Inside `executeTask`, the node validates `msg.aiagent`, prepares the conversational prompt (including optional memory context), and calls the OpenRouter API with any registered tools.
5. Results (or errors) are returned to the orchestrator, which records them in the plan history and continues iterating.

## Error Handling

- Missing AI configuration (`msg.aiagent`) raises a descriptive error.
- Tool or API failures are converted into structured error messages so the orchestrator's reflection step can decide whether to retry, pivot, or fail the plan.
- If the node is invoked outside of an orchestrator loop, standard Node-RED error reporting (status + log) still applies.

## Example Pipeline

```text
[Inject Goal] 
   -> [AI Model] 
   -> [AI Orchestrator Agent: Coder (coding, research)] 
   -> [AI Orchestrator Agent: Reviewer (review)] 
   -> [AI Orchestrator] 
   -> [Debug]
```

In this layout the orchestrator receives:

```json
msg.agents = [
  { "id": "coderNode", "name": "Coder", "capabilities": ["coding","research"], "type": "agent" },
  { "id": "reviewerNode", "name": "Reviewer", "capabilities": ["review"], "type": "agent" }
]
```

The orchestrator can now plan tasks whose `type` is `coding`, `research`, or `review` and execute them without additional wiring.

## See Also

- [AI Orchestrator Module](ai-orchestrator.md) – How plans are created and executed using the discovered agents.
- [Architecture](../architecture.md) – Complete system design overview.
- [Data Flow](../data_flow.md) – Sequence diagrams showing discovery + zero-wire execution.
