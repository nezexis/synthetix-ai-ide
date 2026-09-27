import React from 'react';
import { X, FileCode, GitCompare, SplitSquareVertical } from 'lucide-react';
import { useIde } from '../../context/IdeContext';

export const TabsBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTabId, closeTab, setTabDiffMode } = useIde();

  if (tabs.length === 0) {
    return (
      <div className="h-9 bg-[#16181e] border-b border-[#222631] flex items-center px-4 text-xs text-[#525a70]">
        No files open
      </div>
    );
  }

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <div className="h-9 bg-[#13161c] border-b border-[#20242e] flex items-center justify-between overflow-x-auto select-none no-scrollbar">
      <div className="flex items-center h-full overflow-x-auto">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group h-full flex items-center space-x-2 px-3 border-r border-[#20242e] text-xs font-mono cursor-pointer transition-colors ${
                isActive
                  ? 'bg-[#1a1d24] text-gray-200 border-t-2 border-t-cyan-400 font-medium'
                  : 'bg-[#13161c] text-[#7e859b] hover:bg-[#171a21] hover:text-gray-300'
              }`}
            >
              <FileCode size={13} className={isActive ? 'text-cyan-400' : 'text-[#5d647a]'} />
              <span className="truncate max-w-[140px]">{tab.title}</span>

              {tab.isDirty ? (
                <span
                  className="w-2 h-2 rounded-full bg-cyan-400 group-hover:hidden"
                  title="Unsaved changes"
                />
              ) : null}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-[#282e3c] hover:text-white transition-colors ${
                  tab.isDirty ? 'hidden group-hover:block' : 'opacity-60 group-hover:opacity-100'
                }`}
                title="Close tab (Ctrl+W)"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Right controls: Diff toggle */}
      {activeTab && (
        <div className="flex items-center px-2 space-x-1">
          <button
            onClick={() =>
              setTabDiffMode(activeTab.id, !activeTab.isDiff, activeTab.originalContent)
            }
            className={`p-1 rounded text-xs transition-colors flex items-center space-x-1 ${
              activeTab.isDiff
                ? 'bg-cyan-900/60 text-cyan-300 border border-cyan-600/40'
                : 'text-[#6e758a] hover:text-gray-200 hover:bg-[#1e222a]'
            }`}
            title="Toggle Side-by-side Diff View"
          >
            <GitCompare size={13} />
            <span className="text-[10px] hidden md:inline">Diff</span>
          </button>
        </div>
      )}
    </div>
  );
};
