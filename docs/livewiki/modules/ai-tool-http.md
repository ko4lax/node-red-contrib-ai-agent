---
path: modules/ai-tool-http.md
page-type: module
summary: Documentation for the AI Tool HTTP node - HTTP request tools for external API integration.
tags: [tool, http, api, external, integration]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# AI Tool HTTP Module

The AI Tool HTTP node enables AI agents to make HTTP requests to external APIs, allowing integration with web services, databases, and other external systems.

## Purpose and Responsibilities

The Tool HTTP node serves as a tool definition node that:

- **HTTP Client**: Makes HTTP requests to external endpoints
- **Template Processing**: Processes template variables in URLs, headers, and body
- **Response Handling**: Processes and formats HTTP responses for AI consumption
- **Error Management**: Handles HTTP errors and network issues gracefully

## Key Types and Interfaces

### Tool Definition
```javascript
{
  name: "string",                        // Tool identifier (unique)
  description: "string",                 // Tool description for AI
  method: "GET | POST | PUT | DELETE | PATCH",
  url: "string",                        // URL with template variables
  headers: "object",                     // HTTP headers (template supported)
  body: "string | object",               // Request body (template supported)
  timeout: "number",                    // Request timeout in milliseconds
  responseType: "json | text | buffer"  // Expected response format
}
```

### Template Variables
```javascript
// Input object provided by AI
{
  userId: "12345",
  action: "getProfile",
  filters: {
    active: true,
    limit: 10
  }
}

// URL template: https://api.example.com/users/${input.userId}/profile
// Resolves to: https://api.example.com/users/12345/profile
```

### Response Structure
```javascript
{
  success: "boolean",                    // Request success status
  status: "number",                      // HTTP status code
  headers: "object",                     // Response headers
  data: "any",                          // Response body (parsed according to responseType)
  error: "string"                       // Error message if failed
}
```

## Dependencies and Relationships

### Required Dependencies
- **Node-RED Runtime**: Version 1.0.0 or higher
- **HTTP Client**: Axios library (included as dependency)
- **AI Agent Node**: Consumes the tool definition

### Integration Points
- **AI Agent Node**: Tool registration and execution
- **External APIs**: Any HTTP/HTTPS endpoint
- **Authentication Systems**: Various auth methods supported

## Configuration Options

### Basic Configuration
- **Name**: Display name for the node
- **Tool Name**: Unique identifier used by AI to call the tool
- **Description**: Human-readable description of tool functionality
- **Method**: HTTP method (GET, POST, PUT, DELETE, PATCH)

### Request Configuration
- **URL**: Target endpoint with template variable support
- **Headers**: HTTP headers (JSON format, template supported)
- **Body**: Request body content (template supported)

### Advanced Options
- **Timeout**: Request timeout in milliseconds (default: 30000)
- **Response Type**: Expected response format (json, text, buffer)
- **Follow Redirects**: Whether to follow HTTP redirects (default: true)

## Usage Examples

### Simple GET Request
```javascript
// Configuration
{
  name: "Get User Profile",
  toolName: "getUserProfile",
  description: "Retrieve user profile information",
  method: "GET",
  url: "https://api.example.com/users/${input.userId}",
  headers: {
    "Authorization": "Bearer ${input.token}",
    "Content-Type": "application/json"
  }
}

// AI Input
{
  userId: "12345",
  token: "eyJhbGciOiJIUzI1NiIs..."
}

// Resulting Request
GET https://api.example.com/users/12345
Headers: {
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIs...",
  "Content-Type": "application/json"
}
```

### POST Request with Body
```javascript
// Configuration
{
  name: "Create User",
  toolName: "createUser",
  description: "Create a new user account",
  method: "POST",
  url: "https://api.example.com/users",
  headers: {
    "Authorization": "Bearer ${input.token}",
    "Content-Type": "application/json"
  },
  body: {
    "name": "${input.name}",
    "email": "${input.email}",
    "role": "${input.role || 'user'}"
  }
}

// AI Input
{
  token: "eyJhbGciOiJIUzI1NiIs...",
  name: "John Doe",
  email: "john@example.com",
  role: "admin"
}

// Resulting Request Body
{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin"
}
```

### Complex API Integration
```javascript
// Configuration
{
  name: "Search Products",
  toolName: "searchProducts",
  description: "Search products with filters and pagination",
  method: "GET",
  url: "https://api.shop.com/products",
  headers: {
    "X-API-Key": "${input.apiKey}",
    "Accept": "application/json"
  },
  timeout: 15000
}

// AI Input
{
  apiKey: "prod-key-123",
  query: "laptop",
  category: "electronics",
  minPrice: 500,
  maxPrice: 2000,
  page: 1,
  limit: 20
}

// Resulting URL with Query Parameters
GET https://api.shop.com/products?query=laptop&category=electronics&minPrice=500&maxPrice=2000&page=1&limit=20
```

## Template Variable Processing

### Basic Variable Substitution
```javascript
// Template: https://api.example.com/users/${input.userId}
// Input: { userId: "123" }
// Result: https://api.example.com/users/123
```

### Object Property Access
```javascript
// Template: https://api.example.com/users/${input.user.id}
// Input: { user: { id: "123", name: "John" } }
// Result: https://api.example.com/users/123
```

