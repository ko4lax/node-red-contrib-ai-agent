---
path: modules/ai-orchestrator.md
page-type: module
summary: Documentation for the AI Orchestrator node - multi-agent coordination and autonomous planning.
tags: [orchestrator, multi-agent, planning, autonomous]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# AI Orchestrator Module

The AI Orchestrator node coordinates multiple AI agents by creating and executing autonomous plans using an observe-think-act-reflect cycle with task dependency management and dynamic plan revision.

## Purpose and Responsibilities

The AI Orchestrator node serves as a higher-level coordination component that:

- **Autonomous Planning**: Creates structured plans to achieve complex goals
- **Task Coordination**: Manages task execution with dependency resolution
- **Multi-Agent Management**: Coordinates multiple specialized AI agents
- **Dynamic Adaptation**: Revises plans based on execution outcomes and feedback
- **Error Recovery**: Handles task failures with intelligent recovery strategies

## Key Types and Interfaces

### Orchestrator Configuration
```javascript
{
  name: "string",                        // Display name
  maxIterations: "number",               // Maximum autonomy cycles
  planningStrategy: "simple | advanced", // Planning approach
  defaultGoal: "string",                 // Fallback goal
  agents: "Array<string>",               // Available agent IDs
  taskTimeout: "number",                 // Task execution timeout
  retryPolicy: "object"                  // Retry and escalation rules
}
```

### Plan Structure
```javascript
{
  id: "string",                          // Unique plan identifier
  goal: "string",                        // Primary objective
  tasks: [
    {
      id: "string",                      // Task identifier
      description: "string",             // Task description
      priority: "high | medium | low",   // Task priority
      dependencies: ["string"],           // Dependent task IDs
      agentType: "string",               // Required agent type
      status: "pending | in_progress | completed | failed",
      result: "any",                      // Task execution result
      metadata: "object"                  // Additional task data
    }
  ],
  createdAt: "number",                    // Plan creation timestamp
  updatedAt: "number",                    // Last update timestamp
  iteration: "number"                     // Current iteration
}
```

### Execution State
```javascript
{
  plan: "Plan",                          // Current plan
  iteration: "number",                    // Current cycle number
  phase: "observe | think | act | reflect", // Current phase
  activeTask: "Task",                    // Currently executing task
  results: "Array<TaskResult>",          // Completed task results
  errors: "Array<Error>",                // Execution errors
  metadata: "object"                     // Execution metadata
}
```

## Dependencies and Relationships

### Required Dependencies
- **Node-RED Runtime**: Version 1.0.0 or higher
- **AI Agent Nodes**: Specialized agents for task execution
- **AI Model Node**: Planning and reasoning capabilities

### Integration Points
- **AI Agent Nodes**: Task execution and specialized processing
- **Memory Systems**: Plan and execution state persistence
- **Tool Nodes**: Extended capabilities for agents

## Configuration Options

### Basic Configuration
- **Name**: Display name for the node
- **Max Iterations**: Maximum autonomy cycles (default: 10)
- **Planning Strategy**: Simple (linear) or Advanced (dependency-aware)
- **Default Goal**: Fallback objective when no goal provided

### Advanced Configuration
- **Task Timeout**: Maximum time per task (default: 300000ms)
- **Retry Count**: Number of retry attempts (default: 3)
- **Parallel Execution**: Enable concurrent task execution
- **Escalation Rules**: When to escalate or abort

## Usage Examples

### Simple Goal Achievement
```javascript
// Input message
{
  payload: "Write a blog post about renewable energy and then translate it to Spanish",
  goal: "Create and translate renewable energy blog post"
}

// Generated Plan
{
  goal: "Create and translate renewable energy blog post",
  tasks: [
    {
      id: "task-1",
      description: "Research renewable energy topics",
      priority: "high",
      agentType: "researcher",
      dependencies: []
    },
    {
      id: "task-2", 
      description: "Write blog post about renewable energy",
      priority: "high",
      agentType: "writer",
      dependencies: ["task-1"]
    },
    {
      id: "task-3",
      description: "Translate blog post to Spanish",
      priority: "medium", 
      agentType: "translator",
      dependencies: ["task-2"]
    }
  ]
}
```

