# JARVIS — REST & WebSocket API Specification

## 1. API Architecture Overview

JARVIS provides a dual API surface:
1. **REST API**: Serves health probes, tool discovery, and session message history.
2. **WebSocket API (Socket.io / WSS)**: Handles real-time telemetry streaming, assistant chunk streaming, tool execution events, and system status updates.

---

## 2. REST Endpoints Specification

### Health & System Status
- `GET /health` — **[IMPLEMENTED]** Returns server health status, component statuses, version, and uptime.
- `GET /api/v1/tools` — **[IMPLEMENTED]** Returns list of active registered tools in `ToolRegistry`.
- `GET /api/v1/sessions/:sessionId/messages` — **[IMPLEMENTED]** Returns chat message history for active session.

### Authentication & User Management (Future Phases)
- `POST /api/v1/auth/register` — **[PLANNED]** Device pairing / user setup.
- `POST /api/v1/auth/webauthn/challenge` — **[PLANNED]** WebAuthn challenge nonce.
- `POST /api/v1/auth/webauthn/verify` — **[PLANNED]** Verifies WebAuthn assertion signature.

---

## 3. WebSocket Event Protocol Standard

### Client -> Server Events
- `user.message` — **[IMPLEMENTED]** Dispatches prompt payload `{ content, sessionId, correlationId }`.
- `client.ping` — **[IMPLEMENTED]** Requests immediate status telemetry update.

### Server -> Client Events
- `system.status` — **[IMPLEMENTED]** Pushes component health status snapshot.
- `event` — **[IMPLEMENTED]** Broadcasts typed `JarvisEvent` items (e.g. `tool.requested`, `llm.request.started`).
- `assistant.chunk` — **[IMPLEMENTED]** Streams response text chunks `{ chunk, correlationId, isFinal }`.
- `assistant.completed` — **[IMPLEMENTED]** Signals completion of request with final response & tool result.
- `error` — **[IMPLEMENTED]** Returns structured JSON error payload.
