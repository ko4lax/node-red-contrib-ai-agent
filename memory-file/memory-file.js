const fs = require('fs');
const path = require('path');

class SimpleFileStorage {
    constructor(options = {}) {
        this.filePath = options.filePath;
        this.backupEnabled = options.backupEnabled !== false;
        this.backupCount = options.backupCount || 3;
    }

    async save(data) {
        try {
            const dir = path.dirname(this.filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            data.metadata = data.metadata || {};
            data.metadata.lastUpdated = new Date().toISOString();

            await fs.promises.writeFile(
                this.filePath,
                JSON.stringify(data, null, 2)
            );

            if (this.backupEnabled) {
                await this.createBackup();
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    loadSync() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = fs.readFileSync(this.filePath, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            // Backup recovery is still async, but for initial load sync is safer
            return null;
        }
    }

    async load() {
        try {
            if (fs.existsSync(this.filePath)) {
                const data = await fs.promises.readFile(this.filePath, 'utf8');
                return JSON.parse(data);
            }
            return null;
        } catch (error) {
            return await this.recoverFromBackup();
        }
    }

    async createBackup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = `${this.filePath}.${timestamp}.bak`;

            await fs.promises.copyFile(this.filePath, backupPath);

            const backups = await this.listBackups();
            if (backups.length > this.backupCount) {
                const oldestBackups = backups
                    .sort((a, b) => a.time - b.time)
                    .slice(0, backups.length - this.backupCount);

                for (const backup of oldestBackups) {
                    await fs.promises.unlink(backup.path);
                }
            }

            return true;
        } catch (error) {
            return false;
        }
    }

    async listBackups() {
        try {
            const dir = path.dirname(this.filePath);
            const base = path.basename(this.filePath);

            const files = await fs.promises.readdir(dir);

            return files
                .filter(file => file.startsWith(`${base}.`) && file.endsWith('.bak'))
                .map(file => {
                    const match = file.match(/\.(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)\.bak$/);
                    const timestamp = match ? match[1].replace(/-/g, ':').replace(/-(\d{3})Z$/, '.$1Z') : null;

                    return {
                        path: path.join(dir, file),
                        time: timestamp ? new Date(timestamp).getTime() : 0
                    };
                });
        } catch (error) {
            return [];
        }
    }

    async recoverFromBackup() {
        try {
            const backups = await this.listBackups();

            if (backups.length === 0) {
                return null;
            }

            const latestBackup = backups.sort((a, b) => b.time - a.time)[0];
            const data = await fs.promises.readFile(latestBackup.path, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }
}

class SimpleMemoryManager {
    constructor(options = {}) {
        this.maxConversations = options.maxConversations || 50;
        this.maxMessagesPerConversation = options.maxMessagesPerConversation || 100;
        this.conversations = [];
    }

    addMessage(conversationId, message) {
        let conversation = this.conversations.find(c => c.id === conversationId);

        if (!conversation) {
            conversation = {
                id: conversationId,
                messages: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.conversations.push(conversation);

            if (this.conversations.length > this.maxConversations) {
                this.conversations = this.conversations
                    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
                    .slice(0, this.maxConversations);
            }
        }

        conversation.messages.push({
            ...message,
            timestamp: new Date().toISOString()
        });

        conversation.updatedAt = new Date().toISOString();

        if (conversation.messages.length > this.maxMessagesPerConversation) {
            conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation);
        }

        return conversation;
    }

    getConversation(conversationId) {
        return this.conversations.find(c => c.id === conversationId) || null;
    }

    getConversationMessages(conversationId, limit = null) {
        const conversation = this.getConversation(conversationId);

        if (!conversation) {
            return [];
        }

        const messages = conversation.messages;

        if (limit && messages.length > limit) {
            return messages.slice(-limit);
        }

        return messages;
    }

    searchConversations(query, options = {}) {
        const results = [];

        for (const conversation of this.conversations) {
            const matchingMessages = conversation.messages.filter(message =>
                message.content && message.content.toLowerCase().includes(query.toLowerCase())
            );

            if (matchingMessages.length > 0) {
                results.push({
                    conversation,
                    matchingMessages: options.includeMessages ? matchingMessages : matchingMessages.length
                });
            }
        }

        return results.sort((a, b) =>
            new Date(b.conversation.updatedAt) - new Date(a.conversation.updatedAt)
        );
    }

    deleteConversation(conversationId) {
        const index = this.conversations.findIndex(c => c.id === conversationId);

        if (index !== -1) {
            this.conversations.splice(index, 1);
            return true;
        }

        return false;
    }

    clearAllConversations() {
        this.conversations = [];
        return true;
    }

    toJSON() {
        return {
            conversations: this.conversations,
            metadata: {
                version: '1.0',
                lastUpdated: new Date().toISOString(),
                stats: {
                    conversationCount: this.conversations.length,
                    messageCount: this.conversations.reduce((count, conv) => count + conv.messages.length, 0)
                }
            }
        };
    }

    fromJSON(data) {
        if (data && data.conversations) {
            this.conversations = data.conversations;
        } else {
            this.conversations = [];
        }
    }
}

module.exports = function (RED) {
    'use strict';

    function MemoryFileNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;

        // Configuration
        node.name = config.name || 'AI Memory (File)';
        node.filename = config.filename || 'ai-memories.json';
        node.maxConversations = parseInt(config.maxConversations) || 50;
        node.maxMessagesPerConversation = parseInt(config.maxMessagesPerConversation) || 100;
        node.backupEnabled = config.backupEnabled !== false;
        node.backupCount = parseInt(config.backupCount) || 3;

        const userDir = (RED.settings && RED.settings.userDir) || process.cwd();
        const filePath = path.join(userDir, node.filename);

        // Create storage and memory manager
        node.fileStorage = new SimpleFileStorage({
            filePath,
            backupEnabled: node.backupEnabled,
            backupCount: node.backupCount
        });

        node.memoryManager = new SimpleMemoryManager({
            maxConversations: node.maxConversations,
            maxMessagesPerConversation: node.maxMessagesPerConversation
        });

        // Load existing memories synchronously at startup
        try {
            const data = node.fileStorage.loadSync();
            if (data) {
                node.memoryManager.fromJSON(data);
                node.status({
                    fill: "green",
                    shape: "dot",
                    text: `${node.memoryManager.conversations.length} conversations`
                });
            } else {
                node.status({ fill: "blue", shape: "ring", text: "New memory file will be created" });
            }
        } catch (err) {
            node.error("Error loading memory file: " + err.message);
            node.status({ fill: "red", shape: "ring", text: "Error loading" });
        }

        // Handle incoming messages
        node.on('input', async function (msg, send, done) {
            // Use send and done for Node-RED 1.0+ compatibility
            send = send || function () { node.send.apply(node, arguments) };

            try {
                msg.aimemory = msg.aimemory || {};

                if (msg.command) {
                    await processCommand(node, msg);
                } else {
                    const conversationId = msg.conversationId || 'default';
                    const messages = node.memoryManager.getConversationMessages(conversationId);

                    msg.aimemory = {
                        type: 'file',
                        conversationId,
                        context: messages
                    };
                }

                send(msg);

                node.status({
                    fill: "green",
                    shape: "dot",
                    text: `${node.memoryManager.conversations.length} conversations`
                });

                if (done) done();
            } catch (err) {
                node.error("Error in memory node: " + err.message, msg);
                node.status({ fill: "red", shape: "ring", text: "Error" });
                if (done) done(err);
            }
        });

        async function processCommand(node, msg) {
            const command = msg.command;

            switch (command) {
                case 'add':
                    if (!msg.message) {
                        throw new Error('No message content provided');
                    }

                    const conversationId = msg.conversationId || 'default';
                    const conversation = node.memoryManager.addMessage(conversationId, msg.message);

                    msg.result = {
                        success: true,
                        operation: 'add',
                        conversationId,
                        messageCount: conversation.messages.length
                    };

                    await node.fileStorage.save(node.memoryManager.toJSON());
                    break;

                case 'get':
                    const getConversationId = msg.conversationId || 'default';
                    const limit = msg.limit || null;

                    msg.result = {
                        success: true,
                        operation: 'get',
                        conversationId: getConversationId,
                        messages: node.memoryManager.getConversationMessages(getConversationId, limit)
                    };
                    break;

                case 'search':
                    if (!msg.query) {
                        throw new Error('No search query provided');
                    }

                    msg.result = {
                        success: true,
                        operation: 'search',
                        query: msg.query,
                        results: node.memoryManager.searchConversations(msg.query, {
                            includeMessages: msg.includeMessages !== false
                        })
                    };
                    break;

                case 'delete':
                    if (!msg.conversationId) {
                        throw new Error('No conversation ID provided');
                    }

                    const deleted = node.memoryManager.deleteConversation(msg.conversationId);

                    msg.result = {
                        success: deleted,
                        operation: 'delete',
                        conversationId: msg.conversationId
                    };

                    if (deleted) {
                        await node.fileStorage.save(node.memoryManager.toJSON());
                    }
                    break;

                case 'clear':
                    node.memoryManager.clearAllConversations();

                    msg.result = {
                        success: true,
                        operation: 'clear'
                    };

                    await node.fileStorage.save(node.memoryManager.toJSON());
                    break;

                default:
                    throw new Error(`Unknown command: ${command}`);
            }
        }

        node.on('close', async function () {
            try {
                await node.fileStorage.save(node.memoryManager.toJSON());
            } catch (err) {
                node.error("Error saving memory file: " + err.message);
            }
            node.status({});
        });
    }

    RED.nodes.registerType("ai-memory-file", MemoryFileNode);
};
