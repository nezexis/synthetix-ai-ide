import React, { useState, useRef, useEffect } from 'react';
import { useIde } from '../../context/IdeContext';
import { ExplorerPanel } from '../panels/ExplorerPanel';
import { SearchPanel } from '../panels/SearchPanel';
import { AiChatPanel } from '../panels/AiChatPanel';
import { MultiAgentPanel } from '../panels/MultiAgentPanel';
import { GitPanel } from '../panels/GitPanel';
import { RulesMemoryPanel } from '../panels/RulesMemoryPanel';
import { CodeReviewPanel } from '../panels/CodeReviewPanel';

export const Sidebar: React.FC = () => {
  const { activePanel, sidebarOpen } = useIde();
  const [width, setWidth] = useState(320);
  const isResizingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      // Subtract activity bar width (48px)
      const newWidth = Math.max(240, Math.min(600, e.clientX - 48));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      document.body.style.cursor = 'default';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (!sidebarOpen) return null;

  return (
    <div
      style={{ width: `${width}px` }}
      className="relative h-full bg-[#14171d] border-r border-[#20242e] flex flex-col flex-shrink-0 select-none overflow-hidden"
    >
      <div className="flex-1 overflow-hidden">
        {activePanel === 'explorer' && <ExplorerPanel />}
        {activePanel === 'search' && <SearchPanel />}
        {activePanel === 'ai' && <AiChatPanel />}
        {activePanel === 'multiagent' && <MultiAgentPanel />}
        {activePanel === 'git' && <GitPanel />}
        {activePanel === 'rules' && <RulesMemoryPanel />}
        {activePanel === 'review' && <CodeReviewPanel />}
      </div>

      {/* Resize handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          isResizingRef.current = true;
          document.body.style.cursor = 'col-resize';
        }}
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-cyan-500/50 transition-colors z-30"
      />
    </div>
  );
};
