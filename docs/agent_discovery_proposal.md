# Agent Discovery and Registration Proposal (Refined)

## Problem Statement

The current AI Orchestrator creates plans without knowing what agents are actually available. This leads to:

1.  **Silent failures** - Tasks dispatched to non-existent agents never complete.
2.  **No validation** - Orchestrator can't verify if agents exist for task types it creates.
3.  **Poor user experience** - No way to discover available agents when planning.
4.  **Unreliable execution** - Plans may contain impossible-to-execute tasks.

## Proposed Solution: Chain Discovery (Pipeline)

We will implement a visual "Pipeline Discovery" model where the goal picks up its team as it travels through the flow.

### 1. AI Agent (`ai-agent`) - Unchanged
Remains the standalone expert for manual use.

### 2. AI Agent Orchestrator (`ai-agent-orchestrator`) - NEW
A pass-through node that "tags" the message with its capabilities.

*   **Logic**: When a `msg` enters, the node appends its metadata (ID, Capabilities) to an array: `msg.agents`.
*   **Outputs**:
    1.  **Result**: Standard output for solo execution.
    2.  **Pipeline**: Path to the next agent or the Orchestrator.

### 3. AI Orchestrator (`ai-orchestrator`) - UPDATED
The Orchestrator is now a "Self-Aware" destination.

*   **Logic**: It looks at the incoming `msg.agents` to see which tools it has at its disposal for the current goal.
*   **Execution**: It calls the discovered agents directly via their Node IDs (Zero-Wire).
*   **Port Layout**: 1 Input (Goal + Team), 1 Output (Final Result).

---

## Technical Details: The Clean Path

### Chain Discovery Diagram
The flow is linear, intuitive, and visually represents the "Tool Belt" for each specific orchestrator.

```
[Inject Goal] -> [Agent: Coding] -> [Agent: Researcher] -> [Orchestrator] -> [Output]
```

### Discovery Data Structure
As the message travels, it builds a manifest:
```javascript
// msg.agents after passing through two nodes:
[
  { id: "node_1", name: "Coder", capabilities: ["js", "python"] },
  { id: "node_2", name: "Search", capabilities: ["web-search"] }
]
```

### Zero-Wire Direct Execution
The orchestrator calls the agent without any wires:
```javascript
// Inside orchestrator loop:
const coder = RED.nodes.getNode("node_1");
const result = await coder.executeTask("Fix the bug", msg);
```

## Summary of Benefits

1.  **Perfect Visual Clarity**: The wires literally show which agents are helping with which goal.
2.  **No Messy Ports**: The Orchestrator has only one input and one output, looking like a simple black box.
3.  **Dynamic Scoping**: You can give different agents to different orchestrators just by changing the wire path.
4.  **Zero Execution Wires**: The complex "Manager/Worker" communication is hidden inside the code, keeping the workspace clean.

## Summary of Benefits

1.  **Explicit Wiring**: Only agents physically wired to the Orchestrator's registration port are used in the plan.
2.  **Visual Hierarchy**: Users can see exactly which agents are available to which orchestrator.
3.  **Backward Compatibility**: The original `ai-agent` node is completely unaffected.
4.  **Simplicity**: No complex configuration nodes or global state management needed.

## Implementation Phases

1.  **Phase 1**: Create the `ai-agent-orchestrator` node (UI + logic).
2.  **Phase 2**: Add Input 2 to `ai-orchestrator` and implement the registration listener.
3.  **Phase 3**: Update `createInitialPlan` in `ai-orchestrator` to use the registered agent list.
4.  **Phase 4**: Documentation and example flows.

---
**Status**: Revised - Aligned with user's specific 2-node architecture.  
**Priority**: High - Ready for implementation.
