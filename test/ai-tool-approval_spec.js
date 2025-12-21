const should = require('should');
const helper = require('node-red-node-test-helper');
const approvalNode = require('../tool-approval/ai-tool-approval.js');

helper.init(require.resolve('node-red'));

describe('ai-tool-approval node', function () {

    beforeEach(function (done) {
        helper.startServer(done);
    });

    afterEach(function (done) {
        helper.unload();
        helper.stopServer(done);
    });

    it('should be loaded', function (done) {
        const flow = [{ id: 'n1', type: 'ai-tool-approval', name: 'test approval' }];
        helper.load(approvalNode, flow, function () {
            const n1 = helper.getNode('n1');
            n1.should.have.property('name', 'test approval');
            done();
        });
    });

    it('should register a tool in msg.aiagent.tools', function (done) {
        const flow = [
            { id: 'n1', type: 'ai-tool-approval', name: 'test tool', toolName: 'my_approval', wires: [['n2']] },
            { id: 'n2', type: 'helper' }
        ];
        helper.load(approvalNode, flow, function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');
            n2.on('input', function (msg) {
                msg.should.have.property('aiagent');
                msg.aiagent.should.have.property('tools');
                msg.aiagent.tools[0].function.should.have.property('name', 'my_approval');
                msg.aiagent.tools[0].should.have.property('execute');
                done();
            });
            n1.receive({ payload: {} });
        });
    });

    it('should pause and resume when tool is executed', function (done) {
        const flow = [
            { id: 'n1', type: 'ai-tool-approval', name: 'test tool', toolName: 'approve_me', wires: [['n2'], ['n3']] },
            { id: 'n2', type: 'helper' }, // agent output
            { id: 'n3', type: 'helper' }  // request output
        ];
        helper.load(approvalNode, flow, async function () {
            const n1 = helper.getNode('n1');
            const n2 = helper.getNode('n2');
            const n3 = helper.getNode('n3');

            // 1. Get the tool definition
            n2.on('input', async function (msg) {
                const tool = msg.aiagent.tools[0];

                // 2. Mock human response
                n3.on('input', function (reqMsg) {
                    reqMsg.should.have.property('approvalId');
                    reqMsg.payload.should.have.property('reason', 'test');

                    // Send response back to input
                    n1.receive({
                        approvalId: reqMsg.approvalId,
                        payload: { status: 'approved', comment: 'looks good' }
                    });
                });

                // 3. Execute the tool
                const result = await tool.execute({ reason: 'test', question: 'ok?' });
                result.should.have.property('status', 'approved');
                result.should.have.property('comment', 'looks good');
                done();
            });

            n1.receive({ payload: {} });
        });
    });
});
