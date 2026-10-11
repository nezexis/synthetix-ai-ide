# Synthetix AI IDE

An experimental AI-powered coding environment inspired by Cursor.

## Status
🚧 Work in progress. The code was generated with AI assistance (Google AI Studio)
and not every feature is tested yet. I'm 13 and I'm learning how it works.

## Idea
A code editor where an AI assistant can read project files, suggest edits and
run commands, all in one window.

## Planned features
- [ ] Code editor (Monaco)
- [ ] AI chat with modes: Agent, Ask, Plan, Debug
- [ ] Inline AI edit (Ctrl+K)
- [ ] Integrated terminal
- [ ] Git panel
- [ ] Checkpoints and rollback
- [ ] Project rules and memory

(I mark a feature ✅ when I have tested it myself.)

## Tech
React, TypeScript, Tailwind CSS, Monaco Editor, xterm.js, Node.js, Express,
WebSocket, Google Gemini API

## Run locally
1. Install [Node.js](https://nodejs.org)
2. `npm install`
3. Copy `.env.example` to `.env` and add your API key
4. `npm run dev`

⚠️ **Security:** this app can run terminal commands. Run it only on your own
computer and never deploy it publicly.

## Roadmap
- [ ] Test and document each feature
- [ ] Add screenshots or a demo GIF
- [ ] Fix known bugs

## About me
I'm 13 and I build projects with AI assistance while learning programming.
