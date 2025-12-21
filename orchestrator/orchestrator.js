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
            node.status({ fill: 'blue', shape: 'dot', text: 'thinking...' });

            try {
                // Initialize orchestration state if not present
                if (!msg.orchestration) {
                    msg.orchestration = {
                        planId: 'plan-' + Date.now(),
                        iterations: 0,
                        goal: msg.payload || node.defaultGoal,
                        status: 'planning',
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
                    send([null, msg]); // Output 2 for final result
                    if (done) done();
                    return;
                }

                // AI Configuration check
                if (!msg.aiagent || !msg.aiagent.apiKey) {
                    throw new Error('AI Model configuration missing or API key not found.');
                }

                // Logic based on current status
                if (msg.orchestration.status === 'planning' || !msg.orchestration.plan) {
                    await createInitialPlan(node, msg);
                } else {
                    await reflectAndRefine(node, msg);
                }

                // Dispatch or Finalize
                if (msg.orchestration.status === 'completed' || msg.orchestration.status === 'failed') {
                    node.status({ fill: 'green', shape: 'dot', text: msg.orchestration.status });
                    send([null, msg]); // Output 2
                } else {
                    const nextTask = getNextTask(msg.orchestration.plan);
                    if (nextTask) {
                        msg.payload = nextTask.input;
                        msg.topic = nextTask.type;
                        msg.orchestration.currentTaskId = nextTask.id;
                        node.status({ fill: 'blue', shape: 'ring', text: `dispatching: ${nextTask.id}` });
                        send([msg, null]); // Output 1
                    } else {
                        msg.orchestration.status = 'completed';
                        node.status({ fill: 'green', shape: 'dot', text: 'completed' });
                        send([null, msg]); // Output 2
                    }
                }

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
        const prompt = `Goal: ${goal}\n\nDecompose this goal into a series of tasks for AI agents. 
Return a JSON object with a "tasks" array. Each task should have:
- "id": a short string id
- "type": the type of task
- "input": what the agent should do
- "status": "pending"

Example:
{
  "tasks": [
    {"id": "t1", "type": "research", "input": "Find information about X", "status": "pending"},
    {"id": "t2", "type": "summary", "input": "Summarize the findings", "status": "pending"}
  ]
}`;

        try {
            const response = await callAI(msg.aiagent, prompt, "You are an AI Orchestrator that creates plans.");
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

        // Update history
        msg.orchestration.history.push({
            taskId: currentTaskId,
            result: taskResult,
            timestamp: new Date().toISOString()
        });

        // Update task status in plan
        const task = msg.orchestration.plan.tasks.find(t => t.id === currentTaskId);
        if (task) {
            task.status = 'completed';
            task.output = taskResult;
        }

        const prompt = `Current Goal: ${msg.orchestration.goal}
Current Plan: ${JSON.stringify(msg.orchestration.plan)}
Last Task Result: ${JSON.stringify(taskResult)}

Evaluate the progress. Should we continue with the current plan, refine it, or is the goal achieved?
Return a JSON object:
{
  "analysis": "string evaluation",
  "status": "executing" | "completed" | "failed",
  "updatedPlan": { ... same structure as plan ... }
}`;

        try {
            const response = await callAI(msg.aiagent, prompt, "You are an AI Orchestrator that reflects on progress.");
            const reflection = JSON.parse(extractJson(response));

            msg.orchestration.status = reflection.status;
            if (reflection.updatedPlan) {
                msg.orchestration.plan = reflection.updatedPlan;
            }
        } catch (error) {
            node.warn(`Reflection failed, continuing with current plan: ${error.message}`);
            // Fallback: just move to next task if possible
        }
    }

    function getNextTask(plan) {
        if (!plan || !plan.tasks) return null;
        return plan.tasks.find(t => t.status === 'pending');
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
