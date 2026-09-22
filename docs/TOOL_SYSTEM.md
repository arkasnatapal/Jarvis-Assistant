# JARVIS — Standardized Tool Architecture & Lifecycle

## 1. Tool Framework Overview

All external interactions in JARVIS are encapsulated as strongly typed **Tools**. The tool framework enforces a 7-stage lifecycle: schema validation, contextual capability verification, HITL approval, pre-execution sanitization, execution wrapping, post-execution auditing, and resource teardown.

---

## 2. Phase 1 Tool Status Registry

| Tool Name | Capability | Risk Level | Status | Implementation File |
|---|---|---|---|---|
| `get_current_time` | `SYSTEM_TIME` | `SAFE` | **IMPLEMENTED** | `apps/server/src/tools/built-in/time.tool.ts` |
| `calculate` | `MATH_EVAL` | `SAFE` | **IMPLEMENTED** | `apps/server/src/tools/built-in/calculator.tool.ts` |
| `get_system_status` | `SYSTEM_READ` | `SAFE` | **IMPLEMENTED** | `apps/server/src/tools/built-in/system-status.tool.ts` |
| `web_search` | `WEB_SEARCH` | `SAFE` | **IMPLEMENTED (Adapter)** | `apps/server/src/tools/built-in/web-search.tool.ts` |
| `jarvis_test` | `JARVIS_TEST` | `SAFE` | **IMPLEMENTED** | `apps/server/src/tools/built-in/jarvis-test.tool.ts` |
| `desktop_launch_app` | `SYSTEM_CONTROL` | `HIGH` | **PLANNED (Phase 3)** | Local Agent WSS Bridge |
| `terminal_run_command` | `TERMINAL_EXECUTE` | `HIGH` | **PLANNED (Phase 3)** | Local Agent WSS Bridge |
| `browser_open_url` | `BROWSER_CONTROL` | `LOW` | **PLANNED (Phase 4)** | Playwright Controller |

---

## 3. Tool Specification Standard

Every tool implements `ToolDefinition`:

```typescript
export interface ToolDefinition<TInput extends z.ZodTypeAny = z.ZodTypeAny> {
  name: string;
  description: string;
  inputSchema: TInput;
  riskLevel: RiskLevel;
  requiredCapability: CapabilityPermission;
  requiresConfirmation: boolean;
  timeoutMs: number;
}
```
