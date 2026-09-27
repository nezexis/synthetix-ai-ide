import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  ActivePanel,
  AiMode,
  ProjectFile,
  EditorTab,
  ChatMessage,
  GitStatusResult,
  IdeSettings,
  ProjectRule,
  ProjectMemoryItem,
  SpecializedAgent,
  ToolCallRecord,
  FileDiffRecord,
} from '../types';
import { api } from '../services/api';

interface IdeContextType {
  // Navigation & Layout
  activePanel: ActivePanel;
  setActivePanel: (panel: ActivePanel) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  aiPanelOpen: boolean;
  setAiPanelOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  quickOpenOpen: boolean;
  setQuickOpenOpen: (open: boolean) => void;
  newProjectModalOpen: boolean;
  setNewProjectModalOpen: (open: boolean) => void;
  settingsModalOpen: boolean;
  setSettingsModalOpen: (open: boolean) => void;

  // Project Files
  projectRoot: string;
  fileTree: ProjectFile[];
  refreshFileTree: () => Promise<void>;
  openFile: (filePath: string, line?: number) => Promise<void>;
  createFile: (filePath: string, content?: string) => Promise<void>;
  createFolder: (dirPath: string) => Promise<void>;
  deleteFileOrFolder: (targetPath: string) => Promise<void>;
  renameFileOrFolder: (oldPath: string, newPath: string) => Promise<void>;

  // Editor Tabs
  tabs: EditorTab[];
  activeTabId: string | null;
  setActiveTabId: (id: string | null) => void;
  updateTabContent: (id: string, content: string) => void;
  saveActiveFile: () => Promise<void>;
  saveTab: (id: string) => Promise<void>;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  setTabDiffMode: (id: string, isDiff: boolean, oldContent?: string) => void;

  // Inline AI Assistant (Cmd+K)
  inlineAiVisible: boolean;
  setInlineAiVisible: (visible: boolean) => void;
  inlineAiSelection: { text: string; startLine: number; endLine: number } | null;
  setInlineAiSelection: (sel: { text: string; startLine: number; endLine: number } | null) => void;

  // Terminal
  terminalSessions: { id: string; name: string; cwd: string; isActive: boolean }[];
  activeTerminalId: string | null;
  setActiveTerminalId: (id: string | null) => void;
  createTerminalSession: (name?: string) => Promise<string>;
  killTerminalSession: (id: string) => Promise<void>;
  runCommandInTerminal: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;

  // Git
  gitStatus: GitStatusResult | null;
  refreshGitStatus: () => Promise<void>;
  stageFile: (filePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageFile: (filePath: string) => Promise<void>;
  discardChanges: (filePath: string) => Promise<void>;
  commitChanges: (message: string) => Promise<boolean>;

  // AI Agent & Chat
  aiMode: AiMode;
  setAiMode: (mode: AiMode) => void;
  selectedAgentId: string;
  setSelectedAgentId: (id: string) => void;
  currentThreadId: string;
  setCurrentThreadId: (id: string) => void;
  chatThreads: { id: string; title: string; updatedAt: number }[];
  chatMessages: ChatMessage[];
  isAgentRunning: boolean;
  agentStatusText: string;
  currentStreamingText: string;
  activeToolCalls: ToolCallRecord[];
  activeDiffs: FileDiffRecord[];
  sendAgentPrompt: (prompt: string, contextFiles?: string[], images?: string[]) => void;
  stopAgentTask: () => void;
  rollbackCheckpoint: (checkpointId: string) => Promise<void>;
  clearCurrentChat: () => void;

  // Settings, Rules & Memory
  settings: IdeSettings;
  updateSettings: (newSettings: IdeSettings) => Promise<void>;
  rules: ProjectRule[];
  updateRules: (rules: ProjectRule[]) => Promise<void>;
  memory: ProjectMemoryItem[];
  updateMemory: (items: ProjectMemoryItem[]) => Promise<void>;
  agents: SpecializedAgent[];
}

const IdeContext = createContext<IdeContextType | null>(null);

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
      return 'javascript';
    case 'json':
      return 'json';
    case 'html':
      return 'html';
    case 'css':
      return 'css';
    case 'py':
      return 'python';
    case 'rs':
      return 'rust';
    case 'go':
      return 'go';
    case 'md':
      return 'markdown';
    case 'sh':
    case 'bash':
      return 'shell';
    case 'yaml':
    case 'yml':
      return 'yaml';
    default:
      return 'plaintext';
  }
}

