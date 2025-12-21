---
path: README.md
page-type: overview
summary: High-level introduction to the Node-RED AI Agent project.
tags: [overview, introduction, getting-started]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# Node-RED AI Agent

A powerful AI Agent for Node-RED that enables natural language processing with memory and tool integration. This package provides nodes for creating AI-powered flows with conversation context management and extensible tool integration.

## Overview

The Node-RED AI Agent is a comprehensive solution for integrating AI capabilities into Node-RED flows. It provides:

- **AI Agent Node**: Process messages with AI, maintaining conversation context
- **Memory Nodes**: Store conversation context in memory (volatile) or persist to disk
- **AI Model Node**: Configure AI models and API settings
- **AI Orchestrator Node**: Coordinate multiple agents and create autonomous plans
- **Tool Integration**: Extend functionality with custom tools
- **Stateless Design**: Memory nodes are stateless, making them more reliable and scalable

## Key Features

- Natural language processing with configurable AI models
- Conversation context management with automatic retention
- Extensible tool system for custom functionality
- Support for both in-memory and file-based memory storage
- Multi-agent orchestration with autonomous planning
- Human-in-the-loop approval workflows
- Template variable support for dynamic content

## Quick Start

1. Install the package via the Node-RED palette manager
2. Add an AI Model node to configure your OpenRouter API key and model
3. Add a Memory node (In-Memory or File-based) to manage conversation context
4. Add AI Tool nodes to define custom functions or HTTP requests
5. Connect to an AI Agent node to process messages

## Architecture

The system follows a modular architecture with separate concerns:

- **Agent**: Core AI processing logic
- **Model**: AI model configuration and API management
- **Memory**: Conversation context storage and retrieval
- **Tools**: Extensible functionality for AI agents
- **Orchestrator**: Multi-agent coordination and planning

## See Also

- [Getting Started](getting_started.md) - Detailed installation and setup guide
- [Architecture](architecture.md) - System architecture and design patterns
- [API Reference](api_reference.md) - Complete API documentation
- [Module Documentation](modules/) - Detailed documentation for each node type
