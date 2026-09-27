import fs from 'fs';
import path from 'path';
import {
  IdeSettings,
  ChatMessage,
  ProjectRule,
  ProjectMemoryItem,
  ProjectCheckpoint,
  SpecializedAgent,
  AgentTask,
} from './types.js';

const DATA_DIR = path.resolve(process.cwd(), '.synthetix-data');

// Default IDE Settings
export const DEFAULT_SETTINGS: IdeSettings = {
  general: {
    theme: 'dark-modern',
    language: 'ru',
    autoSave: true,
    autoSaveDelay: 1000,
  },
  editor: {
    fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
    fontSize: 14,
    lineHeight: 22,
    tabSize: 2,
    minimap: true,
    wordWrap: 'on',
    cursorBlinking: 'smooth',
    cursorStyle: 'line',
    formatOnSave: true,
    bracketPairColorization: true,
  },
  ai: {
    defaultProvider: 'gemini',
    agentModel: 'gemini-3.8-flash',
    askModel: 'gemini-3.8-flash',
    autocompleteModel: 'gemini-3.8-flash',
    inlineModel: 'gemini-3.8-flash',
    debugModel: 'gemini-3.8-flash',
    temperature: 0.2,
    streaming: true,
    autocompleteDelay: 250,
    autocompleteEnabled: true,
  },
  terminal: {
    shell: process.platform === 'win32' ? 'powershell.exe' : '/bin/bash',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
  },
  git: {
    autoFetch: true,
    confirmOnCommit: false,
  },
  privacy: {
    telemetry: false,
    localOnlyMode: false,
    retainHistory: true,
  },
};

// Default System Rules
export const DEFAULT_RULES: ProjectRule[] = [
  {
    id: 'rule-typescript-strict',
    title: 'TypeScript Best Practices',
    category: 'code-style',
    content: 'Always use strict TypeScript types. Avoid `any`. Use descriptive interfaces and explicit return types where appropriate.',
    enabled: true,
    scope: 'global',
  },
  {
    id: 'rule-no-mocks',
    title: 'Real Implementation Integrity',
    category: 'architecture',
    content: 'All tools and features must be linked to real execution engines. Do not create fake mock returns, fake delays, or simulated UI.',
    enabled: true,
    scope: 'global',
  },
  {
    id: 'rule-clean-code',
    title: 'Modular & Maintainable Architecture',
    category: 'architecture',
    content: 'Keep files focused, single-responsibility, and properly commented. Isolate business logic from UI components.',
    enabled: true,
    scope: 'project',
  },
  {
    id: 'rule-test-coverage',
    title: 'Verify Before Completing',
    category: 'testing',
    content: 'Before concluding any automated agent task, run build and tests to verify there are no compilation errors or broken logic.',
    enabled: true,
    scope: 'project',
  },
];

// Default Specialized Agents
export const DEFAULT_AGENTS: SpecializedAgent[] = [
  {
    id: 'agent-fullstack',
    name: 'Full-Stack Agent',
    role: 'fullstack',
    description: 'Autonomous development agent capable of reading, writing, testing, and debugging across the entire project.',
    systemPrompt: 'You are an elite autonomous software engineer. You analyze codebases thoroughly, make targeted edits, verify results with tests/commands, and produce clean, robust production software.',
    model: 'gemini-3.8-flash',
    allowedTools: ['read_file', 'write_file', 'patch_file', 'list_dir', 'execute_command', 'run_tests', 'search_code', 'web_search', 'git_ops'],
    avatarColor: '#3b82f6',
    status: 'idle',
  },
  {
    id: 'agent-frontend',
    name: 'Frontend Specialist',
    role: 'frontend',
    description: 'Focuses on UI components, styling, animations, responsiveness, and user experience.',
    systemPrompt: 'You are a senior UI/UX engineer and frontend architect specializing in modern React, Tailwind CSS, TypeScript, and accessible components.',
    model: 'gemini-3.8-flash',
    allowedTools: ['read_file', 'write_file', 'patch_file', 'list_dir', 'search_code'],
    avatarColor: '#8b5cf6',
    status: 'idle',
  },
  {
    id: 'agent-backend',
    name: 'Backend & Systems Architect',
    role: 'backend',
    description: 'Specializes in server APIs, databases, authentication, networking, and system performance.',
    systemPrompt: 'You are a senior systems and backend engineer specializing in high-performance Node.js/Express, APIs, data storage, and security.',
    model: 'gemini-3.8-flash',
    allowedTools: ['read_file', 'write_file', 'patch_file', 'list_dir', 'execute_command', 'search_code'],
    avatarColor: '#10b981',
    status: 'idle',
  },
  {
    id: 'agent-qa',
    name: 'QA & Test Automation',
    role: 'qa',
    description: 'Discovers edge cases, writes automated tests, runs test suites, and reports issues.',
    systemPrompt: 'You are a QA automation expert. You write rigorous unit and integration tests, verify boundary conditions, and detect subtle bugs.',
    model: 'gemini-3.8-flash',
    allowedTools: ['read_file', 'write_file', 'run_tests', 'execute_command', 'search_code'],
    avatarColor: '#f59e0b',
    status: 'idle',
  },
  {
    id: 'agent-reviewer',
    name: 'Code Reviewer & Auditor',
    role: 'reviewer',
    description: 'Performs comprehensive code reviews, checks security vulnerabilities, and evaluates maintainability.',
    systemPrompt: 'You are a principal security and architecture reviewer. You inspect diffs and code for potential vulnerabilities, performance bottlenecks, and architectural smells.',
    model: 'gemini-3.8-flash',
    allowedTools: ['read_file', 'list_dir', 'search_code'],
    avatarColor: '#ec4899',
    status: 'idle',
  },
];

