import React, { useState, useEffect } from 'react';
import { Search, FileCode } from 'lucide-react';
import { useIde } from '../../context/IdeContext';

export const QuickFileOpen: React.FC = () => {
  const { quickOpenOpen, setQuickOpenOpen, fileTree, openFile } = useIde();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Flatten files
  const getAllFiles = (tree: any[], list: string[] = []): string[] => {
    for (const item of tree) {
      if (!item.isDirectory) list.push(item.relativePath);
      if (item.children) getAllFiles(item.children, list);
    }
    return list;
  };

  const files = getAllFiles(fileTree);
  const filtered = files.filter((f) => f.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Global keydown listeners for Quick Open (Ctrl+P / Cmd+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setQuickOpenOpen(true);
      }
      if (e.key === 'Escape' && quickOpenOpen) {
        setQuickOpenOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quickOpenOpen, setQuickOpenOpen]);

  if (!quickOpenOpen) return null;

  const selectFile = (index: number) => {
    if (filtered[index]) {
      openFile(filtered[index]);
      setQuickOpenOpen(false);
      setQuery('');
    }
  };

  return (
    <div
      onClick={() => setQuickOpenOpen(false)}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 z-50 select-none p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#14171e] border border-[#2c3343] rounded-xl shadow-2xl overflow-hidden text-xs flex flex-col"
      >
        <div className="p-3 border-b border-[#202531] flex items-center space-x-2 bg-[#171a23]">
          <Search size={15} className="text-cyan-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % filtered.length);
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
              } else if (e.key === 'Enter') {
                e.preventDefault();
                selectFile(selectedIndex);
              }
            }}
            placeholder="Type a file path to open..."
            autoFocus
            className="flex-1 bg-transparent text-white placeholder-[#606980] focus:outline-none text-xs font-mono"
          />
        </div>

        <div className="max-h-72 overflow-y-auto p-1.5 divide-y divide-[#181c25]">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-[#555d72]">No matching files found</div>
          ) : (
            filtered.map((filePath, idx) => {
              const isSelected = idx === selectedIndex;
              const fileName = filePath.split('/').pop();
              return (
                <div
                  key={filePath}
                  onClick={() => selectFile(idx)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors font-mono ${
                    isSelected ? 'bg-cyan-950/80 text-white' : 'text-[#8a92a6] hover:bg-[#1a1e28]'
                  }`}
                >
                  <div className="flex items-center space-x-2 truncate">
                    <FileCode size={14} className={isSelected ? 'text-cyan-400' : 'text-[#5d657b]'} />
                    <span className="font-semibold text-gray-200">{fileName}</span>
                    <span className="text-[10px] text-[#555e75] truncate">{filePath}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
