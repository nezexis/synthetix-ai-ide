import fs from 'fs';
import path from 'path';
import { fsService } from './fs.js';

export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'interface' | 'variable' | 'type' | 'export';
  filePath: string;
  lineNumber: number;
  snippet: string;
}

export interface FileIndexEntry {
  path: string;
  relativePath: string;
  mtime: number;
  symbols: CodeSymbol[];
  lineCount: number;
}

export class CodebaseIndexer {
  private index: Map<string, FileIndexEntry> = new Map();
  private lastIndexed = 0;

  async indexCodebase(): Promise<{ indexedFiles: number; totalSymbols: number }> {
    const root = fsService.getProjectRoot();
    const files = await this.collectFiles(root);
    let totalSymbols = 0;

    for (const filePath of files) {
      try {
        const stat = await fs.promises.stat(filePath);
        const existing = this.index.get(filePath);

        if (existing && existing.mtime >= stat.mtimeMs) {
          totalSymbols += existing.symbols.length;
          continue;
        }

        const content = await fs.promises.readFile(filePath, 'utf-8');
        const symbols = this.extractSymbols(filePath, content);
        totalSymbols += symbols.length;

        this.index.set(filePath, {
          path: filePath,
          relativePath: fsService.getRelativePath(filePath),
          mtime: stat.mtimeMs,
          symbols,
          lineCount: content.split('\n').length,
        });
      } catch {
        // Skip unreadable files
      }
    }

    this.lastIndexed = Date.now();
    return {
      indexedFiles: this.index.size,
      totalSymbols,
    };
  }

  private async collectFiles(dir: string, maxFiles = 1000): Promise<string[]> {
    const results: string[] = [];
    const queue = [dir];

    while (queue.length > 0 && results.length < maxFiles) {
      const current = queue.shift()!;
      try {
        const entries = await fs.promises.readdir(current, { withFileTypes: true });
        for (const entry of entries) {
          if (
            entry.name.startsWith('.') ||
            entry.name === 'node_modules' ||
            entry.name === 'dist' ||
            entry.name === 'coverage'
          ) {
            continue;
          }
          const full = path.join(current, entry.name);
          if (entry.isDirectory()) {
            queue.push(full);
          } else if (
            /\.(js|jsx|ts|tsx|py|rb|go|rs|java|c|cpp|h|css|html|json|md)$/i.test(entry.name)
          ) {
            results.push(full);
          }
        }
      } catch {
        // ignore
      }
    }

    return results;
  }

  private extractSymbols(filePath: string, content: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const lines = content.split('\n');

    const fnRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_$]+)/;
    const classRegex = /(?:export\s+)?class\s+([a-zA-Z0-9_$]+)/;
    const interfaceRegex = /(?:export\s+)?interface\s+([a-zA-Z0-9_$]+)/;
    const typeRegex = /(?:export\s+)?type\s+([a-zA-Z0-9_$]+)\s*=/;
    const constFnRegex = /(?:export\s+)?const\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\(/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let match = fnRegex.exec(line);
      if (match) {
        symbols.push({
          name: match[1],
          kind: 'function',
          filePath: fsService.getRelativePath(filePath),
          lineNumber: i + 1,
          snippet: line.trim(),
        });
        continue;
      }

      match = classRegex.exec(line);
      if (match) {
        symbols.push({
          name: match[1],
          kind: 'class',
          filePath: fsService.getRelativePath(filePath),
          lineNumber: i + 1,
          snippet: line.trim(),
        });
        continue;
      }

      match = interfaceRegex.exec(line);
      if (match) {
        symbols.push({
          name: match[1],
          kind: 'interface',
          filePath: fsService.getRelativePath(filePath),
          lineNumber: i + 1,
          snippet: line.trim(),
        });
        continue;
      }

      match = typeRegex.exec(line);
      if (match) {
        symbols.push({
          name: match[1],
          kind: 'type',
          filePath: fsService.getRelativePath(filePath),
          lineNumber: i + 1,
          snippet: line.trim(),
        });
        continue;
      }

      match = constFnRegex.exec(line);
      if (match) {
        symbols.push({
          name: match[1],
          kind: 'function',
          filePath: fsService.getRelativePath(filePath),
          lineNumber: i + 1,
          snippet: line.trim(),
        });
      }
    }

    return symbols;
  }

  findSymbols(query: string, limit = 30): CodeSymbol[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    const results: CodeSymbol[] = [];

    for (const entry of this.index.values()) {
      for (const sym of entry.symbols) {
        if (sym.name.toLowerCase().includes(q)) {
          results.push(sym);
          if (results.length >= limit) return results;
        }
      }
    }
    return results;
  }

  getAllSymbols(): CodeSymbol[] {
    const results: CodeSymbol[] = [];
    for (const entry of this.index.values()) {
      results.push(...entry.symbols);
    }
    return results;
  }

  getIndexStats(): { fileCount: number; symbolCount: number; lastIndexed: number } {
    let symbolCount = 0;
    for (const entry of this.index.values()) {
      symbolCount += entry.symbols.length;
    }
    return {
      fileCount: this.index.size,
      symbolCount,
      lastIndexed: this.lastIndexed,
    };
  }
}

export const codebaseIndexer = new CodebaseIndexer();
