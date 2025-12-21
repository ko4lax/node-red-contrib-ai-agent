---
path: modules/ai-model.md
page-type: module
summary: Documentation for the AI Model node - configuration for AI services and APIs.
tags: [ai-model, configuration, api]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# AI Model Module

The AI Model node provides configuration for AI services, managing API credentials, model selection, and request parameters.

## Purpose and Responsibilities

The AI Model node serves as a configuration node that:

- **API Management**: Stores and manages API credentials and endpoints
- **Model Selection**: Provides access to various AI models and their configurations
- **Parameter Configuration**: Sets default parameters for AI requests
- **Service Integration**: Connects to AI service providers (OpenRouter, OpenAI, etc.)

## Key Types and Interfaces

### Model Configuration
```javascript
{
  name: "string",                        // Display name
  model: "string",                       // Model identifier (e.g., "gpt-4")
  apiKey: "string",                      // API key for authentication
  baseUrl: "string",                     // Custom API endpoint
  temperature: "number",                 // Response randomness (0-2)
  maxTokens: "number",                  // Maximum response tokens
  topP: "number",                        // Nucleus sampling parameter
  frequencyPenalty: "number",           // Repetition penalty
  presencePenalty: "number"             // Topic repetition penalty
}
```

### Supported Providers
- **OpenRouter**: Multi-provider access with model routing
- **OpenAI**: Direct OpenAI API access
- **Custom Endpoints**: Compatible API endpoints

## Dependencies and Relationships

### Required Dependencies
- **AI Service Provider**: Valid API credentials for the chosen provider
- **Node-RED Runtime**: Version 1.0.0 or higher

### Integration Points
- **AI Agent Node**: Provides model configuration for AI processing
- **AI Orchestrator Node**: Uses model for planning and reasoning
- **Memory Nodes**: May use model for context consolidation

## Configuration Options

### Basic Configuration
- **Name**: Display name for the configuration node
- **Model**: AI model to use from dropdown or custom input
- **API Key**: Authentication token for the AI service

### Advanced Parameters
- **Temperature**: Controls response creativity (0.0-2.0)
- **Maximum Tokens**: Limit response length
- **Top P**: Nucleus sampling threshold (0.0-1.0)
- **Frequency Penalty**: Reduce repetitive responses (-2.0-2.0)
- **Presence Penalty**: Encourage topic diversity (-2.0-2.0)

### Custom Endpoint
- **Base URL**: Override default API endpoint
- **Organization**: OpenAI organization ID (if applicable)

## Usage Examples

### Basic OpenRouter Setup
```javascript
// In Node-RED flow
const modelConfig = {
  name: "GPT-4",
  model: "openai/gpt-4-turbo",
  apiKey: "sk-or-v1-...",
  temperature: 0.7,
  maxTokens: 2000
};
```

### Custom Endpoint Configuration
```javascript
const customConfig = {
  name: "Local Model",
  model: "llama-2-7b",
  baseUrl: "http://localhost:8000/v1",
  apiKey: "local-api-key",
  temperature: 0.5
};
```

### High Creativity Configuration
```javascript
const creativeConfig = {
  name: "Creative Assistant",
  model: "anthropic/claude-3-opus",
  apiKey: "sk-or-v1-...",
  temperature: 1.2,
  topP: 0.9,
  frequencyPenalty: 0.5,
  presencePenalty: 0.3
};
```

## Model Selection Guide

### General Purpose
- **GPT-4 Turbo**: Balanced performance, good for most tasks
- **Claude 3 Opus**: Strong reasoning and analysis
- **GPT-3.5 Turbo**: Fast and cost-effective

### Specialized Tasks
- **Code Generation**: GPT-4, Claude 3 Sonnet
- **Creative Writing**: Claude 3 Opus, GPT-4 with high temperature
- **Data Analysis**: Claude 3 Sonnet, GPT-4
- **Translation**: GPT-4, specialized multilingual models

### Cost Optimization
- **Simple Tasks**: GPT-3.5 Turbo, smaller models
- **Batch Processing**: Lower temperature, consistent prompts
- **Prototyping**: Free or low-cost models

## Error Handling

### Common Errors
- **Invalid API Key**: `Error: Authentication failed`
- **Model Not Available**: `Error: Model not found`
- **Rate Limit Exceeded**: `Error: Rate limit exceeded`
- **Invalid Parameters**: `Error: Invalid request parameters`

### Troubleshooting Steps
1. Verify API key validity and permissions
2. Check model availability and spelling
3. Review rate limits and usage quotas
4. Validate parameter ranges and formats

## Security Considerations

### API Key Management
- Store API keys securely in Node-RED credentials
- Use environment variables in production
- Rotate keys regularly
- Monitor usage for unauthorized access

### Data Privacy
- Review provider data retention policies
- Avoid sending sensitive information to third-party models
- Use custom endpoints for sensitive data processing

## Performance Optimization

### Response Time
- Choose appropriate model size for task complexity
- Set reasonable `maxTokens` limits
- Consider caching for repeated queries

### Cost Management
- Monitor token usage and costs
- Use smaller models for simple tasks
- Implement request batching where possible

## See Also

- [AI Agent Module](ai-agent.md) - Model usage
- [AI Orchestrator Module](ai-orchestrator.md) - Advanced model usage
- [Configuration Guide](../configuration.md) - System configuration
- [API Reference](../api_reference.md) - Complete API documentation