### Complex Multi-Agent Coordination
```javascript
// Input message
{
  payload: "Analyze customer feedback data and create improvement recommendations",
  goal: "Analyze feedback and create recommendations",
  agents: ["analyst", "researcher", "writer", "reviewer"]
}

// Advanced Plan with Dependencies
{
  goal: "Analyze feedback and create recommendations",
  tasks: [
    {
      id: "data-collection",
      description: "Collect customer feedback data",
      priority: "high",
      agentType: "analyst",
      dependencies: []
    },
    {
      id: "data-analysis", 
      description: "Analyze feedback patterns and trends",
      priority: "high",
      agentType: "analyst",
      dependencies: ["data-collection"]
    },
    {
      id: "research-benchmarks",
      description: "Research industry benchmarks",
      priority: "medium",
      agentType: "researcher", 
      dependencies: []
    },
    {
      id: "draft-recommendations",
      description: "Draft initial recommendations",
      priority: "high",
      agentType: "writer",
      dependencies: ["data-analysis", "research-benchmarks"]
    },
    {
      id: "review-recommendations",
      description: "Review and refine recommendations",
      priority: "medium",
      agentType: "reviewer",
      dependencies: ["draft-recommendations"]
    }
  ]
}
```

### Error Recovery and Plan Revision
```javascript
// Initial plan fails at task execution
{
  failedTask: "data-collection",
  error: "API rate limit exceeded",
  recoveryActions: [
    {
      action: "retry",
      delay: 60000,
      maxRetries: 3
    },
    {
      action: "pivot", 
      newTask: "use-backup-data-source",
      dependencies: []
    },
    {
      action: "escalate",
      message: "Unable to collect data, manual intervention required"
    }
  ]
}
```

## Autonomy Cycle

### Observe Phase
```javascript
// Gather current state information
function observe(executionState) {
  return {
    completedTasks: getCompletedTasks(executionState.plan),
    failedTasks: getFailedTasks(executionState.plan),
    availableAgents: getAvailableAgents(),
    resources: getAvailableResources(),
    constraints: getCurrentConstraints()
  };
}
```

### Think Phase
```javascript
// Analyze state and decide next actions
function think(observation, plan) {
  const analysis = analyzeObservation(observation);
  const nextTask = selectNextTask(plan, analysis);
  
  if (shouldRevisePlan(analysis)) {
    return revisePlan(plan, analysis);
  }
  
  return {
    action: "execute",
    task: nextTask,
    reasoning: analysis.reasoning
  };
}
```

### Act Phase
```javascript
// Execute the selected task
async function act(task, agents) {
  const agent = selectAgent(task, agents);
  
  try {
    const result = await agent.execute(task);
    return {
      success: true,
      result: result,
      task: task
    };
  } catch (error) {
    return {
      success: false,
      error: error,
      task: task
    };
  }
}
```

### Reflect Phase
```javascript
// Evaluate results and update plan
function reflect(result, plan) {
  const evaluation = evaluateResult(result);
  const updatedPlan = updatePlan(plan, evaluation);
  
  return {
    plan: updatedPlan,
    insights: evaluation.insights,
    nextPhase: determineNextPhase(evaluation)
  };
}
```

## Task Dependency Management

### Dependency Types
```javascript
// Sequential dependency
{
  taskId: "task-2",
  dependencies: ["task-1"],  // Must complete task-1 first
  type: "sequential"
}

// Parallel dependency  
{
  taskId: "task-3",
  dependencies: ["task-1", "task-2"],  // Both must complete
  type: "parallel"
}

// Conditional dependency
{
  taskId: "task-4", 
  dependencies: ["task-1"],
  condition: "task-1.result.success === true",
  type: "conditional"
}
```

### Dependency Resolution
```javascript
function getAvailableTasks(plan) {
  return plan.tasks.filter(task => {
    if (task.status !== "pending") return false;
    
    // Check if all dependencies are satisfied
    return task.dependencies.every(depId => {
      const depTask = plan.tasks.find(t => t.id === depId);
      return depTask && depTask.status === "completed";
    });
  });
}
```

### Priority-Based Execution
```javascript
function selectNextTask(availableTasks) {
  // Sort by priority first, then by dependencies
  return availableTasks.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  })[0];
}
```

## Error Recovery Strategies

### Retry Strategy
```javascript
{
  task: "api-call",
  error: "Rate limit exceeded",
  retryPolicy: {
    maxRetries: 3,
    delays: [1000, 5000, 15000],  // Progressive backoff
    retryConditions: ["rate_limit", "timeout", "network_error"]
  }
}
```

### Pivot Strategy
```javascript
{
  task: "data-collection",
  error: "Primary API unavailable",
  pivotStrategy: {
    alternativeTask: "use-backup-source",
    fallbackAgents: ["backup-analyst"],
    adaptation: "use cached data if available"
  }
}
```

