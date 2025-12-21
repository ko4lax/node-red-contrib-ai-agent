---
path: configuration.md
page-type: reference
summary: Configuration options and environment variables for the Node-RED AI Agent.
tags: [configuration, settings, environment, options]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# Configuration

This document covers all configuration options, environment variables, and settings for the Node-RED AI Agent.

## Environment Variables

### API Configuration

```bash
# OpenRouter API Key (alternative to Node-RED credentials)
OPENROUTER_API_KEY=sk-or-v1-...

# Default AI Model
AI_MODEL_DEFAULT=gpt-4

# Default Temperature
AI_TEMPERATURE_DEFAULT=0.7

# Default Max Tokens
AI_MAX_TOKENS_DEFAULT=1000
```

### Memory Configuration

```bash
# Default memory file location
MEMORY_FILE_DEFAULT=conversation-memory.json

# Memory storage directory
MEMORY_STORAGE_DIR=~/.node-red/ai-memory

# Enable memory backups
MEMORY_BACKUPS_ENABLED=true

# Number of backup files to keep
MEMORY_BACKUP_COUNT=5
```

### Tool Configuration

```bash
# Default HTTP timeout for tools (milliseconds)
TOOL_HTTP_TIMEOUT=10000

# Enable tool result caching
TOOL_CACHE_ENABLED=true

# Tool cache TTL (seconds)
TOOL_CACHE_TTL=300
```

### Orchestrator Configuration

```bash
# Default maximum iterations
ORCHESTRATOR_MAX_ITERATIONS=10

# Default planning strategy
ORCHESTRATOR_PLANNING_STRATEGY=advanced

# Orchestrator timeout (milliseconds)
ORCHESTRATOR_TIMEOUT=300000
```

### Logging Configuration

```bash
# Log level (error, warn, info, debug)
LOG_LEVEL=info

# Enable detailed AI logging
AI_LOGGING_DETAILED=false

# Log API requests and responses
LOG_API_CALLS=false
```

## Node Configuration

### AI Model Node

#### Basic Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | "AI Model" | Display name for the node |
| `model` | string | "gpt-4" | AI model to use |
| `temperature` | number | 0.7 | Response creativity (0.0-2.0) |
| `maxTokens` | number | 1000 | Maximum response tokens |

#### Available Models

- `gpt-4` - OpenAI GPT-4
- `gpt-4-turbo` - OpenAI GPT-4 Turbo
- `gpt-3.5-turbo` - OpenAI GPT-3.5 Turbo
- `claude-3-opus` - Anthropic Claude 3 Opus
- `claude-3-sonnet` - Anthropic Claude 3 Sonnet
- `claude-3-haiku` - Anthropic Claude 3 Haiku
- Any model available on OpenRouter

#### Credential Configuration

```javascript
{
  "apiKey": "sk-or-v1-..."  // OpenRouter API key
}
```

### AI Agent Node

#### Basic Settings

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | "AI Agent" | Display name for the node |
| `systemPrompt` | string | "" | System instructions for AI |
| `responseType` | string | "text" | Response format (text/json) |
| `timeout` | number | 30000 | Request timeout (ms) |

#### System Prompt Templates

```javascript
// Basic assistant
"You are a helpful AI assistant. Provide clear and accurate responses."

// Code assistant
"You are an expert programmer. Provide clean, well-commented code solutions."

// Data analyst
"You are a data analyst. Analyze the provided data and give actionable insights."

// Creative writer
"You are a creative writer. Craft engaging and original content."
```

### Memory Configuration Nodes

#### AI Memory (In-Memory)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | "In-Memory" | Display name |
| `maxItems` | number | 10 | Maximum messages to retain |
| `retentionPolicy` | string | "fifo" | Retention policy (fifo/lifo) |
| `resetOnDeploy` | boolean | false | Clear memory on deploy |

#### AI Memory (File)

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | "File Memory" | Display name |
| `filename` | string | "conversation-memory.json" | Storage filename |
| `maxConversations` | number | 100 | Maximum conversations |
| `maxMessagesPerConversation` | number | 50 | Messages per conversation |
| `backups.enabled` | boolean | true | Enable backups |
| `backups.count` | number | 5 | Number of backups |
| `consolidation.enabled` | boolean | true | Enable consolidation |
| `consolidation.threshold` | number | 20 | Consolidation threshold |
| `consolidation.model` | string | "gpt-3.5-turbo" | Consolidation model |
| `longTermMemory.enabled` | boolean | true | Enable vector storage |
| `longTermMemory.embeddingModel` | string | "text-embedding-ada-002" | Embedding model |

### Tool Configuration Nodes

#### AI Tool Function

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | "Function Tool" | Display name |
| `toolName` | string | "" | Tool identifier |
| `description` | string | "" | Tool description |
| `function` | string | "" | JavaScript function code |

#### AI Tool HTTP

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | "HTTP Tool" | Display name |
| `toolName` | string | "" | Tool identifier |
| `description` | string | "" | Tool description |
| `method` | string | "GET" | HTTP method |
| `url` | string | "" | Request URL |
| `headers` | object | {} | Request headers |
| `body` | string | "" | Request body |
| `timeout` | number | 10000 | Timeout (ms) |

#### AI Tool Approval

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | "Approval Tool" | Display name |
| `toolName` | string | "" | Tool identifier |
| `description` | string | "" | Tool description |

### AI Orchestrator

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | string | "AI Orchestrator" | Display name |
| `maxIterations` | number | 10 | Maximum iterations |
| `planningStrategy` | string | "advanced" | Planning strategy |
| `defaultGoal` | string | "" | Default goal |
| `retryAttempts` | number | 3 | Retry attempts |
| `timeout` | number | 300000 | Timeout (ms) |

