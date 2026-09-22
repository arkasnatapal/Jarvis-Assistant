# JARVIS Local Agent Pairing Specification — Phase 3

## Pairing Protocol Overview

The Local Agent pairs with the JARVIS Server via loopback WebSocket authentication (`ws://127.0.0.1:3001/local-agent`).

1. **Key Generation**: Upon first run, the Local Agent generates a 256-bit cryptographically secure secret and stores it at `~/.jarvis/local_agent_pairing.key`.
2. **Handshake Message**:
   ```json
   {
     "type": "agent.handshake",
     "agentId": "jarvis-win-agent-01",
     "timestamp": 1790099000000,
     "nonce": "handshake_1790099000000",
     "signature": "hmac_sha256_hex_digest",
     "payload": {
       "agentId": "jarvis-win-agent-01",
       "platform": "windows",
       "version": "0.3.0",
       "capabilities": ["system.status", "..."],
       "killSwitchActive": false
     }
   }
   ```
3. **Verification**: Server verifies HMAC signature using stored pairing secret.
4. **Status Update**: Upon successful verification, Web HUD updates status to `LOCAL AGENT ONLINE`.