export const IdeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Navigation & Layout
  const [activePanel, setActivePanel] = useState<ActivePanel>('ai');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [quickOpenOpen, setQuickOpenOpen] = useState(false);
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Files & Tabs
  const [projectRoot, setProjectRoot] = useState('');
  const [fileTree, setFileTree] = useState<ProjectFile[]>([]);
  const [tabs, setTabs] = useState<EditorTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Inline AI
  const [inlineAiVisible, setInlineAiVisible] = useState(false);
  const [inlineAiSelection, setInlineAiSelection] = useState<{
    text: string;
    startLine: number;
    endLine: number;
  } | null>(null);

  // Terminal
  const [terminalSessions, setTerminalSessions] = useState<
    { id: string; name: string; cwd: string; isActive: boolean }[]
  >([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);

  // Git
  const [gitStatus, setGitStatus] = useState<GitStatusResult | null>(null);

  // AI & Chat
  const [aiMode, setAiMode] = useState<AiMode>('agent');
  const [selectedAgentId, setSelectedAgentId] = useState('agent-fullstack');
  const [currentThreadId, setCurrentThreadId] = useState('main');
  const [chatThreads, setChatThreads] = useState<{ id: string; title: string; updatedAt: number }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [agentStatusText, setAgentStatusText] = useState('Ready');
  const [currentStreamingText, setCurrentStreamingText] = useState('');
  const [activeToolCalls, setActiveToolCalls] = useState<ToolCallRecord[]>([]);
  const [activeDiffs, setActiveDiffs] = useState<FileDiffRecord[]>([]);
  const abortAgentRef = useRef<(() => void) | null>(null);
  const currentTaskIdRef = useRef<string | null>(null);

  // Settings & Rules & Memory
  const [settings, setSettings] = useState<IdeSettings>({
    general: { theme: 'dark-modern', language: 'ru', autoSave: true, autoSaveDelay: 1000 },
    editor: {
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
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
    terminal: { shell: '/bin/bash', fontSize: 13, fontFamily: "'JetBrains Mono', monospace" },
    git: { autoFetch: true, confirmOnCommit: false },
    privacy: { telemetry: false, localOnlyMode: false, retainHistory: true },
  });
  const [rules, setRules] = useState<ProjectRule[]>([]);
  const [memory, setMemory] = useState<ProjectMemoryItem[]>([]);
  const [agents, setAgents] = useState<SpecializedAgent[]>([]);

  // Initialize data on mount
  useEffect(() => {
    const init = async () => {
      try {
        const rootData = await api.getRoot();
        setProjectRoot(rootData.root);

        const treeData = await api.getFileTree();
        setFileTree(treeData.tree);

        // Open README.md or starter file by default if exists
        const readme = treeData.tree.find((f) => f.name.toLowerCase().startsWith('readme'));
        if (readme) {
          openFile(readme.relativePath);
        } else if (treeData.tree.length > 0) {
          const first = treeData.tree.find((f) => !f.isDirectory);
          if (first) openFile(first.relativePath);
        }

        // Terminal initial session
        const terms = await api.getTerminalSessions();
        if (terms.length > 0) {
          setTerminalSessions(terms);
          setActiveTerminalId(terms[0].id);
        } else {
          const newSession = await api.createTerminalSession('Terminal 1');
          setTerminalSessions([newSession]);
          setActiveTerminalId(newSession.id);
        }

        // Load Git status
        refreshGitStatus();

        // Load Settings, Rules, Memory, Agents
        const [loadedSettings, loadedRules, loadedMemory, loadedAgents, loadedThreads] =
          await Promise.all([
            api.getSettings(),
            api.getRules(),
            api.getMemory(),
            api.getAgents(),
            api.getThreads(),
          ]);
        setSettings(loadedSettings);
        setRules(loadedRules);
        setMemory(loadedMemory);
        setAgents(loadedAgents);
        setChatThreads(loadedThreads);

        // Load initial conversation
        const msgs = await api.getConversations('main');
        setChatMessages(msgs);
      } catch (e) {
        console.error('Initialization error:', e);
      }
    };
    init();
  }, []);

  // Sync theme to root class
  useEffect(() => {
    document.documentElement.className = settings.general.theme;
  }, [settings.general.theme]);

  const refreshFileTree = async () => {
    try {
      const data = await api.getFileTree();
      setFileTree(data.tree);
      setProjectRoot(data.root);
    } catch (e) {
      console.error('Failed to refresh tree:', e);
    }
  };

  const openFile = async (filePath: string, line?: number) => {
    // Check if already open
    const existing = tabs.find((t) => t.filePath === filePath);
    if (existing) {
      setActiveTabId(existing.id);
      if (line) {
        setTabs((prev) =>
          prev.map((t) => (t.id === existing.id ? { ...t, cursorLine: line } : t))
        );
      }
      return;
    }

    try {
      const file = await api.readFile(filePath);
      const title = filePath.split('/').pop() || filePath;
      const newTab: EditorTab = {
        id: `tab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        filePath: file.relativePath,
        title,
        content: file.content,
        originalContent: file.content,
        isDirty: false,
        language: detectLanguage(filePath),
        cursorLine: line,
      };

      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (e: any) {
      console.error(`Failed to open file ${filePath}:`, e);
    }
  };

  const createFile = async (filePath: string, content = '') => {
    await api.createFile(filePath, content);
    await refreshFileTree();
    await openFile(filePath);
  };

  const createFolder = async (dirPath: string) => {
    await api.createDirectory(dirPath);
    await refreshFileTree();
  };

  const deleteFileOrFolder = async (targetPath: string) => {
    await api.deletePath(targetPath);
    // Close tab if deleted
    setTabs((prev) => prev.filter((t) => !t.filePath.startsWith(targetPath)));
    await refreshFileTree();
    refreshGitStatus();
  };

  const renameFileOrFolder = async (oldPath: string, newPath: string) => {
    await api.renamePath(oldPath, newPath);
    // Update tabs
    setTabs((prev) =>
      prev.map((t) => {
        if (t.filePath === oldPath) {
          return {
            ...t,
            filePath: newPath,
            title: newPath.split('/').pop() || newPath,
            language: detectLanguage(newPath),
          };
        }
        return t;
      })
    );
    await refreshFileTree();
    refreshGitStatus();
  };

  const updateTabContent = (id: string, content: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            content,
            isDirty: content !== t.originalContent,
          };
        }
        return t;
      })
    );
  };

  const saveTab = async (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    try {
      await api.writeFile(tab.filePath, tab.content);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, isDirty: false, originalContent: t.content } : t
        )
      );
      refreshGitStatus();
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const saveActiveFile = async () => {
    if (activeTabId) {
      await saveTab(activeTabId);
    }
  };

  const closeTab = (id: string) => {
    setTabs((prev) => {
      const filtered = prev.filter((t) => t.id !== id);
      if (activeTabId === id) {
        const nextActive = filtered.length > 0 ? filtered[filtered.length - 1].id : null;
        setActiveTabId(nextActive);
      }
      return filtered;
    });
  };

  const closeOtherTabs = (id: string) => {
    setTabs((prev) => prev.filter((t) => t.id === id));
    setActiveTabId(id);
  };

  const closeAllTabs = () => {
    setTabs([]);
    setActiveTabId(null);
  };

  const setTabDiffMode = (id: string, isDiff: boolean, oldContent?: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDiff, diffOldContent: oldContent } : t))
    );
  };

  // Terminal
  const createTerminalSession = async (name?: string): Promise<string> => {
    const s = await api.createTerminalSession(name);
    setTerminalSessions((prev) => [...prev, s]);
    setActiveTerminalId(s.id);
    return s.id;
  };

  const killTerminalSession = async (id: string) => {
    await api.killTerminalSession(id);
    setTerminalSessions((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeTerminalId === id) {
        setActiveTerminalId(remaining.length > 0 ? remaining[0].id : null);
      }
      return remaining;
    });
  };

  const runCommandInTerminal = async (command: string) => {
    return api.executeCommand(command);
  };

  // Git
  const refreshGitStatus = async () => {
    try {
      const status = await api.getGitStatus();
      setGitStatus(status);
    } catch (e) {
      console.error('Git status error:', e);
    }
  };

  const stageFile = async (filePath: string) => {
    await api.stageFile(filePath);
    await refreshGitStatus();
  };

  const stageAll = async () => {
    await api.stageAll();
    await refreshGitStatus();
  };

  const unstageFile = async (filePath: string) => {
    await api.unstageFile(filePath);
    await refreshGitStatus();
  };

  const discardChanges = async (filePath: string) => {
    await api.discardChanges(filePath);
    // Reload open tab if opened
    const tab = tabs.find((t) => t.filePath === filePath);
    if (tab) {
      const file = await api.readFile(filePath);
      setTabs((prev) =>
        prev.map((t) =>
          t.id === tab.id
            ? { ...t, content: file.content, originalContent: file.content, isDirty: false }
            : t
        )
      );
    }
    await refreshGitStatus();
  };

  const commitChanges = async (message: string): Promise<boolean> => {
    const res = await api.gitCommit(message);
    if (res.success) {
      await refreshGitStatus();
      return true;
    }
    return false;
  };

  // AI Agent & Chat
  const sendAgentPrompt = (prompt: string, contextFiles: string[] = [], images: string[] = []) => {
    if (!prompt.trim() || isAgentRunning) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: Date.now(),
      mode: aiMode,
      contextFiles,
      attachedImages: images,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setIsAgentRunning(true);
    setAgentStatusText('Initializing...');
    setCurrentStreamingText('');
    setActiveToolCalls([]);
    setActiveDiffs([]);

    const taskId = `task-${Date.now()}`;
    currentTaskIdRef.current = taskId;

    // Attach active file automatically if not in contextFiles
    const fullContextFiles = [...contextFiles];
    if (activeTabId) {
      const activeTab = tabs.find((t) => t.id === activeTabId);
      if (activeTab && !fullContextFiles.includes(activeTab.filePath)) {
        fullContextFiles.push(activeTab.filePath);
      }
    }

    const abort = api.streamAgentTask({
      taskId,
      prompt,
      mode: aiMode,
      agentRole: selectedAgentId,
      contextFiles: fullContextFiles,
      attachedImages: images.map((img) => ({ mimeType: 'image/png', data: img })),
      onStatus: (status) => setAgentStatusText(status),
      onChunk: (chunk) => setCurrentStreamingText((prev) => prev + chunk),
      onToolCall: (tool) => {
        setActiveToolCalls((prev) => {
          const index = prev.findIndex((t) => t.id === tool.id);
          if (index >= 0) {
            const next = [...prev];
            next[index] = tool;
            return next;
          }
          return [...prev, tool];
        });
      },
      onDiff: async (diff) => {
        setActiveDiffs((prev) => [...prev, diff]);
        // Update any open tab with the new content
        setTabs((prevTabs) =>
          prevTabs.map((t) => {
            if (t.filePath === diff.filePath) {
              return {
                ...t,
                content: diff.newContent,
                originalContent: diff.newContent,
                isDirty: false,
              };
            }
            return t;
          })
        );
        refreshFileTree();
        refreshGitStatus();
      },
      onCompleted: (assistantMessage) => {
        setChatMessages((prev) => {
          const updated = [...prev, assistantMessage];
          api.saveConversations(updated, currentThreadId).catch(() => {});
          return updated;
        });
        setIsAgentRunning(false);
        setAgentStatusText('Completed');
        setCurrentStreamingText('');
        currentTaskIdRef.current = null;
        refreshFileTree();
        refreshGitStatus();
      },
      onError: (error) => {
        const errorMsg: ChatMessage = {
          id: `msg-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error during execution: ${error}`,
          timestamp: Date.now(),
          mode: aiMode,
          status: 'failed',
        };
        setChatMessages((prev) => {
          const updated = [...prev, errorMsg];
          api.saveConversations(updated, currentThreadId).catch(() => {});
          return updated;
        });
        setIsAgentRunning(false);
        setAgentStatusText('Failed');
        currentTaskIdRef.current = null;
      },
    });

    abortAgentRef.current = abort;
  };

  const stopAgentTask = () => {
    if (abortAgentRef.current) {
      abortAgentRef.current();
      abortAgentRef.current = null;
    }
    if (currentTaskIdRef.current) {
      api.stopTask(currentTaskIdRef.current).catch(() => {});
    }
    setIsAgentRunning(false);
    setAgentStatusText('Stopped by user');
  };

  const rollbackCheckpoint = async (checkpointId: string) => {
    try {
      const res = await api.rollbackCheckpoint(checkpointId);
      // Refresh affected open tabs
      for (const f of res.filesRestored) {
        const tab = tabs.find((t) => t.filePath === f);
        if (tab) {
          const file = await api.readFile(f);
          setTabs((prev) =>
            prev.map((t) =>
              t.id === tab.id
                ? { ...t, content: file.content, originalContent: file.content, isDirty: false }
                : t
            )
          );
        }
      }
      await refreshFileTree();
      await refreshGitStatus();
    } catch (e: any) {
      console.error('Rollback error:', e);
    }
  };

  const clearCurrentChat = () => {
    setChatMessages([]);
    api.saveConversations([], currentThreadId).catch(() => {});
  };

  const updateSettings = async (newSettings: IdeSettings) => {
    setSettings(newSettings);
    await api.saveSettings(newSettings);
  };

  const updateRules = async (newRules: ProjectRule[]) => {
    setRules(newRules);
    await api.saveRules(newRules);
  };

  const updateMemory = async (newMemory: ProjectMemoryItem[]) => {
    setMemory(newMemory);
    await api.saveMemory(newMemory);
  };

  return (
    <IdeContext.Provider
      value={{
        activePanel,
        setActivePanel,
        sidebarOpen,
        setSidebarOpen,
        terminalOpen,
        setTerminalOpen,
        aiPanelOpen,
        setAiPanelOpen,
        commandPaletteOpen,
        setCommandPaletteOpen,
        quickOpenOpen,
        setQuickOpenOpen,
        newProjectModalOpen,
        setNewProjectModalOpen,
        settingsModalOpen,
        setSettingsModalOpen,

        projectRoot,
        fileTree,
        refreshFileTree,
        openFile,
        createFile,
        createFolder,
        deleteFileOrFolder,
        renameFileOrFolder,

        tabs,
        activeTabId,
        setActiveTabId,
        updateTabContent,
        saveActiveFile,
        saveTab,
        closeTab,
        closeOtherTabs,
        closeAllTabs,
        setTabDiffMode,

        inlineAiVisible,
        setInlineAiVisible,
        inlineAiSelection,
        setInlineAiSelection,

        terminalSessions,
        activeTerminalId,
        setActiveTerminalId,
        createTerminalSession,
        killTerminalSession,
        runCommandInTerminal,

        gitStatus,
        refreshGitStatus,
        stageFile,
        stageAll,
        unstageFile,
        discardChanges,
        commitChanges,

        aiMode,
        setAiMode,
        selectedAgentId,
        setSelectedAgentId,
        currentThreadId,
        setCurrentThreadId,
        chatThreads,
        chatMessages,
        isAgentRunning,
        agentStatusText,
        currentStreamingText,
        activeToolCalls,
        activeDiffs,
        sendAgentPrompt,
        stopAgentTask,
        rollbackCheckpoint,
        clearCurrentChat,

        settings,
        updateSettings,
        rules,
        updateRules,
        memory,
        updateMemory,
        agents,
      }}
    >
      {children}
    </IdeContext.Provider>
  );
};

export const useIde = () => {
  const context = useContext(IdeContext);
  if (!context) {
    throw new Error('useIde must be used within an IdeProvider');
  }
  return context;
};
