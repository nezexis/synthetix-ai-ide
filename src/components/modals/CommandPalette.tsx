import React, { useState, useEffect } from 'react';
import {
  Command,
  Play,
  Terminal,
  Save,
  Files,
  GitBranch,
  Sparkles,
  Settings,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';

export const CommandPalette: React.FC = () => {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setTerminalOpen,
    terminalOpen,
    runCommandInTerminal,
    saveActiveFile,
    setActivePanel,
    setSidebarOpen,
    setSettingsModalOpen,
    setNewProjectModalOpen,
    setAiMode,
  } = useIde();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands = [
    {
      id: 'terminal-toggle',
      title: 'View: Toggle Integrated Terminal',
      category: 'Terminal',
      icon: Terminal,
      shortcut: 'Ctrl+`',
      action: () => setTerminalOpen(!terminalOpen),
    },
    {
      id: 'run-tests',
      title: 'Tasks: Run Test Suite (npm test)',
      category: 'Terminal',
      icon: Play,
      shortcut: 'F5',
      action: () => {
        setTerminalOpen(true);
        runCommandInTerminal('npm test');
      },
    },
    {
      id: 'run-start',
      title: 'Tasks: Start Application (npm start)',
      category: 'Terminal',
      icon: Play,
      shortcut: '',
      action: () => {
        setTerminalOpen(true);
        runCommandInTerminal('npm start');
      },
    },
    {
      id: 'file-save',
      title: 'File: Save Current File',
      category: 'File',
      icon: Save,
      shortcut: '⌘S',
      action: () => saveActiveFile(),
    },
    {
      id: 'view-explorer',
      title: 'View: Show File Explorer',
      category: 'View',
      icon: Files,
      shortcut: '⌘⇧E',
      action: () => {
        setActivePanel('explorer');
        setSidebarOpen(true);
      },
    },
    {
      id: 'view-git',
      title: 'View: Show Source Control (Git)',
      category: 'Git',
      icon: GitBranch,
      shortcut: '⌘⇧G',
      action: () => {
        setActivePanel('git');
        setSidebarOpen(true);
      },
    },
    {
      id: 'ai-agent',
      title: 'AI: Switch to Autonomous Agent Mode',
      category: 'AI',
      icon: Sparkles,
      shortcut: '',
      action: () => {
        setAiMode('agent');
        setActivePanel('ai');
        setSidebarOpen(true);
      },
    },
    {
      id: 'ai-debug',
      title: 'AI: Switch to Debug & Fix Mode',
      category: 'AI',
      icon: Sparkles,
      shortcut: '',
      action: () => {
        setAiMode('debug');
        setActivePanel('ai');
        setSidebarOpen(true);
      },
    },
    {
      id: 'ai-review',
      title: 'AI: Run Comprehensive Code Review Audit',
      category: 'AI',
      icon: CheckCircle2,
      shortcut: '',
      action: () => {
        setActivePanel('review');
        setSidebarOpen(true);
      },
    },
    {
      id: 'project-new',
      title: 'Project: Create or Switch Workspace',
      category: 'Project',
      icon: Files,
      shortcut: '',
      action: () => setNewProjectModalOpen(true),
    },
    {
      id: 'settings-open',
      title: 'Preferences: Open IDE Settings',
      category: 'Preferences',
      icon: Settings,
      shortcut: '⌘,',
      action: () => setSettingsModalOpen(true),
    },
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global keydown listeners for Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (e.key === 'Escape' && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  if (!commandPaletteOpen) return null;

  const executeSelected = (index: number) => {
    if (filtered[index]) {
      filtered[index].action();
      setCommandPaletteOpen(false);
      setQuery('');
    }
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 z-50 select-none p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#14171e] border border-[#2c3343] rounded-xl shadow-2xl overflow-hidden text-xs flex flex-col"
      >
        {/* Search Input */}
        <div className="p-3 border-b border-[#202531] flex items-center space-x-2 bg-[#171a23]">
          <Command size={15} className="text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % filtered.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                executeSelected(selectedIndex);
              }
            }}
            placeholder="Type a command or action name..."
            autoFocus
            className="flex-1 bg-transparent text-white placeholder-[#606980] focus:outline-none text-xs"
          />
        </div>

        {/* Commands List */}
        <div className="max-h-72 overflow-y-auto p-1.5 divide-y divide-[#181c25]">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-[#555d72]">No matching commands</div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={cmd.id}
                  onClick={() => executeSelected(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    isSelected ? 'bg-cyan-950/80 text-white' : 'text-[#8a92a6] hover:bg-[#1a1e28]'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon size={14} className={isSelected ? 'text-cyan-400' : 'text-[#5d657b]'} />
                    <span>{cmd.title}</span>
                  </div>
                  {cmd.shortcut && (
                    <kbd className="bg-[#101217] text-[#697288] px-1.5 py-0.5 rounded font-mono text-[10px] border border-[#222633]">
                      {cmd.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
