# JARVIS — Real-Time Event System & Telemetry Architecture

## 1. Event System Overview

JARVIS is built around an **Event-Driven Architecture (EDA)**. All operations stream typed `JarvisEvent` payloads over the internal EventBus and WebSocket protocol.

---

## 2. Event Catalog & Implementation Status

| Event Type | Priority | Source | Status | Purpose |
|---|---|---|---|---|
| `system.connected` | `LOW` | `server` | **IMPLEMENTED** | Dispatched when a new client connects over WebSockets. |
| `user.request.received` | `LOW` | `user_ui` | **IMPLEMENTED** | Emitted when user submits prompt. |
| `orchestrator.started` | `LOW` | `orchestrator` | **IMPLEMENTED** | Signals beginning of orchestration pipeline. |
| `orchestrator.completed` | `LOW` | `orchestrator` | **IMPLEMENTED** | Signals successful task completion. |
| `llm.request.started` | `LOW` | `llm` | **IMPLEMENTED** | Emitted when LLM query commences. |
| `llm.response.chunk` | `LOW` | `llm` | **IMPLEMENTED** | Streams individual text chunks. |
| `llm.request.completed` | `LOW` | `llm` | **IMPLEMENTED** | Emitted upon full LLM completion. |
| `llm.request.failed` | `HIGH` | `llm` | **IMPLEMENTED** | Emitted on LLM error/timeout. |
| `tool.requested` | `LOW` | `tool_system` | **IMPLEMENTED** | Emitted when LLM requests tool execution. |
| `tool.permission_checked` | `LOW` | `permission_engine` | **IMPLEMENTED** | Emitted upon capability permission check. |
| `tool.started` | `LOW` | `tool_system` | **IMPLEMENTED** | Signals tool handler launch. |
| `tool.completed` | `LOW` | `tool_system` | **IMPLEMENTED** | Emitted on tool success with result. |
| `tool.failed` | `HIGH` | `tool_system` | **IMPLEMENTED** | Emitted on tool failure or timeout. |
| `system.error` | `HIGH` | `orchestrator` | **IMPLEMENTED** | Emitted on server exception. |
| `system.status` | `LOW` | `server` | **IMPLEMENTED** | Pushes component status snapshot. |

---

## 3. Standardized Event Payload Schema

```typescript
export interface JarvisEvent {
  eventId: string;
  eventType: JarvisEventType;
  source: 'user_ui' | 'server' | 'orchestrator' | 'llm' | 'tool_system' | 'permission_engine';
  timestamp: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  correlationId: string;
  payload: Record<string, unknown>;
}
```
