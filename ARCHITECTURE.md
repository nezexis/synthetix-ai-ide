# Synthetix AI IDE — Architecture & Technical Specifications

## 1. System Overview

Synthetix AI IDE is built on a modular client-server architecture:
```
┌────────────────────────────────────────────────────────┐
│                    Browser Client                      │
│  ┌───────────────┐ ┌───────────────┐ ┌──────────────┐  │
│  │ Monaco Editor │ │ xterm Terminal│ │  AI Chat &   │  │
│  │   + Ghost Tab │ │   (WebSocket) │ │ Multi-Agent  │  │
│  └───────────────┘ └───────────────┘ └──────────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │             State Engine (IdeContext)            │  │
│  └──────────────────────────────────────────────────┘  │
└───────────────────────────▲────────────────────────────┘
                            │ HTTP & WebSockets
┌───────────────────────────▼────────────────────────────┐
│                  Node.js Express Server                │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────┐  │
│  │ Filesystem API  │ │ Terminal PTY    │ │ Git CLI  │  │
│  └─────────────────┘ └─────────────────┘ └──────────┘  │
│  ┌─────────────────┐ ┌─────────────────┐ ┌──────────┐  │
│  │  Agent Engine   │ │ AI Providers    │ │ Indexer  │  │
│  │  (Multi-Turn)   │ │ (Gemini/OpenAI) │ │ (Symbols)│  │
│  └─────────────────┘ └─────────────────┘ └──────────┘  │
│  ┌──────────────────────────────────────────────────┐  │
│  │    Persistent Storage Engine (.synthetix-data/)  │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

## 2. Core Subsystems

### 2.1 File System Layer (`server/fs.ts`)
- Operates directly on the host operating system with asynchronous `fs.promises`.
- Automatically excludes build artifacts, binary blobs, and version control directories from scans (`node_modules`, `.git`, `.synthetix-data`, `dist`).
- Provides deep text search and regex search with line-by-line offset coordinates for editor positioning.

### 2.2 Terminal Subsystem (`server/terminal.ts`)
- Spawns real interactive shells via Node.js `child_process.spawn`.
- Communicates bidirectional character streams via WebSockets (`ws`).
- Supports session creation, persistent session binding, output ring buffering (2000 lines), process termination (`SIGTERM`), and timeout safeguards.

### 2.3 Git Subsystem (`server/git.ts`)
- Wraps standard `git` CLI commands without external binary dependencies.
- Handles status parsing (staged vs unstaged vs untracked), unified diff generation, commit creation, branch management, and log tracking.

### 2.4 Codebase Symbol Indexer (`server/codebaseIndexer.ts`)
- Scans source code files (`.ts`, `.js`, `.py`, `.rs`, `.go`, `.java`) and indexes exported symbols, functions, classes, interfaces, and types.
- Maintains in-memory cache keyed by file path and modified time (`mtimeMs`).
- Enables sub-millisecond `@symbol` lookups and contextual injection.

### 2.5 Multi-Provider AI Layer (`server/ai.ts`)
- Implements the `@google/genai` TypeScript SDK server-side with telemetry headers (`User-Agent: aistudio-build`).
- Manages streaming responses using Server-Sent Events (SSE).
- Provides fallback adapters for OpenAI-compatible endpoints and local models (such as Ollama).
- Implements dedicated zero-shot inline code replacement and real-time ghost text autocomplete.

### 2.6 Autonomous Agent Engine (`server/agent.ts`)
- Multi-turn tool loop implementing:
  `USER REQUEST -> EXPLORE -> PLAN -> TOOL EXECUTION -> VERIFY -> OUTPUT`
- Pre-task checkpoints: files are snapshotted prior to automated modifications.
- Supports runtime interruption and cancellation.
- Injects persistent Project Rules (`rules.json`) and Architectural Memory (`memory.json`) directly into the agent system instructions.
