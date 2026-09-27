import React from 'react';
import {
  Files,
  Search,
  Sparkles,
  Users,
  GitBranch,
  BookOpen,
  CheckCircle2,
  Settings,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { ActivePanel } from '../../types';

export const ActivityBar: React.FC = () => {
  const {
    activePanel,
    setActivePanel,
    sidebarOpen,
    setSidebarOpen,
    gitStatus,
    isAgentRunning,
    setSettingsModalOpen,
  } = useIde();

  const handlePanelClick = (panel: ActivePanel) => {
    if (activePanel === panel && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setActivePanel(panel);
      setSidebarOpen(true);
    }
  };

  const modifiedGitCount = gitStatus?.files.length || 0;

  return (
    <aside className="w-12 bg-[#121418] border-r border-[#20242d] flex flex-col justify-between py-2 select-none z-20">
      {/* Top primary icons */}
      <div className="flex flex-col items-center space-y-1">
        {/* Explorer */}
        <button
          onClick={() => handlePanelClick('explorer')}
          title="File Explorer (Ctrl+Shift+E)"
          className={`relative p-2.5 rounded-lg transition-colors ${
            activePanel === 'explorer' && sidebarOpen
              ? 'text-cyan-400 bg-[#1c202a]'
              : 'text-[#6e758a] hover:text-gray-200 hover:bg-[#181b24]'
          }`}
        >
          <Files size={19} />
          {activePanel === 'explorer' && sidebarOpen && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
          )}
        </button>

        {/* Search */}
        <button
          onClick={() => handlePanelClick('search')}
          title="Search Codebase (Ctrl+Shift+F)"
          className={`relative p-2.5 rounded-lg transition-colors ${
            activePanel === 'search' && sidebarOpen
              ? 'text-cyan-400 bg-[#1c202a]'
              : 'text-[#6e758a] hover:text-gray-200 hover:bg-[#181b24]'
          }`}
        >
          <Search size={19} />
          {activePanel === 'search' && sidebarOpen && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
          )}
        </button>

        {/* AI Agent Chat */}
        <button
          onClick={() => handlePanelClick('ai')}
          title="AI Agent (Ctrl+Shift+A)"
          className={`relative p-2.5 rounded-lg transition-colors ${
            activePanel === 'ai' && sidebarOpen
              ? 'text-cyan-400 bg-[#1c202a]'
              : 'text-[#6e758a] hover:text-gray-200 hover:bg-[#181b24]'
          }`}
        >
          <Sparkles size={19} className={isAgentRunning ? 'text-cyan-400 animate-pulse' : ''} />
          {isAgentRunning && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          )}
          {activePanel === 'ai' && sidebarOpen && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
          )}
        </button>

        {/* Multi-Agent */}
        <button
          onClick={() => handlePanelClick('multiagent')}
          title="Multi-Agent Workgroup"
          className={`relative p-2.5 rounded-lg transition-colors ${
            activePanel === 'multiagent' && sidebarOpen
              ? 'text-cyan-400 bg-[#1c202a]'
              : 'text-[#6e758a] hover:text-gray-200 hover:bg-[#181b24]'
          }`}
        >
          <Users size={19} />
          {activePanel === 'multiagent' && sidebarOpen && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
          )}
        </button>

        {/* Source Control / Git */}
        <button
          onClick={() => handlePanelClick('git')}
          title="Source Control / Git (Ctrl+Shift+G)"
          className={`relative p-2.5 rounded-lg transition-colors ${
            activePanel === 'git' && sidebarOpen
              ? 'text-cyan-400 bg-[#1c202a]'
              : 'text-[#6e758a] hover:text-gray-200 hover:bg-[#181b24]'
          }`}
        >
          <GitBranch size={19} />
          {modifiedGitCount > 0 && (
            <span className="absolute bottom-1 right-1 bg-cyan-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {modifiedGitCount > 9 ? '9+' : modifiedGitCount}
            </span>
          )}
          {activePanel === 'git' && sidebarOpen && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
          )}
        </button>

        {/* Rules & Memory */}
        <button
          onClick={() => handlePanelClick('rules')}
          title="Project Rules & Architecture Memory"
          className={`relative p-2.5 rounded-lg transition-colors ${
            activePanel === 'rules' && sidebarOpen
              ? 'text-cyan-400 bg-[#1c202a]'
              : 'text-[#6e758a] hover:text-gray-200 hover:bg-[#181b24]'
          }`}
        >
          <BookOpen size={19} />
          {activePanel === 'rules' && sidebarOpen && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
          )}
        </button>

        {/* Code Review & Audit */}
        <button
          onClick={() => handlePanelClick('review')}
          title="AI Code Review & Quality Audit"
          className={`relative p-2.5 rounded-lg transition-colors ${
            activePanel === 'review' && sidebarOpen
              ? 'text-cyan-400 bg-[#1c202a]'
              : 'text-[#6e758a] hover:text-gray-200 hover:bg-[#181b24]'
          }`}
        >
          <CheckCircle2 size={19} />
          {activePanel === 'review' && sidebarOpen && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-cyan-400 rounded-r" />
          )}
        </button>
      </div>

      {/* Bottom icons */}
      <div className="flex flex-col items-center space-y-1">
        <button
          onClick={() => setSettingsModalOpen(true)}
          title="Preferences & Settings"
          className="p-2.5 rounded-lg text-[#6e758a] hover:text-gray-200 hover:bg-[#181b24] transition-colors"
        >
          <Settings size={19} />
        </button>
      </div>
    </aside>
  );
};
