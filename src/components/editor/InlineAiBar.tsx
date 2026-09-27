import React, { useState } from 'react';
import { Sparkles, Check, X, ArrowRight, Loader2 } from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { api } from '../../services/api';

interface InlineAiBarProps {
  onApplyReplacement: (replacement: string) => void;
  onClose: () => void;
}

export const InlineAiBar: React.FC<InlineAiBarProps> = ({ onApplyReplacement, onClose }) => {
  const { inlineAiSelection, tabs, activeTabId } = useIde();
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewReplacement, setPreviewReplacement] = useState<string | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!instruction.trim() || !inlineAiSelection || !activeTab) return;

    setLoading(true);
    try {
      const replacement = await api.getInlineEdit({
        instruction,
        selectedCode: inlineAiSelection.text,
        fullFileContent: activeTab.content,
        filePath: activeTab.filePath,
        language: activeTab.language,
      });
      setPreviewReplacement(replacement);
    } catch (err) {
      console.error('Inline AI error:', err);
    } finally {
      setLoading(false);
    }
  };

  const quickPills = [
    'Add error handling',
    'Optimize performance',
    'Add TypeScript types',
    'Add comments & documentation',
    'Refactor to clean code',
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-xl bg-[#161920] border border-cyan-500/40 rounded-xl shadow-2xl shadow-black/80 z-40 p-3 select-none backdrop-blur-md">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#252a36]">
        <div className="flex items-center space-x-2">
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <Sparkles size={12} />
          </div>
          <span className="text-xs font-semibold text-gray-200">
            Inline AI Editor (Cmd+K)
          </span>
          {inlineAiSelection && (
            <span className="text-[10px] font-mono text-[#8a92a6] bg-[#1d212b] px-1.5 py-0.5 rounded">
              Lines {inlineAiSelection.startLine}–{inlineAiSelection.endLine}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-[#788094] hover:text-white p-1 rounded transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Input */}
      {!previewReplacement ? (
        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="relative">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="What would you like AI to change in the selected code? (e.g. Optimize, fix bug, add types...)"
              autoFocus
              className="w-full bg-[#0f1115] border border-[#272c3a] focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white placeholder-[#5d6478] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !instruction.trim()}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#202530] text-white disabled:text-[#52596d] px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-colors"
            >
              {loading ? (
                <Loader2 size={12} className="animate-spin text-cyan-300" />
              ) : (
                <>
                  <span>Generate</span>
                  <ArrowRight size={11} />
                </>
              )}
            </button>
          </div>

          {/* Quick pills */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {quickPills.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => {
                  setInstruction(pill);
                }}
                className="text-[10px] bg-[#1a1e28] hover:bg-[#232938] text-[#8e97af] hover:text-gray-200 px-2 py-0.5 rounded-full border border-[#2a3040] transition-colors"
              >
                {pill}
              </button>
            ))}
          </div>
        </form>
      ) : (
        /* Preview & Confirmation */
        <div className="space-y-3">
          <div className="text-xs text-[#a0a8be] font-medium">Proposed Code Replacement:</div>
          <div className="max-h-56 overflow-y-auto bg-[#0d0f13] border border-[#252a36] rounded-lg p-2.5 font-mono text-xs text-gray-200 whitespace-pre">
            {previewReplacement}
          </div>

          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              onClick={() => setPreviewReplacement(null)}
              className="px-3 py-1 bg-[#1e222d] hover:bg-[#282e3c] text-gray-300 rounded text-xs transition-colors"
            >
              Back
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 rounded text-xs transition-colors flex items-center space-x-1"
            >
              <X size={12} />
              <span>Reject</span>
            </button>
            <button
              onClick={() => {
                onApplyReplacement(previewReplacement);
                onClose();
              }}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium transition-colors flex items-center space-x-1 shadow-sm"
            >
              <Check size={12} />
              <span>Accept & Apply</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
