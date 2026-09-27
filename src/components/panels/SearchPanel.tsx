import React, { useState } from 'react';
import { Search, RotateCw, FileCode, Check } from 'lucide-react';
import { useIde } from '../../context/IdeContext';
import { api } from '../../services/api';
import { SearchMatch } from '../../types';

export const SearchPanel: React.FC = () => {
  const { openFile } = useIde();
  const [query, setQuery] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [matches, setMatches] = useState<SearchMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [reindexing, setReindexing] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) {
      setMatches([]);
      return;
    }
    setLoading(true);
    try {
      const results = await api.searchFiles(query, isRegex);
      setMatches(results);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await api.reindexCodebase();
    } catch (e) {
      console.error('Reindex error:', e);
    } finally {
      setReindexing(false);
    }
  };

  // Group matches by file
  const groupedMatches = matches.reduce<Record<string, SearchMatch[]>>((acc, match) => {
    if (!acc[match.filePath]) acc[match.filePath] = [];
    acc[match.filePath].push(match);
    return acc;
  }, {});

  return (
    <div className="h-full flex flex-col bg-[#14171d] text-xs">
      {/* Header */}
      <div className="h-9 px-3 border-b border-[#20242e] flex items-center justify-between text-[#8a92a6]">
        <div className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[11px] text-gray-300">
          <Search size={13} className="text-cyan-400" />
          <span>Search Codebase</span>
        </div>

        <button
          onClick={handleReindex}
          disabled={reindexing}
          title="Re-index symbol search"
          className="p-1 hover:text-white rounded hover:bg-[#1e222d] transition-colors"
        >
          <RotateCw size={13} className={reindexing ? 'animate-spin text-cyan-400' : ''} />
        </button>
      </div>

      {/* Search Input Box */}
      <div className="p-3 border-b border-[#20242e] space-y-2">
        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search all files..."
            className="w-full bg-[#0f1116] border border-[#2b3140] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#5a6276] focus:outline-none focus:border-cyan-500 pr-12"
          />
          <button
            type="button"
            onClick={() => setIsRegex(!isRegex)}
            className={`absolute right-2 top-1/2 -translate-y-1/2 px-1 rounded text-[10px] font-mono transition-colors ${
              isRegex
                ? 'bg-cyan-600 text-white'
                : 'text-[#697289] hover:text-gray-300 hover:bg-[#1e232f]'
            }`}
            title="Use Regular Expression"
          >
            .*
          </button>
        </form>

        <div className="flex items-center justify-between text-[11px] text-[#697289]">
          <span>
            {matches.length} {matches.length === 1 ? 'match' : 'matches'} in {Object.keys(groupedMatches).length} files
          </span>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-[#202430] text-white disabled:text-[#555d72] rounded text-[11px] transition-colors"
          >
            {loading ? 'Searching...' : 'Find'}
          </button>
        </div>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 font-mono">
        {Object.entries(groupedMatches).map(([filePath, fileMatches]) => (
          <div key={filePath} className="border border-[#20242e] rounded-lg overflow-hidden bg-[#101318]">
            {/* File header */}
            <div
              onClick={() => openFile(filePath)}
              className="bg-[#171a22] px-2.5 py-1 flex items-center justify-between text-[#8a92a6] hover:text-gray-200 cursor-pointer border-b border-[#20242e] text-[11px]"
            >
              <div className="flex items-center space-x-1.5 truncate">
                <FileCode size={13} className="text-cyan-400" />
                <span className="font-semibold text-gray-300">{filePath}</span>
              </div>
              <span className="text-[10px] text-[#555e75]">{fileMatches.length}</span>
            </div>

            {/* Line items */}
            <div className="divide-y divide-[#181c25]">
              {fileMatches.map((m, idx) => (
                <div
                  key={idx}
                  onClick={() => openFile(m.filePath, m.lineNumber)}
                  className="px-2.5 py-1 hover:bg-[#1c202a] text-[#7d869b] hover:text-gray-200 cursor-pointer text-[11px] flex space-x-2 transition-colors"
                >
                  <span className="text-cyan-500/70 select-none w-7 text-right">
                    {m.lineNumber}:
                  </span>
                  <span className="truncate text-gray-300">{m.lineContent}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
