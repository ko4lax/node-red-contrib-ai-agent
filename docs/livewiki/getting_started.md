---
path: getting_started.md
page-type: tutorial
summary: Complete guide for installing and setting up the Node-RED AI Agent.
tags: [tutorial, installation, setup, getting-started]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# Getting Started

This guide will walk you through installing and configuring the Node-RED AI Agent for your first AI-powered flow.

## Prerequisites

- Node-RED version 1.0.0 or higher
- Node.js version 14.0.0 or higher
- OpenRouter API key (for AI model access)

## Installation

### Via Node-RED Palette Manager (Recommended)

1. Open Node-RED in your browser
2. Navigate to **Menu → Manage Palette**
3. Click the **Install** tab
4. Search for `node-red-contrib-ai-agent`
5. Click **Install** next to the package

### Via Command Line

```bash
cd ~/.node-red
npm install node-red-contrib-ai-agent
```

Restart Node-RED after installation.

## Basic Setup

### Step 1: Configure AI Model

1. Drag an **AI Model** node to your workspace
2. Double-click to configure:
   - **Name**: Give it a descriptive name (e.g., "GPT-4 Model")
   - **Model**: Select your preferred model (e.g., "gpt-4")
   - **Temperature**: Set response creativity (0.7 is a good default)
   - **Max Tokens**: Set response length limit (1000 is reasonable)
   - **API Key**: Enter your OpenRouter API key

3. Click **Done**

### Step 2: Create AI Agent Flow

1. Drag an **AI Agent** node to your workspace
2. Drag an **Inject** node and a **Debug** node
3. Connect them: `[Inject] → [AI Model] → [AI Agent] → [Debug]`

### Step 3: Configure AI Agent

1. Double-click the **AI Agent** node
2. Set the **System Prompt** (optional):
   ```
   You are a helpful AI assistant. Respond concisely and accurately.
   ```
3. Click **Done**

### Step 4: Test the Flow

1. Double-click the **Inject** node
2. Set the payload to a test message like "Hello, how are you?"
3. Click **Deploy**
4. Click the inject button to test

You should see the AI response in the debug panel.

## Adding Memory

For conversation context, add a memory node:

### In-Memory Memory

1. Drag an **AI Memory (In-Memory)** configuration node
2. Set **Max Items** to control conversation length (e.g., 10)
3. Connect it to your AI Agent node's memory input

### File-Based Memory

1. Drag an **AI Memory (File)** configuration node
2. Set **Filename** for storage (e.g., `conversation-memory.json`)
3. Configure retention settings as needed
4. Connect to AI Agent node

## Adding Tools

Extend your AI agent with custom tools:

### Function Tool

1. Drag an **AI Tool Function** node
2. Configure:
   - **Tool Name**: `getCurrentTime`
   - **Description**: "Get the current date and time"
   - **Function**: `return new Date().toISOString()`
3. Connect before the AI Agent node

### HTTP Tool

1. Drag an **AI Tool HTTP** node
2. Configure:
   - **Tool Name**: `getWeather`
   - **Description**: "Get weather information for a city"
   - **Method**: GET
   - **URL**: `https://api.openweathermap.org/data/2.5/weather?q=${input.city}&appid=YOUR_API_KEY`
3. Connect before the AI Agent node

## Example Flows

### Simple Chatbot

```
[Inject] → [AI Model] → [Memory] → [AI Agent] → [Debug]
```

### API-Enabled Assistant

```
[Inject] → [AI Model] → [HTTP Tool] → [Function Tool] → [Memory] → [AI Agent] → [Debug]
```

### Multi-Agent System

```
[Inject] → [AI Model] → [Orchestrator] → [Agent 1] → [Orchestrator] → [Agent 2] → [Debug]
```

## Configuration Best Practices

### API Security
- Store API keys in Node-RED credentials, not in flow configuration
- Use environment variables for production deployments
- Rotate API keys regularly

### Memory Management
- Set appropriate `maxItems` to control token usage
- Use file-based memory for persistent conversations
- Enable consolidation for long-running conversations

### Error Handling
- Add catch nodes to handle API errors
- Monitor node status indicators
- Set appropriate timeouts for external calls

## Troubleshooting

### Common Issues

**"AI configuration missing" error**
- Ensure AI Model node is connected before AI Agent
- Check that API key is properly configured

**"Memory not properly initialized" error**
- Verify memory node is connected to AI Agent
- Check memory configuration settings

**No response from AI**
- Verify API key is valid
- Check model availability
- Monitor network connectivity

### Debug Tips

1. Use Debug nodes to inspect message flow
2. Check node status indicators for errors
3. Review Node-RED logs for detailed error messages
4. Test with simple inputs before complex flows

## Next Steps

- Explore [Architecture](architecture.md) for deeper understanding
- Review [API Reference](api_reference.md) for advanced configuration
- Check [Module Documentation](modules/) for detailed node information
- See [Examples](examples.md) for more complex use cases

## See Also

- [Architecture](architecture.md) - System design and patterns
- [Configuration](configuration.md) - Advanced configuration options
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