### Escalation Strategy
```javascript
{
  task: "critical-computation",
  error: "Insufficient permissions",
  escalationStrategy: {
    level: "human_intervention",
    message: "Manual approval required for access",
    context: {
      originalTask: "critical-computation",
      error: "Permission denied",
      alternatives: ["use-different-approach", "request-access"]
    }
  }
}
```

## Plan Revision Logic

### Revision Triggers
```javascript
const revisionTriggers = {
  taskFailure: (failureCount, totalTasks) => failureCount / totalTasks > 0.3,
  resourceConstraint: (resourceUsage) => resourceUsage > 0.9,
  timeConstraint: (elapsedTime, timeLimit) => elapsedTime > timeLimit * 0.8,
  newInformation: (newData) => newData.impact === "high"
};
```

### Revision Strategies
```javascript
// Reorder tasks based on new priorities
function reorderTasks(plan, newPriorities) {
  return {
    ...plan,
    tasks: plan.tasks.map(task => ({
      ...task,
      priority: newPriorities[task.id] || task.priority
    })).sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    })
  };
}

// Split complex tasks
function splitComplexTask(plan, complexTask) {
  const subtasks = decomposeTask(complexTask);
  
  return {
    ...plan,
    tasks: [
      ...plan.tasks.filter(t => t.id !== complexTask.id),
      ...subtasks.map((subtask, index) => ({
        ...subtask,
        id: `${complexTask.id}-${index}`,
        dependencies: complexTask.dependencies
      }))
    ]
  };
}
```

## Performance Optimization

### Parallel Execution
```javascript
function executeParallelTasks(plan, agents) {
  const readyTasks = getAvailableTasks(plan);
  const parallelGroups = groupTasksByDependencies(readyTasks);
  
  return parallelGroups.map(group => 
    Promise.all(group.map(task => executeTask(task, agents)))
  );
}
```

### Resource Management
```javascript
function optimizeResourceUsage(plan, availableResources) {
  // Balance load across agents
  const agentLoad = calculateAgentLoad(plan, availableResources);
  
  return redistributeTasks(plan, agentLoad);
}
```

### Caching and Memoization
```javascript
// Cache task results to avoid redundant work
const taskCache = new Map();

function executeTaskWithCache(task, agent) {
  const cacheKey = generateTaskKey(task);
  
  if (taskCache.has(cacheKey)) {
    return taskCache.get(cacheKey);
  }
  
  const result = agent.execute(task);
  taskCache.set(cacheKey, result);
  
  return result;
}
```

## Monitoring and Observability

### Execution Metrics
```javascript
{
  planId: "plan-123",
  metrics: {
    totalTasks: 8,
    completedTasks: 5,
    failedTasks: 1,
    averageTaskDuration: 45000,
    totalExecutionTime: 180000,
    resourceUtilization: 0.75,
    successRate: 0.875
  }
}
```

### Health Checks
```javascript
function checkOrchestratorHealth(state) {
  return {
    status: state.iteration < state.maxIterations ? "healthy" : "warning",
    activeTasks: state.plan.tasks.filter(t => t.status === "in_progress").length,
    errorRate: calculateErrorRate(state),
    resourceAvailability: checkResourceAvailability()
  };
}
```

## Common Patterns

### Research and Writing Workflow
```javascript
{
  goal: "Research and write article",
  pattern: "research-write-review",
  tasks: [
    "research-topic",
    "outline-article", 
    "write-draft",
    "review-content",
    "final-edit"
  ]
}
```

### Data Analysis Pipeline
```javascript
{
  goal: "Analyze dataset and generate insights",
  pattern: "collect-process-analyze-report",
  tasks: [
    "collect-data",
    "clean-data",
    "analyze-patterns",
    "generate-insights",
    "create-report"
  ]
}
```

### Multi-Step Decision Process
```javascript
{
  goal: "Make complex business decision",
  pattern: "gather-analyze-decide-implement",
  tasks: [
    "gather-requirements",
    "analyze-options",
    "evaluate-risks",
    "make-decision",
    "create-implementation-plan"
  ]
}
```

## See Also

- [AI Agent Module](ai-agent.md) - Individual agent execution
- [Architecture](../architecture.md) - System design and coordination
- [Data Flow](../data_flow.md) - Message processing and coordination
- [Development Guide](../development.md) - Custom orchestrator implementations
