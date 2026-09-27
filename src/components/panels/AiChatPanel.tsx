import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Square,
  Paperclip,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  FileCode,
  Terminal,
  Play,
  GitBranch,
  ChevronDown,
  Layers,
  Trash2,
  Plus,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { AiMode, ChatMessage } from '../../types';

export const AiChatPanel: React.FC = () => {
  const {
    aiMode,
    setAiMode,
    selectedAgentId,
    setSelectedAgentId,
    agents,
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
    fileTree,
    openFile,
    setTabDiffMode,
    tabs,
  } = useIde();

  const [prompt, setPrompt] = useState('');
  const [contextFiles, setContextFiles] = useState<string[]>([]);
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, currentStreamingText, activeToolCalls]);

  const handleSend = () => {
    if (!prompt.trim() || isAgentRunning) return;
    sendAgentPrompt(prompt, contextFiles, attachedImages);
    setPrompt('');
    setContextFiles([]);
    setAttachedImages([]);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string)?.split(',')[1];
      if (base64) {
        setAttachedImages((prev) => [...prev, base64]);
      }
    };
    reader.readAsDataURL(file);
  };

  // Collect flat list of project files for @-attachment
  const getAllFiles = (tree: any[], list: string[] = []): string[] => {
    for (const item of tree) {
      if (!item.isDirectory) list.push(item.relativePath);
      if (item.children) getAllFiles(item.children, list);
    }
    return list;
  };
  const availableFiles = getAllFiles(fileTree);

  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  return (
    <div className="h-full flex flex-col bg-[#13151b] text-xs">
      {/* Top Bar: Mode, Specialized Agent, Clear */}
      <div className="h-10 px-3 border-b border-[#20242e] flex items-center justify-between text-[#8a92a6] bg-[#151820]">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 font-bold text-gray-200">
            <Sparkles size={14} className="text-cyan-400" />
            <span className="text-[11px] uppercase tracking-wider">AI Studio</span>
          </div>

          {/* Mode Pill */}
          <select
            value={aiMode}
            onChange={(e) => setAiMode(e.target.value as AiMode)}
            className="bg-[#1a1e28] text-cyan-300 font-mono text-[11px] border border-[#2c3343] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer uppercase"
          >
            <option value="agent">Agent (Autonomous)</option>
            <option value="ask">Ask (Read-Only)</option>
            <option value="plan">Plan (Architectural)</option>
            <option value="debug">Debug (Error Solver)</option>
          </select>
        </div>

        <div className="flex items-center space-x-1">
          {/* Agent Role Switcher */}
          <select
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            className="bg-[#1a1e28] text-gray-300 text-[11px] border border-[#2c3343] rounded px-1.5 py-0.5 focus:outline-none cursor-pointer max-w-[110px] truncate"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>

          <button
            onClick={clearCurrentChat}
            title="Clear Chat History"
            className="p-1 hover:text-red-400 rounded hover:bg-[#1f2430] transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4 font-sans select-text">
        {chatMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-3 text-[#586177]">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-center justify-center text-cyan-400">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-300">
                {selectedAgent?.name || 'Autonomous Agent'}
              </p>
              <p className="text-[11px] text-[#69738c] max-w-xs mt-1">
                {selectedAgent?.description ||
                  'Ask me to write features, optimize code, run tests, or debug errors.'}
              </p>
            </div>

            {/* Quick Starters */}
            <div className="w-full max-w-xs space-y-1.5 pt-2">
              {[
                'Add Fibonacci algorithm in src/math.js with tests',
                'Run automated tests and fix any failing assertions',
                'Explain the project architecture and structure',
                'Create a REST API route in src/index.js',
              ].map((starter, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(starter)}
                  className="w-full text-left px-2.5 py-1.5 bg-[#171a22] hover:bg-[#1d222d] border border-[#242936] hover:border-cyan-600/50 rounded text-[11px] text-gray-300 transition-colors"
                >
                  {starter}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Render Chat History */}
        {chatMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col space-y-2 ${
              msg.role === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            {/* Message Bubble */}
            <div
              className={`max-w-[95%] rounded-xl p-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-gradient-to-r from-cyan-900/60 to-blue-900/60 border border-cyan-700/50 text-white'
                  : 'bg-[#181b23] border border-[#252a36] text-gray-200'
              }`}
            >
              {/* Context pills on user message */}
              {msg.contextFiles && msg.contextFiles.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {msg.contextFiles.map((f, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] bg-black/40 px-2 py-0.5 rounded font-mono text-cyan-300 border border-cyan-800/40"
                    >
                      @{f}
                    </span>
                  ))}
                </div>
              )}

              {/* Text content */}
              <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

              {/* Render Tool Calls Record */}
              {msg.toolCalls && msg.toolCalls.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#2a2f3f] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#697289]">
                    Executed Tools ({msg.toolCalls.length})
                  </div>
                  <div className="space-y-1">
                    {msg.toolCalls.map((tool) => (
                      <div
                        key={tool.id}
                        className="p-1.5 bg-[#12141a] border border-[#232733] rounded text-[11px] font-mono"
                      >
                        <div className="flex items-center justify-between text-gray-300">
                          <div className="flex items-center space-x-1.5">
                            {tool.status === 'success' ? (
                              <CheckCircle size={12} className="text-emerald-400" />
                            ) : tool.status === 'error' ? (
                              <AlertCircle size={12} className="text-red-400" />
                            ) : (
                              <Sparkles size={12} className="text-cyan-400 animate-spin" />
                            )}
                            <span className="font-semibold text-cyan-300">{tool.name}</span>
                          </div>
                          {tool.durationMs && (
                            <span className="text-[10px] text-[#555d72]">
                              {tool.durationMs}ms
                            </span>
                          )}
                        </div>
                        {tool.args && Object.keys(tool.args).length > 0 && (
                          <div className="text-[10px] text-[#6e7790] truncate mt-0.5">
                            {JSON.stringify(tool.args)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Render File Diffs */}
              {msg.diffs && msg.diffs.length > 0 && (
                <div className="mt-3 pt-2 border-t border-[#2a2f3f] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-[#697289]">
                    <span>Modified Files ({msg.diffs.length})</span>
                    {msg.checkpointId && (
                      <button
                        onClick={() => rollbackCheckpoint(msg.checkpointId!)}
                        className="text-yellow-400 hover:text-yellow-300 flex items-center space-x-1"
                        title="Rollback all changes made in this task"
                      >
                        <RotateCcw size={10} />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    {msg.diffs.map((diff, i) => (
                      <div
                        key={i}
                        className="p-1.5 bg-[#12141a] border border-[#232733] rounded flex items-center justify-between text-[11px] font-mono"
                      >
                        <div
                          onClick={() => {
                            openFile(diff.filePath);
                            const foundTab = tabs.find((t) => t.filePath === diff.filePath);
                            if (foundTab) {
                              setTabDiffMode(foundTab.id, true, diff.oldContent);
                            }
                          }}
                          className="flex items-center space-x-1.5 text-cyan-300 hover:underline cursor-pointer truncate"
                        >
                          <FileCode size={12} />
                          <span className="truncate">{diff.filePath}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px]">
                          <span className="text-emerald-400">+{diff.additions}</span>
                          <span className="text-red-400">-{diff.deletions}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Live streaming bubble while Agent is running */}
        {isAgentRunning && (
          <div className="flex flex-col space-y-2 items-start">
            <div className="max-w-[95%] rounded-xl p-3 text-xs leading-relaxed bg-[#181b23] border border-cyan-500/30 text-gray-200 space-y-2">
              <div className="flex items-center space-x-2 text-cyan-400 font-semibold text-[11px]">
                <Sparkles size={13} className="animate-spin text-cyan-400" />
                <span>{agentStatusText}</span>
              </div>

              {/* Real-time active tool calls */}
              {activeToolCalls.length > 0 && (
                <div className="space-y-1">
                  {activeToolCalls.map((tool) => (
                    <div
                      key={tool.id}
                      className="p-1.5 bg-[#101217] border border-[#232733] rounded text-[11px] font-mono flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-1.5 text-cyan-300">
                        {tool.status === 'success' ? (
                          <CheckCircle size={12} className="text-emerald-400" />
                        ) : tool.status === 'error' ? (
                          <AlertCircle size={12} className="text-red-400" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                        )}
                        <span>{tool.name}</span>
                      </div>
                      <span className="text-[10px] text-[#5b647c]">running</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Streaming token text */}
              {currentStreamingText && (
                <div className="whitespace-pre-wrap font-sans text-gray-300 pt-1">
                  {currentStreamingText}
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Context Attachments Bar */}
      {(contextFiles.length > 0 || attachedImages.length > 0) && (
        <div className="px-3 py-1.5 bg-[#171a22] border-t border-[#20242e] flex flex-wrap gap-1.5 items-center">
          {contextFiles.map((f, i) => (
            <span
              key={i}
              className="text-[10px] font-mono bg-cyan-950/60 border border-cyan-700/50 text-cyan-300 px-2 py-0.5 rounded-full flex items-center space-x-1"
            >
              <span>@{f}</span>
              <button
                onClick={() => setContextFiles((prev) => prev.filter((_, idx) => idx !== i))}
                className="hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
          {attachedImages.map((_, i) => (
            <span
              key={i}
              className="text-[10px] bg-purple-950/60 border border-purple-700/50 text-purple-300 px-2 py-0.5 rounded-full flex items-center space-x-1"
            >
              <span>Image {i + 1}</span>
              <button
                onClick={() => setAttachedImages((prev) => prev.filter((_, idx) => idx !== i))}
                className="hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input Box & Action Controls */}
      <div className="p-3 border-t border-[#20242e] bg-[#14171d] space-y-2">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Ask ${selectedAgent?.name || 'Agent'} or describe feature/bug...`}
            rows={3}
            className="w-full bg-[#0f1115] border border-[#272c3a] focus:border-cyan-500 rounded-lg p-2.5 text-xs text-white placeholder-[#5a6276] focus:outline-none resize-none font-sans"
          />

          <div className="flex items-center justify-between pt-1">
            {/* Attachment buttons */}
            <div className="flex items-center space-x-1 text-[#6e7790]">
              {/* @-File picker button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAttachMenu(!showAttachMenu)}
                  className="p-1.5 hover:text-white hover:bg-[#1e232e] rounded transition-colors"
                  title="Attach file context (@)"
                >
                  <Paperclip size={14} />
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-8 left-0 w-52 max-h-48 overflow-y-auto bg-[#171a23] border border-[#282e3c] rounded-lg shadow-xl p-1 z-30 font-mono text-[11px]">
                    <div className="px-2 py-1 text-[10px] uppercase font-bold text-[#5e667b]">
                      Attach File:
                    </div>
                    {availableFiles.map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          if (!contextFiles.includes(f)) setContextFiles((prev) => [...prev, f]);
                          setShowAttachMenu(false);
                        }}
                        className="w-full text-left px-2 py-1 hover:bg-[#202533] text-gray-300 hover:text-white rounded truncate"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Vision image upload */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 hover:text-white hover:bg-[#1e232e] rounded transition-colors"
                title="Attach UI Mockup or Screenshot"
              >
                <ImageIcon size={14} />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Send or Stop Button */}
            {isAgentRunning ? (
              <button
                type="button"
                onClick={stopAgentTask}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <Square size={12} className="fill-white" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSend}
                disabled={!prompt.trim()}
                className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
              >
                <span>Send</span>
                <Send size={12} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
