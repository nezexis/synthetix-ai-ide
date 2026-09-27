import React, { useEffect, useRef, useState } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import {
  Terminal as TerminalIcon,
  Plus,
  Trash2,
  Maximize2,
  X,
  Play,
  RotateCw,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';

export const TerminalPanel: React.FC = () => {
  const {
    terminalOpen,
    setTerminalOpen,
    terminalSessions,
    activeTerminalId,
    setActiveTerminalId,
    createTerminalSession,
    killTerminalSession,
    settings,
  } = useIde();

  const [height, setHeight] = useState(240);
  const isResizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newHeight = Math.max(120, Math.min(600, window.innerHeight - e.clientY - 24));
      setHeight(newHeight);
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

  // Initialize xterm and WebSocket connection
  useEffect(() => {
    if (!terminalOpen || !containerRef.current || !activeTerminalId) return;

    // Destroy prior instance
    if (xtermRef.current) {
      xtermRef.current.dispose();
      xtermRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    const term = new XTerm({
      cursorBlink: true,
      fontSize: settings.terminal.fontSize,
      fontFamily: settings.terminal.fontFamily,
      theme: {
        background: '#0d0f13',
        foreground: '#e2e8f0',
        cursor: '#38bdf8',
        selectionBackground: '#1e293b',
        black: '#1e222a',
        red: '#f87171',
        green: '#4ade80',
        yellow: '#facc15',
        blue: '#60a5fa',
        magenta: '#c084fc',
        cyan: '#38bdf8',
        white: '#f1f5f9',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'bind', sessionId: activeTerminalId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.sessionId === activeTerminalId) {
          if (msg.type === 'output' || msg.type === 'history') {
            term.write(msg.data);
          }
        }
      } catch {
        // ignore
      }
    };

    // User typing into terminal
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', sessionId: activeTerminalId, data }));
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
      ws.close();
    };
  }, [terminalOpen, activeTerminalId, settings.terminal.fontSize]);

  const sendQuickCommand = (cmd: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeTerminalId) {
      wsRef.current.send(
        JSON.stringify({ type: 'input', sessionId: activeTerminalId, data: `${cmd}\r` })
      );
    }
  };

  if (!terminalOpen) return null;

  return (
    <div
      style={{ height: `${height}px` }}
      className="relative w-full bg-[#0d0f13] border-t border-[#20242e] flex flex-col select-none overflow-hidden z-20"
    >
      {/* Top resize handle */}
      <div
        onMouseDown={(e) => {
          e.preventDefault();
          isResizingRef.current = true;
          document.body.style.cursor = 'row-resize';
        }}
        className="absolute top-0 left-0 w-full h-1 cursor-row-resize hover:bg-cyan-500/50 transition-colors z-30"
      />

      {/* Terminal Title & Tabs Bar */}
      <div className="h-8 bg-[#121419] border-b border-[#20242e] flex items-center justify-between px-3 text-xs text-[#8a92a6]">
        {/* Session tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          <TerminalIcon size={13} className="text-cyan-400 mr-1.5" />
          {terminalSessions.map((s) => (
            <div
              key={s.id}
              onClick={() => setActiveTerminalId(s.id)}
              className={`flex items-center space-x-1.5 px-2.5 py-0.5 rounded cursor-pointer font-mono text-[11px] transition-colors ${
                s.id === activeTerminalId
                  ? 'bg-[#1e232f] text-cyan-300 font-medium'
                  : 'hover:bg-[#161922] text-[#717a90]'
              }`}
            >
              <span>{s.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  killTerminalSession(s.id);
                }}
                className="hover:text-red-400 p-0.5 rounded"
              >
                <X size={10} />
              </button>
            </div>
          ))}

          <button
            onClick={() => createTerminalSession(`Terminal ${terminalSessions.length + 1}`)}
            className="p-1 hover:text-white rounded hover:bg-[#1e222d] text-cyan-400 transition-colors"
            title="New Terminal"
          >
            <Plus size={13} />
          </button>
        </div>

        {/* Quick action buttons & Close */}
        <div className="flex items-center space-x-1.5 font-mono text-[10px]">
          <button
            onClick={() => sendQuickCommand('npm test')}
            className="px-2 py-0.5 bg-[#1a1f2b] hover:bg-[#232b3b] text-cyan-300 rounded border border-[#273042] transition-colors flex items-center space-x-1"
          >
            <Play size={9} />
            <span>npm test</span>
          </button>
          <button
            onClick={() => sendQuickCommand('npm start')}
            className="px-2 py-0.5 bg-[#1a1f2b] hover:bg-[#232b3b] text-emerald-300 rounded border border-[#273042] transition-colors flex items-center space-x-1"
          >
            <Play size={9} />
            <span>npm start</span>
          </button>
          <button
            onClick={() => sendQuickCommand('git status')}
            className="px-2 py-0.5 bg-[#1a1f2b] hover:bg-[#232b3b] text-yellow-300 rounded border border-[#273042] transition-colors"
          >
            git status
          </button>
          <button
            onClick={() => xtermRef.current?.clear()}
            className="px-2 py-0.5 bg-[#1a1f2b] hover:bg-[#232b3b] text-gray-300 rounded border border-[#273042] transition-colors"
          >
            clear
          </button>

          <div className="h-3 w-[1px] bg-[#2a3040] mx-1" />

          <button
            onClick={() => setTerminalOpen(false)}
            className="p-1 hover:text-white rounded hover:bg-[#1e222d] transition-colors"
            title="Close Terminal"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Real XTerm Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full p-2 bg-[#0d0f13] overflow-hidden" />
    </div>
  );
};
