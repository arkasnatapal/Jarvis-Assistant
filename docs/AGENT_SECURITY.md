# JARVIS Local Agent Security Architecture — Phase 3

## 1. Security Boundaries

The Local Agent acts as a privileged security boundary for JARVIS:
- The web browser does **NOT** directly control Windows.
- The backend server does **NOT** have arbitrary shell access.
- The Local Agent only executes authorized desktop capabilities.

## 2. Authentication & HMAC Signatures

All communication between JARVIS Server and Local Agent is authenticated via HMAC-SHA256:
- Secret key stored in `~/.jarvis/local_agent_pairing.key`.
- Message format: `{ timestamp, nonce, payload, signature }`.
- Signature: `HMAC-SHA256(secret, timestamp:nonce:payload)`.

## 3. Replay Protection & Timestamp Freshness

- Requests with timestamps deviating by more than 5,000ms are dropped.
- Rolling request cache tracks recent request IDs for 60 seconds to prevent replay attacks.

## 4. Filesystem Sandbox Verification

- Normalizes target path to canonical realpath (`os.path.realpath(os.path.abspath(path))`).
- Verifies canonical target path begins with an allowed root directory.
- Rejects relative path traversal (`..`), UNC network shares, device paths, and symlink targets outside allowed boundaries.

## 5. Emergency Kill Switch

- Global hotkey listener on host machine: `Ctrl + Alt + Shift + K`.
- Instantly sets agent status to `REMOTE_CONTROL_DISABLED`.
- Rejects all incoming remote command executions until reset.