## Configuration Files

### Node-RED Settings File

Add to your `settings.js`:

```javascript
module.exports = {
    // AI Agent configuration
    aiAgent: {
        defaultModel: "gpt-4",
        defaultTemperature: 0.7,
        defaultMaxTokens: 1000,
        enableLogging: false
    },
    
    // Memory configuration
    aiMemory: {
        storageDir: require('path').join(__dirname, 'ai-memory'),
        defaultMaxItems: 10,
        enableBackups: true,
        backupCount: 5
    },
    
    // Tool configuration
    aiTools: {
        httpTimeout: 10000,
        enableCache: true,
        cacheTTL: 300
    },
    
    // Orchestrator configuration
    aiOrchestrator: {
        maxIterations: 10,
        defaultPlanningStrategy: "advanced",
        timeout: 300000
    }
};
```

### Package.json Configuration

```json
{
  "name": "my-node-red-project",
  "dependencies": {
    "node-red-contrib-ai-agent": "^0.4.1"
  },
  "node-red": {
    "settings": {
      "aiAgent": {
        "defaultModel": "gpt-4",
        "defaultTemperature": 0.7
      }
    }
  }
}
```

## Runtime Configuration

### Dynamic Configuration via Messages

Configure nodes dynamically using message properties:

```javascript
// Override AI model
msg.aiagent = {
  model: "claude-3-opus",
  temperature: 0.5,
  maxTokens: 2000
};

// Override memory settings
msg.aimemory = {
  maxItems: 20,
  conversationId: "special-conversation"
};

// Add tools dynamically
msg.aiagent.tools = [
  {
    type: "function",
    function: {
      name: "dynamicTool",
      description: "Dynamically added tool",
      parameters: { type: "object", properties: {} }
    }
  }
];
```

### Configuration Validation

```javascript
// Validate AI configuration
function validateAIConfig(config) {
  const errors = [];
  
  if (!config.model) errors.push("Model is required");
  if (!config.apiKey) errors.push("API key is required");
  if (config.temperature < 0 || config.temperature > 2) {
    errors.push("Temperature must be between 0 and 2");
  }
  if (config.maxTokens < 1 || config.maxTokens > 32000) {
    errors.push("Max tokens must be between 1 and 32000");
  }
  
  return errors;
}

// Validate memory configuration
function validateMemoryConfig(config) {
  const errors = [];
  
  if (config.maxItems < 1) errors.push("Max items must be positive");
  if (config.filename && !config.filename.endsWith('.json')) {
    errors.push("Memory file must be JSON");
  }
  
  return errors;
}
```

## Security Configuration

### API Key Management

```javascript
// Environment variable (recommended)
process.env.OPENROUTER_API_KEY = "sk-or-v1-...";

// Node-RED credentials (secure)
// Configure via Node-RED editor UI

// Runtime configuration (less secure)
// Only for development/testing
```

### Tool Security

```javascript
// Validate tool parameters
function validateToolInput(toolName, input) {
  const sanitized = sanitizeInput(input);
  
  // Check for dangerous operations
  if (sanitized.includes('eval') || sanitized.includes('exec')) {
    throw new Error('Dangerous operation detected');
  }
  
  return sanitized;
}

// HTTP tool security
function secureHttpRequest(config) {
  // Validate URL
  const url = new URL(config.url);
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Only HTTP/HTTPS URLs allowed');
  }
  
  // Remove sensitive headers
  const safeHeaders = { ...config.headers };
  delete safeHeaders['authorization'];
  delete safeHeaders['cookie'];
  
  return { ...config, headers: safeHeaders };
}
```

### Memory Security

```javascript
// Encrypt sensitive memory data
function encryptMemoryData(data) {
  if (process.env.MEMORY_ENCRYPTION_KEY) {
    return encrypt(JSON.stringify(data), process.env.MEMORY_ENCRYPTION_KEY);
  }
  return data;
}

// Sanitize memory content
function sanitizeMemoryContent(content) {
  // Remove or mask sensitive information
  return content
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '****-****-****-****')
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '****@****.***');
}
```

## Performance Configuration

### Optimization Settings

```javascript
// Token optimization
const tokenOptimization = {
  maxContextTokens: 4000,      // Maximum context tokens
  compressionThreshold: 10,    // Messages before compression
  compressionModel: "gpt-3.5-turbo"  // Model for compression
};

// Caching configuration
const cacheConfig = {
  toolResults: true,           // Cache tool results
  apiResponses: false,         // Don't cache AI responses
  memoryQueries: true,         // Cache memory searches
  ttl: 300                    // Cache TTL in seconds
};

// Concurrent execution
const concurrencyConfig = {
  maxConcurrentTools: 5,      // Maximum concurrent tool calls
  maxConcurrentAgents: 3,      // Maximum concurrent agents
  queueTimeout: 30000         // Queue timeout
};
```

### Monitoring Configuration

```javascript
// Metrics collection
const monitoring = {
  enableMetrics: true,
  metricsInterval: 60000,      // Collection interval (ms)
  metricsRetention: 86400000,  // Retention period (ms)
  
  // Metrics to collect
  trackTokenUsage: true,
  trackResponseTime: true,
  trackToolExecutions: true,
  trackMemoryUsage: true
};
```

## See Also

- [Getting Started](getting_started.md) - Installation and setup guide
- [API Reference](api_reference.md) - Complete API documentation
- [Development](development.md) - Development configuration
- [Troubleshooting](troubleshooting.md) - Configuration issues
