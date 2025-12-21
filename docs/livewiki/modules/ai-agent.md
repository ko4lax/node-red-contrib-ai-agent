---
path: modules/ai-agent.md
page-type: module
summary: Documentation for the AI Agent node - the central processing component.
tags: [ai-agent, core, processing]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# AI Agent Module

The AI Agent node is the central processing component that orchestrates AI interactions, manages conversation context, and executes tools.

## Purpose and Responsibilities

The AI Agent node serves as the primary interface between Node-RED flows and AI services. Its main responsibilities include:

- **AI Model Communication**: Sending requests to configured AI models and processing responses
- **Context Management**: Maintaining conversation history through connected memory systems
- **Tool Execution**: Coordinating the execution of available tools and integrating their results
- **Message Processing**: Transforming input messages into AI-compatible format and back

## Key Types and Interfaces

### Input Message Structure
```javascript
{
  payload: "string | object",           // Primary content to process
  topic: "string",                      // Optional message topic
  aiagent: {                            // AI Agent configuration
    model: "object",                    // AI model configuration
    memory: "object",                   // Memory system configuration
    tools: "array"                      // Available tools
  }
}
```

### Output Message Structure
```javascript
{
  payload: "string | object",           // AI response content
  topic: "string",                      // Preserved input topic
  aiagent: {                            // Updated AI Agent state
    response: "object",                 // Full AI response
    context: "object",                  // Updated conversation context
    toolCalls: "array"                  // Tool calls made during processing
  }
}
```

## Dependencies and Relationships

### Required Dependencies
- **AI Model Node**: Provides model configuration and API credentials
- **Memory Configuration** (optional): Supplies conversation context
- **Tool Nodes** (optional): Extend agent capabilities

### Node-RED Integration
The AI Agent integrates with Node-RED's message passing system, allowing it to work seamlessly with:
- Input nodes (HTTP, MQTT, Inject, etc.)
- Output nodes (Debug, HTTP Response, etc.)
- Function nodes for custom processing

## Configuration Options

### Node Properties
- **Name**: Display name for the node (optional)
- **System Prompt**: Initial instructions for the AI (optional)
- **Response Type**: Expected response format (text or JSON)

### Runtime Configuration
The agent expects configuration via `msg.aiagent`:
```javascript
msg.aiagent = {
  model: {
    apiKey: "string",
    model: "string",
    baseUrl: "string"
  },
  memory: {
    type: "inmem | file",
    config: "object"
  },
  tools: [
    {
      name: "string",
      description: "string",
      parameters: "object"
    }
  ]
}
```

## Usage Examples

### Basic Usage
```javascript
// Simple message processing
msg.payload = "Hello, how are you?";
return msg;
```

### With Memory Context
```javascript
// Message with conversation context
msg.payload = "What did we discuss earlier?";
msg.aiagent = {
  memory: {
    type: "file",
    config: { filename: "conversation.json" }
  }
};
return msg;
```

### With Tools
```javascript
// Message with tool availability
msg.payload = "Get the current weather";
msg.aiagent = {
  tools: [
    {
      name: "get_weather",
      description: "Get current weather for a location",
      parameters: { location: "string" }
    }
  ]
};
return msg;
```

## Error Handling

The AI Agent provides comprehensive error handling:

### Common Errors
- **API Key Missing**: `Error: API key not configured`
- **Model Not Found**: `Error: Model not available`
- **Memory Access Error**: `Error: Cannot access memory system`
- **Tool Execution Error**: `Error: Tool execution failed`

### Error Response Format
```javascript
{
  payload: "Error message",
  error: {
    code: "ERROR_CODE",
    message: "Detailed error description",
    stack: "Call stack (development only)"
  }
}
```

## Performance Considerations

### Token Usage
- Monitor token consumption with large conversation contexts
- Use memory consolidation to reduce context size
- Set appropriate `maxItems` in memory configuration

### Response Time
- Consider model selection for latency-sensitive applications
- Implement timeout handling for long-running operations
- Use tool approval for critical operations

## See Also

- [AI Model Module](ai-model.md) - Model configuration
- [Memory Modules](ai-memory-inmem.md) - Context management
- [Tool Modules](ai-tool-function.md) - Function extensions
- [Architecture](../architecture.md) - System design
- [Data Flow](../data_flow.md) - Message processing
