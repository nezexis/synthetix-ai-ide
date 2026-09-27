import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import { storageService } from './storage.js';

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system' | 'model';
  content: string;
}

export interface StreamChunkHandler {
  onChunk: (text: string) => void;
  onToolCall?: (toolCall: { name: string; args: any; id?: string }) => void;
}

export class AiService {
  private geminiClient: GoogleGenAI | null = null;

  constructor() {
    this.initGemini();
  }

  private initGemini(customKey?: string) {
    const apiKey = customKey || process.env.GEMINI_API_KEY;
    if (apiKey) {
      this.geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }

  getGeminiClient(): GoogleGenAI {
    if (!this.geminiClient) {
      this.initGemini();
    }
    if (!this.geminiClient) {
      throw new Error(
        'Gemini API Key is not configured. Please ensure GEMINI_API_KEY is available in the environment or set in Settings.'
      );
    }
    return this.geminiClient;
  }

  // Generate text streaming or full response
  async generateStream(params: {
    prompt: string;
    systemInstruction?: string;
    model?: string;
    temperature?: number;
    tools?: any[];
    imageParts?: { mimeType: string; data: string }[];
    onChunk: (text: string) => void;
  }): Promise<{ fullText: string; toolCalls?: any[] }> {
    const settings = storageService.getSettings();
    const provider = settings.ai.defaultProvider;

    if (provider === 'gemini') {
      return this.generateGeminiStream(params);
    } else if (provider === 'openai' || provider === 'ollama' || provider === 'custom') {
      return this.generateOpenAiStream(params);
    } else {
      return this.generateGeminiStream(params);
    }
  }

  private async generateGeminiStream(params: {
    prompt: string;
    systemInstruction?: string;
    model?: string;
    temperature?: number;
    tools?: any[];
    imageParts?: { mimeType: string; data: string }[];
    onChunk: (text: string) => void;
  }): Promise<{ fullText: string; toolCalls?: any[] }> {
    const client = this.getGeminiClient();
    const model = params.model || 'gemini-3.8-flash';

    const parts: any[] = [];
    if (params.imageParts && params.imageParts.length > 0) {
      for (const img of params.imageParts) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }
    }
    parts.push({ text: params.prompt });

    const config: any = {};
    if (params.systemInstruction) {
      config.systemInstruction = params.systemInstruction;
    }
    if (typeof params.temperature === 'number') {
      config.temperature = params.temperature;
    }
    if (params.tools && params.tools.length > 0) {
      config.tools = params.tools;
    }

    try {
      const responseStream = await client.models.generateContentStream({
        model,
        contents: { parts },
        config,
      });

      let fullText = '';
      let functionCalls: any[] = [];

      for await (const chunk of responseStream) {
        const textChunk = (chunk as GenerateContentResponse).text;
        if (textChunk) {
          fullText += textChunk;
          params.onChunk(textChunk);
        }
        if (chunk.functionCalls && chunk.functionCalls.length > 0) {
          functionCalls.push(...chunk.functionCalls);
        }
      }

      return { fullText, toolCalls: functionCalls.length > 0 ? functionCalls : undefined };
    } catch (err: any) {
      // If streaming fails with toolCalls, try non-streaming fallback
      if (params.tools && params.tools.length > 0) {
        const res = await client.models.generateContent({
          model,
          contents: { parts },
          config,
        });
        const text = res.text || '';
        params.onChunk(text);
        return {
          fullText: text,
          toolCalls: res.functionCalls || undefined,
        };
      }
      throw err;
    }
  }

  // OpenAI / Ollama compatible fallback endpoint
  private async generateOpenAiStream(params: {
    prompt: string;
    systemInstruction?: string;
    model?: string;
    temperature?: number;
    onChunk: (text: string) => void;
  }): Promise<{ fullText: string; toolCalls?: any[] }> {
    const settings = storageService.getSettings();
    const endpoint = settings.ai.customEndpoint || 'http://localhost:11434/v1';
    const apiKey = settings.ai.customApiKey || 'ollama';
    const model = params.model || 'llama3';

    const messages = [];
    if (params.systemInstruction) {
      messages.push({ role: 'system', content: params.systemInstruction });
    }
    messages.push({ role: 'user', content: params.prompt });

    const res = await fetch(`${endpoint.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: params.temperature ?? 0.2,
        stream: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI-compatible provider error (${res.status}): ${errText}`);
    }

    if (!res.body) throw new Error('No response body received');

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        if (trimmed === 'data: [DONE]') break;
        try {
          const json = JSON.parse(trimmed.slice(5).trim());
          const delta = json.choices?.[0]?.delta?.content || '';
          if (delta) {
            fullText += delta;
            params.onChunk(delta);
          }
        } catch {
          // ignore malformed chunks
        }
      }
    }

    return { fullText };
  }

  // Real AI Autocomplete generator for Monaco inline completions
  async getAutocompleteSuggestion(params: {
    prefix: string;
    suffix: string;
    filePath: string;
    language: string;
    recentSymbols?: string[];
  }): Promise<string> {
    const client = this.getGeminiClient();
    const prompt = `You are a high-speed code completion engine.
You are given the code BEFORE the cursor (prefix) and AFTER the cursor (suffix) in file "${params.filePath}" (${params.language}).
Predict and return ONLY the exact next characters or lines of code that should be inserted directly at the cursor.

CRITICAL RULES:
1. Return ONLY the code to be inserted at the cursor position.
2. DO NOT repeat code from the prefix.
3. DO NOT repeat code from the suffix.
4. DO NOT wrap with markdown backticks (no \`\`\`).
5. If no completion is appropriate, return empty string.
6. Maximum 10 lines of code.

[PREFIX]:
${params.prefix.slice(-1500)}
[CURSOR]
[SUFFIX]:
${params.suffix.slice(0, 500)}`;

    try {
      const res = await client.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          temperature: 0.1,
        },
      });

      let text = res.text || '';
      // Clean accidental markdown wrappers
      text = text.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
      return text;
    } catch (err) {
      console.error('Autocomplete error:', err);
      return '';
    }
  }

  // Inline Code Assistant (Cmd+K)
  async getInlineEdit(params: {
    instruction: string;
    selectedCode: string;
    fullFileContent: string;
    filePath: string;
    language: string;
  }): Promise<string> {
    const client = this.getGeminiClient();
    const prompt = `You are an expert code editor.
Instruction from user: "${params.instruction}"

File: ${params.filePath} (${params.language})

Here is the selected code snippet to edit:
\`\`\`${params.language}
${params.selectedCode}
\`\`\`

Here is surrounding file context:
\`\`\`${params.language}
${params.fullFileContent.slice(0, 2000)}
\`\`\`

Output ONLY the replacement code for the selected snippet.
Do not include explanation.
Do not include markdown code block backticks unless they are part of the actual file.`;

    const res = await client.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
      },
    });

    let text = res.text || '';
    if (text.startsWith('```') && text.endsWith('```')) {
      const lines = text.split('\n');
      text = lines.slice(1, -1).join('\n');
    }
    return text;
  }
}

export const aiService = new AiService();
