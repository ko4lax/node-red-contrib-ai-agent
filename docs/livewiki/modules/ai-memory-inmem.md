---
path: modules/ai-memory-inmem.md
page-type: module
summary: Documentation for the AI Memory (In-Memory) node - volatile conversation context storage.
tags: [memory, in-memory, context, volatile]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# AI Memory (In-Memory) Module

The AI Memory (In-Memory) node provides volatile storage for conversation context, maintaining conversation history in memory during runtime.

## Purpose and Responsibilities

The In-Memory node serves as a configuration node that:

- **Context Storage**: Maintains conversation history in RAM
- **Session Management**: Tracks conversation state across message exchanges
- **Memory Limits**: Enforces configurable size limits to prevent memory overflow
- **Stateless Design**: Provides configuration that can be instantiated by agent nodes

## Key Types and Interfaces

### Memory Configuration
```javascript
{
  name: "string",                        // Display name
  maxItems: "number",                    // Maximum conversation turns
  type: "inmem",                         // Memory type identifier
  conversations: "Map<string, Array>"    // In-memory conversation store
}
```

### Conversation Structure
```javascript
{
  id: "string",                          // Unique conversation identifier
  messages: [
    {
      role: "system | user | assistant", // Message role
      content: "string",                 // Message content
      timestamp: "number",               // Unix timestamp
      metadata: "object"                 // Additional metadata
    }
  ],
  summary: "string",                     // Optional conversation summary
  metadata: "object"                     // Conversation-level metadata
}
```

## Dependencies and Relationships

### Required Dependencies
- **Node-RED Runtime**: Version 1.0.0 or higher
- **AI Agent Node**: Uses this memory configuration

### Integration Points
- **AI Agent Node**: Primary consumer of memory configuration
- **Debug Nodes**: Can inspect memory state for debugging
- **Function Nodes**: Can manipulate memory via `msg.command`

## Configuration Options

### Basic Configuration
- **Name**: Display name for the configuration node
- **Max Items**: Maximum number of conversation turns to keep (default: 10)

### Advanced Options
- **Conversation ID Strategy**: How to identify conversations
- **Message Format**: Structure of stored messages
- **Cleanup Policy**: When to remove old conversations

## Usage Examples

### Basic Setup
```javascript
// Simple in-memory configuration
const memoryConfig = {
  name: "Chat Memory",
  maxItems: 20,
  type: "inmem"
};
```

### High Volume Configuration
```javascript
// Configuration for high-volume scenarios
const highVolumeConfig = {
  name: "High Volume Memory",
  maxItems: 5,
  type: "inmem",
  cleanupPolicy: "aggressive"
};
```

### Long Conversation Support
```javascript
// Configuration for extended conversations
const longConversationConfig = {
  name: "Extended Chat",
  maxItems: 50,
  type: "inmem",
  summaryThreshold: 25
};
```

## Memory Commands

### Supported Commands via `msg.command`

#### Add Message
```javascript
msg.command = "add";
msg.conversationId = "user123";
msg.message = {
  role: "user",
  content: "Hello, how are you?",
  timestamp: Date.now()
};
```

#### Get Messages
```javascript
msg.command = "get";
msg.conversationId = "user123";
// Returns: msg.payload = messages array
```

#### Search Messages
```javascript
msg.command = "search";
msg.query = "weather";
// Returns: msg.payload = matching messages
```

#### Clear Memory
```javascript
msg.command = "clear";
msg.scope = "conversation | all";
msg.conversationId = "user123"; // Optional for scope="conversation"
```

#### Delete Conversation
```javascript
msg.command = "delete";
msg.conversationId = "user123";
```

## Performance Characteristics

### Memory Usage
- **Linear Growth**: Memory usage scales with conversation count and length
- **Cleanup**: Automatic removal of oldest messages when `maxItems` exceeded
- **Garbage Collection**: Relies on Node.js garbage collection for cleanup

### Response Time
- **O(1) Access**: Direct array access for message retrieval
- **O(n) Search**: Linear search for text-based queries
- **Minimal Latency**: In-memory operations are extremely fast

## Limitations

### Volatility
- **No Persistence**: Memory is lost on Node-RED restart
- **Process Bound**: Memory is tied to the Node-RED process
- **No Sharing**: Cannot share memory across multiple Node-RED instances

### Scalability
- **Memory Bound**: Limited by available system memory
- **No Compression**: Messages stored as-is without compression
- **Single Process**: No distributed memory capabilities

## Use Cases

### Best For
- **Development**: Testing and prototyping
- **Short-lived Conversations**: Temporary chat sessions
- **Stateless Applications**: Where persistence isn't required
- **High Performance**: Scenarios requiring maximum speed

### Not Recommended For
- **Production Systems**: Where data persistence is critical
- **Long-term Storage**: Historical conversation analysis
- **Multi-instance Deployments**: Where memory sharing is needed
- **Large-scale Applications**: With many concurrent conversations

## Migration to File Memory

When outgrowing in-memory limitations:

1. **Backup Current State**: Export important conversations
2. **Update Configuration**: Switch to file-based memory
3. **Import Data**: Migrate existing conversations
4. **Test Thoroughly**: Verify functionality before deployment

## See Also

- [AI Memory (File) Module](ai-memory-file.md) - Persistent memory option
- [AI Agent Module](ai-agent.md) - Memory usage
- [Configuration Guide](../configuration.md) - Memory configuration
- [Data Flow](../data_flow.md) - Context management
