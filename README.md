# Synthetix AI IDE — Autonomous AI Software Development Environment

Synthetix is a full-featured, professional AI Coding IDE engineered with zero mocks, real OS integration, and autonomous agent capabilities comparable to state-of-the-art tools like Cursor.

---

## 🚀 Key Practical Capabilities

1. **Autonomous AI Agent (`Agent` Mode)**:
   - Self-directed exploration of codebases.
   - Real tool execution: reading, writing, creating, patching, and deleting files.
   - Execution of real bash/terminal commands, automated tests (`npm test`), and linting.
   - Verification before concluding tasks: rerunning tests and inspecting output logs.
   - Step-by-step reasoning feed with live execution duration and diagnostics.

2. **Specialized AI Modes**:
   - **Agent**: Fully autonomous multi-turn development with tool execution.
   - **Ask**: Read-only codebase comprehension, explanation, and architectural Q&A.
   - **Plan**: Structured planning mode producing step-by-step implementation roadmaps with checkboxes before applying changes.
   - **Debug**: Dedicated error investigator that reproduces stack traces, identifies root causes, applies fixes, and verifies tests.

3. **Multi-Agent Swarm**:
   - Parallel specialized roles: **Full-Stack Engineer**, **Frontend Specialist**, **Backend & Systems Architect**, **QA Automation**, and **Security/Code Reviewer**.
   - Custom agent creation with tailored system prompts, models, and allowed tool permissions.

4. **Professional Code Editor**:
   - Built on Monaco Editor with real caret movements, line numbers, code folding, multi-cursor, bracket matching, and format-on-save.
   - **Real AI Ghost Text (Tab Autocomplete)**: Context-aware suggestions streamed from Gemini into Monaco inline completion provider.
   - **Inline AI Editor (Cmd+K / Ctrl+K)**: Select code, specify an edit instruction, preview changes, and accept/reject diffs.
   - **Side-by-Side Diff Viewer**: Compare pre-task and post-task file changes.

5. **Integrated OS Terminal**:
   - Real child process terminal powered by `xterm.js` and WebSocket streaming.
   - Multi-tab terminal management, shell selection (`bash`, `powershell`, `zsh`), stdin/stdout streaming, exit code tracking.
   - Seamless interaction between the developer and AI agents running commands.

6. **Full Codebase Context & Search**:
   - Text search and Regex search across all files with line numbers and jump-to-line navigation.
   - Real-time symbol indexer extracting functions, classes, interfaces, and types.
   - `@-references`: Explicit context injection (`@filename`, symbols, git diff, terminal logs).
   - Vision support: Attach screenshots and UI mockups for visual-to-code generation.

7. **Git Integration**:
   - Real git operations: branch switching, creating branches, staging (`+`), unstaging (`-`), discarding changes, committing, and viewing commit history logs.
   - Integrated visual diff for modified and staged files.

8. **Safety, Checkpoints & Rollbacks**:
   - Automatic pre-task checkpoints snapshotting files before agent execution.
   - One-click rollback restoring the exact workspace state.
   - Permission controls for potentially destructive commands.

9. **Project Rules & Architecture Memory**:
   - Persistent `.aide-rules` injected into agent system instructions.
   - Technical memory recording architectural decisions, tech stack constraints, and agreements.

---

## 🛠️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Monaco Editor (`@monaco-editor/react`), `xterm.js`, Lucide icons.
- **Backend**: Node.js, Express, WebSocket (`ws`), `@google/genai` TypeScript SDK, `child_process.spawn`.
- **AI Models**: Google Gemini 3.8 Flash, Gemini 3.1 Pro, with OpenAI/Ollama compatible provider layers.
- **Storage**: Persistent JSON storage (`.synthetix-data/`) for settings, chat threads, checkpoints, memory, and rules.

---

## ⌨️ Shortcuts Reference

| Shortcut | Action |
|---|---|
| `⌘P` / `Ctrl+P` | Quick File Open |
| `⌘⇧P` / `Ctrl+Shift+P` | Command Palette |
| `⌘K` / `Ctrl+K` | Inline AI Code Assistant |
| `Tab` | Accept AI Autocomplete suggestion |
| `⌘S` / `Ctrl+S` | Save Active File |
| `⌘B` / `Ctrl+B` | Toggle Sidebar |
| `Ctrl+\`` | Toggle Integrated Terminal |
| `⌘Enter` / `Ctrl+Enter` | Git Commit |
