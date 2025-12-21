module.exports = function (RED) {
    'use strict';

    function AIToolApprovalNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Configuration
        node.name = config.name || 'human_approval_tool';
        node.toolName = config.toolName || `approve_${Date.now()}`;
        node.description = config.description || 'Request human approval or intervention before proceeding';

        // Registry for pending approvals
        node.pendingApprovals = new Map();

        // Process incoming "human" messages (approvals/denials)
        node.on('input', function (msg, send, done) {
            // Check if this is a response to a pending approval
            const approvalId = msg.approvalId || 'default';
            if (node.pendingApprovals.has(approvalId)) {
                const resolver = node.pendingApprovals.get(approvalId);
                node.pendingApprovals.delete(approvalId);

                node.status({ fill: 'green', shape: 'dot', text: 'Approved' });
                resolver(msg.payload);
                if (done) done();
                return;
            }

            // Normal operation: Register tool
            try {
                const newMsg = RED.util.cloneMessage(msg);
                newMsg.aiagent = newMsg.aiagent || {};
                newMsg.aiagent.tools = newMsg.aiagent.tools || [];

                const toolDef = {
                    type: 'function',
                    function: {
                        name: node.toolName,
                        description: node.description,
                        parameters: {
                            type: 'object',
                            properties: {
                                reason: {
                                    type: 'string',
                                    description: 'The reason why human intervention is required'
                                },
                                question: {
                                    type: 'string',
                                    description: 'The specific question or prompt for the human'
                                }
                            },
                            required: ['reason', 'question']
                        }
                    },
                    execute: async (args) => {
                        const approvalId = Date.now().toString();
                        node.status({ fill: 'yellow', shape: 'dot', text: 'Waiting for approval...' });

                        // Send request to output 2
                        node.send([null, {
                            payload: args,
                            approvalId: approvalId,
                            topic: 'approval_request'
                        }]);

                        // Return a promise that resolves when the input is received
                        return new Promise((resolve) => {
                            node.pendingApprovals.set(approvalId, resolve);

                            // Timeout handling (optional)
                            setTimeout(() => {
                                if (node.pendingApprovals.has(approvalId)) {
                                    node.pendingApprovals.delete(approvalId);
                                    node.status({ fill: 'red', shape: 'dot', text: 'Timed out' });
                                    resolve({ status: 'rejected', error: 'Approval timed out' });
                                }
                            }, 300000); // 5 minutes timeout
                        });
                    }
                };

                newMsg.aiagent.tools.push(toolDef);
                node.status({ fill: 'green', shape: 'dot', text: 'Ready' });
                send([newMsg, null]);
                if (done) done();
            } catch (error) {
                node.status({ fill: 'red', shape: 'ring', text: 'Error' });
                node.error('Error in AI Tool Approval node: ' + error.message, msg);
                if (done) done();
            }
        });

        node.on('close', function (done) {
            node.status({});
            node.pendingApprovals.clear();
            if (done) done();
        });
    }

    RED.nodes.registerType('ai-tool-approval', AIToolApprovalNode);
};
