---
path: modules/ai-tool-function.md
page-type: module
summary: Documentation for the AI Tool Function node - custom JavaScript function tools.
tags: [tool, function, javascript, custom]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# AI Tool Function Module

The AI Tool Function node enables creation of custom JavaScript tools that can be used by AI agents to extend their capabilities with custom logic and processing.

## Purpose and Responsibilities

The Tool Function node serves as a tool definition node that:

- **Function Definition**: Defines custom JavaScript functions for AI execution
- **Parameter Schema**: Specifies function parameters and validation
- **Tool Registration**: Registers tools with the AI agent system
- **Execution Context**: Provides access to Node-RED runtime and message context

## Key Types and Interfaces

### Tool Definition
```javascript
{
  name: "string",                        // Tool identifier (unique)
  description: "string",                 // Tool description for AI
  parameters: {
    type: "object",
    properties: {
      parameter1: {
        type: "string | number | boolean | object | array",
        description: "string",
        required: "boolean"
      }
    }
  },
  function: "function(input, context, node) { /* JavaScript code */ }"
}
```

### Execution Context
```javascript
{
  input: "object",                       // Parameters provided by AI
  context: "object",                     // Node-RED context (flow, global)
  node: "object",                        // Node-RED node instance
  RED: "object",                         // Node-RED runtime object
  util: "object"                         // Node-RED utilities
}
```

### Function Return Value
```javascript
{
  success: "boolean",                    // Execution success status
  result: "any",                         // Function result or error message
  metadata: "object"                     // Optional metadata
}
```

## Dependencies and Relationships

### Required Dependencies
- **Node-RED Runtime**: Version 1.0.0 or higher
- **AI Agent Node**: Consumes the tool definition
- **JavaScript Engine**: V8 or compatible JavaScript runtime

### Integration Points
- **AI Agent Node**: Tool registration and execution
- **Node-RED Context**: Access to flow and global variables
- **Node-RED Utilities**: Helper functions for common operations

## Configuration Options

### Basic Configuration
- **Name**: Display name for the node
- **Tool Name**: Unique identifier used by AI to call the tool
- **Description**: Human-readable description of tool functionality

### Function Configuration
- **Function Editor**: ACE editor for JavaScript code
- **Parameter Schema**: JSON schema for input validation
- **Test Function**: Built-in testing capability

### Advanced Options
- **Timeout**: Maximum execution time (default: 30 seconds)
- **Error Handling**: Custom error handling behavior
- **Logging**: Debug logging options

## Usage Examples

### Simple Calculator Tool
```javascript
function(input, context, node) {
  const { operation, a, b } = input;
  
  try {
    let result;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        result = b !== 0 ? a / b : 'Division by zero';
        break;
      default:
        return { success: false, result: 'Unknown operation' };
    }
    
    return { success: true, result };
  } catch (error) {
    return { success: false, result: error.message };
  }
}
```

### Date/Time Utility Tool
```javascript
function(input, context, node) {
  const { operation, date, format } = input;
  
  try {
    const targetDate = date ? new Date(date) : new Date();
    
    switch (operation) {
      case 'format':
        return { success: true, result: targetDate.toLocaleDateString() };
      case 'timestamp':
        return { success: true, result: targetDate.getTime() };
      case 'addDays':
        const days = input.days || 0;
        targetDate.setDate(targetDate.getDate() + days);
        return { success: true, result: targetDate.toISOString() };
      default:
        return { success: false, result: 'Unknown operation' };
    }
  } catch (error) {
    return { success: false, result: error.message };
  }
}
```

### Context Access Tool
```javascript
function(input, context, node) {
  const { operation, key, value, scope } = input;
  
  try {
    switch (operation) {
      case 'get':
        const targetScope = scope === 'global' ? context.global : context.flow;
        const result = targetScope.get(key);
        return { success: true, result };
      
      case 'set':
        const setScope = scope === 'global' ? context.global : context.flow;
        setScope.set(key, value);
        return { success: true, result: `Set ${key} in ${scope} context` };
      
      case 'list':
        const listScope = scope === 'global' ? context.global : context.flow;
        const keys = Object.keys(listScope);
        return { success: true, result: keys };
      
      default:
        return { success: false, result: 'Unknown operation' };
    }
  } catch (error) {
    return { success: false, result: error.message };
  }
}
```

## Parameter Schema Definition

### Basic Schema
```json
{
  "type": "object",
  "properties": {
    "text": {
      "type": "string",
      "description": "Text to process",
      "required": true
    },
    "options": {
      "type": "object",
      "description": "Processing options",
      "properties": {
        "uppercase": {
          "type": "boolean",
          "description": "Convert to uppercase"
        },
        "reverse": {
          "type": "boolean",
          "description": "Reverse the text"
        }
      }
    }
  }
}
```

