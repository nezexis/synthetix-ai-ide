import React, { useRef, useEffect } from 'react';
import Editor, { DiffEditor, Monaco } from '@monaco-editor/react';
import { useIde } from '../../context/IdeContext';
import { InlineAiBar } from './InlineAiBar';
import { api } from '../../services/api';

export const EditorContainer: React.FC = () => {
  const {
    tabs,
    activeTabId,
    updateTabContent,
    saveActiveFile,
    settings,
    inlineAiVisible,
    setInlineAiVisible,
    setInlineAiSelection,
  } = useIde();

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Register inline completions provider (Tab autocomplete)
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Track cursor movement
    editor.onDidChangeCursorPosition((e: any) => {
      if (activeTab) {
        activeTab.cursorLine = e.position.lineNumber;
        activeTab.cursorColumn = e.position.column;
      }
    });

    // Custom Keybinding: Save (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveFile();
    });

    // Custom Keybinding: Inline AI (Ctrl+K / Cmd+K)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyK, () => {
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (selection && model) {
        const text = model.getValueInRange(selection);
        setInlineAiSelection({
          text: text || model.getLineContent(selection.startLineNumber),
          startLine: selection.startLineNumber,
          endLine: selection.endLineNumber,
        });
        setInlineAiVisible(true);
      }
    });

    // Register real AI Ghost Text Autocomplete if enabled
    if (settings.ai.autocompleteEnabled) {
      monaco.languages.registerInlineCompletionsProvider(
        ['javascript', 'typescript', 'python', 'json', 'html', 'css'],
        {
          provideInlineCompletions: async (model: any, position: any) => {
            const fullText = model.getValue();
            const offset = model.getOffsetAt(position);
            const prefix = fullText.slice(0, offset);
            const suffix = fullText.slice(offset);

            // Avoid triggering on empty line with no context
            if (!prefix.trim()) return { items: [] };

            try {
              const suggestion = await api.getAutocomplete({
                prefix,
                suffix,
                filePath: activeTab?.filePath || 'file.ts',
                language: activeTab?.language || 'typescript',
              });

              if (!suggestion) return { items: [] };

              return {
                items: [
                  {
                    insertText: suggestion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                  },
                ],
              };
            } catch {
              return { items: [] };
            }
          },
          freeInlineCompletions: () => {},
        }
      );
    }
  };

  // Jump to line if cursorLine was passed
  useEffect(() => {
    if (editorRef.current && activeTab?.cursorLine) {
      editorRef.current.revealLineInCenter(activeTab.cursorLine);
      editorRef.current.setPosition({ lineNumber: activeTab.cursorLine, column: 1 });
    }
  }, [activeTab?.cursorLine, activeTabId]);

  const handleApplyReplacement = (replacement: string) => {
    if (!editorRef.current) return;
    const selection = editorRef.current.getSelection();
    if (selection) {
      const op = {
        range: selection,
        text: replacement,
        forceMoveMarkers: true,
      };
      editorRef.current.executeEdits('inline-ai', [op]);
    }
  };

  if (!activeTab) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#101216] text-[#4d5569] select-none space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#171a22] border border-[#232733] flex items-center justify-center text-cyan-400/40">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm text-gray-400 font-medium">Synthetix Autonomous AI IDE</p>
          <p className="text-xs text-[#5f6880]">Select a file from the Explorer or press ⌘P to open a file.</p>
        </div>
        <div className="flex items-center space-x-2 text-[11px] text-[#555d72] pt-2">
          <span>⌘P: Quick Open</span>
          <span>•</span>
          <span>⌘⇧P: Commands</span>
          <span>•</span>
          <span>⌘K: Inline AI</span>
        </div>
      </div>
    );
  }

  const editorTheme = settings.general.theme === 'clean-light' ? 'light' : 'vs-dark';

  return (
    <div className="relative flex-1 h-full w-full overflow-hidden bg-[#101216]">
      {/* Inline AI Modal Bar */}
      {inlineAiVisible && (
        <InlineAiBar
          onApplyReplacement={handleApplyReplacement}
          onClose={() => setInlineAiVisible(false)}
        />
      )}

      {/* Normal Monaco Editor OR Diff Editor */}
      {activeTab.isDiff ? (
        <DiffEditor
          original={activeTab.diffOldContent || activeTab.originalContent}
          modified={activeTab.content}
          language={activeTab.language}
          theme={editorTheme}
          options={{
            readOnly: false,
            minimap: { enabled: settings.editor.minimap },
            fontSize: settings.editor.fontSize,
            fontFamily: settings.editor.fontFamily,
            lineHeight: settings.editor.lineHeight,
            wordWrap: settings.editor.wordWrap,
            renderSideBySide: true,
          }}
        />
      ) : (
        <Editor
          height="100%"
          language={activeTab.language}
          value={activeTab.content}
          theme={editorTheme}
          onChange={(val) => updateTabContent(activeTab.id, val || '')}
          onMount={handleEditorDidMount}
          options={{
            fontSize: settings.editor.fontSize,
            fontFamily: settings.editor.fontFamily,
            lineHeight: settings.editor.lineHeight,
            tabSize: settings.editor.tabSize,
            minimap: { enabled: settings.editor.minimap },
            wordWrap: settings.editor.wordWrap,
            cursorBlinking: settings.editor.cursorBlinking,
            cursorStyle: settings.editor.cursorStyle,
            bracketPairColorization: { enabled: settings.editor.bracketPairColorization },
            formatOnPaste: true,
            formatOnType: true,
            automaticLayout: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            inlineSuggest: { enabled: true },
            scrollBeyondLastLine: false,
            smoothScrolling: true,
          }}
        />
      )}
    </div>
  );
};
