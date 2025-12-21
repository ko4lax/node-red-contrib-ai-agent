const axios = require('axios');

module.exports = function (RED) {
    function AiOrchestratorNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.name = config.name || 'AI Orchestrator';
        this.maxIterations = parseInt(config.maxIterations) || 5;
        this.planningStrategy = config.planningStrategy || 'simple';
        this.defaultGoal = config.defaultGoal || '';

        node.on('input', async function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments) };

            try {
                // Initialize orchestration state if not present
                if (!msg.orchestration) {
                    node.status({ fill: 'blue', shape: 'dot', text: 'initializing team...' });

                    // Pipeline Discovery: Extract agents from upstream chain
                    const availableAgents = msg.agents || [];

                    msg.orchestration = {
                        planId: 'plan-' + Date.now(),
                        iterations: 0,
                        goal: msg.payload || node.defaultGoal,
                        status: 'planning',
                        availableAgents: availableAgents,
                        history: [],
                        plan: null
                    };
                } else {
                    msg.orchestration.iterations++;
                }

                // Check for max iterations
                if (msg.orchestration.iterations >= node.maxIterations) {
                    node.warn('Max iterations reached');
                    msg.orchestration.status = 'failed';
                    msg.orchestration.error = 'Max iterations reached';
                    node.status({ fill: 'red', shape: 'dot', text: 'max iterations' });
                    send(msg);
                    if (done) done();
                    return;
                }

                // AI Configuration check
                if (!msg.aiagent || !msg.aiagent.apiKey) {
                    throw new Error('AI Model configuration missing or API key not found.');
                }

                // Inner loop for Zero-Wire execution
                while (msg.orchestration.status !== 'completed' && msg.orchestration.status !== 'failed') {

                    // 1. Planning Phase
                    if (msg.orchestration.status === 'planning' || !msg.orchestration.plan) {
                        node.status({ fill: 'blue', shape: 'dot', text: 'planning...' });
                        await createInitialPlan(node, msg);
                    }

                    // 2. Find Next Task
                    const nextTask = getNextTask(msg.orchestration.plan);
                    if (!nextTask) {
                        msg.orchestration.status = 'completed';
                        break;
                    }

                    // 3. Execution Phase (Direct Call)
                    msg.orchestration.currentTaskId = nextTask.id;
                    const agentInfo = msg.orchestration.availableAgents.find(a =>
                        a.capabilities.some(cap => cap.toLowerCase() === nextTask.type.toLowerCase())
                    );

                    if (!agentInfo) {
                        node.warn(`No registered agent found for capability: ${nextTask.type}`);
                        throw new Error(`Capability not provided by any wired agent: ${nextTask.type}`);
                    }

                    const agentNode = RED.nodes.getNode(agentInfo.id);
                    if (!agentNode || typeof agentNode.executeTask !== 'function') {
                        throw new Error(`Agent node ${agentInfo.name} [${agentInfo.id}] is not an AI Agent Orchestrator or is missing executeTask API.`);
                    }

                    node.status({ fill: 'blue', shape: 'ring', text: `agent: ${agentInfo.name}` });
                    try {
                        const result = await agentNode.executeTask(nextTask.input, msg);
                        msg.payload = result;
                        msg.error = null;
                    } catch (err) {
                        msg.error = err.message;
                    }

                    // 4. Reflection Phase
                    node.status({ fill: 'blue', shape: 'dot', text: 'reflecting...' });
                    await reflectAndRefine(node, msg);
                }

                // Final Output
                node.status({ fill: 'green', shape: 'dot', text: msg.orchestration.status });
                send(msg);

                if (done) done();
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: 'error' });
                node.error(error.message, msg);
                if (done) done(error);
            }
        });
    }

    async function createInitialPlan(node, msg) {
        const goal = msg.orchestration.goal;
        const strategy = node.planningStrategy;
        const agents = msg.orchestration.availableAgents || [];
        const agentManifest = agents.map(a => `- ${a.name}: [${a.capabilities.join(', ')}]`).join('\n');

        let prompt = `Goal: ${goal}\n\nAvailable Agents and their Capabilities:\n${agentManifest}\n\nDecompose this goal into a series of tasks. You MUST ONLY use capabilities provided by the available agents listed above. 
Return a JSON object with a "tasks" array. Each task should have:
- "id": a short string id (e.g., "t1", "t2")
- "type": the name of the REQUIRED capability from the list above
- "input": detailed instruction for the agent
- "status": "pending"
- "priority": a number (1-10, default 5)
- "dependsOn": an array of IDs of tasks that must be completed BEFORE this task can start (empty array if none)
`;

        if (strategy === 'advanced') {
            prompt += `\n\nThink about parallel execution. Group related tasks and identify bottlenecks. Ensure dependencies are logical.`;
        }

        prompt += `\n\nExample:
{
  "tasks": [
    {"id": "t1", "type": "research", "input": "...", "status": "pending", "priority": 10, "dependsOn": []},
    {"id": "t2", "type": "implementation", "input": "...", "status": "pending", "priority": 5, "dependsOn": ["t1"]}
  ]
}`;

        try {
            const response = await callAI(msg.aiagent, prompt, "You are an AI Orchestrator that creates non-linear plans with dependencies.");
            const planData = JSON.parse(extractJson(response));
            msg.orchestration.plan = planData;
            msg.orchestration.status = 'executing';
        } catch (error) {
            throw new Error(`Planning failed: ${error.message}`);
        }
    }

    async function reflectAndRefine(node, msg) {
        const currentTaskId = msg.orchestration.currentTaskId;
        const taskResult = msg.payload;
        const isError = msg.error ? true : false;

        // Update history
        msg.orchestration.history.push({
            taskId: currentTaskId,
            result: taskResult,
            error: msg.error,
            timestamp: new Date().toISOString()
        });

        // Update task status in plan
        const task = msg.orchestration.plan.tasks.find(t => t.id === currentTaskId);
        if (task) {
            if (isError) {
                task.status = 'failed';
                task.error = msg.error;
            } else {
                task.status = 'completed';
                task.output = taskResult;
            }
        }

        const prompt = `Current Goal: ${msg.orchestration.goal}
Current Plan: ${JSON.stringify(msg.orchestration.plan)}
Last Task ID: ${currentTaskId}
Last Task ${isError ? 'Error' : 'Result'}: ${JSON.stringify(isError ? msg.error : taskResult)}

Evaluate the progress. 
1. If the last task failed, propose a recovery strategy (retry, alternative task, or fail the goal).
2. If the goal is achieved, set status to "completed".
3. If you need more information or approval from a human, add a task with type "human_approval".
4. Otherwise, continue execution. You may refine the plan by adding, removing, or modifying tasks.

Return a JSON object:
{
  "analysis": "detailed evaluation of progress and next steps",
  "status": "executing" | "completed" | "failed",
  "updatedPlan": { "tasks": [...] }
}`;

        try {
            const response = await callAI(msg.aiagent, prompt, "You are an AI Orchestrator that reflects on progress and manages plan revisions.");
            const reflection = JSON.parse(extractJson(response));

            msg.orchestration.status = reflection.status;
            if (reflection.updatedPlan) {
                msg.orchestration.plan = reflection.updatedPlan;
            }
        } catch (error) {
            node.warn(`Reflection failed, continuing with current plan state: ${error.message}`);
            // Fallback: stay in executing status if it was executing, let getNextTask decide
        }
    }

    function getNextTask(plan) {
        if (!plan || !plan.tasks) return null;

        // Find tasks that are pending AND all their dependencies are completed
        const eligibleTasks = plan.tasks.filter(t => {
            if (t.status !== 'pending') return false;

            if (!t.dependsOn || t.dependsOn.length === 0) return true;

            return t.dependsOn.every(depId => {
                const depTask = plan.tasks.find(pt => pt.id === depId);
                return depTask && depTask.status === 'completed';
            });
        });

        if (eligibleTasks.length === 0) return null;

        // Sort by priority (descending) then by ID
        eligibleTasks.sort((a, b) => {
            const priorityA = a.priority || 5;
            const priorityB = b.priority || 5;
            if (priorityB !== priorityA) return priorityB - priorityA;
            return a.id.localeCompare(b.id);
        });

        return eligibleTasks[0];
    }

    async function callAI(aiConfig, prompt, systemPrompt) {
        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            {
                model: aiConfig.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${aiConfig.apiKey}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return response.data.choices[0]?.message?.content || '';
    }

    function extractJson(text) {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? match[0] : text;
    }

    RED.nodes.registerType('ai-orchestrator', AiOrchestratorNode);
};
