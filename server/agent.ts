import { Type, FunctionDeclaration } from '@google/genai';
import { aiService } from './ai.js';
import { fsService } from './fs.js';
import { terminalService } from './terminal.js';
import { gitService } from './git.js';
import { codebaseIndexer } from './codebaseIndexer.js';
import { storageService } from './storage.js';
import {
  AiMode,
  ToolCallRecord,
  FileDiffRecord,
  ChatMessage,
  ProjectCheckpoint,
} from './types.js';
import * as Diff from 'diff';

// Tool Declarations for Gemini Function Calling
export const AGENT_TOOLS: { functionDeclarations: FunctionDeclaration[] } = {
  functionDeclarations: [
    {
      name: 'read_file',
      description: 'Reads the content of a file in the project.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING, description: 'Relative path to the file in project' },
        },
        required: ['path'],
      },
    },
    {
      name: 'write_file',
      description: 'Writes complete content to a file, creating it if it does not exist.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING, description: 'Relative path to file' },
          content: { type: Type.STRING, description: 'Full new file content' },
        },
        required: ['path', 'content'],
      },
    },
    {
      name: 'replace_in_file',
      description: 'Replaces a specific text block in a file with new content.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING, description: 'Relative path to file' },
          targetContent: { type: Type.STRING, description: 'Exact string to be replaced' },
          replacementContent: { type: Type.STRING, description: 'Replacement string' },
        },
        required: ['path', 'targetContent', 'replacementContent'],
      },
    },
    {
      name: 'list_directory',
      description: 'Lists files and folders inside a given directory.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          path: { type: Type.STRING, description: 'Relative path to directory, or "." for root' },
        },
      },
    },
    {
      name: 'search_codebase',
      description: 'Searches for text or regex across all project files.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Text or regex to search' },
          isRegex: { type: Type.BOOLEAN, description: 'Whether query is a regex' },
        },
        required: ['query'],
      },
    },
    {
      name: 'find_symbols',
      description: 'Finds functions, classes, interfaces, or types in the project symbol index.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: { type: Type.STRING, description: 'Symbol name query' },
        },
        required: ['query'],
      },
    },
    {
      name: 'execute_command',
      description: 'Executes a bash/shell command in the project root directory.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          command: { type: Type.STRING, description: 'Shell command line to execute' },
        },
        required: ['command'],
      },
    },
    {
      name: 'run_tests',
      description: 'Runs project test suite (e.g. npm test) and returns exit code, stdout, stderr.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          customCommand: { type: Type.STRING, description: 'Optional custom test command' },
        },
      },
    },
    {
      name: 'git_status',
      description: 'Returns the current git repository status (branches, modified files, staged files).',
      parameters: {
        type: Type.OBJECT,
        properties: {},
      },
    },
    {
      name: 'git_diff',
      description: 'Returns git diff of unstaged or staged changes.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          staged: { type: Type.BOOLEAN, description: 'Whether to show staged diff' },
          filePath: { type: Type.STRING, description: 'Optional specific file' },
        },
      },
    },
    {
      name: 'fetch_web_url',
      description: 'Fetches content from an external web URL or documentation page.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          url: { type: Type.STRING, description: 'URL to fetch' },
        },
        required: ['url'],
      },
    },
  ],
};

export class AgentEngine {
  private activeTasks: Map<string, { abort: boolean }> = new Map();

  stopTask(taskId: string): boolean {
    const task = this.activeTasks.get(taskId);
    if (task) {
      task.abort = true;
      return true;
    }
    return false;
  }

