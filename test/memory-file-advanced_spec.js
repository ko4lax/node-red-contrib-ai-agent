const helper = require("node-red-node-test-helper");
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const os = require("os");
const sinon = require("sinon");
const proxyquire = require("proxyquire");

describe("AI Memory (File) Advanced Features", function () {
    this.timeout(10000);

    const baseTestDir = path.join(os.tmpdir(), "node-red-ai-test-adv-" + Date.now());
    let memoryFileNode;
    let axiosStub;

    before(function (done) {
        if (!fs.existsSync(baseTestDir)) {
            fs.mkdirSync(baseTestDir, { recursive: true });
        }

        axiosStub = {
            post: sinon.stub()
        };

        memoryFileNode = proxyquire("../memory-file/memory-file.js", {
            'axios': axiosStub
        });

        helper.startServer(done);
    });

    after(function (done) {
        helper.stopServer(() => {
            if (fs.existsSync(baseTestDir)) {
                fs.rmSync(baseTestDir, { recursive: true, force: true });
            }
            done();
        });
    });

    afterEach(function () {
        helper.unload();
        axiosStub.post.reset();
    });

    function getTestEnv(testName) {
        const testSubDir = path.join(baseTestDir, testName.replace(/[^a-zA-Z0-9]/g, "_"));
        if (!fs.existsSync(testSubDir)) {
            fs.mkdirSync(testSubDir, { recursive: true });
        }
        const testFile = "memories.json";
        return {
            testDir: testSubDir,
            testFile: testFile,
            testFilePath: path.join(testSubDir, testFile)
        };
    }

    it("should calculate similarity correctly", function (done) {
        const { testDir, testFile } = getTestEnv("similarity");
        const flow = [{ id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile }];
        helper.settings({ userDir: testDir });
        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            try {
                const vec1 = [1, 0, 0];
                const vec2 = [1, 0, 0];
                const vec3 = [0, 1, 0];

                expect(n1.memoryManager.longTerm.calculateSimilarity(vec1, vec2)).to.equal(1);
                expect(n1.memoryManager.longTerm.calculateSimilarity(vec1, vec3)).to.equal(0);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it("should handle semantic search (query command)", function (done) {
        const { testDir, testFile } = getTestEnv("query");
        const flow = [
            { id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile, vectorEnabled: true, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.settings({ userDir: testDir });

        axiosStub.post.onCall(0).resolves({
            data: { data: [{ embedding: [0.1, 0.2, 0.3] }] }
        });

        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            // Manually add an item to long-term memory
            n1.memoryManager.longTerm.addItem("I like cats", [0.1, 0.2, 0.3], { type: 'test' });

            n2.on("input", function (msg) {
                try {
                    expect(msg.result.success).to.be.true;
                    expect(msg.result.results[0].text).to.equal("I like cats");
                    expect(msg.result.results[0].similarity).to.be.closeTo(1, 0.01);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                command: "query",
                query: "cat info",
                aiagent: { apiKey: "test-key", model: "test-model" }
            });
        });
    });

    it("should handle consolidation (consolidate command)", function (done) {
        const { testDir, testFile } = getTestEnv("consolidate");
        const flow = [
            { id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.settings({ userDir: testDir });

        // Mock Chat Completion (Summary)
        axiosStub.post.onCall(0).resolves({
            data: { choices: [{ message: { content: "User likes cats." } }] }
        });
        // Mock Embedding (Summary Vector)
        axiosStub.post.onCall(1).resolves({
            data: { data: [{ embedding: [0.5, 0.5, 0.5] }] }
        });

        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            // Add some messages to a conversation
            n1.memoryManager.addMessage("c1", { role: "user", content: "I love cats." });
            n1.memoryManager.addMessage("c1", { role: "assistant", content: "That's nice!" });

            n2.on("input", function (msg) {
                try {
                    expect(msg.result.success).to.be.true;
                    expect(msg.result.summary).to.equal("User likes cats.");
                    expect(n1.memoryManager.longTerm.vectors).to.have.lengthOf(1);
                    expect(n1.memoryManager.longTerm.vectors[0].text).to.equal("User likes cats.");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                command: "consolidate",
                conversationId: "c1",
                aiagent: { apiKey: "test-key", model: "test-model" }
            });
        });
    });
});
