import { spawn, ChildProcess } from 'child_process';
import EventEmitter from 'events';
import { fsService } from './fs.js';

export interface TerminalSession {
  id: string;
  name: string;
  cwd: string;
  shell: string;
  process: ChildProcess;
  outputBuffer: string[];
  isActive: boolean;
  createdAt: number;
}

export class TerminalService extends EventEmitter {
  private sessions: Map<string, TerminalSession> = new Map();
  private defaultShell: string;

  constructor() {
    super();
    this.defaultShell = process.platform === 'win32' ? 'powershell.exe' : '/bin/bash';
  }

  createSession(id: string, name = 'Terminal', customCwd?: string, customShell?: string): TerminalSession {
    if (this.sessions.has(id)) {
      return this.sessions.get(id)!;
    }

    const cwd = customCwd || fsService.getProjectRoot();
    const shell = customShell || this.defaultShell;

    // Launch real interactive shell
    const child = spawn(shell, process.platform === 'win32' ? [] : ['-i'], {
      cwd,
      env: {
        ...process.env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
      shell: false,
    });

    const session: TerminalSession = {
      id,
      name,
      cwd,
      shell,
      process: child,
      outputBuffer: [],
      isActive: true,
      createdAt: Date.now(),
    };

    const appendOutput = (data: Buffer | string) => {
      const text = data.toString();
      session.outputBuffer.push(text);
      if (session.outputBuffer.length > 2000) {
        session.outputBuffer.shift();
      }
      this.emit('data', { sessionId: id, data: text });
    };

    child.stdout?.on('data', appendOutput);
    child.stderr?.on('data', appendOutput);

    child.on('error', (err) => {
      appendOutput(`\r\n[Process error: ${err.message}]\r\n`);
      this.emit('error', { sessionId: id, error: err.message });
    });

    child.on('close', (code) => {
      session.isActive = false;
      appendOutput(`\r\n[Process exited with code ${code}]\r\n`);
      this.emit('exit', { sessionId: id, code });
    });

    this.sessions.set(id, session);
    return session;
  }

  writeToSession(id: string, data: string): boolean {
    const session = this.sessions.get(id);
    if (!session || !session.isActive || !session.process.stdin?.writable) {
      return false;
    }
    session.process.stdin.write(data);
    return true;
  }

  killSession(id: string): boolean {
    const session = this.sessions.get(id);
    if (!session) return false;
    try {
      session.process.kill('SIGTERM');
      session.isActive = false;
      this.sessions.delete(id);
      return true;
    } catch {
      return false;
    }
  }

  getSession(id: string): TerminalSession | undefined {
    return this.sessions.get(id);
  }

  getSessionsList(): { id: string; name: string; cwd: string; isActive: boolean }[] {
    return Array.from(this.sessions.values()).map((s) => ({
      id: s.id,
      name: s.name,
      cwd: s.cwd,
      isActive: s.isActive,
    }));
  }

  // Execute a command directly (used by AI agent & test runner) with output capture
  async executeCommand(
    command: string,
    cwd?: string,
    timeoutMs = 60000
  ): Promise<{ stdout: string; stderr: string; exitCode: number; durationMs: number }> {
    const workingDir = cwd || fsService.getProjectRoot();
    const startTime = Date.now();

    return new Promise((resolve) => {
      const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/bash';
      const shellArgs = process.platform === 'win32' ? ['/c', command] : ['-c', command];

      let stdout = '';
      let stderr = '';
      let isTimedOut = false;

      const proc = spawn(shell, shellArgs, {
        cwd: workingDir,
        env: {
          ...process.env,
          TERM: 'xterm-256color',
        },
      });

      const timer = setTimeout(() => {
        isTimedOut = true;
        proc.kill('SIGTERM');
        stderr += `\n[Command timed out after ${timeoutMs}ms]`;
        resolve({
          stdout,
          stderr,
          exitCode: 124,
          durationMs: Date.now() - startTime,
        });
      }, timeoutMs);

      proc.stdout?.on('data', (d) => {
        stdout += d.toString();
      });

      proc.stderr?.on('data', (d) => {
        stderr += d.toString();
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (!isTimedOut) {
          stderr += `\n[Process error: ${err.message}]`;
          resolve({
            stdout,
            stderr,
            exitCode: 1,
            durationMs: Date.now() - startTime,
          });
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (!isTimedOut) {
          resolve({
            stdout,
            stderr,
            exitCode: code ?? 0,
            durationMs: Date.now() - startTime,
          });
        }
      });
    });
  }
}

export const terminalService = new TerminalService();
