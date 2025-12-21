---
path: modules/ai-memory-file.md
page-type: module
summary: Documentation for the AI Memory (File) node - persistent conversation context storage with advanced features.
tags: [memory, file, persistent, backup, vector]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# AI Memory (File) Module

The AI Memory (File) node provides persistent storage for conversation context with advanced features including backup, consolidation, and vector-based long-term memory.

## Purpose and Responsibilities

The File Memory node serves as a configuration node that:

- **Persistent Storage**: Maintains conversation history across Node-RED restarts
- **Backup Management**: Automatically creates and manages backup files
- **Memory Consolidation**: Summarizes old conversations to save space
- **Vector Storage**: Enables semantic search with embedding-based storage
- **Stateless Design**: Provides configuration that can be instantiated by agent nodes

## Key Types and Interfaces

### Memory Configuration
```javascript
{
  name: "string",                        // Display name
  filename: "string",                   // Storage file path
  maxConversations: "number",            // Maximum conversations to store
  maxMessagesPerConversation: "number", // Messages per conversation limit
  backups: "boolean",                    // Enable backup system
  backupCount: "number",                 // Number of backups to keep
  consolidation: "number",              // Messages before auto-consolidation
  longTermMemory: "boolean",             // Enable vector storage
  embeddingModel: "string",              // Model for embeddings
  type: "file"                           // Memory type identifier
}
```

### Storage Structure
```javascript
{
  conversations: {
    "conversationId": {
      id: "string",
      messages: "Array<Message>",
      summary: "string",
      metadata: "object",
      createdAt: "number",
      updatedAt: "number"
    }
  },
  longTermMemory: {
    embeddings: [
      {
        id: "string",
        text: "string",
        embedding: "Array<number>",
        metadata: "object"
      }
    ]
  },
  metadata: {
    version: "string",
    createdAt: "number",
    lastBackup: "number"
  }
}
```

## Dependencies and Relationships

### Required Dependencies
- **Node-RED Runtime**: Version 1.0.0 or higher
- **File System Access**: Read/write permissions for storage location
- **AI Agent Node**: Uses this memory configuration

### Optional Dependencies
- **Embedding Service**: For vector storage functionality
- **AI Model**: For conversation summarization

## Configuration Options

### Basic Configuration
- **Name**: Display name for the configuration node
- **Filename**: Path to storage file (relative to Node-RED user directory)

### Conversation Management
- **Max Conversations**: Maximum conversations to store (default: 100)
- **Max Messages Per Conversation**: Messages per conversation limit (default: 50)

### Backup System
- **Enable Backups**: Toggle automatic backup creation
- **Backup Count**: Number of backup files to retain (default: 5)

### Advanced Features
- **Consolidation Threshold**: Messages before auto-summarization (default: 30)
- **Long-Term Memory**: Enable vector-based semantic storage
- **Embedding Model**: Model for generating embeddings (e.g., "text-embedding-ada-002")

## Usage Examples

### Basic Persistent Memory
```javascript
const basicConfig = {
  name: "Persistent Memory",
  filename: "conversations.json",
  maxConversations: 50,
  maxMessagesPerConversation: 25
};
```

### Production Configuration with Backups
```javascript
const productionConfig = {
  name: "Production Memory",
  filename: "conversations.json",
  maxConversations: 200,
  maxMessagesPerConversation: 100,
  backups: true,
  backupCount: 10,
  consolidation: 50
};
```

### Advanced Configuration with Vector Storage
```javascript
const advancedConfig = {
  name: "Advanced Memory",
  filename: "conversations.json",
  maxConversations: 500,
  maxMessagesPerConversation: 200,
  backups: true,
  backupCount: 20,
  consolidation: 40,
  longTermMemory: true,
  embeddingModel: "text-embedding-ada-002"
};
```

## Memory Commands

### Supported Commands via `msg.command`

