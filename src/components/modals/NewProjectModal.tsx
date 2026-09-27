import React, { useState } from 'react';
import { X, FolderPlus, FolderOpen, Code2, Check, ArrowRight } from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { api } from '../../services/api';

export const NewProjectModal: React.FC = () => {
  const { newProjectModalOpen, setNewProjectModalOpen, projectRoot, refreshFileTree } = useIde();
  const [targetDir, setTargetDir] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'node-api' | 'react-app' | 'python-cli' | 'blank'>('node-api');
  const [loading, setLoading] = useState(false);

  if (!newProjectModalOpen) return null;

  const handleCreateOrSwitch = async () => {
    if (!targetDir.trim()) return;
    setLoading(true);
    try {
      // Create folder if needed and set root
      await api.createDirectory(targetDir.trim()).catch(() => {});
      await api.setRoot(targetDir.trim());

      // Scaffold template files
      if (selectedTemplate === 'node-api') {
        await api.writeFile(
          'package.json',
          JSON.stringify(
            {
              name: 'node-api-app',
              version: '1.0.0',
              type: 'module',
              scripts: { start: 'node src/server.js', test: 'node --test tests/*.test.js' },
            },
            null,
            2
          )
        );
        await api.createDirectory('src').catch(() => {});
        await api.createDirectory('tests').catch(() => {});
        await api.writeFile(
          'src/server.js',
          `import http from 'http';\n\nconst server = http.createServer((req, res) => {\n  res.writeHead(200, { 'Content-Type': 'application/json' });\n  res.end(JSON.stringify({ status: 'ok', time: Date.now() }));\n});\n\nserver.listen(4000, () => console.log('API listening on port 4000'));\n`
        );
        await api.writeFile(
          'tests/api.test.js',
          `import { test } from 'node:test';\nimport assert from 'node:assert';\n\ntest('sanity check', () => {\n  assert.strictEqual(1 + 1, 2);\n});\n`
        );
      } else if (selectedTemplate === 'python-cli') {
        await api.writeFile(
          'main.py',
          `import sys\n\ndef main():\n    print("Hello from Synthetix Python CLI!")\n\nif __name__ == '__main__':\n    main()\n`
        );
        await api.writeFile('requirements.txt', `# Project dependencies\nrequests>=2.31.0\npytest>=8.0.0\n`);
      }

      await refreshFileTree();
      setNewProjectModalOpen(false);
    } catch (e: any) {
      console.error('Project switch error:', e);
    } finally {
      setLoading(false);
    }
  };

  const templates = [
    {
      id: 'node-api',
      title: 'Node.js REST Service',
      description: 'Modern Node.js ES modules project with native tests and HTTP server.',
    },
    {
      id: 'python-cli',
      title: 'Python CLI / Script',
      description: 'Python project starter with main.py entry point and requirements.txt.',
    },
    {
      id: 'blank',
      title: 'Blank Empty Project',
      description: 'Start completely from scratch in a fresh new directory.',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none">
      <div className="w-full max-w-lg bg-[#14171d] border border-[#272d3b] rounded-2xl shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="h-12 px-4 border-b border-[#20242e] flex items-center justify-between bg-[#171a22]">
          <div className="flex items-center space-x-2 text-white font-semibold">
            <FolderPlus size={16} className="text-cyan-400" />
            <span>Open or Create Project Workspace</span>
          </div>
          <button
            onClick={() => setNewProjectModalOpen(false)}
            className="text-[#6d768c] hover:text-white p-1 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-gray-300 font-semibold mb-1">Current Workspace Directory</label>
            <div className="p-2 bg-[#0c0e12] rounded border border-[#222633] text-gray-400 font-mono text-[11px] truncate">
              {projectRoot}
            </div>
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-1">
              New Directory Path (absolute or relative)
            </label>
            <input
              type="text"
              value={targetDir}
              onChange={(e) => setTargetDir(e.target.value)}
              placeholder="workspace/my-new-app"
              className="w-full bg-[#0c0e12] border border-[#272c3a] focus:border-cyan-500 rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-semibold mb-2">Select Starter Template</label>
            <div className="space-y-2">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl.id as any)}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                    selectedTemplate === tpl.id
                      ? 'bg-cyan-950/60 border-cyan-500/80 text-white'
                      : 'bg-[#111318] border-[#222633] text-[#7d879d] hover:border-[#2f3545]'
                  }`}
                >
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-200">{tpl.title}</span>
                    {selectedTemplate === tpl.id && <Check size={14} className="text-cyan-400" />}
                  </div>
                  <p className="text-[11px] text-[#697288] mt-0.5">{tpl.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="h-12 px-4 border-t border-[#20242e] bg-[#171a22] flex items-center justify-end space-x-2">
          <button
            onClick={() => setNewProjectModalOpen(false)}
            className="px-3 py-1.5 bg-[#202430] hover:bg-[#282e3c] text-gray-300 rounded-lg text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateOrSwitch}
            disabled={loading || !targetDir.trim()}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-sm"
          >
            <span>{loading ? 'Initializing...' : 'Open Project'}</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
