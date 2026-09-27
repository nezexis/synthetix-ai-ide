import React, { useState } from 'react';
import { X, Check, Sliders, Monitor, Sparkles, Terminal, GitBranch, Shield } from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { IdeSettings } from '../../types';

export const SettingsModal: React.FC = () => {
  const { settings, updateSettings, settingsModalOpen, setSettingsModalOpen } = useIde();
  const [activeTab, setActiveTab] = useState<'general' | 'editor' | 'ai' | 'terminal' | 'git' | 'privacy'>('general');
  const [form, setForm] = useState<IdeSettings>(settings);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!settingsModalOpen) return null;

  const handleSave = async () => {
    await updateSettings(form);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-3xl bg-[#14171d] border border-[#272d3b] rounded-2xl shadow-2xl flex flex-col h-[560px] overflow-hidden text-xs">
        {/* Modal Top Bar */}
        <div className="h-12 px-4 border-b border-[#20242e] flex items-center justify-between bg-[#171a22]">
          <div className="flex items-center space-x-2 text-white font-semibold text-sm">
            <Sliders size={16} className="text-cyan-400" />
            <span>IDE Preferences &amp; Settings</span>
          </div>
          <button
            onClick={() => setSettingsModalOpen(false)}
            className="text-[#6d768c] hover:text-white p-1 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body: Sidebar Navigation + Settings Form */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Tabs */}
          <div className="w-48 bg-[#111318] border-r border-[#20242e] p-2 space-y-1">
            {[
              { id: 'general', label: 'General', icon: Monitor },
              { id: 'editor', label: 'Editor', icon: Sliders },
              { id: 'ai', label: 'AI & Models', icon: Sparkles },
              { id: 'terminal', label: 'Terminal', icon: Terminal },
              { id: 'git', label: 'Git Control', icon: GitBranch },
              { id: 'privacy', label: 'Privacy & Security', icon: Shield },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/40'
                      : 'text-[#7e879e] hover:text-gray-200 hover:bg-[#181b23]'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-cyan-400' : 'text-[#606980]'} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Settings Fields */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* General */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Color Theme</label>
                  <select
                    value={form.general.theme}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        general: { ...form.general, theme: e.target.value as any },
                      })
                    }
                    className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="dark-modern">Dark Modern (Deep Slate &amp; Cyan)</option>
                    <option value="cyberpunk-navy">Cyberpunk Navy (Midnight Blue)</option>
                    <option value="monokai-pro">Monokai Pro (High Contrast)</option>
                    <option value="clean-light">Clean Light (Day Mode)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Language</label>
                  <select
                    value={form.general.language}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        general: { ...form.general, language: e.target.value as any },
                      })
                    }
                    className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="ru">Русский (Russian)</option>
                    <option value="en">English</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.general.autoSave}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        general: { ...form.general, autoSave: e.target.checked },
                      })
                    }
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-gray-300 font-medium">Auto-save edited files</span>
                </div>
              </div>
            )}

            {/* Editor */}
            {activeTab === 'editor' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Font Family</label>
                  <input
                    type="text"
                    value={form.editor.fontFamily}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        editor: { ...form.editor, fontFamily: e.target.value },
                      })
                    }
                    className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Font Size (px)</label>
                    <input
                      type="number"
                      value={form.editor.fontSize}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          editor: { ...form.editor, fontSize: parseInt(e.target.value, 10) || 14 },
                        })
                      }
                      className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Tab Size</label>
                    <input
                      type="number"
                      value={form.editor.tabSize}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          editor: { ...form.editor, tabSize: parseInt(e.target.value, 10) || 2 },
                        })
                      }
                      className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-1.5 text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.editor.minimap}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        editor: { ...form.editor, minimap: e.target.checked },
                      })
                    }
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-gray-300 font-medium">Show Minimap</span>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.editor.bracketPairColorization}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        editor: { ...form.editor, bracketPairColorization: e.target.checked },
                      })
                    }
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-gray-300 font-medium">Bracket Pair Colorization</span>
                </div>
              </div>
            )}

            {/* AI */}
            {activeTab === 'ai' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">AI Provider</label>
                  <select
                    value={form.ai.defaultProvider}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: { ...form.ai, defaultProvider: e.target.value as any },
                      })
                    }
                    className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-2 text-white focus:outline-none"
                  >
                    <option value="gemini">Google Gemini (Built-in via API Key)</option>
                    <option value="openai">OpenAI Compatible (Custom API / Ollama)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Agent Model</label>
                  <input
                    type="text"
                    value={form.ai.agentModel}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: { ...form.ai, agentModel: e.target.value },
                      })
                    }
                    className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.ai.autocompleteEnabled}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        ai: { ...form.ai, autocompleteEnabled: e.target.checked },
                      })
                    }
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-gray-300 font-medium">Enable Real AI Ghost Text Autocomplete (Tab to accept)</span>
                </div>

                {form.ai.defaultProvider === 'openai' && (
                  <>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Custom Endpoint (e.g. Ollama / v1)</label>
                      <input
                        type="text"
                        value={form.ai.customEndpoint || ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            ai: { ...form.ai, customEndpoint: e.target.value },
                          })
                        }
                        placeholder="http://localhost:11434/v1"
                        className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-300 font-semibold mb-1">Custom API Key</label>
                      <input
                        type="password"
                        value={form.ai.customApiKey || ''}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            ai: { ...form.ai, customApiKey: e.target.value },
                          })
                        }
                        placeholder="sk-..."
                        className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
                      />
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Terminal */}
            {activeTab === 'terminal' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Default Shell</label>
                  <input
                    type="text"
                    value={form.terminal.shell}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        terminal: { ...form.terminal, shell: e.target.value },
                      })
                    }
                    className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-1.5 text-white font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Terminal Font Size</label>
                  <input
                    type="number"
                    value={form.terminal.fontSize}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        terminal: { ...form.terminal, fontSize: parseInt(e.target.value, 10) || 13 },
                      })
                    }
                    className="w-full bg-[#0d0f13] border border-[#272c3a] rounded-lg px-3 py-1.5 text-white focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Git */}
            {activeTab === 'git' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.git.autoFetch}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        git: { ...form.git, autoFetch: e.target.checked },
                      })
                    }
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-gray-300 font-medium">Auto-fetch remote changes</span>
                </div>
              </div>
            )}

            {/* Privacy */}
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.privacy.telemetry}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        privacy: { ...form.privacy, telemetry: e.target.checked },
                      })
                    }
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-gray-300 font-medium">Send anonymous IDE telemetry</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={form.privacy.localOnlyMode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        privacy: { ...form.privacy, localOnlyMode: e.target.checked },
                      })
                    }
                    className="rounded accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-gray-300 font-medium">Local-only Mode (never send code to cloud)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-4 border-t border-[#20242e] bg-[#171a22] flex items-center justify-between">
          <div>
            {savedSuccess && (
              <span className="text-emerald-400 font-semibold flex items-center space-x-1">
                <Check size={14} />
                <span>Settings saved successfully!</span>
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSettingsModalOpen(false)}
              className="px-3 py-1.5 bg-[#202430] hover:bg-[#282e3c] text-gray-300 rounded-lg text-xs"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm"
            >
              <Check size={14} />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