export class StorageService {
  private ensureDirectory() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private readJson<T>(filename: string, fallback: T): T {
    this.ensureDirectory();
    const filePath = path.join(DATA_DIR, filename);
    if (!fs.existsSync(filePath)) {
      this.writeJson(filename, fallback);
      return fallback;
    }
    try {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (err) {
      console.error(`Error reading ${filename}:`, err);
      return fallback;
    }
  }

  private writeJson<T>(filename: string, data: T): void {
    this.ensureDirectory();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  getSettings(): IdeSettings {
    const stored = this.readJson<Partial<IdeSettings>>('settings.json', DEFAULT_SETTINGS);
    return {
      general: { ...DEFAULT_SETTINGS.general, ...(stored.general || {}) },
      editor: { ...DEFAULT_SETTINGS.editor, ...(stored.editor || {}) },
      ai: { ...DEFAULT_SETTINGS.ai, ...(stored.ai || {}) },
      terminal: { ...DEFAULT_SETTINGS.terminal, ...(stored.terminal || {}) },
      git: { ...DEFAULT_SETTINGS.git, ...(stored.git || {}) },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...(stored.privacy || {}) },
    };
  }

  saveSettings(settings: IdeSettings): IdeSettings {
    this.writeJson('settings.json', settings);
    return settings;
  }

  getConversations(threadId = 'main'): ChatMessage[] {
    return this.readJson<ChatMessage[]>(`chat_${threadId}.json`, []);
  }

  saveConversations(messages: ChatMessage[], threadId = 'main'): void {
    this.writeJson(`chat_${threadId}.json`, messages);
  }

  getThreads(): { id: string; title: string; updatedAt: number }[] {
    this.ensureDirectory();
    const files = fs.readdirSync(DATA_DIR);
    const threads: { id: string; title: string; updatedAt: number }[] = [];
    for (const file of files) {
      if (file.startsWith('chat_') && file.endsWith('.json')) {
        const id = file.replace('chat_', '').replace('.json', '');
        const stat = fs.statSync(path.join(DATA_DIR, file));
        threads.push({
          id,
          title: id === 'main' ? 'Main Agent Chat' : `Chat (${id})`,
          updatedAt: stat.mtimeMs,
        });
      }
    }
    if (threads.length === 0) {
      threads.push({ id: 'main', title: 'Main Agent Chat', updatedAt: Date.now() });
    }
    return threads;
  }

  deleteThread(threadId: string): void {
    const filePath = path.join(DATA_DIR, `chat_${threadId}.json`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  getRules(): ProjectRule[] {
    return this.readJson<ProjectRule[]>('rules.json', DEFAULT_RULES);
  }

  saveRules(rules: ProjectRule[]): void {
    this.writeJson('rules.json', rules);
  }

  getMemory(): ProjectMemoryItem[] {
    return this.readJson<ProjectMemoryItem[]>('memory.json', [
      {
        id: 'mem-1',
        category: 'architecture',
        summary: 'Synthetix AI IDE Architecture',
        detail: 'Full-stack system running Express + Vite, with real filesystem, Monaco Editor, child_process terminal, and multi-provider AI engine.',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
      {
        id: 'mem-2',
        category: 'convention',
        summary: 'Zero Mocking Policy',
        detail: 'Every UI control must bind to a working backend tool or engine. No fake responses.',
        createdAt: Date.now() - 3600000,
        updatedAt: Date.now() - 3600000,
      },
    ]);
  }

  saveMemory(items: ProjectMemoryItem[]): void {
    this.writeJson('memory.json', items);
  }

  getCheckpoints(): ProjectCheckpoint[] {
    return this.readJson<ProjectCheckpoint[]>('checkpoints.json', []);
  }

  saveCheckpoint(checkpoint: ProjectCheckpoint): void {
    const list = this.getCheckpoints();
    list.unshift(checkpoint);
    if (list.length > 50) list.pop(); // keep last 50
    this.writeJson('checkpoints.json', list);
  }

  getAgents(): SpecializedAgent[] {
    return this.readJson<SpecializedAgent[]>('agents.json', DEFAULT_AGENTS);
  }

  saveAgents(agents: SpecializedAgent[]): void {
    this.writeJson('agents.json', agents);
  }

  getTasks(): AgentTask[] {
    return this.readJson<AgentTask[]>('tasks.json', []);
  }

  saveTasks(tasks: AgentTask[]): void {
    this.writeJson('tasks.json', tasks);
  }
}

export const storageService = new StorageService();
