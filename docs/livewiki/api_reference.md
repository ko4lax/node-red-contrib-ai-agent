---
path: api_reference.md
page-type: reference
summary: Complete API documentation for Node-RED AI Agent nodes and interfaces.
tags: [api, reference, nodes, configuration]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# API Reference

This document provides comprehensive API documentation for all Node-RED AI Agent nodes, message properties, and configuration options.

## Message Properties

### Standard Node-RED Properties

All standard Node-RED message properties are preserved:

- `msg.payload` - Message payload content
- `msg.topic` - Message topic
- `msg._msgid` - Unique message identifier
- Any custom properties added by upstream nodes

### AI Agent Properties

#### `msg.aiagent`

AI configuration object added by the AI Model node:

```javascript
{
  "model": "gpt-4",                    // AI model name
  "apiKey": "sk-or-v1-...",           // OpenRouter API key
  "temperature": 0.7,                  // Response creativity (0.0-2.0)
  "maxTokens": 1000,                  // Maximum response tokens
  "tools": [                          // Available tools (optional)
    {
      "type": "function",
      "function": {
        "name": "toolName",
        "description": "Tool description",
        "parameters": {
          "type": "object",
          "properties": {},
          "required": []
        }
      }
    }
  ]
}
```

#### `msg.aimemory`

Memory context object added by memory nodes:

```javascript
{
  "context": [                        // Conversation history
    {
      "role": "user|assistant|system",
      "content": "Message content",
      "timestamp": "2025-12-21T14:30:00.000Z"
    }
  ],
  "maxItems": 10,                     // Maximum messages to retain
  "conversationId": "conv-123",       // Unique conversation identifier
  "config": {                         // Memory configuration reference
    "type": "in-memory|file",
    "persistence": true
  }
}
```

#### `msg.aiagent.tools`

Array of available tools for the AI agent:

```javascript
[
  {
    "type": "function",
    "function": {
      "name": "toolName",
      "description": "What the tool does",
      "parameters": {
        "type": "object",
        "properties": {
          "param1": {
            "type": "string|number|boolean|object|array",
            "description": "Parameter description"
          }
        },
        "required": ["param1"]
      }
    }
  }
]
```

## Node APIs

### AI Agent Node

#### Configuration

```javascript
{
  "name": "AI Agent",
  "systemPrompt": "You are a helpful AI assistant.",
  "responseType": "text|json",
  "timeout": 30000
}
```

#### Input Message

Accepts standard Node-RED messages with:
- `msg.payload` - User input text
- `msg.aiagent` - AI configuration (required)
- `msg.aimemory` - Memory context (optional)
- `msg.aiagent.tools` - Available tools (optional)

#### Output Message

```javascript
{
  "payload": "AI response content",
  "aiagent": { /* preserved config */ },
  "usage": {
    "promptTokens": 50,
    "completionTokens": 100,
    "totalTokens": 150
  },
  "toolResults": [ /* Tool execution results */ ]
}
```

#### Error Output

```javascript
{
  "payload": "Error message",
  "error": {
    "code": "CONFIG_ERROR|API_ERROR|TOOL_ERROR",
    "message": "Detailed error description",
    "details": {}
  }
}
```

### AI Model Node

#### Configuration

```javascript
{
  "name": "AI Model",
  "model": "gpt-4|claude-3-opus|...",
  "temperature": 0.7,
  "maxTokens": 1000
}
```

#### Credentials

```javascript
{
  "apiKey": "sk-or-v1-..."  // OpenRouter API key
}
```

#### Output Message

Adds `msg.aiagent` configuration object to the message.

### Memory Nodes

#### AI Memory (In-Memory) Configuration

```javascript
{
  "name": "In-Memory Memory",
  "maxItems": 10,
  "retentionPolicy": "fifo|lifo",
  "resetOnDeploy": false
}
```

#### AI Memory (File) Configuration

```javascript
{
  "name": "File Memory",
  "filename": "conversation-memory.json",
  "maxConversations": 100,
  "maxMessagesPerConversation": 50,
  "backups": {
    "enabled": true,
    "count": 5
  },
  "consolidation": {
    "enabled": true,
    "threshold": 20,
    "model": "gpt-3.5-turbo"
  },
  "longTermMemory": {
    "enabled": true,
    "embeddingModel": "text-embedding-ada-002"
  }
}
```

#### Memory Commands

Send commands via `msg.command`:

```javascript
// Add message to conversation
{
  "command": "add",
  "conversationId": "conv-123",
  "message": {
    "role": "user",
    "content": "Hello"
  }
}

// Get conversation history
{
  "command": "get",
  "conversationId": "conv-123",
  "limit": 10
}

// Search conversations
{
  "command": "search",
  "query": "search term"
}

// Semantic search (vector)
{
  "command": "query",
  "query": "semantic search query"
}

// Consolidate conversation
{
  "command": "consolidate",
  "conversationId": "conv-123"
}

// Clear memory
{
  "command": "clear",
  "scope": "short|long|all"
}

// Delete conversation
{
  "command": "delete",
  "conversationId": "conv-123"
}
```

