import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fsService } from './server/fs.js';
import { terminalService } from './server/terminal.js';
import { gitService } from './server/git.js';
import { aiService } from './server/ai.js';
import { agentEngine } from './server/agent.js';
import { storageService } from './server/storage.js';
import { codebaseIndexer } from './server/codebaseIndexer.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const PORT = parseInt(process.env.PORT || '3000', 10);
const isDev = process.env.NODE_ENV !== 'production';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Ensure starter project exists on boot
(async () => {
  try {
    const starterDir = await fsService.ensureStarterProject();
    fsService.setProjectRoot(starterDir);
    await codebaseIndexer.indexCodebase();
    console.log(`[Synthetix IDE] Starter workspace ready at ${starterDir}`);
  } catch (err) {
    console.error('[Synthetix IDE] Error setting up starter workspace:', err);
  }
})();

// ==========================================
// 1. Filesystem API
// ==========================================
app.get('/api/fs/root', (req: Request, res: Response) => {
  res.json({ root: fsService.getProjectRoot() });
});

app.post('/api/fs/set-root', async (req: Request, res: Response) => {
  try {
    const { path: newPath } = req.body;
    const root = fsService.setProjectRoot(newPath);
    await codebaseIndexer.indexCodebase();
    res.json({ success: true, root });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/fs/tree', async (req: Request, res: Response) => {
  try {
    const tree = await fsService.getFileTree();
    res.json({ tree, root: fsService.getProjectRoot() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/fs/read', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.path as string;
    if (!filePath) return res.status(400).json({ error: 'Path required' });
    const file = await fsService.readFile(filePath);
    res.json(file);
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

app.post('/api/fs/write', async (req: Request, res: Response) => {
  try {
    const { path: filePath, content } = req.body;
    if (!filePath) return res.status(400).json({ error: 'Path required' });
    const result = await fsService.writeFile(filePath, content ?? '');
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/fs/create', async (req: Request, res: Response) => {
  try {
    const { path: filePath, content } = req.body;
    const result = await fsService.createFile(filePath, content ?? '');
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/fs/mkdir', async (req: Request, res: Response) => {
  try {
    const { path: dirPath } = req.body;
    const result = await fsService.createDirectory(dirPath);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/fs/delete', async (req: Request, res: Response) => {
  try {
    const { path: targetPath } = req.body;
    const result = await fsService.deletePath(targetPath);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/fs/rename', async (req: Request, res: Response) => {
  try {
    const { oldPath, newPath } = req.body;
    const result = await fsService.renamePath(oldPath, newPath);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/fs/search', async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const isRegex = req.query.regex === 'true';
    const matches = await fsService.searchInFiles(q, isRegex);
    res.json({ matches });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 2. Terminal API
// ==========================================
app.get('/api/terminal/sessions', (req: Request, res: Response) => {
  res.json({ sessions: terminalService.getSessionsList() });
});

app.post('/api/terminal/create', (req: Request, res: Response) => {
  const { id, name, shell, cwd } = req.body;
  const sessionId = id || `term-${Date.now()}`;
  const session = terminalService.createSession(sessionId, name, cwd, shell);
  res.json({
    id: session.id,
    name: session.name,
    cwd: session.cwd,
    shell: session.shell,
    isActive: session.isActive,
  });
});

app.post('/api/terminal/kill', (req: Request, res: Response) => {
  const { id } = req.body;
  const success = terminalService.killSession(id);
  res.json({ success });
});

app.post('/api/terminal/exec', async (req: Request, res: Response) => {
  try {
    const { command, cwd, timeoutMs } = req.body;
    const result = await terminalService.executeCommand(command, cwd, timeoutMs);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 3. Git API
// ==========================================
app.get('/api/git/status', async (req: Request, res: Response) => {
  try {
    const status = await gitService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/git/diff', async (req: Request, res: Response) => {
  try {
    const filePath = req.query.file as string | undefined;
    const staged = req.query.staged === 'true';
    const diff = await gitService.getDiff(filePath, staged);
    res.json({ diff });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/stage', async (req: Request, res: Response) => {
  try {
    const { path: filePath } = req.body;
    const success = await gitService.stageFile(filePath);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/stage-all', async (req: Request, res: Response) => {
  try {
    const success = await gitService.stageAll();
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/unstage', async (req: Request, res: Response) => {
  try {
    const { path: filePath } = req.body;
    const success = await gitService.unstageFile(filePath);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/discard', async (req: Request, res: Response) => {
  try {
    const { path: filePath } = req.body;
    const success = await gitService.discardChanges(filePath);
    res.json({ success });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/commit', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    const result = await gitService.commit(message);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/git/branches', async (req: Request, res: Response) => {
  try {
    const branches = await gitService.getBranches();
    res.json(branches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/branch', async (req: Request, res: Response) => {
  try {
    const { name, createNew } = req.body;
    const result = await gitService.switchBranch(name, createNew);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/git/log', async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const log = await gitService.getLog(limit);
    res.json({ log });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/git/init', async (req: Request, res: Response) => {
  try {
    const result = await gitService.initRepository();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. AI & Agent Streaming API
// ==========================================
app.post('/api/ai/autocomplete', async (req: Request, res: Response) => {
  try {
    const { prefix, suffix, filePath, language } = req.body;
    const suggestion = await aiService.getAutocompleteSuggestion({
      prefix,
      suffix,
      filePath: filePath || 'file.ts',
      language: language || 'typescript',
    });
    res.json({ suggestion });
  } catch (err: any) {
    res.status(500).json({ error: err.message, suggestion: '' });
  }
});

app.post('/api/ai/inline-edit', async (req: Request, res: Response) => {
  try {
    const { instruction, selectedCode, fullFileContent, filePath, language } = req.body;
    const replacement = await aiService.getInlineEdit({
      instruction,
      selectedCode,
      fullFileContent: fullFileContent || '',
      filePath: filePath || 'file.ts',
      language: language || 'typescript',
    });
    res.json({ replacement });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Server-Sent Events (SSE) stream for Agent execution
app.post('/api/ai/agent-stream', async (req: Request, res: Response) => {
  const { taskId, prompt, mode, agentRole, contextFiles, attachedImages } = req.body;
  const currentTaskId = taskId || `task-${Date.now()}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    sendEvent('start', { taskId: currentTaskId });

    const result = await agentEngine.runAgentStep({
      taskId: currentTaskId,
      userPrompt: prompt,
      mode: mode || 'agent',
      agentRole,
      contextFiles,
      attachedImages,
      onStatus: (status) => sendEvent('status', { status }),
      onChunk: (chunk) => sendEvent('chunk', { chunk }),
      onToolCall: (tool) => sendEvent('tool_call', { tool }),
      onDiff: (diff) => sendEvent('diff', { diff }),
    });

    sendEvent('completed', {
      message: result.message,
      checkpointId: result.checkpointId,
    });
    res.end();
  } catch (err: any) {
    sendEvent('error', { error: err.message });
    res.end();
  }
});

app.post('/api/ai/stop', (req: Request, res: Response) => {
  const { taskId } = req.body;
  const success = agentEngine.stopTask(taskId);
  res.json({ success });
});

app.post('/api/ai/rollback', async (req: Request, res: Response) => {
  try {
    const { checkpointId } = req.body;
    const result = await agentEngine.rollbackCheckpoint(checkpointId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. Codebase & Symbols API
// ==========================================
app.get('/api/codebase/symbols', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const symbols = q ? codebaseIndexer.findSymbols(q) : codebaseIndexer.getAllSymbols();
  res.json({ symbols });
});

app.post('/api/codebase/reindex', async (req: Request, res: Response) => {
  try {
    const stats = await codebaseIndexer.indexCodebase();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. Storage & State Management API
// ==========================================
app.get('/api/settings', (req: Request, res: Response) => {
  res.json(storageService.getSettings());
});

app.post('/api/settings', (req: Request, res: Response) => {
  const saved = storageService.saveSettings(req.body);
  res.json(saved);
});

app.get('/api/rules', (req: Request, res: Response) => {
  res.json({ rules: storageService.getRules() });
});

app.post('/api/rules', (req: Request, res: Response) => {
  storageService.saveRules(req.body);
  res.json({ success: true });
});

app.get('/api/memory', (req: Request, res: Response) => {
  res.json({ memory: storageService.getMemory() });
});

app.post('/api/memory', (req: Request, res: Response) => {
  storageService.saveMemory(req.body);
  res.json({ success: true });
});

app.get('/api/agents', (req: Request, res: Response) => {
  res.json({ agents: storageService.getAgents() });
});

app.post('/api/agents', (req: Request, res: Response) => {
  storageService.saveAgents(req.body);
  res.json({ success: true });
});

app.get('/api/tasks', (req: Request, res: Response) => {
  res.json({ tasks: storageService.getTasks() });
});

app.post('/api/tasks', (req: Request, res: Response) => {
  storageService.saveTasks(req.body);
  res.json({ success: true });
});

app.get('/api/conversations', (req: Request, res: Response) => {
  const threadId = (req.query.threadId as string) || 'main';
  res.json({ messages: storageService.getConversations(threadId) });
});

app.post('/api/conversations', (req: Request, res: Response) => {
  const threadId = (req.query.threadId as string) || 'main';
  storageService.saveConversations(req.body.messages, threadId);
  res.json({ success: true });
});

app.get('/api/threads', (req: Request, res: Response) => {
  res.json({ threads: storageService.getThreads() });
});

app.delete('/api/threads/:id', (req: Request, res: Response) => {
  storageService.deleteThread(req.params.id);
  res.json({ success: true });
});

app.get('/api/checkpoints', (req: Request, res: Response) => {
  res.json({ checkpoints: storageService.getCheckpoints() });
});

// ==========================================
// 7. WebSocket for Interactive Terminal
// ==========================================
wss.on('connection', (ws: WebSocket) => {
  let boundSessionId: string | null = null;

  const dataListener = ({ sessionId, data }: { sessionId: string; data: string }) => {
    if (boundSessionId === sessionId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'output', sessionId, data }));
    }
  };

  terminalService.on('data', dataListener);

  ws.on('message', (message: string) => {
    try {
      const msg = JSON.parse(message.toString());
      if (msg.type === 'bind') {
        boundSessionId = msg.sessionId;
        const session = terminalService.getSession(msg.sessionId);
        if (session && session.outputBuffer.length > 0) {
          // Send buffered history
          ws.send(
            JSON.stringify({
              type: 'history',
              sessionId: msg.sessionId,
              data: session.outputBuffer.join(''),
            })
          );
        }
      } else if (msg.type === 'input') {
        const { sessionId, data } = msg;
        terminalService.writeToSession(sessionId, data);
      }
    } catch (e) {
      console.error('WebSocket message parsing error:', e);
    }
  });

  ws.on('close', () => {
    terminalService.off('data', dataListener);
  });
});

// ==========================================
// 8. Vite Integration (Dev) or Static (Prod)
// ==========================================
async function startServer() {
  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[Synthetix IDE] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Synthetix IDE] Failed to start server:', err);
  process.exit(1);
});
