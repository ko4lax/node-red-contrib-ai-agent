const should = require('should');
const helper = require('node-red-node-test-helper');
const orchestratorNode = require('../orchestrator/orchestrator.js');
const axios = require('axios');
const sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('ai-orchestrator node', function () {
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

    it('should create an initial plan', function (done) {
        const flow = [
            { id: 'n1', type: 'ai-orchestrator', name: 'orchestrator', wires: [['n2'], ['n3']] },
            { id: 'n2', type: 'helper' },
            { id: 'n3', type: 'helper' }
        ];

        const planResponse = {
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            tasks: [
                                { id: 't1', type: 'test', input: 'task 1', status: 'pending' }
                            ]
                        })
                    }
                }]
            }
        };

        axiosPostStub.resolves(planResponse);

        helper.load(orchestratorNode, flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload', 'task 1');
                    msg.should.have.property('orchestration');
                    msg.orchestration.should.have.property('status', 'executing');
                    msg.orchestration.plan.tasks.should.have.length(1);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                payload: 'My goal',
                aiagent: { apiKey: 'test-key', model: 'test-model' }
            });
        });
    });

    it('should reflect and move to next task', function (done) {
        const flow = [
            { id: 'n1', type: 'ai-orchestrator', name: 'orchestrator', wires: [['n2'], ['n3']] },
            { id: 'n2', type: 'helper' },
            { id: 'n3', type: 'helper' }
        ];

        const reflectionResponse = {
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            analysis: 'Task 1 done, moving to Task 2',
                            status: 'executing',
                            updatedPlan: {
                                tasks: [
                                    { id: 't1', type: 'test', input: 'task 1', status: 'completed', output: 'result 1' },
                                    { id: 't2', type: 'test', input: 'task 2', status: 'pending' }
                                ]
                            }
                        })
                    }
                }]
            }
        };

        axiosPostStub.resolves(reflectionResponse);

        helper.load(orchestratorNode, flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload', 'task 2');
                    msg.orchestration.plan.tasks[0].should.have.property('status', 'completed');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                payload: 'result 1',
                aiagent: { apiKey: 'test-key', model: 'test-model' },
                orchestration: {
                    planId: 'p1',
                    iterations: 1,
                    goal: 'My goal',
                    status: 'executing',
                    currentTaskId: 't1',
                    history: [],
                    plan: {
                        tasks: [
                            { id: 't1', type: 'test', input: 'task 1', status: 'pending' }
                        ]
                    }
                }
            });
        });
    });

    it('should respect task dependencies', function (done) {
        const flow = [
            { id: 'n1', type: 'ai-orchestrator', wires: [['n2'], ['n3']] },
            { id: 'n2', type: 'helper' },
            { id: 'n3', type: 'helper' }
        ];

        helper.load(orchestratorNode, flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            const plan = {
                tasks: [
                    { id: 't1', type: 'test', input: 'task 1', status: 'pending', dependsOn: [] },
                    { id: 't2', type: 'test', input: 'task 2', status: 'pending', dependsOn: ['t1'] }
                ]
            };

            n2.on('input', function (msg) {
                try {
                    // First task should be t1
                    msg.should.have.property('payload', 'task 1');
                    msg.orchestration.currentTaskId.should.equal('t1');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                aiagent: { apiKey: 'test-key', model: 'test-model' },
                orchestration: {
                    planId: 'p1',
                    iterations: 0,
                    goal: 'Goal',
                    status: 'executing',
                    plan: plan
                }
            });
        });
    });

    it('should respect task priorities', function (done) {
        const flow = [
            { id: 'n1', type: 'ai-orchestrator', wires: [['n2'], ['n3']] },
            { id: 'n2', type: 'helper' },
            { id: 'n3', type: 'helper' }
        ];

        helper.load(orchestratorNode, flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            const plan = {
                tasks: [
                    { id: 't1', type: 'test', input: 'task 1', status: 'pending', priority: 1 },
                    { id: 't2', type: 'test', input: 'task 2', status: 'pending', priority: 10 }
                ]
            };

            n2.on('input', function (msg) {
                try {
                    // t2 has higher priority, should be first
                    msg.should.have.property('payload', 'task 2');
                    msg.orchestration.currentTaskId.should.equal('t2');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                aiagent: { apiKey: 'test-key', model: 'test-model' },
                orchestration: {
                    planId: 'p1',
                    iterations: 0,
                    goal: 'Goal',
                    status: 'executing',
                    plan: plan
                }
            });
        });
    });

    it('should handle task errors and update plan', function (done) {
        const flow = [
            { id: 'n1', type: 'ai-orchestrator', wires: [['n2'], ['n3']] },
            { id: 'n2', type: 'helper' },
            { id: 'n3', type: 'helper' }
        ];

        const recoveryResponse = {
            data: {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            analysis: 'Task 1 failed, retrying with new task',
                            status: 'executing',
                            updatedPlan: {
                                tasks: [
                                    { id: 't1', type: 'test', input: 'task 1', status: 'failed', error: 'some error' },
                                    { id: 't3', type: 'test', input: 'retry task 1 differently', status: 'pending' }
                                ]
                            }
                        })
                    }
                }]
            }
        };

        axiosPostStub.resolves(recoveryResponse);

        helper.load(orchestratorNode, flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');

            n2.on('input', function (msg) {
                try {
                    msg.should.have.property('payload', 'retry task 1 differently');
                    msg.orchestration.plan.tasks[0].should.have.property('status', 'failed');
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                payload: 'original error payload',
                error: 'some error',
                aiagent: { apiKey: 'test-key', model: 'test-model' },
                orchestration: {
                    planId: 'p1',
                    iterations: 1,
                    goal: 'Goal',
                    status: 'executing',
                    currentTaskId: 't1',
                    history: [],
                    plan: {
                        tasks: [
                            { id: 't1', type: 'test', input: 'task 1', status: 'pending' }
                        ]
                    }
                }
            });
        });
    });
});
