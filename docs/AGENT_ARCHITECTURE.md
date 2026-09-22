# JARVIS — Multi-Agent Architecture Specification

## 1. Unified Agent Architecture

JARVIS simplifies multi-agent orchestration by deploying specialized sub-agent **Personas** within a single **Unified In-Process Agent Engine** (running inside `apps/server`). This avoids the over-engineering of separate heavy micro-services while retaining clean separation of responsibilities, tool subsets, and prompt instructions.

---

## 2. LLM Provider Abstraction & Fallback Framework

The agent system uses a standardized `ILLMProvider` interface that abstracts underlying model vendor details and provides automated fallback chains:

```typescript
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
}

export interface LLMResponse {
  content: string | null;
  toolCalls?: Array<{
    id: string;
    toolName: string;
    args: Record<string, unknown>;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface ILLMProvider {
  providerId: string; // 'anthropic' | 'openai' | 'google' | 'ollama'
  modelName: string;   // 'claude-3-5-sonnet' | 'gpt-4o' | 'llama3.2'
  generateResponse(messages: LLMMessage[], tools?: Record<string, unknown>[]): Promise<LLMResponse>;
  streamResponse(messages: LLMMessage[], onChunk: (text: string) => void): Promise<LLMResponse>;
}
```

### Fallback Priority Chain
1. **Primary**: Cloud High-Reasoning Model (e.g. Anthropic Claude 3.5 Sonnet / OpenAI GPT-4o)
2. **Secondary**: Cloud Fast Model (e.g. Google Gemini 1.5 Flash / GPT-4o-mini)
3. **Tertiary (Offline)**: Local Ollama Model (e.g. Llama 3.2 / Qwen 2.5)

---

## 3. Specialized Agent Personas

Sub-agents exist as lightweight configuration personas running within the main agent loop:

| Agent Persona | Focus Area | Allowed Tool Subset | Risk Threshold | Default Model Tier |
|---|---|---|---|---|
| **Master Orchestrator** | Intent parsing, plan generation, result synthesis | `system_notify`, `ask_user` | SAFE | High-Reasoning LLM |
| **Coding Persona** | Code generation, refactoring, test execution | `file_read`, `file_write`, `terminal_exec` | HIGH | High-Reasoning LLM |
| **Research Persona** | Web search, information synthesis | `web_search`, `fetch_url`, `pdf_extract` | LOW | Fast LLM |
| **Browser Persona** | Controlled form filling & extraction | `browser_navigate`, `browser_click`, `browser_type` | MEDIUM | High-Reasoning LLM |
| **Desktop Persona** | Windows OS app management, screen capture | `app_launch`, `process_kill`, `sys_telemetry` | HIGH | Fast LLM |
| **Productivity Persona** | Email and calendar operations | `email_read`, `email_send`, `calendar_read` | HIGH | Fast LLM |

---

## 4. Chain-of-Thought (CoT) Sanitization & UI Boundaries

### Privacy & Security Rule: No Raw CoT Exposure
- **Server-Side Debug Logs Only**: Raw model scratchpad thinking, internal system prompts, and un-sanitized reflection steps are logged strictly to encrypted server debug logs (`apps/server/logs/debug.log`).
- **User-Facing Progress Tokens**: The orchestrator transforms internal thoughts into sanitized, high-level status messages before pushing over WebSockets:
  - *Internal CoT*: `"Checking if file C:\Windows\System32\cmd.exe exists to execute shell command..."`
  - *Sanitized UI Stream*: `"Preparing task environment..."`

---

## 5. Execution Limits & Loop Safeguards

1. **Max Steps**: Maximum 10 tool iterations per task execution.
2. **Timeout**: 120 seconds maximum per task step.
3. **Loop Detector**: Halts execution if identical tool parameters are dispatched 3 times sequentially.
