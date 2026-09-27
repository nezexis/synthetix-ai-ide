import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Zap,
  RotateCw,
  Sparkles,
  ArrowRight,
  FileCode,
} from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { api } from '../../services/api';

interface ReviewIssue {
  id: string;
  file: string;
  line: number;
  type: 'security' | 'performance' | 'style' | 'bug';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  suggestedFix: string;
}

export const CodeReviewPanel: React.FC = () => {
  const { openFile, sendAgentPrompt, setAiMode, setActivePanel, tabs, activeTabId } = useIde();
  const [analyzing, setAnalyzing] = useState(false);
  const [issues, setIssues] = useState<ReviewIssue[]>([]);

  const activeTab = tabs.find((t) => t.id === activeTabId);

  const runCodeReview = async () => {
    setAnalyzing(true);
    try {
      // Review active file or sample files in project
      const targetFile = activeTab ? activeTab.filePath : 'src/math.js';
      const fileData = await api.readFile(targetFile);

      // Perform real rule evaluation
      const found: ReviewIssue[] = [];
      const lines = fileData.content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('var ')) {
          found.push({
            id: `rev-${i}-var`,
            file: targetFile,
            line: i + 1,
            type: 'style',
            severity: 'medium',
            title: 'Use of deprecated `var` declaration',
            description: '`var` has function scope rather than block scope and can cause variable hoisting hazards.',
            suggestedFix: 'Replace `var` with `let` or `const`.',
          });
        }
        if (line.includes('eval(')) {
          found.push({
            id: `rev-${i}-eval`,
            file: targetFile,
            line: i + 1,
            type: 'security',
            severity: 'high',
            title: 'Insecure `eval()` usage',
            description: 'Direct code execution via `eval` can lead to arbitrary code execution vulnerabilities.',
            suggestedFix: 'Use safe JSON.parse or a structured parser instead.',
          });
        }
        if (line.includes('console.log(')) {
          found.push({
            id: `rev-${i}-log`,
            file: targetFile,
            line: i + 1,
            type: 'style',
            severity: 'low',
            title: 'Residual debugging `console.log`',
            description: 'Console logging in production can impact performance and leak sensitive internal telemetry.',
            suggestedFix: 'Remove or replace with a dedicated structured logger.',
          });
        }
        if (line.includes('catch') && !line.includes('error') && !line.includes('err')) {
          found.push({
            id: `rev-${i}-catch`,
            file: targetFile,
            line: i + 1,
            type: 'bug',
            severity: 'medium',
            title: 'Swallowed or unhandled error catch block',
            description: 'Catching exceptions without logging or rethrowing may hide silent failures.',
            suggestedFix: 'Pass error parameter and log or handle gracefully.',
          });
        }
      }

      // If no basic syntax issues found, add a clean architectural assessment
      if (found.length === 0) {
        found.push({
          id: 'rev-arch-1',
          file: targetFile,
          line: 1,
          type: 'performance',
          severity: 'low',
          title: 'Add TypeScript strict typing',
          description: 'File is currently in JavaScript; converting to TypeScript (.ts) will provide static type guarantees and faster refactoring.',
          suggestedFix: 'Convert file to TypeScript with typed function signatures.',
        });
      }

      setIssues(found);
    } catch (e) {
      console.error('Review error:', e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFixWithAi = (issue: ReviewIssue) => {
    setAiMode('debug');
    setActivePanel('ai');
    sendAgentPrompt(
      `Fix this issue in ${issue.file} at line ${issue.line}:
Issue: ${issue.title}
Detail: ${issue.description}
Suggested Fix: ${issue.suggestedFix}`,
      [issue.file]
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#14171d] text-xs">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#20242e] flex items-center justify-between text-[#8a92a6]">
        <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-300">
          <CheckCircle2 size={13} className="text-cyan-400" />
          <span>AI Code Review</span>
        </div>

        <button
          onClick={runCodeReview}
          disabled={analyzing}
          className="flex items-center space-x-1 px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[11px] font-medium transition-colors"
        >
          <RotateCw size={11} className={analyzing ? 'animate-spin' : ''} />
          <span>{analyzing ? 'Auditing...' : 'Run Audit'}</span>
        </button>
      </div>

      {/* Target File Info */}
      <div className="px-3 py-2 bg-[#101217] border-b border-[#20242e] flex items-center justify-between text-[#7d879e]">
        <div className="flex items-center space-x-1.5 truncate font-mono text-[11px]">
          <FileCode size={12} className="text-cyan-400" />
          <span className="truncate">
            Target: <strong className="text-gray-200">{activeTab ? activeTab.filePath : 'src/math.js'}</strong>
          </span>
        </div>
        <span className="text-[10px] text-[#555e75]">{issues.length} issues</span>
      </div>

      {/* Issues List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {issues.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-[#555e75] space-y-2">
            <CheckCircle2 size={28} className="text-emerald-500/50" />
            <p className="text-xs font-semibold text-gray-400">Ready for Code Audit</p>
            <p className="text-[11px] text-[#697288] max-w-xs">
              Click &quot;Run Audit&quot; to inspect code quality, potential security flaws, and performance optimizations.
            </p>
          </div>
        ) : (
          issues.map((issue) => (
            <div
              key={issue.id}
              className="border border-[#232835] rounded-xl p-3 bg-[#111319] space-y-2 hover:border-[#2f3647] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-1.5 font-semibold text-gray-200 text-xs">
                  {issue.type === 'security' ? (
                    <ShieldAlert size={13} className="text-red-400" />
                  ) : issue.type === 'performance' ? (
                    <Zap size={13} className="text-yellow-400" />
                  ) : (
                    <AlertTriangle size={13} className="text-cyan-400" />
                  )}
                  <span>{issue.title}</span>
                </div>

                <span
                  className={`text-[9px] uppercase font-mono px-1.5 py-0.2 rounded font-semibold ${
                    issue.severity === 'high'
                      ? 'bg-red-950/80 text-red-300 border border-red-800/40'
                      : issue.severity === 'medium'
                      ? 'bg-yellow-950/80 text-yellow-300 border border-yellow-800/40'
                      : 'bg-blue-950/80 text-blue-300 border border-blue-800/40'
                  }`}
                >
                  {issue.severity}
                </span>
              </div>

              <div
                onClick={() => openFile(issue.file, issue.line)}
                className="text-[10px] font-mono text-cyan-400 hover:underline cursor-pointer flex items-center space-x-1"
              >
                <span>{issue.file}</span>
                <span>:</span>
                <span>line {issue.line}</span>
              </div>

              <p className="text-[11px] text-[#788299] leading-relaxed font-sans">{issue.description}</p>

              <div className="p-2 bg-[#0b0c10] border border-[#202533] rounded text-[11px] text-gray-300 font-sans flex items-start space-x-1.5">
                <span className="text-emerald-400 font-bold">Fix:</span>
                <span>{issue.suggestedFix}</span>
              </div>

              {/* Fix with AI Action */}
              <div className="pt-1 flex justify-end">
                <button
                  onClick={() => handleFixWithAi(issue)}
                  className="px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded text-[11px] font-medium flex items-center space-x-1 transition-colors shadow-xs"
                >
                  <Sparkles size={11} />
                  <span>Fix with AI</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
