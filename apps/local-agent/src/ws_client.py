import json
import time
import threading
import traceback
import websocket
from typing import Dict, Any

from src.config import (
    AGENT_ID,
    PLATFORM,
    VERSION,
    SERVER_WS_URL,
    HEARTBEAT_INTERVAL_SECONDS,
    RECONNECT_INITIAL_BACKOFF,
    RECONNECT_MAX_BACKOFF,
    AGENT_CAPABILITIES
)
from src.pairing import get_or_create_pairing_secret
from src.security import (
    verify_hmac_signature,
    verify_replay_protection,
    compute_hmac_signature,
    serialize_payload
)
from src.kill_switch import is_kill_switch_active, register_activate_callback

# Capabilities mapping
from src.capabilities.system import get_system_status, get_system_info, get_system_uptime
from src.capabilities.applications import list_applications, launch_application, close_application
from src.capabilities.windows import list_windows, focus_window, minimize_window, maximize_window
from src.capabilities.filesystem import list_filesystem, read_filesystem, exists_filesystem

CAPABILITY_DISPATCH = {
    "system.status": lambda p: get_system_status(),
    "system.info": lambda p: get_system_info(),
    "system.uptime": lambda p: get_system_uptime(),
    "application.list": lambda p: list_applications(),
    "application.launch": lambda p: launch_application(p.get("applicationId", "")),
    "application.close": lambda p: close_application(p.get("applicationId", "")),
    "window.list": lambda p: list_windows(),
    "window.focus": lambda p: focus_window(p.get("query", "")),
    "window.minimize": lambda p: minimize_window(p.get("query", "")),
    "window.maximize": lambda p: maximize_window(p.get("query", "")),
    "filesystem.list": lambda p: list_filesystem(p.get("path", "")),
    "filesystem.read": lambda p: read_filesystem(p.get("path", "")),
    "filesystem.exists": lambda p: exists_filesystem(p.get("path", ""))
}