  async runAgentStep(params: {
    taskId: string;
    userPrompt: string;
    mode: AiMode;
    agentRole?: string;
    contextFiles?: string[];
    attachedImages?: { mimeType: string; data: string }[];
    onStatus: (status: string) => void;
    onChunk: (chunk: string) => void;
    onToolCall: (tool: ToolCallRecord) => void;
    onDiff: (diff: FileDiffRecord) => void;
  }): Promise<{ message: ChatMessage; checkpointId?: string }> {
    this.activeTasks.set(params.taskId, { abort: false });
    const isAborted = () => this.activeTasks.get(params.taskId)?.abort === true;

    const rules = storageService
      .getRules()
      .filter((r) => r.enabled)
      .map((r) => `- [${r.category.toUpperCase()}] ${r.title}: ${r.content}`)
      .join('\n');

    const memory = storageService
      .getMemory()
      .map((m) => `- [${m.category}] ${m.summary}: ${m.detail}`)
      .join('\n');

    const projectRoot = fsService.getProjectRoot();
    let initialCheckpointId: string | undefined;

    // In Agent or Debug mode, save a checkpoint before any automated edits
    if (params.mode === 'agent' || params.mode === 'debug') {
      try {
        const filesToBackup: { path: string; content: string }[] = [];
        if (params.contextFiles && params.contextFiles.length > 0) {
          for (const f of params.contextFiles) {
            try {
              const res = await fsService.readFile(f);
              if (!res.isBinary) filesToBackup.push({ path: res.relativePath, content: res.content });
            } catch {
              // ignore
            }
          }
        }
        initialCheckpointId = `chk-${Date.now()}`;
        storageService.saveCheckpoint({
          id: initialCheckpointId,
          title: `Pre-task Checkpoint: ${params.userPrompt.slice(0, 40)}`,
          timestamp: Date.now(),
          files: filesToBackup,
          description: `Automatic snapshot taken before running AI task: "${params.userPrompt}"`,
        });
      } catch (e) {
        console.warn('Could not create pre-task checkpoint:', e);
      }
    }

    // Build system prompt based on mode
    let systemPrompt = '';
    const baseIdentity = `You are Synthetix AI, an elite senior software engineer and autonomous AI IDE assistant.
You operate directly on the real project codebase at "${projectRoot}".
All file changes and terminal commands execute for real on the host operating system.`;

    if (params.mode === 'ask') {
      systemPrompt = `${baseIdentity}
MODE: ASK
Your goal is to answer developer questions, explain code, analyze architecture, and provide guidance.
You MUST NOT execute destructive actions or modify files in ASK mode. Use read_file, list_directory, search_codebase, find_symbols to provide precise answers.`;
    } else if (params.mode === 'plan') {
      systemPrompt = `${baseIdentity}
MODE: PLAN
Your goal is to create a detailed, pragmatic architectural and implementation plan.
First investigate existing code and files.
Then output a step-by-step plan formatted with markdown checkboxes:
- [ ] Step 1: ...
- [ ] Step 2: ...
Explain the rationale and affected files before performing changes.`;
    } else if (params.mode === 'debug') {
      systemPrompt = `${baseIdentity}
MODE: DEBUG
Your goal is to isolate, diagnose, reproduce, and permanently fix bugs.
1. Read the error or stack trace provided by the user.
2. Locate the file and exact line causing the bug.
3. Understand the root cause (not just symptom).
4. Apply the fix using replace_in_file or write_file.
5. Run tests (run_tests) or execute command to verify the fix works.
6. Summarize the root cause and the fix.`;
    } else {
      // Agent mode
      systemPrompt = `${baseIdentity}
MODE: AUTONOMOUS AGENT
You have full tool access to read, create, replace, and execute files, run tests, and perform git operations.
WORKFLOW:
1. EXPLORE: Check files and structure relevant to user prompt.
2. ACT: Write or patch the code precisely.
3. VERIFY: Run tests or validation commands to ensure everything compiles and works without regression.
4. EXPLAIN: Provide a clean, concise summary of what was accomplished and files changed.`;
    }

    if (rules) {
      systemPrompt += `\n\nPROJECT RULES (MUST ADHERE TO):\n${rules}`;
    }
    if (memory) {
      systemPrompt += `\n\nPROJECT MEMORY / ARCHITECTURAL DECISIONS:\n${memory}`;
    }

    // Include context from contextFiles if provided
    let contextBlock = '';
    if (params.contextFiles && params.contextFiles.length > 0) {
      contextBlock += '\n\nATTACHED CONTEXT FILES:';
      for (const cf of params.contextFiles) {
        try {
          const fileData = await fsService.readFile(cf);
          if (!fileData.isBinary) {
            contextBlock += `\n\n--- FILE: ${fileData.relativePath} ---\n${fileData.content.slice(0, 3000)}`;
          }
        } catch (e: any) {
          contextBlock += `\n[Could not read context file ${cf}: ${e.message}]`;
        }
      }
    }

    const fullPrompt = `${params.userPrompt}${contextBlock}`;
    const tools = params.mode === 'ask' ? undefined : [AGENT_TOOLS];

    let turns = 0;
    const maxTurns = 8;
    let accumulatedText = '';
    const toolCallRecords: ToolCallRecord[] = [];
    const diffRecords: FileDiffRecord[] = [];

    let currentPrompt = fullPrompt;

    while (turns < maxTurns) {
      if (isAborted()) {
        params.onStatus('Task stopped by user');
        break;
      }

      turns++;
      params.onStatus(turns === 1 ? 'Thinking...' : 'Reasoning next steps...');

      let stepResult: { fullText: string; toolCalls?: any[] };
      try {
        stepResult = await aiService.generateStream({
          prompt: currentPrompt,
          systemInstruction: systemPrompt,
          model: 'gemini-3.8-flash',
          temperature: 0.2,
          tools,
          imageParts: params.attachedImages,
          onChunk: (chunk) => {
            accumulatedText += chunk;
            params.onChunk(chunk);
          },
        });
      } catch (err: any) {
        params.onStatus(`Error: ${err.message}`);
        accumulatedText += `\n[Agent error: ${err.message}]`;
        break;
      }

      if (isAborted()) break;

      const calls = stepResult.toolCalls;
      if (!calls || calls.length === 0) {
        // No more tools to call, agent has concluded response
        break;
      }

      // Execute each tool call
      let toolOutputsText = '\n\n[TOOL EXECUTION RESULTS]:\n';

      for (const call of calls) {
        if (isAborted()) break;
        const name = call.name;
        const args = call.args || {};
        const callId = `call-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

        const record: ToolCallRecord = {
          id: callId,
          name,
          args,
          status: 'running',
        };
        params.onToolCall(record);
        params.onStatus(`Executing ${name}...`);

        const startT = Date.now();
        let resultOutput = '';
        let status: 'success' | 'error' = 'success';
        let errorMessage: string | undefined;

        try {
          if (name === 'read_file') {
            const file = await fsService.readFile(args.path);
            resultOutput = `Content of ${args.path}:\n${file.content}`;
          } else if (name === 'write_file') {
            let oldContent = '';
            try {
              const oldFile = await fsService.readFile(args.path);
              oldContent = oldFile.content;
            } catch {
              // new file
            }
            await fsService.writeFile(args.path, args.content);
            resultOutput = `Successfully wrote ${args.content.length} chars to ${args.path}`;

            const patch = Diff.createTwoFilesPatch(
              `a/${args.path}`,
              `b/${args.path}`,
              oldContent,
              args.content
            );
            const parsed = Diff.parsePatch(patch);
            let additions = 0;
            let deletions = 0;
            if (parsed.length > 0) {
              for (const h of parsed[0].hunks) {
                for (const l of h.lines) {
                  if (l.startsWith('+')) additions++;
                  if (l.startsWith('-')) deletions++;
                }
              }
            }
            const diffRecord: FileDiffRecord = {
              filePath: args.path,
              oldContent,
              newContent: args.content,
              patch,
              applied: true,
              additions,
              deletions,
            };
            diffRecords.push(diffRecord);
            params.onDiff(diffRecord);
          } else if (name === 'replace_in_file') {
            const file = await fsService.readFile(args.path);
            const oldContent = file.content;
            if (!oldContent.includes(args.targetContent)) {
              throw new Error(`Target content not found in ${args.path}`);
            }
            const newContent = oldContent.replace(args.targetContent, args.replacementContent);
            await fsService.writeFile(args.path, newContent);
            resultOutput = `Successfully replaced block in ${args.path}`;

            const patch = Diff.createTwoFilesPatch(
              `a/${args.path}`,
              `b/${args.path}`,
              oldContent,
              newContent
            );
            const diffRecord: FileDiffRecord = {
              filePath: args.path,
              oldContent,
              newContent,
              patch,
              applied: true,
              additions: args.replacementContent.split('\n').length,
              deletions: args.targetContent.split('\n').length,
            };
            diffRecords.push(diffRecord);
            params.onDiff(diffRecord);
          } else if (name === 'list_directory') {
            const target = args.path || '.';
            const tree = await fsService.getFileTree(fsService.resolvePath(target), 0, 1);
            resultOutput = `Directory ${target} contents:\n${JSON.stringify(
              tree.map((t) => ({ name: t.name, isDirectory: t.isDirectory, size: t.size })),
              null,
              2
            )}`;
          } else if (name === 'search_codebase') {
            const matches = await fsService.searchInFiles(args.query, !!args.isRegex, 20);
            resultOutput = `Search for "${args.query}" returned ${matches.length} matches:\n${JSON.stringify(
              matches,
              null,
              2
            )}`;
          } else if (name === 'find_symbols') {
            const syms = codebaseIndexer.findSymbols(args.query, 15);
            resultOutput = `Found ${syms.length} symbols matching "${args.query}":\n${JSON.stringify(
              syms,
              null,
              2
            )}`;
          } else if (name === 'execute_command') {
            const execRes = await terminalService.executeCommand(args.command);
            resultOutput = `Exit Code: ${execRes.exitCode}\nStdout:\n${execRes.stdout}\nStderr:\n${execRes.stderr}`;
          } else if (name === 'run_tests') {
            const cmd = args.customCommand || 'npm test';
            const testRes = await terminalService.executeCommand(cmd);
            resultOutput = `Exit Code: ${testRes.exitCode}\nStdout:\n${testRes.stdout}\nStderr:\n${testRes.stderr}`;
          } else if (name === 'git_status') {
            const status = await gitService.getStatus();
            resultOutput = `Git Status:\n${JSON.stringify(status, null, 2)}`;
          } else if (name === 'git_diff') {
            const diff = await gitService.getDiff(args.filePath, !!args.staged);
            resultOutput = `Git Diff:\n${diff || '(No changes)'}`;
          } else if (name === 'fetch_web_url') {
            const resp = await fetch(args.url);
            const text = await resp.text();
            resultOutput = `Fetched ${args.url} (${resp.status}):\n${text.slice(0, 3000)}`;
          } else {
            resultOutput = `Unknown tool: ${name}`;
          }
        } catch (err: any) {
          status = 'error';
          errorMessage = err.message;
          resultOutput = `Error executing ${name}: ${err.message}`;
        }

        record.status = status;
        record.result = resultOutput;
        record.errorMessage = errorMessage;
        record.durationMs = Date.now() - startT;
        toolCallRecords.push(record);

        toolOutputsText += `\n[Tool: ${name}]\n${resultOutput}\n`;
      }

      currentPrompt = `${toolOutputsText}\nBased on these tool results, evaluate whether the user request is completely fulfilled or what next step you need to take. If complete, explain the solution and list all modified files.`;
    }

    this.activeTasks.delete(params.taskId);
    params.onStatus('Task completed');

    const assistantMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: accumulatedText,
      timestamp: Date.now(),
      mode: params.mode,
      agentId: params.agentRole,
      toolCalls: toolCallRecords,
      diffs: diffRecords,
      checkpointId: initialCheckpointId,
      status: isAborted() ? 'interrupted' : 'completed',
    };

    return {
      message: assistantMessage,
      checkpointId: initialCheckpointId,
    };
  }

  async rollbackCheckpoint(checkpointId: string): Promise<{ success: boolean; filesRestored: string[] }> {
    const checkpoints = storageService.getCheckpoints();
    const target = checkpoints.find((c) => c.id === checkpointId);
    if (!target) {
      throw new Error(`Checkpoint ${checkpointId} not found`);
    }

    const restored: string[] = [];
    for (const f of target.files) {
      await fsService.writeFile(f.path, f.content);
      restored.push(f.path);
    }
    return { success: true, filesRestored: restored };
  }
}

export const agentEngine = new AgentEngine();
