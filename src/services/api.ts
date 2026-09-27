import {
  ProjectFile,
  FileContent,
  GitStatusResult,
  GitCommitRecord,
  SearchMatch,
  CodeSymbol,
  IdeSettings,
  ProjectRule,
  ProjectMemoryItem,
  ProjectCheckpoint,
  SpecializedAgent,
  ChatMessage,
  AiMode,
  ToolCallRecord,
  FileDiffRecord,
} from '../types';

export const api = {
  // Filesystem
  async getRoot(): Promise<{ root: string }> {
    const res = await fetch('/api/fs/root');
    return res.json();
  },

  async setRoot(path: string): Promise<{ success: boolean; root: string }> {
    const res = await fetch('/api/fs/set-root', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async getFileTree(): Promise<{ tree: ProjectFile[]; root: string }> {
    const res = await fetch('/api/fs/tree');
    return res.json();
  },

  async readFile(filePath: string): Promise<FileContent> {
    const res = await fetch(`/api/fs/read?path=${encodeURIComponent(filePath)}`);
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async writeFile(filePath: string, content: string): Promise<{ success: boolean; path: string }> {
    const res = await fetch('/api/fs/write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async createFile(filePath: string, content = ''): Promise<{ success: boolean; path: string }> {
    const res = await fetch('/api/fs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath, content }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async createDirectory(dirPath: string): Promise<{ success: boolean; path: string }> {
    const res = await fetch('/api/fs/mkdir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async deletePath(targetPath: string): Promise<{ success: boolean; path: string }> {
    const res = await fetch('/api/fs/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetPath }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async renamePath(oldPath: string, newPath: string): Promise<{ success: boolean; newPath: string }> {
    const res = await fetch('/api/fs/rename', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldPath, newPath }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async searchFiles(query: string, isRegex = false): Promise<SearchMatch[]> {
    const res = await fetch(
      `/api/fs/search?q=${encodeURIComponent(query)}&regex=${isRegex ? 'true' : 'false'}`
    );
    const data = await res.json();
    return data.matches || [];
  },

  // Terminal
  async getTerminalSessions(): Promise<{ id: string; name: string; cwd: string; isActive: boolean }[]> {
    const res = await fetch('/api/terminal/sessions');
    const data = await res.json();
    return data.sessions || [];
  },

  async createTerminalSession(
    name?: string,
    shell?: string
  ): Promise<{ id: string; name: string; cwd: string; shell: string; isActive: boolean }> {
    const res = await fetch('/api/terminal/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, shell }),
    });
    return res.json();
  },

  async killTerminalSession(id: string): Promise<boolean> {
    const res = await fetch('/api/terminal/kill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    return data.success;
  },

  async executeCommand(
    command: string,
    cwd?: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
    const res = await fetch('/api/terminal/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, cwd }),
    });
    return res.json();
  },

  // Git
  async getGitStatus(): Promise<GitStatusResult> {
    const res = await fetch('/api/git/status');
    return res.json();
  },

  async getGitDiff(file?: string, staged = false): Promise<string> {
    const params = new URLSearchParams();
    if (file) params.append('file', file);
    if (staged) params.append('staged', 'true');
    const res = await fetch(`/api/git/diff?${params.toString()}`);
    const data = await res.json();
    return data.diff || '';
  },

  async stageFile(filePath: string): Promise<boolean> {
    const res = await fetch('/api/git/stage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json();
    return data.success;
  },

  async stageAll(): Promise<boolean> {
    const res = await fetch('/api/git/stage-all', { method: 'POST' });
    const data = await res.json();
    return data.success;
  },

  async unstageFile(filePath: string): Promise<boolean> {
    const res = await fetch('/api/git/unstage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json();
    return data.success;
  },

  async discardChanges(filePath: string): Promise<boolean> {
    const res = await fetch('/api/git/discard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: filePath }),
    });
    const data = await res.json();
    return data.success;
  },

  async gitCommit(message: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    const res = await fetch('/api/git/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message }),
    });
    return res.json();
  },

  async getGitBranches(): Promise<{ current: string; all: string[] }> {
    const res = await fetch('/api/git/branches');
    return res.json();
  },

  async switchBranch(name: string, createNew = false): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/git/branch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, createNew }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async getGitLog(limit = 20): Promise<GitCommitRecord[]> {
    const res = await fetch(`/api/git/log?limit=${limit}`);
    const data = await res.json();
    return data.log || [];
  },

  async initGitRepo(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/git/init', { method: 'POST' });
    return res.json();
  },

  // AI & Agent
  async getAutocomplete(params: {
    prefix: string;
    suffix: string;
    filePath: string;
    language: string;
  }): Promise<string> {
    const res = await fetch('/api/ai/autocomplete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data.suggestion || '';
  },

  async getInlineEdit(params: {
    instruction: string;
    selectedCode: string;
    fullFileContent: string;
    filePath: string;
    language: string;
  }): Promise<string> {
    const res = await fetch('/api/ai/inline-edit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return data.replacement || '';
  },

  async stopTask(taskId: string): Promise<boolean> {
    const res = await fetch('/api/ai/stop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId }),
    });
    const data = await res.json();
    return data.success;
  },

  async rollbackCheckpoint(checkpointId: string): Promise<{ success: boolean; filesRestored: string[] }> {
    const res = await fetch('/api/ai/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkpointId }),
    });
    if (!res.ok) throw new Error((await res.json()).error);
    return res.json();
  },

  async getCheckpoints(): Promise<ProjectCheckpoint[]> {
    const res = await fetch('/api/checkpoints');
    const data = await res.json();
    return data.checkpoints || [];
  },

  // Codebase & Symbols
  async getSymbols(query = ''): Promise<CodeSymbol[]> {
    const res = await fetch(`/api/codebase/symbols?q=${encodeURIComponent(query)}`);
    const data = await res.json();
    return data.symbols || [];
  },

  async reindexCodebase(): Promise<{ indexedFiles: number; totalSymbols: number }> {
    const res = await fetch('/api/codebase/reindex', { method: 'POST' });
    return res.json();
  },

  // Storage & Settings
  async getSettings(): Promise<IdeSettings> {
    const res = await fetch('/api/settings');
    return res.json();
  },

  async saveSettings(settings: IdeSettings): Promise<IdeSettings> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    return res.json();
  },

  async getRules(): Promise<ProjectRule[]> {
    const res = await fetch('/api/rules');
    const data = await res.json();
    return data.rules || [];
  },

  async saveRules(rules: ProjectRule[]): Promise<boolean> {
    const res = await fetch('/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules),
    });
    return res.ok;
  },

  async getMemory(): Promise<ProjectMemoryItem[]> {
    const res = await fetch('/api/memory');
    const data = await res.json();
    return data.memory || [];
  },

  async saveMemory(memory: ProjectMemoryItem[]): Promise<boolean> {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memory),
    });
    return res.ok;
  },

  async getAgents(): Promise<SpecializedAgent[]> {
    const res = await fetch('/api/agents');
    const data = await res.json();
    return data.agents || [];
  },

  async saveAgents(agents: SpecializedAgent[]): Promise<boolean> {
    const res = await fetch('/api/agents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agents),
    });
    return res.ok;
  },

  async getConversations(threadId = 'main'): Promise<ChatMessage[]> {
    const res = await fetch(`/api/conversations?threadId=${encodeURIComponent(threadId)}`);
    const data = await res.json();
    return data.messages || [];
  },

  async saveConversations(messages: ChatMessage[], threadId = 'main'): Promise<boolean> {
    const res = await fetch(`/api/conversations?threadId=${encodeURIComponent(threadId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });
    return res.ok;
  },

  async getThreads(): Promise<{ id: string; title: string; updatedAt: number }[]> {
    const res = await fetch('/api/threads');
    const data = await res.json();
    return data.threads || [];
  },

  async deleteThread(id: string): Promise<boolean> {
    const res = await fetch(`/api/threads/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return res.ok;
  },

  // Stream Agent SSE
  streamAgentTask(params: {
    taskId: string;
    prompt: string;
    mode: AiMode;
    agentRole?: string;
    contextFiles?: string[];
    attachedImages?: { mimeType: string; data: string }[];
    onStatus: (status: string) => void;
    onChunk: (chunk: string) => void;
    onToolCall: (tool: ToolCallRecord) => void;
    onDiff: (diff: FileDiffRecord) => void;
    onCompleted: (message: ChatMessage, checkpointId?: string) => void;
    onError: (error: string) => void;
  }): () => void {
    const controller = new AbortController();

    fetch('/api/ai/agent-stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: params.taskId,
        prompt: params.prompt,
        mode: params.mode,
        agentRole: params.agentRole,
        contextFiles: params.contextFiles,
        attachedImages: params.attachedImages,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok || !response.body) {
          throw new Error(`Server returned ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              const rawData = line.slice(6).trim();
              if (!rawData) continue;
              try {
                const data = JSON.parse(rawData);
                if (currentEvent === 'status') params.onStatus(data.status);
                else if (currentEvent === 'chunk') params.onChunk(data.chunk);
                else if (currentEvent === 'tool_call') params.onToolCall(data.tool);
                else if (currentEvent === 'diff') params.onDiff(data.diff);
                else if (currentEvent === 'completed') {
                  params.onCompleted(data.message, data.checkpointId);
                } else if (currentEvent === 'error') params.onError(data.error);
              } catch (e) {
                // ignore json error
              }
            }
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          params.onError(err.message);
        }
      });

    return () => {
      controller.abort();
      api.stopTask(params.taskId).catch(() => {});
    };
  },
};
