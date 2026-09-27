import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FilePlus,
  FolderPlus,
  RefreshCw,
  Trash2,
  Edit2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  MoreVertical,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { ProjectFile } from '../../types';

export const ExplorerPanel: React.FC = () => {
  const {
    fileTree,
    refreshFileTree,
    openFile,
    createFile,
    createFolder,
    deleteFileOrFolder,
    renameFileOrFolder,
    projectRoot,
    sendAgentPrompt,
    setAiPanelOpen,
  } = useIde();

  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    '': true,
    src: true,
    tests: true,
  });
  const [newFileInput, setNewFileInput] = useState<{ open: boolean; folderPath: string }>({
    open: false,
    folderPath: '',
  });
  const [newFileName, setNewFileName] = useState('');
  const [isFolderCreating, setIsFolderCreating] = useState(false);
  const [renameInput, setRenameInput] = useState<{ open: boolean; path: string; name: string }>({
    open: false,
    path: '',
    name: '',
  });

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderPath]: !prev[folderPath] }));
  };

  const handleCreate = async () => {
    if (!newFileName.trim()) return;
    const fullPath = newFileInput.folderPath
      ? `${newFileInput.folderPath}/${newFileName.trim()}`
      : newFileName.trim();

    if (isFolderCreating) {
      await createFolder(fullPath);
    } else {
      await createFile(fullPath);
    }
    setNewFileInput({ open: false, folderPath: '' });
    setNewFileName('');
  };

  const handleRename = async () => {
    if (!renameInput.name.trim()) return;
    const parts = renameInput.path.split('/');
    parts.pop();
    const newPath = parts.length > 0 ? `${parts.join('/')}/${renameInput.name.trim()}` : renameInput.name.trim();

    await renameFileOrFolder(renameInput.path, newPath);
    setRenameInput({ open: false, path: '', name: '' });
  };

  const projectName = projectRoot.split('/').pop() || 'Workspace';

  const renderTree = (files: ProjectFile[], level = 0) => {
    return files.map((file) => {
      const isExpanded = !!expandedFolders[file.relativePath];

      if (file.isDirectory) {
        return (
          <div key={file.relativePath} className="select-none">
            <div
              onClick={() => toggleFolder(file.relativePath)}
              style={{ paddingLeft: `${level * 14 + 10}px` }}
              className="group flex items-center justify-between py-1 px-2 hover:bg-[#1c202a] text-[#8e95aa] hover:text-gray-200 text-xs font-mono cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-1.5 truncate">
                {isExpanded ? (
                  <ChevronDown size={13} className="text-[#555d72]" />
                ) : (
                  <ChevronRight size={13} className="text-[#555d72]" />
                )}
                {isExpanded ? (
                  <FolderOpen size={14} className="text-cyan-400" />
                ) : (
                  <Folder size={14} className="text-cyan-400" />
                )}
                <span className="truncate font-medium">{file.name}</span>
              </div>

              {/* Folder quick actions */}
              <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 text-[#697289]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFolderCreating(false);
                    setNewFileInput({ open: true, folderPath: file.relativePath });
                  }}
                  title="New File in folder"
                  className="p-1 hover:text-white"
                >
                  <FilePlus size={11} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete folder ${file.name}?`)) {
                      deleteFileOrFolder(file.relativePath);
                    }
                  }}
                  title="Delete folder"
                  className="p-1 hover:text-red-400"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            {/* Folder children */}
            {isExpanded && file.children && (
              <div>{renderTree(file.children, level + 1)}</div>
            )}
          </div>
        );
      }

      // File row
      return (
        <div
          key={file.relativePath}
          onClick={() => openFile(file.relativePath)}
          style={{ paddingLeft: `${level * 14 + 24}px` }}
          className="group flex items-center justify-between py-1 px-2 hover:bg-[#1a1e28] text-[#858d9f] hover:text-gray-200 text-xs font-mono cursor-pointer transition-colors"
        >
          <div className="flex items-center space-x-2 truncate">
            <FileCode size={13} className="text-[#5e667b] group-hover:text-cyan-400 transition-colors" />
            <span className="truncate">{file.name}</span>
          </div>

          {/* Quick file actions */}
          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 text-[#697289]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setAiPanelOpen(true);
                sendAgentPrompt(`Please analyze and explain the file "${file.relativePath}".`, [file.relativePath]);
              }}
              title="Ask AI about this file"
              className="p-1 hover:text-cyan-400"
            >
              <Sparkles size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRenameInput({ open: true, path: file.relativePath, name: file.name });
              }}
              title="Rename file"
              className="p-1 hover:text-white"
            >
              <Edit2 size={11} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete file ${file.name}?`)) {
                  deleteFileOrFolder(file.relativePath);
                }
              }}
              title="Delete file"
              className="p-1 hover:text-red-400"
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#14171d] text-xs">
      {/* Panel Header */}
      <div className="h-9 px-3 border-b border-[#20242e] flex items-center justify-between text-[#8a92a6]">
        <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-300">
          <span>Explorer</span>
          <span className="text-[#495163] text-[10px]">({projectName})</span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              setIsFolderCreating(false);
              setNewFileInput({ open: true, folderPath: '' });
            }}
            title="New File"
            className="p-1 hover:text-white rounded hover:bg-[#1e222d] transition-colors"
          >
            <FilePlus size={14} />
          </button>
          <button
            onClick={() => {
              setIsFolderCreating(true);
              setNewFileInput({ open: true, folderPath: '' });
            }}
            title="New Folder"
            className="p-1 hover:text-white rounded hover:bg-[#1e222d] transition-colors"
          >
            <FolderPlus size={14} />
          </button>
          <button
            onClick={refreshFileTree}
            title="Refresh Explorer"
            className="p-1 hover:text-white rounded hover:bg-[#1e222d] transition-colors"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Creation Modal / Inline Input */}
      {newFileInput.open && (
        <div className="p-2 border-b border-[#20242e] bg-[#181b24] space-y-1.5">
          <div className="text-[11px] text-cyan-400 font-medium">
            Create {isFolderCreating ? 'Folder' : 'File'} in{' '}
            <span className="font-mono text-gray-300">{newFileInput.folderPath || 'root'}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setNewFileInput({ open: false, folderPath: '' });
              }}
              placeholder={isFolderCreating ? 'folder-name' : 'filename.ts'}
              autoFocus
              className="flex-1 bg-[#0f1116] border border-[#2b3140] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleCreate}
              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs"
            >
              Add
            </button>
            <button
              onClick={() => setNewFileInput({ open: false, folderPath: '' })}
              className="px-2 py-1 bg-[#252a36] hover:bg-[#2e3444] text-gray-400 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Rename Input */}
      {renameInput.open && (
        <div className="p-2 border-b border-[#20242e] bg-[#181b24] space-y-1.5">
          <div className="text-[11px] text-yellow-400 font-medium">Rename</div>
          <div className="flex items-center space-x-1.5">
            <input
              type="text"
              value={renameInput.name}
              onChange={(e) => setRenameInput((prev) => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setRenameInput({ open: false, path: '', name: '' });
              }}
              autoFocus
              className="flex-1 bg-[#0f1116] border border-[#2b3140] rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-yellow-500"
            />
            <button
              onClick={handleRename}
              className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-xs"
            >
              Rename
            </button>
            <button
              onClick={() => setRenameInput({ open: false, path: '', name: '' })}
              className="px-2 py-1 bg-[#252a36] hover:bg-[#2e3444] text-gray-400 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* File Tree List */}
      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.length === 0 ? (
          <div className="p-4 text-center text-[#555d72]">No files in project</div>
        ) : (
          renderTree(fileTree)
        )}
      </div>
    </div>
  );
};
