# JARVIS — Local Desktop Agent Specification (Windows) — Phase 3

## 1. Local Desktop Agent Overview

The **Local Desktop Agent** is a native Python 3.11+ process running on the user's Windows operating system (`apps/local-agent`). It provides JARVIS with controlled, secure, permission-based interaction with host OS capabilities without exposing unrestricted remote control or arbitrary shell execution.

```
USER
 ↓
JARVIS WEB HUD (React + Socket.IO)
 ↓
JARVIS BACKEND (Node.js + Fastify)
 ↓
ORCHESTRATOR
 ↓
PERMISSION ENGINE
 ↓
SECURE LOCAL-AGENT CHANNEL (HMAC WSS loopback)
 ↓
JARVIS WINDOWS AGENT (Python + PyWin32 + psutil)
 ↓
WINDOWS OS
```

---

## 2. Command to Run

Start the Local Agent from repository root:

```bash
pnpm local-agent
# or
python apps/local-agent/main.py
```

---

## 3. Implemented Capabilities (13 Total)

| Capability Code | Description | Risk Level | Approval Policy |
|---|---|---|---|
| `system.status` | CPU, RAM, Disk, GPU, Battery, Network, OS, Uptime | LOW | Auto-Approve |
| `system.info` | Hardware info, CPU count, release, architecture | LOW | Auto-Approve |
| `system.uptime` | Boot timestamp, formatted uptime | LOW | Auto-Approve |
| `application.list` | Running GUI process list | LOW | Auto-Approve |
| `application.launch` | Launch app from allowlist registry (`vscode`, `chrome`, `notepad`, `calculator`, `explorer`, `terminal`) | MEDIUM | Auto-Approve (Allowlist) |
| `application.close` | Close app from registry | HIGH | **HITL Confirmation Required** |
| `window.list` | Visible desktop window handles & titles | LOW | Auto-Approve |
| `window.focus` | Bring window matching title/HWND to front | MEDIUM | Auto-Approve |
| `window.minimize` | Minimize window matching title/HWND | MEDIUM | Auto-Approve |
| `window.maximize` | Maximize window matching title/HWND | MEDIUM | Auto-Approve |
| `filesystem.list` | List directory contents inside sandbox roots | MEDIUM | Auto-Approve inside sandbox |
| `filesystem.read` | Read file inside sandbox roots (max 500 KB) | MEDIUM | Auto-Approve inside sandbox |
| `filesystem.exists` | Check file/folder existence inside sandbox roots | LOW | Auto-Approve inside sandbox |

---

## 4. Sandbox Isolation & Safety Rules

1. **No Arbitrary Shell Execution**: `execute_shell`, `execute_powershell`, and `run_any_command` are strictly prohibited.
2. **Allowlisted Application Registry**: Applications are launched by validated `applicationId` (e.g. `vscode`, `chrome`), never arbitrary executable paths.
3. **Filesystem Jail**: Strictly restricted to canonical allowed roots (`d:\Jarvis`, `C:\Users\<user>\Documents`, `C:\Users\<user>\Projects`). Path traversal (`..`), UNC paths, symlink escapes outside roots are blocked.
4. **Emergency Kill Switch**: Pressing `Ctrl + Alt + Shift + K` disables remote control immediately (`REMOTE CONTROL DISABLED`).
