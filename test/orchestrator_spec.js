const should = require('should');
const helper = require('node-red-node-test-helper');
const orchestratorNode = require('../orchestrator/orchestrator.js');
const agentOrchestratorNode = require('../orchestrator-agent/orchestrator-agent.js');
const axios = require('axios');
const sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('ai-orchestrator node (Chain Discovery)', function () {
    let axiosPostStub;

    beforeEach(function (done) {
        helper.startServer(done);
        axiosPostStub = sinon.stub(axios, 'post');
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
        axiosPostStub.restore();
    });

    it('should be loaded', function (done) {
        const flow = [{ id: 'n1', type: 'ai-orchestrator', name: 'test name' }];
        helper.load(orchestratorNode, flow, function () {
            const n1 = helper.getNode('n1');
            try {
                n1.should.have.property('name', 'test name');
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('should discover agents and execute a simple plan', function (done) {
        const flow = [
            { id: 'agent1', type: 'ai-orchestrator-agent', name: 'Coder', capabilities: 'coding', wires: [['orch1']] },
            { id: 'orch1', type: 'ai-orchestrator', name: 'Manager', wires: [['helper1']] },
            { id: 'helper1', type: 'helper' }
        ];

        axiosPostStub.onCall(0).resolves({
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tasks: [{ id: 't1', type: 'coding', input: 'task 1', status: 'pending' }]
                        })
                    }
                }]
            }
        });
        axiosPostStub.onCall(1).resolves({
            data: { choices: [{ message: { content: "result 1" } }] }
        });
        axiosPostStub.onCall(2).resolves({
            data: { choices: [{ message: { content: JSON.stringify({ analysis: 'done', status: 'completed' }) } }] }
        });

        helper.load([orchestratorNode, agentOrchestratorNode], flow, function () {
            const agent1 = helper.getNode('agent1');
            const helper1 = helper.getNode('helper1');

            helper1.on('input', function (msg) {
                try {
                    msg.orchestration.status.should.equal('completed');
                    msg.payload.should.equal("result 1");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            agent1.receive({
                payload: 'Go',
                aiagent: { apiKey: 'test-key', model: 'test-model' }
            });
        });
    });

    it('should respect task dependencies', function (done) {
        const flow = [
            { id: 'agent1', type: 'ai-orchestrator-agent', name: 'Agent', capabilities: 'work', wires: [['orch1']] },
            { id: 'orch1', type: 'ai-orchestrator', name: 'Manager', wires: [['helper1']] },
            { id: 'helper1', type: 'helper' }
        ];

        // Plan with t2 depending on t1
        axiosPostStub.onCall(0).resolves({
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tasks: [
                                { id: 't1', type: 'work', input: 'task 1', status: 'pending', dependsOn: [] },
                                { id: 't2', type: 'work', input: 'task 2', status: 'pending', dependsOn: ['t1'] }
                            ]
                        })
                    }
                }]
            }
        });

        // Agent calls
        axiosPostStub.onCall(1).resolves({ data: { choices: [{ message: { content: "r1" } }] } }); // t1 result
        axiosPostStub.onCall(2).resolves({ data: { choices: [{ message: { content: JSON.stringify({ analysis: 'next', status: 'executing' }) } }] } }); // reflect 1

        axiosPostStub.onCall(3).resolves({ data: { choices: [{ message: { content: "r2" } }] } }); // t2 result
        axiosPostStub.onCall(4).resolves({ data: { choices: [{ message: { content: JSON.stringify({ analysis: 'done', status: 'completed' }) } }] } }); // reflect 2

        helper.load([orchestratorNode, agentOrchestratorNode], flow, function () {
            const agent1 = helper.getNode('agent1');
            const helper1 = helper.getNode('helper1');

            helper1.on('input', function (msg) {
                try {
                    msg.orchestration.status.should.equal('completed');
                    msg.orchestration.history.should.have.length(2);
                    msg.orchestration.history[0].taskId.should.equal('t1');
                    msg.orchestration.history[1].taskId.should.equal('t2');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            agent1.receive({
                payload: 'Run dependencies',
                aiagent: { apiKey: 'test-key', model: 'test-model' }
            });
        });
    });

    it('should respect task priorities', function (done) {
        const flow = [
            { id: 'agent1', type: 'ai-orchestrator-agent', name: 'Agent', capabilities: 'work', wires: [['orch1']] },
            { id: 'orch1', type: 'ai-orchestrator', name: 'Manager', wires: [['helper1']] },
            { id: 'helper1', type: 'helper' }
        ];

        // Plan with t2 having higher priority than t1
        axiosPostStub.onCall(0).resolves({
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tasks: [
                                { id: 't1', type: 'work', input: 'task 1', status: 'pending', priority: 1 },
                                { id: 't2', type: 'work', input: 'task 2', status: 'pending', priority: 10 }
                            ]
                        })
                    }
                }]
            }
        });

        axiosPostStub.onCall(1).resolves({ data: { choices: [{ message: { content: "r2" } }] } }); // t2 executed first
        axiosPostStub.onCall(2).resolves({ data: { choices: [{ message: { content: JSON.stringify({ analysis: 'next', status: 'executing' }) } }] } });

        axiosPostStub.onCall(3).resolves({ data: { choices: [{ message: { content: "r1" } }] } }); // t1 executed second
        axiosPostStub.onCall(4).resolves({ data: { choices: [{ message: { content: JSON.stringify({ analysis: 'done', status: 'completed' }) } }] } });

        helper.load([orchestratorNode, agentOrchestratorNode], flow, function () {
            const agent1 = helper.getNode('agent1');
            const helper1 = helper.getNode('helper1');

            helper1.on('input', function (msg) {
                try {
                    msg.orchestration.history[0].taskId.should.equal('t2');
                    msg.orchestration.history[1].taskId.should.equal('t1');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            agent1.receive({
                payload: 'Run priorities',
                aiagent: { apiKey: 'test-key', model: 'test-model' }
            });
        });
    });

    it('should handle task errors and recover', function (done) {
        const flow = [
            { id: 'agent1', type: 'ai-orchestrator-agent', name: 'Agent', capabilities: 'work', wires: [['orch1']] },
            { id: 'orch1', type: 'ai-orchestrator', name: 'Manager', wires: [['helper1']] },
            { id: 'helper1', type: 'helper' }
        ];

        axiosPostStub.onCall(0).resolves({
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tasks: [{ id: 't1', type: 'work', input: 'fail this', status: 'pending' }]
                        })
                    }
                }]
            }
        });

        // Agent 1 fails
        axiosPostStub.onCall(1).rejects(new Error('AI execution failed'));

        // Reflection proposes recovery
        axiosPostStub.onCall(2).resolves({
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            analysis: 't1 failed, trying t2',
                            status: 'executing',
                            updatedPlan: {
                                tasks: [
                                    { id: 't1', type: 'work', input: 'fail this', status: 'failed', error: 'AI execution failed' },
                                    { id: 't2', type: 'work', input: 'recovery task', status: 'pending' }
                                ]
                            }
                        })
                    }
                }]
            }
        });

        axiosPostStub.onCall(3).resolves({ data: { choices: [{ message: { content: "recovered" } }] } });
        axiosPostStub.onCall(4).resolves({ data: { choices: [{ message: { content: JSON.stringify({ status: 'completed' }) } }] } });

        helper.load([orchestratorNode, agentOrchestratorNode], flow, function () {
            const agent1 = helper.getNode('agent1');
            const helper1 = helper.getNode('helper1');

            helper1.on('input', function (msg) {
                try {
                    msg.orchestration.status.should.equal('completed');
                    msg.orchestration.history[0].should.have.property('error', 'AI execution failed');
                    msg.payload.should.equal('recovered');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            agent1.receive({
                payload: 'Error recovery test',
                aiagent: { apiKey: 'test-key', model: 'test-model' }
            });
        });
    });

    it('should tolerate non-JSON wrappers in planning response', function (done) {
        const flow = [
            { id: 'agent1', type: 'ai-orchestrator-agent', name: 'Writer', capabilities: 'work', wires: [['orch1']] },
            { id: 'orch1', type: 'ai-orchestrator', name: 'Manager', wires: [['helper1']] },
            { id: 'helper1', type: 'helper' }
        ];

        const wrappedPlan = "```json\n" +
            "{\n" +
            "  // This is a comment that should be ignored\n" +
            "  \"tasks\": [\n" +
            "    {\"id\": \"t1\", \"type\": \"work\", \"input\": \"Line1\nLine2\", \"status\": \"pending\"}\n" +
            "  ]\n" +
            "}\n" +
            "```";

        axiosPostStub.onCall(0).resolves({
            data: {
                choices: [{
                    message: {
                        content: wrappedPlan
                    }
                }]
            }
        });
        axiosPostStub.onCall(1).resolves({
            data: { choices: [{ message: { content: "ok" } }] }
        });
        axiosPostStub.onCall(2).resolves({
            data: { choices: [{ message: { content: JSON.stringify({ analysis: 'done', status: 'completed' }) } }] }
        });

        helper.load([orchestratorNode, agentOrchestratorNode], flow, function () {
            const agent1 = helper.getNode('agent1');
            const helper1 = helper.getNode('helper1');

            helper1.on('input', function (msg) {
                try {
                    msg.orchestration.status.should.equal('completed');
                    msg.payload.should.equal('ok');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            agent1.receive({
                payload: 'Plan wrappers',
                aiagent: { apiKey: 'test-key', model: 'test-model' }
            });
        });
    });
});
