const axios = require('axios');

/**
 * AI Orchestrator Node - Manages multi-agent task execution with planning and reflection
 * @param {Object} config - Node configuration object
 * @param {string} config.name - Node name
 * @param {number} config.maxIterations - Maximum number of planning/execution iterations
 * @param {string} config.planningStrategy - Strategy for plan creation ('simple' or 'advanced')
 * @param {string} config.defaultGoal - Default goal if none provided in message
 */
module.exports = function (RED) {
    function AiOrchestratorNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        this.name = config.name || 'AI Orchestrator';
        this.maxIterations = normalizePositiveInt(config.maxIterations, 5, 1, 100);
        this.planningStrategy = (config.planningStrategy || 'simple');
        this.defaultGoal = config.defaultGoal || '';
        this.maxHistory = normalizePositiveInt(config.maxHistory, 50, 1, 1000);
        this.providerBaseUrl = String(config.providerBaseUrl || 'https://openrouter.ai/api/v1');
        this.timeoutMs = normalizePositiveInt(config.timeoutMs, 30000, 1000, 300000);
        this.debug = !!config.debug;

        const configErrors = validateNodeConfig(node);
        if (configErrors.length > 0) {
            node.error(configErrors.join('; '));
        }

        node.on('input', async function (msg, send, done) {
            send = send || function () { node.send.apply(node, arguments) };

            try {
                // Initialize orchestration state if not present
                if (!msg.orchestration) {
                    node.status({ fill: 'blue', shape: 'dot', text: 'initializing team...' });

                    // Pipeline Discovery: Extract agents from upstream chain
                    const availableAgents = msg.agents || [];

                    const payloadGoal = (typeof msg.payload === 'string' && msg.payload.trim()) ? msg.payload : '';

                    msg.orchestration = {
                        planId: 'plan-' + Date.now(),
                        iterations: 0,
                        goal: payloadGoal || node.defaultGoal,
                        status: 'planning',
                        availableAgents: availableAgents,
                        history: [],
                        plan: null
                    };
                }

                const messageErrors = validateMessage(msg, node);
                if (messageErrors.length > 0) {
                    throw new Error(messageErrors.join('; '));
                }

                if (msg.orchestration._running) {
                    if (done) done();
                    return;
                }

                msg.orchestration._running = true;
                setImmediate(() => processNextStep(RED, node, msg, send, done));
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: 'error' });
                node.error(error.message, msg);
                if (done) done(error);
            }
        });
    }

    async function processNextStep(RED, node, msg, send, done) {
        try {
            if (!msg.orchestration) {
                msg.orchestration = { status: 'failed', error: 'Orchestration state missing' };
            }

            if (msg.orchestration.status === 'completed' || msg.orchestration.status === 'failed') {
                finalizeOrchestration(node, msg, send, done);
                return;
            }

            if (msg.orchestration.iterations >= node.maxIterations) {
                msg.orchestration.status = 'failed';
                msg.orchestration.error = 'Max iterations reached';
                node.status({ fill: 'red', shape: 'dot', text: 'max iterations' });
                finalizeOrchestration(node, msg, send, done);
                return;
            }

            if (msg.orchestration.status === 'planning' || !msg.orchestration.plan) {
                node.status({ fill: 'blue', shape: 'dot', text: 'planning...' });
                await createInitialPlan(node, msg);

                const planErrors = validatePlan(msg.orchestration.plan, msg.orchestration.availableAgents || []);
                if (planErrors.length > 0) {
                    msg.orchestration.status = 'failed';
                    msg.orchestration.error = planErrors.join('; ');
                    node.status({ fill: 'red', shape: 'ring', text: 'plan invalid' });
                    finalizeOrchestration(node, msg, send, done);
                    return;
                }

                setImmediate(() => processNextStep(RED, node, msg, send, done));
                return;
            }

            const nextTask = getNextTask(msg.orchestration.plan);
            if (!nextTask) {
                msg.orchestration.status = 'completed';
                finalizeOrchestration(node, msg, send, done);
                return;
            }

            msg.orchestration.currentTaskId = nextTask.id;
            const agentInfo = selectAgentForTask(msg.orchestration, nextTask);

            if (!agentInfo) {
                msg.error = `Capability not provided by any wired agent: ${nextTask.type}`;
                msg.payload = null;
            } else {
                const agentNode = RED.nodes.getNode(agentInfo.id);
                if (!agentNode || typeof agentNode.executeTask !== 'function') {
                    msg.error = `Agent node ${agentInfo.name} [${agentInfo.id}] is not an AI Orchestrator Agent or is missing executeTask API.`;
                    msg.payload = null;
                } else {
                    node.status({ fill: 'blue', shape: 'ring', text: `agent: ${agentInfo.name}` });
                    try {
                        const result = await agentNode.executeTask(nextTask.input, msg);
                        msg.payload = result;
                        msg.error = null;
                    } catch (err) {
                        let errorMessage = err && err.message ? err.message : String(err);
                        if (errorMessage.startsWith('AI API Error: ')) {
                            errorMessage = errorMessage.substring('AI API Error: '.length);
                        }
                        msg.error = errorMessage;
                    }
                }
            }

            node.status({ fill: 'blue', shape: 'dot', text: 'reflecting...' });
            await reflectAndRefine(node, msg);
            msg.orchestration.iterations++;

            setImmediate(() => processNextStep(RED, node, msg, send, done));
        } catch (error) {
            msg.orchestration.status = 'failed';
            msg.orchestration.error = error && error.message ? error.message : String(error);
            node.status({ fill: 'red', shape: 'ring', text: 'error' });
            finalizeOrchestration(node, msg, send, done, error);
        }
    }

    function finalizeOrchestration(node, msg, send, done, error) {
        msg.orchestration._running = false;
        node.status({ fill: msg.orchestration.status === 'completed' ? 'green' : 'red', shape: 'dot', text: msg.orchestration.status });
        send(msg);
        if (done) done(error);
    }

    /**
     * Creates an initial execution plan using AI
     * @param {Object} node - The orchestrator node instance
     * @param {Object} msg - The message object containing orchestration state
     * @throws {Error} If planning fails
     */
    async function createInitialPlan(node, msg) {
        const goal = msg.orchestration.goal;
        const goalText = typeof goal === 'string' ? goal : JSON.stringify(goal, null, 2);
        const strategy = node.planningStrategy;
        const agents = msg.orchestration.availableAgents || [];
        const agentManifest = agents.map(a => `- ${a.name}: [${a.capabilities.join(', ')}]`).join('\n');
        const allowedCapabilities = Array.from(new Set(
            agents.flatMap(a => Array.isArray(a.capabilities) ? a.capabilities : []).map(String)
        ));
        const allowedCapabilitiesJson = JSON.stringify(allowedCapabilities);

        let prompt = `Goal: ${goalText}\n\nAvailable Agents and their Capabilities:\n${agentManifest}\n\nDecompose this goal into a series of tasks. You MUST ONLY use capabilities provided by the available agents listed above. 
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

        prompt += `\n\nIMPORTANT OUTPUT RULES:
- Return ONLY raw JSON (no markdown, no code fences, no explanations)
- Do NOT include comments (e.g. // ...)
- Do NOT include trailing commas
- All string values must be valid JSON strings (escape newlines as \\n if needed)

CAPABILITY RULES:
- The "type" field MUST be one of these EXACT strings (case-sensitive): ${allowedCapabilitiesJson}
- Do NOT invent new capabilities.
- If the goal seems to require a missing capability, still produce a plan using ONLY the allowed capabilities, and include a task whose input explains the limitation.

Example:
{
  "tasks": [
    {"id": "t1", "type": "research", "input": "...", "status": "pending", "priority": 10, "dependsOn": []},
    {"id": "t2", "type": "implementation", "input": "...", "status": "pending", "priority": 5, "dependsOn": ["t1"]}
  ]
}`;

        try {
            debugLog(node, 'Planning Prompt', prompt);
            const response = await callAI(node, msg.aiagent, prompt, "You are an AI Orchestrator that creates non-linear plans with dependencies.");
            debugLog(node, 'Planning Response', response);
            const planData = parseJsonResponse(response);
            msg.orchestration.plan = planData;
            msg.orchestration.status = 'executing';
        } catch (error) {
            throw new Error(`Planning failed: ${error.message}`);
        }
    }

    /**
     * Reflects on task execution results and refines the plan
     * @param {Object} node - The orchestrator node instance
     * @param {Object} msg - The message object containing orchestration state and task results
     */
    async function reflectAndRefine(node, msg) {
        const currentTaskId = msg.orchestration.currentTaskId;
        const isError = !!msg.error;
        const taskResult = msg.payload;

        // Update history
        msg.orchestration.history.push({
            taskId: currentTaskId,
            result: taskResult,
            error: msg.error,
            timestamp: new Date().toISOString()
        });

        if (Array.isArray(msg.orchestration.history) && msg.orchestration.history.length > node.maxHistory) {
            msg.orchestration.history = msg.orchestration.history.slice(-node.maxHistory);
        }

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

        const hasHumanApprovalCapability = (msg.orchestration.availableAgents || []).some(a =>
            Array.isArray(a.capabilities) && a.capabilities.some(c => String(c).toLowerCase() === 'human_approval')
        );

        const allowedCapabilities = Array.from(new Set(
            (msg.orchestration.availableAgents || [])
                .flatMap(a => Array.isArray(a.capabilities) ? a.capabilities : [])
                .map(String)
        ));
        const allowedCapabilitiesJson = JSON.stringify(allowedCapabilities);

        const humanApprovalInstruction = hasHumanApprovalCapability
            ? '3. If you need more information or approval from a human, add a task with type "human_approval".'
            : '3. Do NOT request human approval tasks ("human_approval" is not available).';

        const reflectionGoal = msg.orchestration.goal;
        const reflectionGoalText = typeof reflectionGoal === 'string' ? reflectionGoal : JSON.stringify(reflectionGoal, null, 2);

        const prompt = `Current Goal: ${reflectionGoalText}
Current Plan: ${JSON.stringify(msg.orchestration.plan)}
Last Task ID: ${currentTaskId}
Last Task ${isError ? 'Error' : 'Result'}: ${JSON.stringify(isError ? msg.error : taskResult)}

Available Capabilities (EXACT strings): ${allowedCapabilitiesJson}

Evaluate the progress. 
1. If the last task failed, propose a recovery strategy (retry, alternative task, or fail the goal).
2. If the goal is achieved, set status to "completed".
${humanApprovalInstruction}
4. Otherwise, continue execution. You may refine the plan by adding, removing, or modifying tasks.

PLAN UPDATE RULES:
- In updatedPlan.tasks, every task.type MUST be one of the EXACT capability strings listed above.
- Do NOT invent or rename capabilities.

Return a JSON object:
{
  "analysis": "detailed evaluation of progress and next steps",
  "status": "executing" | "completed" | "failed",
  "updatedPlan": { "tasks": [...] }
}`;

        try {
            const response = await callAI(node, msg.aiagent, prompt, "You are an AI Orchestrator that reflects on progress and manages plan revisions.");
            const reflection = parseJsonResponse(response);

            msg.orchestration.status = reflection.status;
            if (reflection.updatedPlan) {
                msg.orchestration.plan = reflection.updatedPlan;
            }
        } catch (error) {
            node.warn(`Reflection failed, continuing with current plan state: ${error.message}`);
            // Fallback: stay in executing status if it was executing, let getNextTask decide
        }
    }

    /**
     * Gets the next executable task from the plan based on dependencies and priority
     * @param {Object} plan - The execution plan containing tasks
     * @returns {Object|null} The next task to execute or null if no eligible tasks
     */
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

    function selectAgentForTask(orchestration, task) {
        if (!orchestration || !task || !task.type) return null;
        const availableAgents = orchestration.availableAgents || [];
        const taskType = String(task.type).toLowerCase();

        const matchingAgents = availableAgents.filter(a =>
            Array.isArray(a.capabilities) && a.capabilities.some(cap => String(cap).toLowerCase() === taskType)
        );

        if (matchingAgents.length === 0) return null;
        if (matchingAgents.length === 1) return matchingAgents[0];

        orchestration.agentUsage = orchestration.agentUsage || {};
        orchestration.agentLastUsedAt = orchestration.agentLastUsedAt || {};

        // Prefer least recently used among matching agents to avoid always picking the first.
        matchingAgents.sort((a, b) => {
            const aLast = orchestration.agentLastUsedAt[a.id] || 0;
            const bLast = orchestration.agentLastUsedAt[b.id] || 0;
            if (aLast !== bLast) return aLast - bLast;
            return String(a.id).localeCompare(String(b.id));
        });

        const selected = matchingAgents[0];
        orchestration.agentUsage[selected.id] = (orchestration.agentUsage[selected.id] || 0) + 1;
        orchestration.agentLastUsedAt[selected.id] = Date.now();
        return selected;
    }

    /**
     * Makes an API call to the AI model
     * @param {Object} aiConfig - AI configuration containing model and API key
     * @param {string} prompt - The user prompt to send
     * @param {string} systemPrompt - The system prompt for context
     * @returns {Promise<string>} The AI response content
     * @throws {Error} If API call fails
     */
    async function callAI(node, aiConfig, prompt, systemPrompt) {
        const response = await axios.post(
            buildChatCompletionsUrl(node, aiConfig),
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
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://nodered.org/',
                    'X-Title': 'Node-RED AI Orchestrator'
                },
                timeout: getTimeoutMs(node, aiConfig)
            }
        );
        return response.data.choices[0]?.message?.content || '';
    }

    function buildChatCompletionsUrl(node, aiConfig) {
        const baseUrl = (aiConfig && aiConfig.baseUrl) ? String(aiConfig.baseUrl) : String(node.providerBaseUrl);
        return baseUrl.replace(/\/+$/, '') + '/chat/completions';
    }

    function getTimeoutMs(node, aiConfig) {
        if (aiConfig && aiConfig.timeoutMs !== undefined) {
            return normalizePositiveInt(aiConfig.timeoutMs, node.timeoutMs, 1000, 300000);
        }
        return node.timeoutMs;
    }

    /**
     * Extracts JSON from a text response
     * @param {string} text - The text containing JSON
     * @returns {string} The extracted JSON string
     */
    function extractJson(text) {
        const match = text.match(/\{[\s\S]*\}/);
        return match ? match[0] : text;
    }

    /**
     * Parses a JSON object from an AI response, tolerating common non-JSON wrappers.
     * @param {string} text - The AI response
     * @returns {any} Parsed JSON
     */
    function parseJsonResponse(text) {
        const extracted = extractJson(text);
        try {
            return JSON.parse(extracted);
        } catch (_err) {
            const sanitized = sanitizeJsonLikeText(extracted);
            return JSON.parse(sanitized);
        }
    }

    /**
     * Removes markdown fences and JS-style comments, and escapes raw newlines inside string literals.
     * This is a best-effort repair for model outputs that are "almost JSON".
     * @param {string} input - A string that should contain a JSON object
     * @returns {string} A JSON string more likely to be parseable by JSON.parse
     */
    function sanitizeJsonLikeText(input) {
        if (typeof input !== 'string') return '';

        // Remove common markdown code fences
        let s = input
            .replace(/^\s*```(?:json)?\s*/i, '')
            .replace(/\s*```\s*$/i, '')
            .trim();

        // If we still have leading/trailing non-JSON, re-extract
        s = extractJson(s).trim();

        let out = '';
        let inString = false;
        let escape = false;
        let inLineComment = false;

        for (let i = 0; i < s.length; i++) {
            const ch = s[i];
            const next = i + 1 < s.length ? s[i + 1] : '';

            if (inLineComment) {
                if (ch === '\n') {
                    inLineComment = false;
                    out += ch;
                }
                continue;
            }

            if (!inString && ch === '/' && next === '/') {
                inLineComment = true;
                i++;
                continue;
            }

            if (!inString && ch === '`') {
                // ignore stray backticks
                continue;
            }

            if (inString) {
                if (escape) {
                    out += ch;
                    escape = false;
                    continue;
                }
                if (ch === '\\') {
                    out += ch;
                    escape = true;
                    continue;
                }
                if (ch === '"') {
                    out += ch;
                    inString = false;
                    continue;
                }
                if (ch === '\n') {
                    out += '\\n';
                    continue;
                }
                if (ch === '\r') {
                    // drop CR; newline will be handled by \n
                    continue;
                }
                out += ch;
                continue;
            }

            if (ch === '"') {
                out += ch;
                inString = true;
                escape = false;
                continue;
            }

            out += ch;
        }

        return out.trim();
    }

    function debugLog(node, label, payload) {
        if (!node || !node.debug || typeof node.warn !== 'function') return;
        try {
            const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
            node.warn(`[AI Orchestrator] ${label}: ${serialized}`);
        } catch (_err) {
            node.warn(`[AI Orchestrator] ${label}: [unserializable payload]`);
        }
    }

    function normalizePositiveInt(value, fallback, min, max) {
        const n = parseInt(value);
        if (!Number.isFinite(n)) return fallback;
        if (n < min) return min;
        if (n > max) return max;
        return n;
    }

    function validateNodeConfig(node) {
        const errors = [];
        if (!['simple', 'advanced'].includes(String(node.planningStrategy))) {
            errors.push('planningStrategy must be "simple" or "advanced"');
        }
        if (!String(node.providerBaseUrl || '').trim()) {
            errors.push('providerBaseUrl must be a non-empty string');
        }
        return errors;
    }

    function validateMessage(msg, node) {
        const errors = [];
        if (!msg || typeof msg !== 'object') {
            errors.push('msg must be an object');
            return errors;
        }
        if (!msg.aiagent) {
            errors.push('AI Model configuration missing (msg.aiagent)');
            return errors;
        }
        if (!msg.aiagent.apiKey || !String(msg.aiagent.apiKey).trim()) {
            errors.push('AI Model API key not found (msg.aiagent.apiKey)');
        }
        if (!msg.aiagent.model || !String(msg.aiagent.model).trim()) {
            errors.push('AI Model not found (msg.aiagent.model)');
        }
        if (msg.orchestration && (!msg.orchestration.goal || !String(msg.orchestration.goal).trim())) {
            errors.push('Orchestration goal is empty');
        }
        return errors;
    }

    function validatePlan(plan, availableAgents) {
        const errors = [];
        if (!plan || typeof plan !== 'object') {
            errors.push('Plan is missing');
            return errors;
        }
        if (!Array.isArray(plan.tasks)) {
            errors.push('Plan.tasks must be an array');
            return errors;
        }

        const allowedCapabilities = new Set(
            (availableAgents || [])
                .flatMap(a => Array.isArray(a.capabilities) ? a.capabilities : [])
                .map(c => String(c))
        );

        const idSet = new Set();
        for (const task of plan.tasks) {
            if (!task || typeof task !== 'object') {
                errors.push('Task must be an object');
                continue;
            }
            if (!task.id || !String(task.id).trim()) {
                errors.push('Task.id is required');
            } else {
                const id = String(task.id);
                if (idSet.has(id)) errors.push(`Duplicate task id: ${id}`);
                idSet.add(id);
            }
            if (!task.type || !String(task.type).trim()) {
                errors.push(`Task ${String(task.id || '?')} is missing type`);
            } else if (allowedCapabilities.size > 0 && !allowedCapabilities.has(String(task.type))) {
                errors.push(`Task ${String(task.id || '?')} has unsupported type: ${String(task.type)}`);
            }
            if (!task.status) {
                task.status = 'pending';
            }
            if (!['pending', 'completed', 'failed'].includes(String(task.status))) {
                errors.push(`Task ${String(task.id || '?')} has invalid status: ${String(task.status)}`);
            }
            if (!Array.isArray(task.dependsOn)) {
                task.dependsOn = task.dependsOn ? [task.dependsOn] : [];
            }
        }

        for (const task of plan.tasks) {
            for (const depId of (task.dependsOn || [])) {
                const dep = String(depId);
                if (!idSet.has(dep)) {
                    errors.push(`Task ${String(task.id || '?')} depends on non-existent task ${dep}`);
                }
            }
        }

        const cycle = findDependencyCycle(plan.tasks);
        if (cycle) {
            errors.push(`Circular dependencies detected: ${cycle.join(' -> ')}`);
        }

        return errors;
    }

    function findDependencyCycle(tasks) {
        const graph = new Map();
        for (const t of tasks || []) {
            if (!t || !t.id) continue;
            graph.set(String(t.id), (t.dependsOn || []).map(String));
        }

        const visiting = new Set();
        const visited = new Set();

        function dfs(nodeId, path) {
            if (visiting.has(nodeId)) {
                const idx = path.indexOf(nodeId);
                return idx >= 0 ? path.slice(idx).concat([nodeId]) : path.concat([nodeId]);
            }
            if (visited.has(nodeId)) return null;

            visiting.add(nodeId);
            visited.add(nodeId);
            const deps = graph.get(nodeId) || [];
            for (const dep of deps) {
                const result = dfs(dep, path.concat([nodeId]));
                if (result) return result;
            }
            visiting.delete(nodeId);
            return null;
        }

        for (const nodeId of graph.keys()) {
            const result = dfs(nodeId, []);
            if (result) return result;
        }
        return null;
    }

    RED.nodes.registerType('ai-orchestrator', AiOrchestratorNode);
};
