export type ActivePanel =
  | 'explorer'
  | 'search'
  | 'ai'
  | 'multiagent'
  | 'git'
  | 'rules'
  | 'review'
  | 'settings';

export type AiMode = 'agent' | 'ask' | 'plan' | 'debug' | 'review';

export interface ProjectFile {
  name: string;
  path: string;
  relativePath: string;
  isDirectory: boolean;
  size?: number;
  lastModified?: number;
  children?: ProjectFile[];
  extension?: string;
}

export interface FileContent {
  path: string;
  relativePath: string;
  content: string;
  isBinary?: boolean;
  size: number;
  lastModified: number;
}

export interface EditorTab {
  id: string;
  filePath: string;
  title: string;
  content: string;
  originalContent: string;
  isDirty: boolean;
  isDiff?: boolean;
  diffOldContent?: string;
  language: string;
  cursorLine?: number;
  cursorColumn?: number;
}

export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, any>;
  result?: any;
  status: 'running' | 'success' | 'error';
  errorMessage?: string;
  durationMs?: number;
}

export interface FileDiffRecord {
  filePath: string;
  oldContent: string;
  newContent: string;
  patch: string;
  applied: boolean;
  additions: number;
  deletions: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  mode?: AiMode;
  agentId?: string;
  toolCalls?: ToolCallRecord[];
  diffs?: FileDiffRecord[];
  checkpointId?: string;
  attachedImages?: string[];
  contextFiles?: string[];
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'interrupted';
}

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' | 'copied';
  staged: boolean;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  branch: string;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
}

export interface GitCommitRecord {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export interface ProjectRule {
  id: string;
  title: string;
  category: 'code-style' | 'architecture' | 'testing' | 'security' | 'custom';
  content: string;
  enabled: boolean;
  scope: 'global' | 'project';
}

export interface ProjectMemoryItem {
  id: string;
  category: 'architecture' | 'decision' | 'convention' | 'constraint';
  summary: string;
  detail: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectCheckpoint {
  id: string;
  title: string;
  timestamp: number;
  files: { path: string; content: string }[];
  description: string;
}

export interface SpecializedAgent {
  id: string;
  name: string;
  role: string;
  description: string;
  systemPrompt: string;
  model: string;
  allowedTools: string[];
  avatarColor: string;
  status: 'idle' | 'working' | 'paused';
  conversationId?: string;
}

export interface SearchMatch {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
}

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type' | 'export';
  filePath: string;
  lineNumber: number;
  snippet: string;
}

export interface IdeSettings {
  general: {
    theme: 'dark-modern' | 'cyberpunk-navy' | 'monokai-pro' | 'clean-light';
    language: 'en' | 'ru';
    autoSave: boolean;
    autoSaveDelay: number;
  };
  editor: {
    fontFamily: string;
    fontSize: number;
    lineHeight: number;
    tabSize: number;
    minimap: boolean;
    wordWrap: 'on' | 'off' | 'wordWrapColumn';
    cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
    cursorStyle: 'line' | 'block' | 'underline';
    formatOnSave: boolean;
    bracketPairColorization: boolean;
  };
  ai: {
    defaultProvider: 'gemini' | 'openai' | 'ollama' | 'custom';
    agentModel: string;
    askModel: string;
    autocompleteModel: string;
    inlineModel: string;
    debugModel: string;
    temperature: number;
    streaming: boolean;
    customEndpoint?: string;
    customApiKey?: string;
    autocompleteDelay: number;
    autocompleteEnabled: boolean;
  };
  terminal: {
    shell: string;
    fontSize: number;
    fontFamily: string;
  };
  git: {
    autoFetch: boolean;
    confirmOnCommit: boolean;
  };
  privacy: {
    telemetry: boolean;
    localOnlyMode: boolean;
    retainHistory: boolean;
  };
}
