import React, { useEffect } from 'react';
import { IdeProvider, useIde } from './context/IdeContext';
import { Header } from './components/layout/Header';
import { ActivityBar } from './components/layout/ActivityBar';
import { Sidebar } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { TabsBar } from './components/editor/TabsBar';
import { EditorContainer } from './components/editor/EditorContainer';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { SettingsModal } from './components/panels/SettingsModal';
import { CommandPalette } from './components/modals/CommandPalette';
import { QuickFileOpen } from './components/modals/QuickFileOpen';
import { NewProjectModal } from './components/modals/NewProjectModal';

const IdeLayout: React.FC = () => {
  const {
    sidebarOpen,
    setSidebarOpen,
    terminalOpen,
    setTerminalOpen,
    setCommandPaletteOpen,
    setQuickOpenOpen,
    saveActiveFile,
  } = useIde();

  // Global keybindings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+B / Cmd+B -> Toggle Sidebar
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setSidebarOpen(!sidebarOpen);
      }
      // Ctrl+` -> Toggle Terminal
      if ((e.metaKey || e.ctrlKey) && e.key === '`') {
        e.preventDefault();
        setTerminalOpen(!terminalOpen);
      }
      // Ctrl+S / Cmd+S -> Save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveActiveFile();
      }
      // Ctrl+P / Cmd+P -> Quick Open
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setQuickOpenOpen(true);
      }
      // Ctrl+Shift+P / Cmd+Shift+P -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen, terminalOpen, saveActiveFile, setSidebarOpen, setTerminalOpen, setQuickOpenOpen, setCommandPaletteOpen]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0e1014] text-gray-200 select-none antialiased">
      {/* Top Header */}
      <Header />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Activity Bar */}
        <ActivityBar />

        {/* Resizable Sidebar */}
        <Sidebar />

        {/* Editor & Terminal Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-[#101216]">
          {/* Tabs Bar */}
          <TabsBar />

          {/* Monaco Editor Container */}
          <div className="flex-1 relative overflow-hidden">
            <EditorContainer />
          </div>

          {/* Integrated Real Terminal */}
          <TerminalPanel />
        </main>
      </div>

      {/* Bottom Status Bar */}
      <StatusBar />

      {/* Modals & Dialogs */}
      <SettingsModal />
      <CommandPalette />
      <QuickFileOpen />
      <NewProjectModal />
    </div>
  );
};

export default function App() {
  return (
    <IdeProvider>
      <IdeLayout />
    </IdeProvider>
  );
}