#### Basic Operations
```javascript
// Add message
msg.command = "add";
msg.conversationId = "user123";
msg.message = { role: "user", content: "Hello", timestamp: Date.now() };

// Get conversation
msg.command = "get";
msg.conversationId = "user123";
```

#### Search Operations
```javascript
// Text search
msg.command = "search";
msg.query = "weather forecast";

// Semantic search (requires long-term memory)
msg.command = "query";
msg.query = "discussions about weather";
```

#### Maintenance Operations
```javascript
// Manual consolidation
msg.command = "consolidate";
msg.conversationId = "user123";

// Clear operations
msg.command = "clear";
msg.scope = "shortterm | longterm | all";

// Delete conversation
msg.command = "delete";
msg.conversationId = "user123";
```

## File Management

### Storage Location
- **Default**: Node-RED user directory
- **Custom**: Relative or absolute paths supported
- **Permissions**: Ensure read/write access to storage location

### Backup Strategy
- **Automatic**: Created before major operations
- **Rotation**: Oldest backups deleted when limit exceeded
- **Format**: `.bak.N` extension (e.g., `conversations.json.bak.1`)

### File Format
- **JSON**: Human-readable format for easy inspection
- **Versioned**: Includes format version for compatibility
- **Compressed**: Optional compression for large files

## Vector Storage (Long-Term Memory)

### Embedding Generation
```javascript
// Automatic embedding during consolidation
const consolidationResult = {
  summary: "User discussed weather patterns",
  embedding: [0.1, 0.2, 0.3, ...], // Generated by embedding model
  metadata: { type: "consolidation", timestamp: Date.now() }
};
```

### Semantic Search
```javascript
// Query by text
msg.command = "query";
msg.query = "weather discussions";

// Query by embedding
msg.command = "query";
msg.query = [0.1, 0.2, 0.3, ...]; // Pre-computed embedding
```

### Vector Operations
- **Similarity Search**: Find semantically similar content
- **Threshold Filtering**: Only return results above similarity threshold
- **Metadata Filtering**: Filter by content type or date range

## Performance Considerations

### File I/O Performance
- **Batch Operations**: Group multiple operations when possible
- **Async Operations**: Non-blocking file operations
- **Caching**: In-memory cache for frequently accessed conversations

### Memory Usage
- **Consolidation**: Reduces memory usage by summarizing old conversations
- **Vector Storage**: Additional memory for embeddings
- **Cleanup**: Automatic removal of old conversations and embeddings

### Scalability
- **File Size**: Monitor file size for very large datasets
- **Indexing**: Consider database for large-scale deployments
- **Partitioning**: Split storage by date or user for very large systems

## Error Handling

### File System Errors
- **Permission Denied**: Check file system permissions
- **Disk Full**: Monitor available disk space
- **File Corruption**: Use backup files for recovery

### Data Integrity
- **Validation**: JSON schema validation on load
- **Checksums**: Optional data integrity verification
- **Recovery**: Automatic fallback to backup files

## Security Considerations

### Data Protection
- **File Permissions**: Restrict access to memory files
- **Encryption**: Consider encrypting sensitive conversation data
- **Backup Security**: Secure backup file locations

### Privacy Compliance
- **Data Retention**: Implement appropriate retention policies
- **User Consent**: Ensure compliance with data protection regulations
- **Anonymization**: Consider anonymizing personal data

## Migration and Upgrade

### Version Migration
```javascript
// Migration script example
function migrateMemoryFormat(oldData, newVersion) {
  // Transform old format to new format
  return transformedData;
}
```

### Backup Restoration
```javascript
// Restore from backup
const fs = require('fs');
const backupData = JSON.parse(fs.readFileSync('conversations.json.bak.1'));
// Restore to main file
```

## See Also

- [AI Memory (In-Memory) Module](ai-memory-inmem.md) - Volatile memory option
- [AI Agent Module](ai-agent.md) - Memory usage
- [Configuration Guide](../configuration.md) - Memory configuration
- [Development Guide](../development.md) - Custom memory implementations
