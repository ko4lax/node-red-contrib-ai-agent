---
path: llm-context.md
page-type: reference
summary: Machine-readable context for the Node-RED AI Agent repo covering nodes, data contracts, files, and integration patterns.
tags: [llm, context, reference, ai-agent, node-red]
created: 2025-12-21
updated: 2025-12-21
version: 1.0.0
---

# LLM Context

This document captures the essential repository knowledge an LLM needs to reason about the **node-red-contrib-ai-agent** project. It focuses on node catalogs, message contracts, file layout, and patterns shared across modules.

## Repository Snapshot

- **Package**: `node-red-contrib-ai-agent@0.5.2`
- **Runtime**: Node-RED `>= 1.0.0`, Node.js `>= 14`
- **Primary dependency**: `axios` for HTTP + OpenRouter calls
- **Dev toolchain**: `mocha` tests, `eslint`, `prettier`, `sinon`, `proxyquire`, `node-red-node-test-helper`
- **Scripts**: `npm test`, `npm run update-models` (Python helper under `scripts/update_models.py`)

## Node Catalog (from `package.json`)

| Node Type | File | Purpose |
|-----------|------|---------|
| `ai-agent` | `agent/ai-agent.js` | Core conversational agent with tool + memory integration |
| `ai-model` | `model/ai-model.js` | Injects API keys/model configuration into `msg.aiagent` |
| `ai-tool` | `tool/ai-tool.js` | Base helper for registering generic tools |
| `ai-tool-function` | `tool-function/ai-tool-function.js` | Adds custom JS function tools (ACE editor UI) |
| `ai-tool-http` | `tool-http/ai-tool-http.js` | Adds HTTP invocation tools with templated URL/headers/body |
| `ai-tool-approval` | `tool-approval/ai-tool-approval.js` | Human-in-the-loop pause/resume tool |
| `ai-memory-file` | `memory-file/memory-file.js` | File-based context storage with backups |
| `ai-memory-inmem` | `memory-inmem/memory-inmem.js` | Volatile, in-process context store |
| `ai-orchestrator` | `orchestrator/orchestrator.js` | Multi-agent planner/reflector with zero-wire execution |
| `ai-orchestrator-agent` | `orchestrator-agent/orchestrator-agent.js` | Discovery node that tags `msg.agents` and exposes `executeTask()` |

## Message Contracts & Shared Objects

- `msg.payload`: user goal or intermediate result (string/object)
- `msg.aiagent`: injected by AI Model node; includes `{ model, apiKey, temperature, maxTokens, tools? }`
- `msg.aimemory`: optional memory context with rolling `context[]`, `maxItems`, conversation metadata
- `msg.aiagent.tools[]`: tool definitions following OpenAI/OpenRouter schema (`type`, `function`, `parameters`)
- `msg.agents[]`: manifest built by AI Orchestrator Agent nodes; each entry `{ id, name, capabilities[], type }`
- `msg.orchestration`: orchestrator state (`planId`, `goal`, `iterations`, `plan.tasks[]`, `history[]`, `status`)

## Flow Patterns

1. **Standard Conversation**  
   `[Input] → ai-model → (memory) → (tool nodes) → ai-agent → Output`
2. **Human Approval**  
   Tool nodes can emit on secondary outputs while returning Promises to the agent.
3. **Chain Discovery / Zero-Wire**  
   `[Inject Goal] → ai-model → ai-orchestrator-agent (Coder) → ai-orchestrator-agent (Reviewer) → ai-orchestrator → Output`  
   - `msg.agents` accumulates capability manifests.  
   - `ai-orchestrator` plans tasks restricted to discovered capabilities, calls `executeTask()` directly (no wiring) and reflects after each result.

## Key Files & Directories

- `agent/ai-agent.js`: Prepares prompts (system + memory + user), handles OpenRouter responses, invokes tools, updates memory.
- `model/ai-model.js`: Configuration node storing API credentials via Node-RED credential store.
- `memory-file/` & `memory-inmem/`: Configuration nodes describing storage behavior; actual state lives in runtime JSON (e.g., `ai-memories.json`).
- `tool-function/ai-tool-function.js` & `.html`: ACE editor integration for authoring JS snippets, including resize + lifecycle hooks.
- `tool-http/ai-tool-http.js`: Processes `${input.*}` template variables across URL/headers/body before executing via `axios`.
- `orchestrator/orchestrator.js`: Core logic for planning (`createInitialPlan`), selecting eligible tasks by dependency/priority, executing agents, and reflecting via OpenRouter prompts with `response_format: json_object`.
- `orchestrator-agent/orchestrator-agent.js`: Validates AI config, prepares prompts similar to `ai-agent`, formats tools, and ensures `msg.agents` always exists.
- `docs/livewiki/`: Docsify-ready knowledge base; `overview.md`, `architecture.md`, `data_flow.md`, and module guides mirror README content. This `llm-context.md` must stay in sync with major architectural shifts.
- `test/`: Mocha specs (e.g., `ai-agent_spec.js`, `ai-model_spec.js`, `ai-tool-function_spec.js`, `chain_discovery_spec.js`, `orchestrator_spec.js`, `ai-tool-approval_spec.js`) exercising node behavior with `node-red-node-test-helper` and stubbed `axios`.
- `scripts/update_models.py`: Utility for syncing model metadata (external dependency on Python environment).

## External Integrations

- **OpenRouter API** (`https://openrouter.ai/api/v1/chat/completions`):  
  - Always called with `axios.post`.  
  - Headers include `Authorization: Bearer <apiKey>`, `Content-Type: application/json`, plus referer/title metadata.  
  - Orchestrator enforces `response_format: { type: 'json_object' }` to parse plans/reflections.  
  - Tool-enabled nodes set `tool_choice: 'auto'` and recursively process tool calls.

## Testing & Quality Gates

- Run `npm test` (Mocha).  
- Specs rely on `sinon` for stubs and `proxyquire` to mock OpenRouter responses.  
- Chain Discovery tests (`test/chain_discovery_spec.js`, `test/orchestrator_spec.js`) ensure orchestrator-agent registrations, dependency handling, priority ordering, and error recovery logic remain stable.

## Implementation Notes & Conventions

- **Stateless configs**: Node-RED configuration nodes (model, memory) do not persist runtime state; state lives in messages or external files.
- **Template Variables**: HTTP tools and other user-facing editors adopt `${input.foo}` syntax, resolved against AI-provided tool arguments.
- **Error Surfaces**: Orchestrator strips the `"AI API Error: "` prefix from agent errors to match tests; orchestrator-agent exposes friendly validation messages for missing `msg.aiagent` data.
- **Versioning**: Docs follow semantic version increments in frontmatter (`version:`) with `created`/`updated` fields using `YYYY-MM-DD`.

## Quick Reference Checklists

- **Adding a new node**: register in `package.json` `node-red.nodes`, add entry to docs (`docs/livewiki/modules/` + `_sidebar.md` + `table_of_contents.md`), and supply tests.
- **Updating documentation**: if `overview.md` changes, mirror content into `docs/livewiki/README.md`. Update `llm-context.md` whenever architecture, file layout, or message contracts change.
- **Chain Discovery**: always ensure orchestrator-agent nodes push `{ id, name, capabilities }` into `msg.agents` before handing off to orchestrator. Capabilities comparisons are case-insensitive.

Keep this page aligned with code-level reality so LLMs consuming the live wiki have an authoritative, compact reference.