### Complex Schema
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "object",
      "description": "Database query parameters",
      "properties": {
        "table": {
          "type": "string",
          "description": "Table name",
          "required": true
        },
        "filters": {
          "type": "array",
          "description": "Filter conditions",
          "items": {
            "type": "object",
            "properties": {
              "field": { "type": "string" },
              "operator": { "type": "string", "enum": ["=", ">", "<", "like"] },
              "value": {}
            }
          }
        },
        "limit": {
          "type": "number",
          "description": "Maximum results",
          "minimum": 1,
          "maximum": 1000
        }
      }
    }
  }
}
```

## Error Handling

### Best Practices
```javascript
function(input, context, node) {
  try {
    // Validate input
    if (!input.requiredParam) {
      return { 
        success: false, 
        result: 'Missing required parameter: requiredParam' 
      };
    }
    
    // Perform operation
    const result = performOperation(input);
    
    // Validate result
    if (result === null || result === undefined) {
      return { 
        success: false, 
        result: 'Operation returned invalid result' 
      };
    }
    
    return { success: true, result };
    
  } catch (error) {
    // Log error for debugging
    node.error(`Tool function error: ${error.message}`, error);
    
    return { 
      success: false, 
      result: `Error: ${error.message}` 
    };
  }
}
```

### Error Types
- **Validation Errors**: Invalid input parameters
- **Runtime Errors**: JavaScript execution errors
- **Timeout Errors**: Function execution exceeded time limit
- **Permission Errors**: Insufficient permissions for operations

## Security Considerations

### Input Validation
```javascript
function(input, context, node) {
  // Sanitize string inputs
  if (typeof input.text === 'string') {
    input.text = input.text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  // Validate numeric ranges
  if (input.number && (input.number < 0 || input.number > 100)) {
    return { success: false, result: 'Number out of range (0-100)' };
  }
  
  // Continue with processing...
}
```

### Access Control
```javascript
function(input, context, node) {
  // Check user permissions
  const userPermissions = context.get('userPermissions') || [];
  if (input.requiresAdmin && !userPermissions.includes('admin')) {
    return { success: false, result: 'Insufficient permissions' };
  }
  
  // Continue with operation...
}
```

### Code Injection Prevention
- **Avoid eval()**: Never use eval() with user input
- **Safe Parsing**: Use JSON.parse() for object parsing
- **Input Sanitization**: Clean all user inputs
- **Limited Scope**: Restrict access to Node-RED internals

## Performance Optimization

### Efficient Operations
```javascript
function(input, context, node) {
  // Use efficient data structures
  const cache = context.get('toolCache') || {};
  const cacheKey = JSON.stringify(input);
  
  // Check cache first
  if (cache[cacheKey]) {
    return { success: true, result: cache[cacheKey] };
  }
  
  // Perform expensive operation
  const result = expensiveOperation(input);
  
  // Cache result
  cache[cacheKey] = result;
  context.set('toolCache', cache);
  
  return { success: true, result };
}
```

### Memory Management
- **Avoid Memory Leaks**: Clean up resources properly
- **Limit Data Size**: Restrict input and output sizes
- **Use Streams**: For large data processing
- **Cache Wisely**: Implement appropriate caching strategies

## Testing and Debugging

### Built-in Testing
```javascript
// Test function in the editor
function test() {
  const testInput = { text: "Hello World", operation: "uppercase" };
  const testContext = { flow: { get: () => {}, set: () => {} } };
  const testNode = { error: () => {} };
  
  return yourFunction(testInput, testContext, testNode);
}
```

### Debug Logging
```javascript
function(input, context, node) {
  // Debug logging
  node.log(`Processing input: ${JSON.stringify(input)}`);
  
  // Processing logic...
  
  node.log(`Returning result: ${JSON.stringify(result)}`);
  return result;
}
```

## Common Patterns

### Data Transformation
```javascript
function(input, context, node) {
  const { data, transform } = input;
  
  switch (transform) {
    case 'csv-to-json':
      return { success: true, result: parseCSV(data) };
    case 'json-to-csv':
      return { success: true, result: convertToCSV(data) };
    case 'filter':
      return { success: true, result: filterData(data, input.criteria) };
    default:
      return { success: false, result: 'Unknown transform' };
  }
}
```

### External API Integration
```javascript
function(input, context, node) {
  const axios = require('axios');
  
  return axios.get(input.url, { params: input.params })
    .then(response => ({ success: true, result: response.data }))
    .catch(error => ({ success: false, result: error.message }));
}
```

### File Operations
```javascript
function(input, context, node) {
  const fs = require('fs').promises;
  
  switch (input.operation) {
    case 'read':
      return fs.readFile(input.path, 'utf8')
        .then(content => ({ success: true, result: content }))
        .catch(error => ({ success: false, result: error.message }));
    
    case 'write':
      return fs.writeFile(input.path, input.content)
        .then(() => ({ success: true, result: 'File written successfully' }))
        .catch(error => ({ success: false, result: error.message }));
    
    default:
      return { success: false, result: 'Unknown operation' };
  }
}
```

## See Also

- [AI Tool HTTP Module](ai-tool-http.md) - HTTP-based tools
- [AI Tool Approval Module](ai-tool-approval.md) - Human-in-the-loop tools
- [AI Agent Module](ai-agent.md) - Tool usage and execution
- [Development Guide](../development.md) - Custom tool development
