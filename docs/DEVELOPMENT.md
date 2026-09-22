# JARVIS — Developer Onboarding & Local Setup Guide

## 1. Environment Requirements
- **Node.js**: `v20.0.0` or higher (verified on Node `v22.23.2`)
- **Package Manager**: `pnpm` `v10.0.0+` or `v12.0.0+`

---

## 2. Quick Start (Development Mode)

1. **Install Dependencies**:
   ```bash
   pnpm install
   pnpm approve-builds --all
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` inside `apps/server`:
   ```bash
   cp .env.example apps/server/.env
   ```

3. **Start Development Servers (Parallel)**:
   ```bash
   pnpm dev
   ```
   - **JARVIS Web HUD**: `http://localhost:5173`
   - **JARVIS Fastify Server**: `http://localhost:3001`

---

## 3. Command Reference

| Command | Description |
|---|---|
| `pnpm dev` | Starts `@jarvis/server` and `@jarvis/web` in parallel dev mode with live reload. |
| `pnpm build` | Compiles TypeScript for `@jarvis/shared`, `@jarvis/server`, and runs Vite production build for `@jarvis/web`. |
| `pnpm test` | Runs Vitest unit and integration test suite across all workspace packages. |
| `pnpm --filter @jarvis/server dev` | Starts backend server independently. |
| `pnpm --filter @jarvis/web dev` | Starts frontend Vite dev server independently. |

---

## 4. Verification & Diagnostics

Run automated test suite:
```bash
pnpm test
```

Test health endpoint manually:
```bash
curl http://localhost:3001/health
```
