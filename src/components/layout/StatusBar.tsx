import React from 'react';
import {
  GitBranch,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Terminal as TerminalIcon,
  Wifi,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';

export const StatusBar: React.FC = () => {
  const {
    gitStatus,
    tabs,
    activeTabId,
    settings,
    terminalOpen,
    setTerminalOpen,
    isAgentRunning,
    agentStatusText,
    setSettingsModalOpen,
  } = useIde();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const branch = gitStatus?.branch || 'main';

  return (
    <footer className="h-6 bg-[#101216] border-t border-[#1e222a] flex items-center justify-between px-2.5 text-[11px] text-[#788094] select-none z-30 font-mono">
      {/* Left indicators */}
      <div className="flex items-center space-x-3">
        {/* Git branch */}
        <div
          className="flex items-center space-x-1.5 hover:text-white cursor-pointer transition-colors"
          title={`Git Branch: ${branch}`}
        >
          <GitBranch size={12} className="text-cyan-400" />
          <span>{branch}</span>
          {gitStatus && gitStatus.files.length > 0 && (
            <span className="text-[10px] text-yellow-400 font-semibold">*{gitStatus.files.length}</span>
          )}
        </div>

        <div className="h-3 w-[1px] bg-[#222631]" />

        {/* Diagnostics status */}
        <div className="flex items-center space-x-2 text-[#8b93a8]">
          <span className="flex items-center space-x-0.5 text-emerald-400">
            <CheckCircle size={11} />
            <span>0</span>
          </span>
          <span className="flex items-center space-x-0.5 text-yellow-400">
            <AlertCircle size={11} />
            <span>0</span>
          </span>
        </div>

        <div className="h-3 w-[1px] bg-[#222631]" />

        {/* Agent live status */}
        <div className="flex items-center space-x-1.5">
          <Sparkles
            size={12}
            className={isAgentRunning ? 'text-cyan-400 animate-spin' : 'text-gray-500'}
          />
          <span className={`text-[11px] font-sans ${isAgentRunning ? 'text-cyan-300 font-medium' : 'text-[#788094]'}`}>
            {isAgentRunning ? `AI: ${agentStatusText}` : 'AI Ready'}
          </span>
        </div>
      </div>

      {/* Right indicators */}
      <div className="flex items-center space-x-3">
        {activeTab && (
          <>
            <span>
              Ln {activeTab.cursorLine || 1}, Col {activeTab.cursorColumn || 1}
            </span>
            <div className="h-3 w-[1px] bg-[#222631]" />
            <span>Spaces: {settings.editor.tabSize}</span>
            <div className="h-3 w-[1px] bg-[#222631]" />
            <span>UTF-8</span>
            <div className="h-3 w-[1px] bg-[#222631]" />
            <span className="uppercase text-cyan-400">{activeTab.language}</span>
            <div className="h-3 w-[1px] bg-[#222631]" />
          </>
        )}

        {/* Model badge */}
        <button
          onClick={() => setSettingsModalOpen(true)}
          className="flex items-center space-x-1 text-cyan-300 hover:text-white transition-colors"
          title="Active AI Model"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>{settings.ai.agentModel}</span>
        </button>

        <div className="h-3 w-[1px] bg-[#222631]" />

        {/* Terminal toggle */}
        <button
          onClick={() => setTerminalOpen(!terminalOpen)}
          className={`flex items-center space-x-1 transition-colors ${
            terminalOpen ? 'text-cyan-400' : 'hover:text-white'
          }`}
          title="Toggle Terminal"
        >
          <TerminalIcon size={12} />
          <span>Terminal</span>
        </button>
      </div>
    </footer>
  );
};