### Tool Nodes

#### AI Tool Function Configuration

```javascript
{
  "name": "Function Tool",
  "toolName": "getCurrentTime",
  "description": "Get the current date and time",
  "function": "return new Date().toISOString();"
}
```

#### AI Tool HTTP Configuration

```javascript
{
  "name": "HTTP Tool",
  "toolName": "getWeather",
  "description": "Get weather information",
  "method": "GET|POST|PUT|DELETE",
  "url": "https://api.example.com/weather",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${input.token}"
  },
  "body": "${input.body}",
  "timeout": 10000
}
```

#### Template Variables

Use `${input.property}` syntax in URL, headers, and body:

```javascript
// Input from AI
{
  "city": "London",
  "units": "metric"
}

// Template in URL
"https://api.openweathermap.org/data/2.5/weather?q=${input.city}&units=${input.units}"
```

#### AI Tool Approval Configuration

```javascript
{
  "name": "Approval Tool",
  "toolName": "requestApproval",
  "description": "Request human approval for actions"
}
```

#### Approval Flow

**Output 1 (Normal):** Tool execution result
**Output 2 (Approval Request):**

```javascript
{
  "payload": "Please approve: Transfer $100 to account 123",
  "approvalId": "approval-uuid",
  "details": {
    "action": "transfer",
    "amount": 100,
    "target": "account-123"
  }
}
```

**Approval Response Input:**

```javascript
{
  "payload": "Approval response",
  "approvalId": "approval-uuid",
  "approved": true,
  "response": "Approved by user"
}
```

### AI Orchestrator Node

#### Configuration

```javascript
{
  "name": "AI Orchestrator",
  "maxIterations": 10,
  "planningStrategy": "simple|advanced",
  "defaultGoal": "Complete the assigned task",
  "retryAttempts": 3,
  "timeout": 300000
}
```

#### Input Message

```javascript
{
  "payload": "Write a blog post about AI and translate to Spanish",
  "goal": "Custom goal (optional)",
  "context": { /* Additional context */ }
}
```

#### Output Message

**Output 1 (Task Dispatch):**

```javascript
{
  "payload": "Write a blog post about AI",
  "taskId": "task-123",
  "taskType": "write",
  "dependencies": [],
  "priority": "high"
}
```

**Output 2 (Final Result):**

```javascript
{
  "payload": "Final translated blog post",
  "plan": {
    "tasks": [/* Completed tasks */],
    "iterations": 3,
    "totalTime": 45000
  }
}
```

## Error Codes

### Configuration Errors

- `CONFIG_MISSING` - AI configuration not found
- `MODEL_MISSING` - AI model not specified
- `APIKEY_MISSING` - API key not configured
- `MEMORY_CONFIG_ERROR` - Memory configuration invalid

### API Errors

- `API_ERROR` - General API failure
- `RATE_LIMIT` - API rate limit exceeded
- `MODEL_UNAVAILABLE` - Requested model unavailable
- `INVALID_RESPONSE` - Invalid API response format

### Tool Errors

- `TOOL_NOT_FOUND` - Requested tool not available
- `TOOL_EXECUTION_ERROR` - Tool execution failed
- `TOOL_TIMEOUT` - Tool execution timeout
- `TOOL_VALIDATION_ERROR` - Invalid tool parameters

### Memory Errors

- `MEMORY_ACCESS_ERROR` - File/memory access failure
- `MEMORY_CORRUPTION` - Memory data corruption
- `CONVERSATION_NOT_FOUND` - Conversation ID not found
- `STORAGE_FULL` - Storage capacity exceeded

## Helper Functions

### Validation Functions

```javascript
// Validate AI configuration
function validateAIConfig(aiagent) {
  if (!aiagent) return 'AI configuration missing';
  if (!aiagent.model) return 'AI model not specified';
  if (!aiagent.apiKey) return 'API key not found';
  return null;
}

// Validate tool parameters
function validateToolParams(tool, input) {
  const schema = tool.function.parameters;
  // Validate input against schema
  return isValid;
}
```

### Utility Functions

```javascript
// Create conversation message
function createMessage(role, content) {
  return {
    role: role,
    content: content,
    timestamp: new Date().toISOString(),
    type: 'conversation'
  };
}

// Generate conversation ID
function generateConversationId() {
  return 'conv-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

// Parse template variables
function parseTemplate(template, input) {
  return template.replace(/\${input\.([^}]+)}/g, (match, path) => {
    return getNestedProperty(input, path);
  });
}
```

## See Also

- [Architecture](architecture.md) - System design and patterns
- [Data Flow](data_flow.md) - Message processing flow
- [Module Documentation](modules/) - Individual component details
- [Configuration](configuration.md) - Configuration options and settings
