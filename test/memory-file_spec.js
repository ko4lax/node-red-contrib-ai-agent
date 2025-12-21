const helper = require("node-red-node-test-helper");
const memoryFileNode = require("../memory-file/memory-file.js");
const { expect } = require("chai");
const fs = require("fs");
const path = require("path");
const os = require("os");

describe("AI Memory (File) Node", function () {
    this.timeout(10000);

    const baseTestDir = path.join(os.tmpdir(), "node-red-ai-test-" + Date.now());

    before(function (done) {
        if (!fs.existsSync(baseTestDir)) {
            fs.mkdirSync(baseTestDir, { recursive: true });
        }
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

    it("should be loaded into the runtime", function (done) {
        const { testDir } = getTestEnv("load");
        const flow = [{ id: "n1", type: "ai-memory-file", name: "test memory" }];
        helper.settings({ userDir: testDir });
        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            try {
                expect(n1).to.not.be.null;
                expect(n1).to.have.property("name", "test memory");
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it("should attach context to msg.aimemory by default", function (done) {
        const { testDir, testFile } = getTestEnv("attach");
        const flow = [
            { id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.settings({ userDir: testDir });
        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    expect(msg).to.have.property("aimemory");
                    expect(msg.aimemory).to.have.property("type", "file");
                    expect(msg.aimemory.context).to.be.an("array");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ payload: "hello" });
        });
    });

    it("should handle 'add' command and persist data", function (done) {
        const { testDir, testFile, testFilePath } = getTestEnv("add");
        const flow = [
            { id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.settings({ userDir: testDir });
        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    expect(msg.result).to.have.property("success", true);
                    expect(msg.result).to.have.property("messageCount", 1);

                    expect(fs.existsSync(testFilePath)).to.be.true;
                    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
                    expect(data.conversations[0].messages[0].content).to.equal("test message");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({
                command: "add",
                message: { role: "user", content: "test message" }
            });
        });
    });

    it("should handle 'get' command to retrieve messages", function (done) {
        const { testDir, testFile, testFilePath } = getTestEnv("get");
        const flow = [
            { id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.settings({ userDir: testDir });

        const initialData = {
            conversations: [{ id: "c1", messages: [{ role: "user", content: "existing message" }], updatedAt: new Date().toISOString() }]
        };
        fs.writeFileSync(testFilePath, JSON.stringify(initialData));

        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    expect(msg.result.messages[0].content).to.equal("existing message");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ command: "get", conversationId: "c1" });
        });
    });

    it("should support searching through conversations", function (done) {
        const { testDir, testFile, testFilePath } = getTestEnv("search");
        const flow = [
            { id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.settings({ userDir: testDir });

        const initialData = {
            conversations: [{ id: "c1", messages: [{ role: "user", content: "I love cats" }], updatedAt: new Date().toISOString() }]
        };
        fs.writeFileSync(testFilePath, JSON.stringify(initialData));

        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    expect(msg.result.results[0].conversation.id).to.equal("c1");
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ command: "search", query: "cats" });
        });
    });

    it("should handle 'delete' command", function (done) {
        const { testDir, testFile, testFilePath } = getTestEnv("delete");
        const flow = [
            { id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.settings({ userDir: testDir });

        const initialData = {
            conversations: [{ id: "c1", messages: [], updatedAt: new Date().toISOString() }]
        };
        fs.writeFileSync(testFilePath, JSON.stringify(initialData));

        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");

            n2.on("input", function (msg) {
                try {
                    const data = JSON.parse(fs.readFileSync(testFilePath, 'utf8'));
                    expect(data.conversations).to.have.lengthOf(0);
                    done();
                } catch (err) {
                    done(err);
                }
            });

            n1.receive({ command: "delete", conversationId: "c1" });
        });
    });

    it("should respect maxMessagesPerConversation limit", function (done) {
        const { testDir, testFile } = getTestEnv("limit");
        const flow = [
            { id: "n1", type: "ai-memory-file", name: "test memory", filename: testFile, maxMessagesPerConversation: 2, wires: [["n2"]] },
            { id: "n2", type: "helper" }
        ];
        helper.settings({ userDir: testDir });

        helper.load(memoryFileNode, flow, function () {
            const n1 = helper.getNode("n1");
            const n2 = helper.getNode("n2");
            let count = 0;

            n2.on("input", function (msg) {
                count++;
                if (count === 3) {
                    try {
                        expect(msg.result.messageCount).to.equal(2);
                        done();
                    } catch (err) {
                        done(err);
                    }
                }
            });

            n1.receive({ command: "add", conversationId: "c1", message: { content: "m1" } });
            n1.receive({ command: "add", conversationId: "c1", message: { content: "m2" } });
            n1.receive({ command: "add", conversationId: "c1", message: { content: "m3" } });
        });
    });
});
