import React from 'react';
import {
  Code2,
  Play,
  Terminal,
  Save,
  Search,
  Settings,
  PanelLeft,
  PanelRight,
  Sparkles,
  FolderOpen,
  Plus,
  Command,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { AiMode } from '../../types';

export const Header: React.FC = () => {
  const {
    projectRoot,
    tabs,
    activeTabId,
    saveActiveFile,
    sidebarOpen,
    setSidebarOpen,
    terminalOpen,
    setTerminalOpen,
    aiPanelOpen,
    setAiPanelOpen,
    aiMode,
    setAiMode,
    setCommandPaletteOpen,
    setQuickOpenOpen,
    setNewProjectModalOpen,
    setSettingsModalOpen,
    runCommandInTerminal,
    isAgentRunning,
  } = useIde();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const projectName = projectRoot.split('/').pop() || 'Workspace';

  const handleRunTests = async () => {
    setTerminalOpen(true);
    await runCommandInTerminal('npm test');
  };

  const handleRunProject = async () => {
    setTerminalOpen(true);
    await runCommandInTerminal('npm start');
  };

  return (
    <header className="h-10 bg-[#16181d] border-b border-[#232730] flex items-center justify-between px-3 select-none text-xs text-[#a0a5b5] z-30">
      {/* Left: Branding & Project Root */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 text-white font-semibold tracking-wide">
          <div className="w-5 h-5 rounded bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm">
            <Code2 size={13} className="text-white" />
          </div>
          <span className="text-xs font-bold text-gray-200 tracking-wider">SYNTHETIX</span>
          <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-cyan-950/80 border border-cyan-700/50 text-cyan-300">
            IDE
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#2a2f3d]" />

        {/* Project Path & Breadcrumb */}
        <div className="flex items-center space-x-1.5 text-[#8890a6]">
          <FolderOpen size={13} className="text-cyan-400" />
          <button
            onClick={() => setNewProjectModalOpen(true)}
            title="Switch or create project"
            className="hover:text-white font-medium truncate max-w-[150px] transition-colors flex items-center gap-1"
          >
            <span>{projectName}</span>
          </button>
          {activeTab && (
            <>
              <span className="text-[#454c5f]">/</span>
              <span className="text-gray-300 font-mono text-[11px] truncate max-w-[200px]">
                {activeTab.filePath}
              </span>
              {activeTab.isDirty && (
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse" title="Unsaved changes" />
              )}
            </>
          )}
        </div>
      </div>

      {/* Center: Search & Command Palette Bar */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setQuickOpenOpen(true)}
          className="flex items-center space-x-2 bg-[#1d212a] hover:bg-[#252a36] text-[#8e95aa] hover:text-gray-200 px-3 py-1 rounded border border-[#2c3242] transition-colors text-[11px]"
          title="Search files (Ctrl+P / Cmd+P)"
        >
          <Search size={12} />
          <span>Quick Open</span>
          <kbd className="bg-[#12141a] px-1.5 py-0.5 rounded text-[10px] text-[#697289] font-mono border border-[#2a2f3d]">
            ⌘P
          </kbd>
        </button>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center space-x-2 bg-[#1d212a] hover:bg-[#252a36] text-[#8e95aa] hover:text-gray-200 px-3 py-1 rounded border border-[#2c3242] transition-colors text-[11px]"
          title="Command Palette (Ctrl+Shift+P / Cmd+Shift+P)"
        >
          <Command size={12} />
          <span>Commands</span>
          <kbd className="bg-[#12141a] px-1.5 py-0.5 rounded text-[10px] text-[#697289] font-mono border border-[#2a2f3d]">
            ⌘⇧P
          </kbd>
        </button>
      </div>

      {/* Right: AI Mode Pills & Control Toggles */}
      <div className="flex items-center space-x-2">
        {/* Mode Selector */}
        <div className="flex items-center bg-[#13161c] p-0.5 rounded border border-[#262b38]">
          {(['agent', 'ask', 'plan', 'debug'] as AiMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setAiMode(mode)}
              className={`px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider transition-colors ${
                aiMode === mode
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-xs'
                  : 'text-[#7e859b] hover:text-gray-200'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Quick Action Buttons */}
        <button
          onClick={handleRunTests}
          className="flex items-center space-x-1 px-2.5 py-1 bg-[#1a2333] hover:bg-[#223048] text-cyan-300 rounded border border-cyan-800/40 text-[11px] font-medium transition-colors"
          title="Run test suite (npm test)"
        >
          <Play size={11} className="fill-cyan-400 text-cyan-400" />
          <span>Tests</span>
        </button>

        <button
          onClick={saveActiveFile}
          disabled={!activeTab?.isDirty}
          className={`p-1.5 rounded transition-colors ${
            activeTab?.isDirty
              ? 'text-cyan-400 hover:bg-[#202531]'
              : 'text-[#485065] cursor-not-allowed'
          }`}
          title="Save file (Ctrl+S / Cmd+S)"
        >
          <Save size={14} />
        </button>

        <div className="h-4 w-[1px] bg-[#2a2f3d]" />

        {/* View Layout Toggles */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`p-1.5 rounded transition-colors ${
            sidebarOpen ? 'text-cyan-400 bg-[#1e232f]' : 'text-[#7e859b] hover:text-gray-200'
          }`}
          title="Toggle Sidebar (Ctrl+B)"
        >
          <PanelLeft size={14} />
        </button>

        <button
          onClick={() => setTerminalOpen(!terminalOpen)}
          className={`p-1.5 rounded transition-colors ${
            terminalOpen ? 'text-cyan-400 bg-[#1e232f]' : 'text-[#7e859b] hover:text-gray-200'
          }`}
          title="Toggle Terminal (Ctrl+`)"
        >
          <Terminal size={14} />
        </button>

        <button
          onClick={() => setAiPanelOpen(!aiPanelOpen)}
          className={`p-1.5 rounded transition-colors ${
            aiPanelOpen ? 'text-cyan-400 bg-[#1e232f]' : 'text-[#7e859b] hover:text-gray-200'
          }`}
          title="Toggle AI Panel"
        >
          <PanelRight size={14} />
        </button>

        <button
          onClick={() => setSettingsModalOpen(true)}
          className="p-1.5 text-[#7e859b] hover:text-gray-200 hover:bg-[#202531] rounded transition-colors"
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
    </header>
  );
};
