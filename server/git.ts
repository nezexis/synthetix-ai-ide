import { terminalService } from './terminal.js';
import { fsService } from './fs.js';

export interface GitFileStatus {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'untracked' | 'renamed' | 'copied';
  staged: boolean;
}

export interface GitStatusResult {
  isGitRepo: boolean;
  branch: string;
  files: GitFileStatus[];
  ahead: number;
  behind: number;
}

export interface GitCommitRecord {
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  message: string;
}

export class GitService {
  private async runGit(command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const cwd = fsService.getProjectRoot();
    return terminalService.executeCommand(`git ${command}`, cwd);
  }

  async isRepository(): Promise<boolean> {
    const { exitCode } = await this.runGit('rev-parse --is-inside-work-tree');
    return exitCode === 0;
  }

  async initRepository(): Promise<{ success: boolean; message: string }> {
    const { stdout, stderr, exitCode } = await this.runGit('init');
    if (exitCode !== 0) {
      throw new Error(`Git init failed: ${stderr}`);
    }
    // Also set initial config if needed
    await this.runGit('config user.name "AI Developer"');
    await this.runGit('config user.email "ai-developer@synthetix.ide"');
    return { success: true, message: stdout.trim() };
  }

  async getStatus(): Promise<GitStatusResult> {
    const isRepo = await this.isRepository();
    if (!isRepo) {
      return {
        isGitRepo: false,
        branch: '',
        files: [],
        ahead: 0,
        behind: 0,
      };
    }

    // Branch
    const branchRes = await this.runGit('branch --show-current');
    const branch = branchRes.stdout.trim() || 'main';

    // Status porcelaine
    const statusRes = await this.runGit('status --porcelain');
    const lines = statusRes.stdout.split('\n').filter((l) => l.trim().length > 0);
    const files: GitFileStatus[] = [];

    for (const line of lines) {
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePath = line.substring(3).trim();

      if (indexStatus !== ' ' && indexStatus !== '?') {
        let status: GitFileStatus['status'] = 'modified';
        if (indexStatus === 'A') status = 'added';
        if (indexStatus === 'D') status = 'deleted';
        if (indexStatus === 'R') status = 'renamed';
        files.push({ path: filePath, status, staged: true });
      }

      if (workTreeStatus !== ' ') {
        let status: GitFileStatus['status'] = 'modified';
        if (workTreeStatus === '?') status = 'untracked';
        if (workTreeStatus === 'D') status = 'deleted';
        files.push({ path: filePath, status, staged: false });
      }
    }

    return {
      isGitRepo: true,
      branch,
      files,
      ahead: 0,
      behind: 0,
    };
  }

  async getDiff(filePath?: string, staged = false): Promise<string> {
    const isRepo = await this.isRepository();
    if (!isRepo) return '';

    let cmd = 'diff';
    if (staged) cmd += ' --cached';
    if (filePath) cmd += ` -- "${filePath}"`;

    const { stdout } = await this.runGit(cmd);
    return stdout;
  }

  async stageFile(filePath: string): Promise<boolean> {
    const { exitCode } = await this.runGit(`add "${filePath}"`);
    return exitCode === 0;
  }

  async stageAll(): Promise<boolean> {
    const { exitCode } = await this.runGit('add -A');
    return exitCode === 0;
  }

  async unstageFile(filePath: string): Promise<boolean> {
    const { exitCode } = await this.runGit(`restore --staged "${filePath}"`);
    return exitCode === 0;
  }

  async discardChanges(filePath: string): Promise<boolean> {
    const { exitCode } = await this.runGit(`restore "${filePath}"`);
    return exitCode === 0;
  }

  async commit(message: string): Promise<{ success: boolean; hash?: string; error?: string }> {
    const safeMsg = message.replace(/"/g, '\\"');
    const { stdout, stderr, exitCode } = await this.runGit(`commit -m "${safeMsg}"`);
    if (exitCode !== 0) {
      return { success: false, error: stderr || stdout };
    }
    const hashRes = await this.runGit('rev-parse --short HEAD');
    return { success: true, hash: hashRes.stdout.trim() };
  }

  async getBranches(): Promise<{ current: string; all: string[] }> {
    const isRepo = await this.isRepository();
    if (!isRepo) return { current: '', all: [] };

    const { stdout } = await this.runGit('branch -a');
    const lines = stdout.split('\n').filter((l) => l.trim().length > 0);
    let current = '';
    const all: string[] = [];

    for (const line of lines) {
      const clean = line.replace('*', '').trim();
      if (line.startsWith('*')) {
        current = clean;
      }
      if (clean && !clean.includes('->')) {
        all.push(clean);
      }
    }

    return { current, all };
  }

  async switchBranch(branchName: string, createNew = false): Promise<{ success: boolean; message: string }> {
    const cmd = createNew ? `checkout -b "${branchName}"` : `checkout "${branchName}"`;
    const { stdout, stderr, exitCode } = await this.runGit(cmd);
    if (exitCode !== 0) {
      throw new Error(stderr || stdout);
    }
    return { success: true, message: stdout || stderr };
  }

  async getLog(limit = 20): Promise<GitCommitRecord[]> {
    const isRepo = await this.isRepository();
    if (!isRepo) return [];

    const format = '%H|%h|%an|%ad|%s';
    const { stdout, exitCode } = await this.runGit(
      `log -n ${limit} --pretty=format:"${format}" --date=short`
    );
    if (exitCode !== 0 || !stdout.trim()) return [];

    const lines = stdout.trim().split('\n');
    return lines.map((line) => {
      const [hash, shortHash, author, date, ...rest] = line.split('|');
      return {
        hash,
        shortHash,
        author,
        date,
        message: rest.join('|'),
      };
    });
  }
}

export const gitService = new GitService();