### Array Access
```javascript
// Template: https://api.example.com/items/${input.items[0].id}
// Input: { items: [{ id: "abc", name: "Item 1" }] }
// Result: https://api.example.com/items/abc
```

### Conditional Values
```javascript
// Template: ${input.active ? 'active' : 'inactive'}
// Input: { active: true }
// Result: "active"
```

### Complex Expressions
```javascript
// Template: https://api.example.com/data?date=${new Date().toISOString()}
// Result: https://api.example.com/data?date=2025-12-21T10:30:00.000Z
```

## Authentication Methods

### Bearer Token
```javascript
headers: {
  "Authorization": "Bearer ${input.token}"
}
```

### API Key
```javascript
headers: {
  "X-API-Key": "${input.apiKey}"
}
```

### Basic Auth
```javascript
// Note: Basic auth should be handled carefully with credentials
headers: {
  "Authorization": "Basic ${Buffer.from(input.username + ':' + input.password).toString('base64')}"
}
```

### Custom Headers
```javascript
headers: {
  "X-Custom-Auth": "${input.customAuthHeader}",
  "X-Request-ID": "${input.requestId || 'auto-generated'}"
}
```

## Response Handling

### JSON Response
```javascript
// Configuration: responseType: "json"
// Response: { "user": { "id": "123", "name": "John" } }
// Tool Output: { success: true, data: { "user": { "id": "123", "name": "John" } } }
```

### Text Response
```javascript
// Configuration: responseType: "text"
// Response: "User created successfully"
// Tool Output: { success: true, data: "User created successfully" }
```

### Error Response
```javascript
// HTTP Status: 404
// Response: { "error": "User not found" }
// Tool Output: { success: false, status: 404, error: "User not found" }
```

## Error Handling

### HTTP Errors
- **4xx Errors**: Client errors (bad request, unauthorized, not found)
- **5xx Errors**: Server errors (internal server error, service unavailable)
- **Network Errors**: Connection timeouts, DNS resolution failures

### Error Response Format
```javascript
{
  success: false,
  status: 404,
  error: "Not Found",
  data: {
    message: "User not found",
    code: "USER_NOT_FOUND"
  }
}
```

### Retry Strategies
```javascript
// Implement retry logic in AI agent responses
if (response.status === 429) {
  // Rate limited - retry after delay
  return { shouldRetry: true, delay: 60000 };
}
```

## Security Considerations

### Credential Management
- **Use Node-RED Credentials**: Store API keys securely
- **Environment Variables**: Use for sensitive configuration
- **Template Exposure**: Be careful with sensitive data in templates

### Input Validation
```javascript
// Validate URLs to prevent SSRF attacks
const allowedDomains = ['api.example.com', 'api.trusted.com'];
if (!allowedDomains.includes(new URL(url).hostname)) {
  throw new Error('Domain not allowed');
}
```

### HTTPS Enforcement
- **Prefer HTTPS**: Always use HTTPS endpoints when available
- **Certificate Validation**: Ensure proper SSL certificate validation
- **Timeout Configuration**: Set appropriate timeouts to prevent hanging

## Performance Optimization

### Connection Pooling
- **Reuse Connections**: Axios handles connection pooling automatically
- **Keep-Alive**: Enable HTTP keep-alive for better performance
- **Timeout Management**: Set appropriate timeouts for different endpoints

### Caching Strategies
```javascript
// Implement caching in AI agent logic
const cacheKey = `http_${url}_${JSON.stringify(params)}`;
if (cache.has(cacheKey)) {
  return cache.get(cacheKey);
}
```

### Batch Operations
```javascript
// Use bulk endpoints when available
// Instead of multiple GET requests, use a single POST with array
```

## Common Patterns

### REST API Integration
```javascript
// Standard CRUD operations
{
  "GET /users": "list users",
  "GET /users/{id}": "get user",
  "POST /users": "create user",
  "PUT /users/{id}": "update user",
  "DELETE /users/{id}": "delete user"
}
```

### Webhook Integration
```javascript
// Send data to external webhooks
{
  method: "POST",
  url: "https://hooks.slack.com/services/${input.webhookId}",
  body: {
    "text": "${input.message}",
    "channel": "${input.channel}"
  }
}
```

### Data Synchronization
```javascript
// Sync data between systems
{
  method: "POST",
  url: "https://api.target.com/sync",
  headers: { "X-Sync-Token": "${input.syncToken}" },
  body: "${input.records}"
}
```

## Testing and Debugging

### Manual Testing
```javascript
// Test with curl equivalent
curl -X GET "https://api.example.com/users/123" \
  -H "Authorization: Bearer token123" \
  -H "Content-Type: application/json"
```

### Debug Logging
```javascript
// Enable debug mode to see request details
{
  debug: true,
  logRequest: true,
  logResponse: true
}
```

### Error Analysis
```javascript
// Analyze failed requests
{
  success: false,
  error: "Request failed",
  details: {
    url: "https://api.example.com/users/123",
    method: "GET",
    status: 404,
    responseTime: 1500
  }
}
```

## See Also

- [AI Tool Function Module](ai-tool-function.md) - JavaScript-based tools
- [AI Tool Approval Module](ai-tool-approval.md) - Human-in-the-loop tools
- [AI Agent Module](ai-agent.md) - Tool usage and execution
- [Configuration Guide](../configuration.md) - HTTP configuration
