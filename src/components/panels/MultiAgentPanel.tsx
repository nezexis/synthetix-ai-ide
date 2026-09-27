import React, { useState } from 'react';
import { Users, Sparkles, Plus, Play, CheckCircle, Shield } from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { SpecializedAgent } from '../../types';
import { api } from '../../services/api';

export const MultiAgentPanel: React.FC = () => {
  const { agents, setSelectedAgentId, setActivePanel, sendAgentPrompt } = useIde();
  const [taskInputs, setTaskInputs] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newPrompt, setNewPrompt] = useState('');

  const handleDispatch = (agent: SpecializedAgent) => {
    const task = taskInputs[agent.id];
    if (!task || !task.trim()) return;
    setSelectedAgentId(agent.id);
    setActivePanel('ai');
    sendAgentPrompt(task);
    setTaskInputs((prev) => ({ ...prev, [agent.id]: '' }));
  };

  const handleCreateAgent = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    const newAgent: SpecializedAgent = {
      id: `agent-${Date.now()}`,
      name: newName.trim(),
      role: newRole.trim() || 'custom',
      description: `Custom specialized agent: ${newName.trim()}`,
      systemPrompt: newPrompt.trim(),
      model: 'gemini-3.8-flash',
      allowedTools: ['read_file', 'write_file', 'execute_command', 'search_code'],
      avatarColor: '#06b6d4',
      status: 'idle',
    };
    const updated = [...agents, newAgent];
    await api.saveAgents(updated);
    setIsCreating(false);
    setNewName('');
    setNewRole('');
    setNewPrompt('');
  };

  return (
    <div className="h-full flex flex-col bg-[#14171d] text-xs">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#20242e] flex items-center justify-between text-[#8a92a6]">
        <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-300">
          <Users size={14} className="text-cyan-400" />
          <span>Multi-Agent Swarm</span>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center space-x-1 px-2 py-0.5 bg-[#1d222e] hover:bg-[#252c3c] text-cyan-300 rounded border border-[#2b3346] text-[11px] transition-colors"
        >
          <Plus size={12} />
          <span>New Agent</span>
        </button>
      </div>

      {/* Creator Form */}
      {isCreating && (
        <div className="p-3 border-b border-[#20242e] bg-[#171a23] space-y-2">
          <div className="text-[11px] font-semibold text-cyan-400">Create Custom Agent Mode</div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Agent Name (e.g. Python DevOps Engineer)"
            className="w-full bg-[#0f1116] border border-[#2b3140] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Role identifier (e.g. devops)"
            className="w-full bg-[#0f1116] border border-[#2b3140] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          />
          <textarea
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            placeholder="System instructions & persona guidelines..."
            rows={3}
            className="w-full bg-[#0f1116] border border-[#2b3140] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-sans"
          />
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              onClick={() => setIsCreating(false)}
              className="px-2.5 py-1 bg-[#222734] hover:bg-[#2b3242] text-gray-300 rounded text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateAgent}
              className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium"
            >
              Save Agent
            </button>
          </div>
        </div>
      )}

      {/* Agents List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="border border-[#20242e] rounded-xl p-3 bg-[#111318] space-y-2.5 hover:border-[#2a303f] transition-colors"
          >
            {/* Header info */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div
                  style={{ backgroundColor: `${agent.avatarColor}20`, borderColor: agent.avatarColor }}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center font-bold text-white text-xs shadow-xs"
                >
                  <Users size={14} style={{ color: agent.avatarColor }} />
                </div>
                <div>
                  <div className="font-semibold text-gray-200 text-xs">{agent.name}</div>
                  <div className="text-[10px] text-[#697288] uppercase tracking-wide font-mono">
                    {agent.role} • {agent.model}
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
                Active
              </span>
            </div>

            <p className="text-[11px] text-[#7d879d] leading-relaxed">{agent.description}</p>

            {/* Allowed tools */}
            <div className="flex flex-wrap gap-1">
              {agent.allowedTools.map((t) => (
                <span
                  key={t}
                  className="text-[9px] font-mono bg-[#181b24] text-[#8e98b0] px-1.5 py-0.5 rounded border border-[#232733]"
                >
                  {t}
                </span>
              ))}
            </div>

            {/* Direct Task Dispatch Input */}
            <div className="pt-1 flex items-center space-x-1.5">
              <input
                type="text"
                value={taskInputs[agent.id] || ''}
                onChange={(e) =>
                  setTaskInputs((prev) => ({ ...prev, [agent.id]: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDispatch(agent);
                }}
                placeholder={`Assign task to ${agent.name}...`}
                className="flex-1 bg-[#0b0c10] border border-[#252a36] focus:border-cyan-500 rounded px-2 py-1 text-[11px] text-white placeholder-[#505769] focus:outline-none font-sans"
              />
              <button
                onClick={() => handleDispatch(agent)}
                disabled={!taskInputs[agent.id]?.trim()}
                className="p-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white rounded transition-colors"
                title="Dispatch task"
              >
                <Play size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
