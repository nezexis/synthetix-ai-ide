import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Plus,
  Minus,
  RotateCcw,
  Check,
  RefreshCw,
  GitCommit,
  Clock,
  FileCode,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { api } from '../../services/api';
import { GitCommitRecord } from '../../types';

export const GitPanel: React.FC = () => {
  const {
    gitStatus,
    refreshGitStatus,
    stageFile,
    stageAll,
    unstageFile,
    discardChanges,
    commitChanges,
    openFile,
    setTabDiffMode,
    tabs,
  } = useIde();

  const [commitMessage, setCommitMessage] = useState('');
  const [branches, setBranches] = useState<{ current: string; all: string[] }>({
    current: 'main',
    all: ['main'],
  });
  const [newBranchName, setNewBranchName] = useState('');
  const [showNewBranch, setShowNewBranch] = useState(false);
  const [commits, setCommits] = useState<GitCommitRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGitData();
  }, []);

  const loadGitData = async () => {
    setLoading(true);
    try {
      await refreshGitStatus();
      const b = await api.getGitBranches();
      setBranches(b);
      const logs = await api.getGitLog(10);
      setCommits(logs);
    } catch (e) {
      console.error('Git load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    const ok = await commitChanges(commitMessage.trim());
    if (ok) {
      setCommitMessage('');
      loadGitData();
    }
  };

  const handleCreateBranch = async () => {
    if (!newBranchName.trim()) return;
    await api.switchBranch(newBranchName.trim(), true);
    setShowNewBranch(false);
    setNewBranchName('');
    loadGitData();
  };

  const handleSwitchBranch = async (name: string) => {
    await api.switchBranch(name, false);
    loadGitData();
  };

  const stagedFiles = gitStatus?.files.filter((f) => f.staged) || [];
  const unstagedFiles = gitStatus?.files.filter((f) => !f.staged) || [];

  const handleViewDiff = async (filePath: string) => {
    await openFile(filePath);
    const diff = await api.getGitDiff(filePath);
    const tab = tabs.find((t) => t.filePath === filePath);
    if (tab) {
      setTabDiffMode(tab.id, true, tab.originalContent);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#14171d] text-xs">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#20242e] flex items-center justify-between text-[#8a92a6]">
        <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-300">
          <GitBranch size={13} className="text-cyan-400" />
          <span>Source Control</span>
        </div>

        <button
          onClick={loadGitData}
          className="p-1 hover:text-white rounded hover:bg-[#1e222d] transition-colors"
          title="Refresh Git status"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin text-cyan-400' : ''} />
        </button>
      </div>

      {/* Branch selector */}
      <div className="px-3 py-2 border-b border-[#20242e] bg-[#111318] flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-gray-300 truncate font-mono text-[11px]">
          <GitBranch size={12} className="text-cyan-400" />
          <select
            value={branches.current}
            onChange={(e) => handleSwitchBranch(e.target.value)}
            className="bg-transparent text-gray-200 focus:outline-none cursor-pointer"
          >
            {branches.all.map((b) => (
              <option key={b} value={b} className="bg-[#181b24] text-white">
                {b}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => setShowNewBranch(!showNewBranch)}
          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center space-x-0.5"
        >
          <Plus size={11} />
          <span>Branch</span>
        </button>
      </div>

      {/* New branch input */}
      {showNewBranch && (
        <div className="p-2 bg-[#171a23] border-b border-[#20242e] flex items-center space-x-1.5">
          <input
            type="text"
            value={newBranchName}
            onChange={(e) => setNewBranchName(e.target.value)}
            placeholder="new-branch-name"
            className="flex-1 bg-[#0f1116] border border-[#2c3242] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleCreateBranch}
            className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs"
          >
            Create
          </button>
        </div>
      )}

      {/* Commit Box */}
      <div className="p-3 border-b border-[#20242e] space-y-2">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message (Cmd+Enter to commit)..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleCommit();
            }
          }}
          className="w-full bg-[#0f1116] border border-[#272c3a] focus:border-cyan-500 rounded p-2 text-xs text-white placeholder-[#5a6276] focus:outline-none resize-none font-sans"
        />
        <button
          onClick={handleCommit}
          disabled={!commitMessage.trim()}
          className="w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#1d222e] text-white disabled:text-[#52596d] rounded font-semibold text-xs transition-colors flex items-center justify-center space-x-1 shadow-xs"
        >
          <Check size={13} />
          <span>Commit Changes</span>
        </button>
      </div>

      {/* Changes list */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1c202a]">
        {/* Staged Changes */}
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#697289] px-1">
            <span>Staged Changes ({stagedFiles.length})</span>
          </div>

          {stagedFiles.map((file) => (
            <div
              key={file.path}
              onClick={() => handleViewDiff(file.path)}
              className="group flex items-center justify-between py-1 px-1.5 hover:bg-[#1c202a] rounded cursor-pointer text-gray-300 font-mono text-[11px]"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <FileCode size={12} className="text-emerald-400" />
                <span className="truncate">{file.path}</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    unstageFile(file.path);
                  }}
                  title="Unstage"
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white"
                >
                  <Minus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Changes */}
        <div className="p-2 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-[#697289] px-1">
            <span>Changes ({unstagedFiles.length})</span>
            {unstagedFiles.length > 0 && (
              <button
                onClick={stageAll}
                className="hover:text-cyan-400 text-[10px] font-normal lowercase tracking-normal"
                title="Stage All"
              >
                + stage all
              </button>
            )}
          </div>

          {unstagedFiles.map((file) => (
            <div
              key={file.path}
              onClick={() => handleViewDiff(file.path)}
              className="group flex items-center justify-between py-1 px-1.5 hover:bg-[#1c202a] rounded cursor-pointer text-gray-300 font-mono text-[11px]"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <FileCode
                  size={12}
                  className={file.status === 'untracked' ? 'text-yellow-400' : 'text-cyan-400'}
                />
                <span className="truncate">{file.path}</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    discardChanges(file.path);
                  }}
                  title="Discard changes"
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-400"
                >
                  <RotateCcw size={11} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    stageFile(file.path);
                  }}
                  title="Stage"
                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white"
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Commit History */}
        <div className="p-2 space-y-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#697289] px-1 flex items-center space-x-1">
            <Clock size={11} />
            <span>Commit History</span>
          </div>

          <div className="space-y-1 font-mono text-[11px]">
            {commits.map((c) => (
              <div
                key={c.hash}
                className="p-1.5 bg-[#101217] rounded border border-[#20242e] space-y-0.5"
              >
                <div className="flex items-center justify-between text-cyan-400">
                  <span className="font-bold">{c.shortHash}</span>
                  <span className="text-[10px] text-[#555d72]">{c.date}</span>
                </div>
                <div className="text-gray-300 truncate font-sans text-xs">{c.message}</div>
                <div className="text-[10px] text-[#69738c]">{c.author}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
