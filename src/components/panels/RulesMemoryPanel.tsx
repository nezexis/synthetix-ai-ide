import React, { useState } from 'react';
import { BookOpen, Brain, Plus, Check, Trash2 } from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { ProjectRule, ProjectMemoryItem } from '../../types';

export const RulesMemoryPanel: React.FC = () => {
  const { rules, updateRules, memory, updateMemory } = useIde();
  const [activeTab, setActiveTab] = useState<'rules' | 'memory'>('rules');

  // Rule creation state
  const [isAddingRule, setIsAddingRule] = useState(false);
  const [newRuleTitle, setNewRuleTitle] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<ProjectRule['category']>('code-style');
  const [newRuleContent, setNewRuleContent] = useState('');

  // Memory creation state
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [newMemSummary, setNewMemSummary] = useState('');
  const [newMemDetail, setNewMemDetail] = useState('');
  const [newMemCategory, setNewMemCategory] = useState<ProjectMemoryItem['category']>('architecture');

  const handleToggleRule = (id: string) => {
    const updated = rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    updateRules(updated);
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    updateRules(updated);
  };

  const handleSaveRule = () => {
    if (!newRuleTitle.trim() || !newRuleContent.trim()) return;
    const rule: ProjectRule = {
      id: `rule-${Date.now()}`,
      title: newRuleTitle.trim(),
      category: newRuleCategory,
      content: newRuleContent.trim(),
      enabled: true,
      scope: 'project',
    };
    updateRules([...rules, rule]);
    setIsAddingRule(false);
    setNewRuleTitle('');
    setNewRuleContent('');
  };

  const handleSaveMemory = () => {
    if (!newMemSummary.trim() || !newMemDetail.trim()) return;
    const item: ProjectMemoryItem = {
      id: `mem-${Date.now()}`,
      category: newMemCategory,
      summary: newMemSummary.trim(),
      detail: newMemDetail.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    updateMemory([...memory, item]);
    setIsAddingMemory(false);
    setNewMemSummary('');
    setNewMemDetail('');
  };

  const handleDeleteMemory = (id: string) => {
    const updated = memory.filter((m) => m.id !== id);
    updateMemory(updated);
  };

  return (
    <div className="h-full flex flex-col bg-[#14171d] text-xs">
      {/* Header Tabs */}
      <div className="h-10 px-3 border-b border-[#20242e] flex items-center justify-between text-[#8a92a6] bg-[#161921]">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center space-x-1.5 py-1 px-2 rounded font-medium text-xs transition-colors ${
              activeTab === 'rules'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                : 'hover:text-white'
            }`}
          >
            <BookOpen size={13} />
            <span>Rules ({rules.filter((r) => r.enabled).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('memory')}
            className={`flex items-center space-x-1.5 py-1 px-2 rounded font-medium text-xs transition-colors ${
              activeTab === 'memory'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                : 'hover:text-white'
            }`}
          >
            <Brain size={13} />
            <span>Memory ({memory.length})</span>
          </button>
        </div>

        <button
          onClick={() => {
            if (activeTab === 'rules') setIsAddingRule(!isAddingRule);
            else setIsAddingMemory(!isAddingMemory);
          }}
          className="p-1 hover:text-white rounded hover:bg-[#1e232e] text-cyan-400 transition-colors"
          title="Add Item"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Rules Tab Content */}
      {activeTab === 'rules' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Creator Form */}
          {isAddingRule && (
            <div className="p-2.5 bg-[#171a23] border border-[#262c3c] rounded-lg space-y-2">
              <div className="text-[11px] font-semibold text-cyan-300">New Project Rule</div>
              <input
                type="text"
                value={newRuleTitle}
                onChange={(e) => setNewRuleTitle(e.target.value)}
                placeholder="Rule Title (e.g. Always use Tailwind v4)"
                className="w-full bg-[#0f1116] border border-[#2c3242] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <select
                value={newRuleCategory}
                onChange={(e) => setNewRuleCategory(e.target.value as any)}
                className="w-full bg-[#0f1116] border border-[#2c3242] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
              >
                <option value="code-style">Code Style</option>
                <option value="architecture">Architecture</option>
                <option value="testing">Testing</option>
                <option value="security">Security</option>
                <option value="custom">Custom</option>
              </select>
              <textarea
                value={newRuleContent}
                onChange={(e) => setNewRuleContent(e.target.value)}
                placeholder="Rule description & AI instructions..."
                rows={2}
                className="w-full bg-[#0f1116] border border-[#2c3242] rounded p-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-sans"
              />
              <div className="flex justify-end space-x-1.5">
                <button
                  onClick={() => setIsAddingRule(false)}
                  className="px-2 py-0.5 bg-[#252a36] text-gray-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRule}
                  className="px-2 py-0.5 bg-cyan-600 text-white rounded text-xs font-medium"
                >
                  Save Rule
                </button>
              </div>
            </div>
          )}

          {/* Rules List */}
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-2.5 rounded-lg border transition-colors ${
                  rule.enabled
                    ? 'bg-[#12141a] border-[#242936]'
                    : 'bg-[#101115] border-[#1d2028] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() => handleToggleRule(rule.id)}
                      className="rounded accent-cyan-500 cursor-pointer"
                    />
                    <span className="font-semibold text-gray-200 text-xs">{rule.title}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-[#1c202a] text-[#8e98af]">
                      {rule.category}
                    </span>
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-[#606980] hover:text-red-400 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-[#788299] leading-relaxed pl-5 font-sans">
                  {rule.content}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory Tab Content */}
      {activeTab === 'memory' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Creator Form */}
          {isAddingMemory && (
            <div className="p-2.5 bg-[#171a23] border border-[#262c3c] rounded-lg space-y-2">
              <div className="text-[11px] font-semibold text-cyan-300">Add Project Memory</div>
              <input
                type="text"
                value={newMemSummary}
                onChange={(e) => setNewMemSummary(e.target.value)}
                placeholder="Key Decision / Convention Summary"
                className="w-full bg-[#0f1116] border border-[#2c3242] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <select
                value={newMemCategory}
                onChange={(e) => setNewMemCategory(e.target.value as any)}
                className="w-full bg-[#0f1116] border border-[#2c3242] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none"
              >
                <option value="architecture">Architecture</option>
                <option value="decision">Decision</option>
                <option value="convention">Convention</option>
                <option value="constraint">Constraint</option>
              </select>
              <textarea
                value={newMemDetail}
                onChange={(e) => setNewMemDetail(e.target.value)}
                placeholder="Technical details & rationale..."
                rows={2}
                className="w-full bg-[#0f1116] border border-[#2c3242] rounded p-2 text-xs text-white focus:outline-none focus:border-cyan-500 resize-none font-sans"
              />
              <div className="flex justify-end space-x-1.5">
                <button
                  onClick={() => setIsAddingMemory(false)}
                  className="px-2 py-0.5 bg-[#252a36] text-gray-300 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMemory}
                  className="px-2 py-0.5 bg-cyan-600 text-white rounded text-xs font-medium"
                >
                  Save Memory
                </button>
              </div>
            </div>
          )}

          {/* Memory items */}
          <div className="space-y-2">
            {memory.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-lg border bg-[#12141a] border-[#242936] space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-gray-200 text-xs">{item.summary}</span>
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300">
                      {item.category}
                    </span>
                    <button
                      onClick={() => handleDeleteMemory(item.id)}
                      className="text-[#606980] hover:text-red-400 p-0.5"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[#788299] leading-relaxed font-sans">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
