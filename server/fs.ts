import fs from 'fs';
import path from 'path';
import { ProjectFile, FileContent, SearchMatch } from './types.js';

const IGNORED_DIRS = new Set([
  '.git',
  'node_modules',
  '.synthetix-data',
  'dist',
  'build',
  '.next',
  '.turbo',
  'coverage',
]);

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svgz', '.webp',
  '.woff', '.woff2', '.ttf', '.eot',
  '.zip', '.tar', '.gz', '.7z',
  '.pdf', '.exe', '.dll', '.so', '.dylib',
  '.mp3', '.mp4', '.wav', '.mov',
]);

export class FilesystemService {
  private projectRoot: string;

  constructor(defaultRoot?: string) {
    this.projectRoot = defaultRoot || path.resolve(process.cwd());
  }

  setProjectRoot(newRoot: string): string {
    if (!fs.existsSync(newRoot)) {
      throw new Error(`Directory does not exist: ${newRoot}`);
    }
    const stat = fs.statSync(newRoot);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${newRoot}`);
    }
    this.projectRoot = path.resolve(newRoot);
    return this.projectRoot;
  }

  getProjectRoot(): string {
    return this.projectRoot;
  }

  resolvePath(targetPath: string): string {
    if (path.isAbsolute(targetPath)) {
      return path.resolve(targetPath);
    }
    return path.resolve(this.projectRoot, targetPath);
  }

  getRelativePath(fullPath: string): string {
    return path.relative(this.projectRoot, fullPath);
  }

  isBinaryFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
  }

  async getFileTree(dirPath = this.projectRoot, depth = 0, maxDepth = 6): Promise<ProjectFile[]> {
    if (depth > maxDepth) return [];
    if (!fs.existsSync(dirPath)) return [];

    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    const result: ProjectFile[] = [];

    // Sort: directories first, then alphabetical
    entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(this.projectRoot, fullPath);

      if (entry.isDirectory()) {
        const children = await this.getFileTree(fullPath, depth + 1, maxDepth);
        result.push({
          name: entry.name,
          path: fullPath,
          relativePath,
          isDirectory: true,
          children,
        });
      } else {
        let size = 0;
        let lastModified = Date.now();
        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          lastModified = stat.mtimeMs;
        } catch {
          // ignore
        }

        result.push({
          name: entry.name,
          path: fullPath,
          relativePath,
          isDirectory: false,
          size,
          lastModified,
          extension: path.extname(entry.name).toLowerCase(),
        });
      }
    }

    return result;
  }

  async readFile(targetPath: string): Promise<FileContent> {
    const fullPath = this.resolvePath(targetPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${targetPath}`);
    }

    const stat = await fs.promises.stat(fullPath);
    const isBinary = this.isBinaryFile(fullPath);
    let content = '';

    if (isBinary) {
      content = `[Binary file: ${path.basename(fullPath)} (${stat.size} bytes)]`;
    } else {
      content = await fs.promises.readFile(fullPath, 'utf-8');
    }

    return {
      path: fullPath,
      relativePath: this.getRelativePath(fullPath),
      content,
      isBinary,
      size: stat.size,
      lastModified: stat.mtimeMs,
    };
  }

  async writeFile(targetPath: string, content: string): Promise<{ success: boolean; path: string }> {
    const fullPath = this.resolvePath(targetPath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }
    await fs.promises.writeFile(fullPath, content, 'utf-8');
    return { success: true, path: fullPath };
  }

  async createFile(targetPath: string, content = ''): Promise<{ success: boolean; path: string }> {
    const fullPath = this.resolvePath(targetPath);
    if (fs.existsSync(fullPath)) {
      throw new Error(`File already exists: ${targetPath}`);
    }
    return this.writeFile(targetPath, content);
  }

  async createDirectory(targetPath: string): Promise<{ success: boolean; path: string }> {
    const fullPath = this.resolvePath(targetPath);
    if (fs.existsSync(fullPath)) {
      throw new Error(`Directory already exists: ${targetPath}`);
    }
    await fs.promises.mkdir(fullPath, { recursive: true });
    return { success: true, path: fullPath };
  }

  async deletePath(targetPath: string): Promise<{ success: boolean; path: string }> {
    const fullPath = this.resolvePath(targetPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Path does not exist: ${targetPath}`);
    }
    const stat = await fs.promises.stat(fullPath);
    if (stat.isDirectory()) {
      await fs.promises.rm(fullPath, { recursive: true, force: true });
    } else {
      await fs.promises.unlink(fullPath);
    }
    return { success: true, path: fullPath };
  }

  async renamePath(oldPath: string, newPath: string): Promise<{ success: boolean; newPath: string }> {
    const fullOldPath = this.resolvePath(oldPath);
    const fullNewPath = this.resolvePath(newPath);

    if (!fs.existsSync(fullOldPath)) {
      throw new Error(`Source does not exist: ${oldPath}`);
    }
    if (fs.existsSync(fullNewPath)) {
      throw new Error(`Target already exists: ${newPath}`);
    }

    const dir = path.dirname(fullNewPath);
    if (!fs.existsSync(dir)) {
      await fs.promises.mkdir(dir, { recursive: true });
    }

    await fs.promises.rename(fullOldPath, fullNewPath);
    return { success: true, newPath: fullNewPath };
  }

  async searchInFiles(query: string, isRegex = false, maxResults = 100): Promise<SearchMatch[]> {
    if (!query.trim()) return [];

    let regex: RegExp;
    try {
      regex = isRegex ? new RegExp(query, 'g') : new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    } catch (e: any) {
      throw new Error(`Invalid regex: ${e.message}`);
    }

    const matches: SearchMatch[] = [];

    const searchDirectory = async (currentDir: string) => {
      if (matches.length >= maxResults) return;
      const entries = await fs.promises.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        if (matches.length >= maxResults) break;
        if (IGNORED_DIRS.has(entry.name)) continue;

        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          await searchDirectory(fullPath);
        } else {
          if (this.isBinaryFile(fullPath)) continue;

          try {
            const stat = await fs.promises.stat(fullPath);
            if (stat.size > 2 * 1024 * 1024) continue; // skip files > 2MB

            const content = await fs.promises.readFile(fullPath, 'utf-8');
            const lines = content.split('\n');

            for (let i = 0; i < lines.length; i++) {
              if (matches.length >= maxResults) break;
              const line = lines[i];
              let match: RegExpExecArray | null;
              regex.lastIndex = 0;

              while ((match = regex.exec(line)) !== null) {
                matches.push({
                  filePath: this.getRelativePath(fullPath),
                  lineNumber: i + 1,
                  lineContent: line.trim(),
                  matchStart: match.index,
                  matchEnd: match.index + match[0].length,
                });
                if (!isRegex) break; // one per line if not regex loop
                if (matches.length >= maxResults) break;
              }
            }
          } catch {
            // ignore unreadable files
          }
        }
      }
    };

    await searchDirectory(this.projectRoot);
    return matches;
  }

  async ensureStarterProject(): Promise<string> {
    const starterDir = path.resolve(process.cwd(), 'workspace', 'sample-project');
    if (!fs.existsSync(starterDir)) {
      await fs.promises.mkdir(starterDir, { recursive: true });
      await fs.promises.mkdir(path.join(starterDir, 'src'), { recursive: true });
      await fs.promises.mkdir(path.join(starterDir, 'tests'), { recursive: true });

      // package.json
      await fs.promises.writeFile(
        path.join(starterDir, 'package.json'),
        JSON.stringify(
          {
            name: 'sample-project',
            version: '1.0.0',
            description: 'Starter project for Synthetix AI IDE development and testing',
            type: 'module',
            scripts: {
              test: 'node --test tests/*.test.js',
              start: 'node src/index.js',
              build: 'echo "Project built successfully"',
            },
            dependencies: {},
          },
          null,
          2
        ),
        'utf-8'
      );

      // README.md
      await fs.promises.writeFile(
        path.join(starterDir, 'README.md'),
        `# Sample Project for Synthetix AI IDE

Welcome to your Synthetix AI IDE development workspace.
This is a real live project with actual files, tests, and a terminal environment.

## Features to test with AI:
1. **AI Autocomplete**: Open \`src/math.js\` and start typing new functions.
2. **Inline AI (Cmd+K / Ctrl+K)**: Highlight code in \`src/math.js\` and ask AI to refactor, add type annotations, or optimize.
3. **Agent Mode**: Ask AI to "Add a Fibonacci function with automated unit tests and run them".
4. **Debug Mode**: Introduce a syntax or logic error and ask the AI Debug Agent to detect and fix it.
5. **Real Terminal**: Run \`npm test\` or \`ls -la\` directly in the bottom terminal.
`,
        'utf-8'
      );

      // src/math.js
      await fs.promises.writeFile(
        path.join(starterDir, 'src', 'math.js'),
        `/**
 * Math utility module
 */

export function add(a, b) {
  return a + b;
}

export function subtract(a, b) {
  return a - b;
}

export function multiply(a, b) {
  return a * b;
}

export function divide(a, b) {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

export function factorial(n) {
  if (n < 0) throw new Error('Negative numbers not supported');
  if (n === 0 || n === 1) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) {
    res *= i;
  }
  return res;
}
`,
        'utf-8'
      );

      // src/index.js
      await fs.promises.writeFile(
        path.join(starterDir, 'src', 'index.js'),
        `import { add, multiply, factorial } from './math.js';

console.log('--- Synthetix AI IDE Sample App ---');
console.log('2 + 3 =', add(2, 3));
console.log('4 * 5 =', multiply(4, 5));
console.log('5! =', factorial(5));
console.log('Ready for autonomous AI development.');
`,
        'utf-8'
      );

      // tests/math.test.js
      await fs.promises.writeFile(
        path.join(starterDir, 'tests', 'math.test.js'),
        `import { test } from 'node:test';
import assert from 'node:assert';
import { add, subtract, multiply, divide, factorial } from '../src/math.js';

test('add numbers correctly', () => {
  assert.strictEqual(add(2, 3), 5);
  assert.strictEqual(add(-1, 1), 0);
});

test('subtract numbers correctly', () => {
  assert.strictEqual(subtract(10, 4), 6);
});

test('multiply numbers correctly', () => {
  assert.strictEqual(multiply(3, 7), 21);
});

test('divide handles normal and zero division', () => {
  assert.strictEqual(divide(10, 2), 5);
  assert.throws(() => divide(5, 0), /Division by zero/);
});

test('factorial calculates correctly', () => {
  assert.strictEqual(factorial(0), 1);
  assert.strictEqual(factorial(1), 1);
  assert.strictEqual(factorial(5), 120);
});
`,
        'utf-8'
      );
    }

    return starterDir;
  }
}

export const fsService = new FilesystemService();
