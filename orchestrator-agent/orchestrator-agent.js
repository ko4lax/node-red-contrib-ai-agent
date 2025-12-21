const axios = require('axios');

/**
 * Helper functions for AI Agent Node
 */

// Validate AI configuration
function validateAIConfig(aiagent) {
    if (!aiagent) return 'AI configuration missing. Ensure an AI Model node is connected.';
    if (!aiagent.model) return 'AI model not specified. Please configure the AI Model node with a valid model.';
    if (!aiagent.apiKey) return 'API key not found. Please configure the AI Model node with a valid API key.';
    return null; // No errors
}

/**
 * Creates and returns a message object
 */
function createMessage(role, content) {
    return {
        role: role,
        content: content,
        timestamp: new Date().toISOString(),
        type: 'conversation'
    };
}

/**
 * Prepares the prompt with context if memory is available
 */
function preparePrompt(node, msg, inputText) {
    const messages = [{ role: 'system', content: node.systemPrompt }];
    let userMessage = null;

    if (msg.aimemory) {
        if (!msg.aimemory.context) {
            throw new Error('Memory not properly initialized. Ensure a memory node is connected.');
        }
        msg.aimemory.context = msg.aimemory.context || [];
        msg.aimemory.maxItems = msg.aimemory.maxItems || 1000;
        messages.push(...msg.aimemory.context);
        userMessage = createMessage('user', inputText);
    }

    messages.push({ role: 'user', content: inputText });

    return { messages, userMessage };
}

/**
 * Updates the conversation context with new messages
 */
function updateContext(msg, userMessage, assistantResponse) {
    if (!msg.aimemory?.context) return;

    const assistantMessage = createMessage('assistant', assistantResponse);
    const newContext = [...msg.aimemory.context, userMessage, assistantMessage];
    const maxItems = msg.aimemory.maxItems || 1000;

    msg.aimemory.context = newContext.slice(-maxItems);
}

/**
 * Handles errors consistently
 */
function handleError(node, msg, error) {
    const errorMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    node.status({ fill: 'red', shape: 'ring', text: 'Error' });
    node.error('AI Orchestrator Agent Error: ' + errorMsg, msg);
}

/**
 * Formats tools for the OpenAI/OpenRouter API
 */
function formatToolsForAPI(tools) {
    return tools.map(tool => {
        const type = tool.type || 'function';
        const fn = tool.function || {};
        return {
            type: type,
            function: {
                name: fn.name || 'function',
                description: fn.description || 'function',
                parameters: fn.parameters || {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        };
    });
}

/**
 * Helper for conditional debug logging
 */
function debugLog(node, label, payload) {
    if (!node?.enableDebug || typeof node.debug !== 'function') return;
    try {
        const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2);
        node.debug(`[AI Orchestrator Agent] ${label}: ${serialized}`);
    } catch (err) {
        node.debug(`[AI Orchestrator Agent] ${label}: [unserializable payload]`);
    }
}

/**
 * Calls the AI with proper error handling
 */
async function callAI(node, aiConfig, messages) {
    const hasTools = aiConfig.tools && Array.isArray(aiConfig.tools) && aiConfig.tools.length > 0;
    const tools = hasTools ? aiConfig.tools : [];
    const toolChoice = hasTools ? 'auto' : 'none';

    try {
        node.status({ fill: 'blue', shape: 'dot', text: `Calling ${aiConfig.model}...` });

        const requestPayload = {
            model: aiConfig.model,
            temperature: aiConfig.temperature,
            messages: messages,
        };

        if (hasTools) {
            requestPayload.tools = formatToolsForAPI(tools);
            requestPayload.tool_choice = toolChoice;
        }

        debugLog(node, 'Request Payload', requestPayload);

        const response = await axios.post(
            'https://openrouter.ai/api/v1/chat/completions',
            requestPayload,
            {
                headers: {
                    'Authorization': `Bearer ${aiConfig.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://nodered.org/',
                    'X-Title': 'Node-RED AI Orchestrator-Agent'
                }
            }
        );

        const responseMessage = response.data.choices[0]?.message;
        debugLog(node, 'Response Message', responseMessage || response.data);

        if (responseMessage?.tool_calls && aiConfig.tools) {
            return await processToolCalls(node, responseMessage, aiConfig.tools, messages, aiConfig);
        }

        return responseMessage?.content?.trim() || '';

    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        throw new Error(`AI API Error: ${errorMsg}`);
    }
}

/**
 * Helper function to process tool calls
 */
async function processToolCalls(node, responseMessage, tools, messages, aiConfig) {
    const toolCalls = responseMessage.tool_calls || [];
    let toolResults = [];

    for (const toolCall of toolCalls) {
        const { id, function: fn } = toolCall;
        const { name, arguments: args } = fn;

        const tool = tools.find(t => t.function?.name === name);
        if (!tool) {
            toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: JSON.stringify({ error: `Tool '${name}' not found` })
            });
            continue;
        }

        try {
            const parsedArgs = typeof args === 'string' ? JSON.parse(args) : args;
            const result = await tool.execute(parsedArgs);

            toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: typeof result === 'string' ? result : JSON.stringify(result)
            });
        } catch (error) {
            toolResults.push({
                tool_call_id: id,
                role: 'tool',
                name,
                content: JSON.stringify({ error: error.message })
            });
        }
    }

    const updatedMessages = [...messages, responseMessage, ...toolResults];
    return await callAI(node, { ...aiConfig, tools: null }, updatedMessages);
}

module.exports = function (RED) {
    function AIOrchestratorAgent(config) {
        RED.nodes.createNode(this, config);
        this.name = config.name || 'AI Orchestrator Agent';
        this.systemPrompt = config.systemPrompt || 'You are a helpful AI assistant.';
        this.capabilities = (config.capabilities || '').split(',').map(s => s.trim()).filter(Boolean);
        this.enableDebug = !!config.debug;

        // AI Orchestrator direct call API
        this.executeTask = async function (taskInput, msg) {
            node.status({ fill: 'blue', shape: 'dot', text: 'executing...' });
            try {
                const validationError = validateAIConfig(msg.aiagent);
                if (validationError) throw new Error(validationError);

                const inputText = typeof taskInput === 'string' ? taskInput : JSON.stringify(taskInput);
                const { messages, userMessage } = preparePrompt(node, msg, inputText);
                const response = await callAI(node, msg.aiagent, messages);

                if (msg.aimemory && userMessage) {
                    updateContext(msg, userMessage, response);
                }

                node.status({ fill: 'green', shape: 'dot', text: 'ready' });
                return response;
            } catch (error) {
                handleError(node, msg, error);
                throw error;
            }
        };

        const node = this;

        node.on('close', function (done) {
            node.status({});
            if (done) done();
        });

        // Discovery Pipeline Logic
        node.on('input', function (msg, send, done) {
            node.status({ fill: 'blue', shape: 'dot', text: 'tagging...' });

            try {
                // Enforce agents array
                msg.agents = msg.agents || [];

                // Push metadata for the Orchestrator to see
                msg.agents.push({
                    id: node.id,
                    name: node.name,
                    capabilities: node.capabilities,
                    type: 'agent'
                });

                // Pass through to the discovery pipeline
                send(msg);
                node.status({ fill: 'green', shape: 'dot', text: 'ready' });

            } catch (error) {
                node.error(error.message, msg);
                node.status({ fill: 'red', shape: 'ring', text: 'Error' });
            } finally {
                if (done) done();
            }
        });
    }

    RED.nodes.registerType('ai-orchestrator-agent', AIOrchestratorAgent);
};