class LocalAgentWSClient:
    def __init__(self):
        self.secret = get_or_create_pairing_secret()
        self.ws = None
        self.connected = False
        self.stop_requested = False
        self.heartbeat_thread = None

        # Register callback when kill switch activates
        register_activate_callback(self._on_kill_switch_activated)

    def start(self):
        """Starts WebSocket client connection loop with exponential backoff."""
        backoff = RECONNECT_INITIAL_BACKOFF

        while not self.stop_requested:
            try:
                print(f"[Agent] Connecting to JARVIS Backend at {SERVER_WS_URL}...")
                self.ws = websocket.WebSocketApp(
                    SERVER_WS_URL,
                    on_open=self._on_open,
                    on_message=self._on_message,
                    on_error=self._on_error,
                    on_close=self._on_close
                )
                self.ws.run_forever()
            except Exception as e:
                print(f"[Agent] Connection error: {e}")

            if self.stop_requested:
                break

            print(f"[Agent] Disconnected. Reconnecting in {backoff} seconds...")
            time.sleep(backoff)
            backoff = min(backoff * 2, RECONNECT_MAX_BACKOFF)

    def _on_open(self, ws):
        """Handler for WebSocket connection open."""
        self.connected = True
        print("[Agent] WebSocket connection established successfully!")

        # Perform Handshake & Capability Advertisement
        now_ms = int(time.time() * 1000)
        nonce = f"handshake_{now_ms}"
        payload = {
            "agentId": AGENT_ID,
            "capabilities": AGENT_CAPABILITIES,
            "killSwitchActive": is_kill_switch_active(),
            "platform": PLATFORM,
            "version": VERSION
        }
        payload_str = serialize_payload(payload)
        signature = compute_hmac_signature(self.secret, now_ms, nonce, payload_str)

        handshake_msg = {
            "type": "agent.handshake",
            "agentId": AGENT_ID,
            "timestamp": now_ms,
            "nonce": nonce,
            "signature": signature,
            "payload": payload
        }
        ws.send(json.dumps(handshake_msg))
        print(f"[Agent] Sent authentication handshake & advertised {len(AGENT_CAPABILITIES)} capabilities.")

        # Start Heartbeat thread
        if not self.heartbeat_thread or not self.heartbeat_thread.is_alive():
            self.heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
            self.heartbeat_thread.start()

    def _on_message(self, ws, message_str):
        """Handler for incoming RPC requests from server."""
        try:
            msg = json.loads(message_str)
            msg_type = msg.get("type", "rpc_request")

            if msg_type == "ping":
                ws.send(json.dumps({"type": "pong", "timestamp": int(time.time() * 1000)}))
                return

            if msg_type == "rpc_request":
                self._handle_rpc_request(msg)
        except Exception as e:
            print(f"[Agent] Error processing WebSocket message: {e}")

    def _handle_rpc_request(self, msg: Dict[str, Any]):
        """Validates and dispatches RPC execution request."""
        request_id = msg.get("requestId", "")
        correlation_id = msg.get("correlationId", "")
        timestamp_ms = msg.get("timestamp", 0)
        nonce = msg.get("nonce", "")
        capability = msg.get("capability", "")
        payload = msg.get("payload", {})
        signature = msg.get("signature", "")

        payload_str = serialize_payload(payload)

        # 1. HMAC Signature Verification
        if not verify_hmac_signature(self.secret, timestamp_ms, nonce, payload_str, signature):
            self._send_rpc_response(request_id, correlation_id, capability, None, "UNAUTHENTICATED: Invalid HMAC signature")
            return

        # 2. Replay Protection & Timestamp Freshness Check
        if not verify_replay_protection(request_id, timestamp_ms):
            self._send_rpc_response(request_id, correlation_id, capability, None, "REPLAY_PROTECTION: Stale timestamp or duplicate request ID")
            return

        # 3. Emergency Kill Switch Check
        if is_kill_switch_active():
            self._send_rpc_response(request_id, correlation_id, capability, None, "REMOTE_CONTROL_DISABLED: Emergency kill switch is active")
            return

        # 4. Capability Dispatch
        handler = CAPABILITY_DISPATCH.get(capability)
        if not handler:
            self._send_rpc_response(request_id, correlation_id, capability, None, f"UNSUPPORTED_CAPABILITY: Capability '{capability}' is not advertised")
            return

        print(f"[Agent] Executing capability '{capability}' for requestId={request_id}...")
        start_time = time.time()

        try:
            result = handler(payload)
            duration_ms = int((time.time() - start_time) * 1000)
            print(f"[Agent] Capability '{capability}' executed successfully in {duration_ms}ms.")
            self._send_rpc_response(request_id, correlation_id, capability, result, None)
        except Exception as e:
            error_msg = str(e)
            print(f"[Agent] Capability '{capability}' execution failed: {error_msg}")
            self._send_rpc_response(request_id, correlation_id, capability, None, error_msg)

    def _send_rpc_response(self, request_id: str, correlation_id: str, capability: str, result: Any, error: str | None):
        """Formats and sends signed RPC response back to server."""
        if not self.ws or not self.connected:
            return

        now_ms = int(time.time() * 1000)
        resp_payload = {
            "error": error,
            "result": result
        }
        payload_str = serialize_payload(resp_payload)
        signature = compute_hmac_signature(self.secret, now_ms, request_id, payload_str)

        response_msg = {
            "type": "rpc_response",
            "agentId": AGENT_ID,
            "requestId": request_id,
            "correlationId": correlation_id,
            "capability": capability,
            "timestamp": now_ms,
            "signature": signature,
            "payload": resp_payload
        }

        try:
            self.ws.send(json.dumps(response_msg))
        except Exception as e:
            print(f"[Agent] Failed to send RPC response: {e}")

    def _heartbeat_loop(self):
        """Sends periodic heartbeat to server."""
        while self.connected and not self.stop_requested:
            time.sleep(HEARTBEAT_INTERVAL_SECONDS)
            if self.ws and self.connected:
                try:
                    now_ms = int(time.time() * 1000)
                    hb_msg = {
                        "type": "agent.heartbeat",
                        "agentId": AGENT_ID,
                        "timestamp": now_ms,
                        "killSwitchActive": is_kill_switch_active()
                    }
                    self.ws.send(json.dumps(hb_msg))
                except Exception:
                    break

    def _on_kill_switch_activated(self):
        """Notifies backend when local hotkey activates kill switch."""
        if self.ws and self.connected:
            try:
                now_ms = int(time.time() * 1000)
                msg = {
                    "type": "agent.kill_switch.activated",
                    "agentId": AGENT_ID,
                    "timestamp": now_ms,
                    "reason": "Hotkey Ctrl+Alt+Shift+K pressed on host"
                }
                self.ws.send(json.dumps(msg))
            except Exception:
                pass

    def _on_error(self, ws, error):
        print(f"[Agent] WebSocket error: {error}")

    def _on_close(self, ws, close_status_code, close_msg):
        self.connected = False
        print(f"[Agent] Connection closed ({close_status_code}): {close_msg}")

    def stop(self):
        """Stops client connection."""
        self.stop_requested = True
        if self.ws:
            self.ws.close()
