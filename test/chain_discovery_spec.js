const should = require('should');
const helper = require('node-red-node-test-helper');
const orchestratorNode = require('../orchestrator/orchestrator.js');
const agentOrchestratorNode = require('../orchestrator-agent/orchestrator-agent.js');
const axios = require('axios');
const sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('Chain Discovery & Zero-Wire Execution', function () {
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

    it('should discover agents in a pipeline and execute tasks directly', function (done) {
        const flow = [
            { id: 'agent1', type: 'ai-orchestrator-agent', name: 'Coder', capabilities: 'coding', wires: [[], ['orch1']] },
            { id: 'orch1', type: 'ai-orchestrator', name: 'Manager', wires: [['helper1']] },
            { id: 'helper1', type: 'helper' }
        ];

        // 1. Mock Planning Phase Response
        const planResponse = {
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tasks: [
                                { id: 't1', type: 'coding', input: 'write a function', status: 'pending' }
                            ]
                        })
                    }
                }]
            }
        };

        // 2. Mock Agent Response
        const agentResponse = {
            data: {
                choices: [{
                    message: {
                        content: "function hello() { return 'world'; }"
                    }
                }]
            }
        };

        // 3. Mock Reflection Phase Response (Completion)
        const reflectionResponse = {
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            analysis: 'Goal achieved',
                            status: 'completed'
                        })
                    }
                }]
            }
        };

        axiosPostStub.onCall(0).resolves(planResponse);
        axiosPostStub.onCall(1).resolves(agentResponse);
        axiosPostStub.onCall(2).resolves(reflectionResponse);

        helper.load([orchestratorNode, agentOrchestratorNode], flow, function () {
            const agent1 = helper.getNode('agent1');
            const helper1 = helper.getNode('helper1');

            helper1.on('input', function (msg) {
                try {
                    // Check planning prompt
                    const planningCall = axiosPostStub.getCall(0);
                    const prompt = planningCall.args[1].messages[1].content;
                    prompt.should.containEql('Coder');
                    prompt.should.containEql('coding');

                    msg.orchestration.status.should.equal('completed');
                    msg.payload.should.equal("function hello() { return 'world'; }");
                    msg.agents.should.have.length(1);
                    msg.agents[0].name.should.equal('Coder');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            // Start the flow
            agent1.receive({
                payload: 'Build a hello world',
                aiagent: { apiKey: 'test-key', model: 'test-model' }
            });
        });
    });
});
