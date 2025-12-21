# Agent Discovery and Registration Proposal

## Problem Statement

The current AI Orchestrator has a critical architectural flaw: **it creates plans without knowing what agents are actually available**. This leads to:

1. **Silent failures** - Tasks dispatched to non-existent agents never complete
2. **No validation** - Orchestrator can't verify if agents exist for task types it creates
3. **Poor user experience** - No way to discover available agents when planning
4. **Unreliable execution** - Plans may contain impossible-to-execute tasks

## Current Architecture Issues

```javascript
// Current orchestrator.js - creates arbitrary task types
{
  "id": "t1", 
  "type": "research",  // No validation if "research" agents exist
  "input": "...", 
  "status": "pending"
}

// Flow-based routing with no discovery
msg.topic = nextTask.type;  // Hope someone is listening for this topic
send([msg, null]);  // Fire and forget
```

## Proposed Solution: Agent Registry System

### 1. Global Agent Registry

Create a centralized registry that tracks all available agents and their capabilities.

```javascript
// agent-registry.js
class AgentRegistry {
    constructor() {
        this.agents = new Map(); // agentId -> agentInfo
        this.capabilities = new Map(); // capability -> [agentIds]
    }
    
    register(agentId, agentInfo) { /* ... */ }
    findAgentsByCapability(capability) { /* ... */ }
    getAllCapabilities() { /* ... */ }
    validateTaskTypes(taskTypes) { /* ... */ }
}
```

### 2. Agent Self-Registration

Each AI Agent node registers itself when created and unregisters when destroyed.

```javascript
// ai-agent.js - enhanced with registration
function AiAgentNode(config) {
    const node = this;
    this.agentId = `agent-${node.id}-${Date.now()}`;
    
    // Auto-register with capabilities extracted from system prompt
    const capabilities = extractCapabilities(node.systemPrompt);
    globalAgentRegistry.register(node.agentId, {
        name: node.agentName,
        type: determineAgentType(node.systemPrompt),
        capabilities: capabilities,
        description: `AI Agent: ${node.agentName}`
    });
    
    // Cleanup on node deletion
    node.on('close', () => globalAgentRegistry.unregister(node.agentId));
}
```

### 3. Enhanced Orchestrator Planning

Update the orchestrator to plan only with available capabilities.

```javascript
// orchestrator.js - enhanced planning
async function createInitialPlan(node, msg) {
    const availableAgents = globalAgentRegistry.getAllAgents();
    const availableCapabilities = globalAgentRegistry.getAllCapabilities();
    
    if (availableAgents.length === 0) {
        throw new Error('No agents registered. Create AI Agent nodes first.');
    }
    
    const prompt = `
Available Agents: ${JSON.stringify(availableAgents)}
Available Capabilities: ${availableCapabilities.join(', ')}

Create tasks using ONLY these capabilities: ${availableCapabilities.join(', ')}
    `;
    
    // Validate created tasks against available capabilities
    const planData = JSON.parse(extractJson(response));
    validateTaskTypes(planData.tasks, availableCapabilities);
}
```

### 4. Smart Task Dispatch

Enhance dispatch with agent routing information.

```javascript
// Enhanced dispatch with routing
const nextTask = getNextTask(msg.orchestration.plan);
const capableAgents = globalAgentRegistry.findAgentsByCapability(nextTask.type);

if (capableAgents.length === 0) {
    throw new Error(`No agents available for task type: ${nextTask.type}`);
}

msg.agentRouting = {
    taskType: nextTask.type,
    capableAgents: capableAgents,
    selectedAgent: capableAgents[0] // Could implement load balancing
};
```

## Implementation Plan

### Phase 1: Core Registry (High Priority)
1. Create `orchestrator/agent-registry.js`
2. Implement basic registration and discovery
3. Add unit tests

### Phase 2: Agent Integration (High Priority)
1. Update `agent/ai-agent.js` to auto-register
2. Extract capabilities from system prompts
3. Handle registration/unregistration lifecycle

### Phase 3: Orchestrator Enhancement (High Priority)
1. Update `orchestrator/orchestrator.js` to use registry
2. Add task validation against available capabilities
3. Enhance planning prompt with agent information
4. Improve error messages for missing agents

### Phase 4: UI Improvements (Medium Priority)
1. Add "Available Agents" section to orchestrator config
2. Show agent capabilities in the UI
3. Add registry status indicators

### Phase 5: Advanced Features (Low Priority)
1. Agent health monitoring
2. Load balancing between multiple agents
3. Agent specialization scoring
4. Dynamic capability discovery

## Capability Extraction Strategy

### Automatic Detection
Parse system prompts for capability keywords:

```javascript
const capabilityMap = {
    'research': ['research', 'analyze', 'investigate', 'study'],
    'code': ['code', 'program', 'develop', 'implement'],
    'review': ['review', 'check', 'validate', 'test'],
    'write': ['write', 'create', 'generate', 'draft'],
    'data': ['data', 'process', 'transform', 'calculate']
};
```

### Manual Override
Allow users to specify capabilities in node configuration:

```javascript
// ai-agent.html - add capabilities field
<div class="form-row">
    <label for="node-input-capabilities"><i class="fa fa-cogs"></i> Capabilities</label>
    <input type="text" id="node-input-capabilities" placeholder="research,code,review">
</div>
```

## Benefits of This Approach

1. **Reliability** - Only creates executable plans
2. **Validation** - Early detection of impossible tasks
3. **Visibility** - Users can see available agents
4. **Flexibility** - Agents can be added/removed dynamically
5. **Scalability** - Supports multiple agents per capability
6. **Debugging** - Clear error messages for missing capabilities

## Backward Compatibility

- Existing flows continue to work (topic-based routing still functions)
- Registry is additive - doesn't break current agent implementations
- Gradual migration path for existing deployments

## Testing Strategy

1. **Unit Tests**: Registry core functions
2. **Integration Tests**: Agent registration/unregistration
3. **Flow Tests**: Complete orchestrator-agent workflows
4. **Error Scenarios**: Missing agents, invalid capabilities

## Migration Guide

1. Deploy updated nodes with registry support
2. Existing agents auto-register on next deployment
3. Orchestrator immediately benefits from agent discovery
4. No manual configuration required for basic functionality

## Risk Assessment

**Low Risk**:
- Registry is internal - no external dependencies
- Backward compatible with existing flows
- Can be rolled back by removing registry calls

**Medium Risk**:
- Performance impact of registry operations (minimal)
- Memory usage for agent storage (trivial)

**Mitigations**:
- Comprehensive testing before deployment
- Feature flag to disable registry if needed
- Monitoring for performance impact

## Success Metrics

1. **Zero silent task failures** due to missing agents
2. **Improved planning accuracy** with available agents
3. **Better user experience** with visible agent capabilities
4. **Easier debugging** with clear error messages

## Next Steps

1. Review and approve this proposal
2. Implement Phase 1 (Core Registry)
3. Progress through phases based on feedback
4. Monitor and measure success metrics

---

**Status**: Ready for review and implementation
**Estimated effort**: 2-3 days for core functionality, 1 week for full implementation
**Priority**: High - fixes critical architectural flaw
