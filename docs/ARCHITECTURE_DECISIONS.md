# JARVIS — Architectural Decision Records (ADR)

## ADR 001: Monorepo Architecture with pnpm Workspaces
- **Status**: APPROVED & IMPLEMENTED (Phase 1)
- **Context**: JARVIS consists of a web frontend, backend server orchestrator, local desktop agent, and shared packages.
- **Decision**: Use a **pnpm monorepo** structure (`apps/` and `packages/`).
- **Implementation**: Created `apps/web`, `apps/server`, `packages/shared`, `pnpm-workspace.yaml`.

---

## ADR 002: Dual Language Stack (Node.js/TypeScript + Python)
- **Status**: APPROVED (TypeScript server & web implemented in Phase 1; Python local agent planned for Phase 3)
- **Context**: Server orchestrator and web app benefit from TypeScript's rigid typing and async performance.
- **Decision**: Use **TypeScript/Node.js** for `apps/server`, `apps/web`, `packages/shared`. Use **Python 3.11+** for `apps/local-agent` (Phase 3).

---

## ADR 003: Hybrid Relational & Vector Persistence
- **Status**: APPROVED (In-memory storage implemented for Phase 1; PostgreSQL/PGVector planned for Phase 6)
- **Context**: Phase 1 requires lightweight in-memory session management without external database dependencies.
- **Decision**: Use in-memory session store (`SessionManager`) with clean interface, ready to swap to Redis/PostgreSQL in later phases.

---

## ADR 004: Human-in-the-Loop (HITL) Approval Enforcement
- **Status**: APPROVED & IMPLEMENTED (Phase 1 Permission Engine foundation)
- **Context**: High-risk tool calls require confirmation gates.
- **Decision**: Permission Engine evaluates `SAFE` tools as `ALLOW` and `HIGH`/`CRITICAL` tools as `REQUIRE_CONFIRMATION`.

---

## ADR 005: Untrusted External Content Delimiting
- **Status**: APPROVED (Planned for Phase 4 Browser Agent)
- **Context**: Prevent prompt injection from external sources.
- **Decision**: Wrap external content in strict `<external_untrusted_content>` tags.

---

## ADR 006: LLM Provider Abstraction & Automated Fallback Chain
- **Status**: APPROVED & IMPLEMENTED (Phase 1)
- **Context**: Avoid coupling JARVIS to a single AI vendor.
- **Decision**: Implement `LLMProvider` interface with `MockLLMProvider` and `OpenAICompatibleProvider`. Fallback to Mock provider when API keys are absent or invalid.

---

## ADR 007: Privacy & CoT Sanitization Boundary
- **Status**: APPROVED & IMPLEMENTED (Phase 1)
- **Context**: Internal prompt reasoning logged to server; high-level progress streamed over WebSockets.

---

## ADR 008: Degraded Offline Mode Strategy
- **Status**: APPROVED & IMPLEMENTED (Phase 1)
- **Context**: System status indicators and mock provider allow 100% offline operation during development and testing.

---

## ADR 009: Contextual Capability-Based Access Control (CCBAC)
- **Status**: APPROVED & IMPLEMENTED (Phase 1 Permission Engine)
- **Context**: Dynamic capability validation for tool calls.
