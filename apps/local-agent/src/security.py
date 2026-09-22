import os
import hmac
import hashlib
import time
import json
from typing import List, Optional
from src.config import DEFAULT_ALLOWED_ROOTS

# Rolling Request Cache to prevent Replay Attacks
_seen_request_ids = set()
_seen_timestamps = {}
CACHE_CLEANUP_INTERVAL_SECONDS = 60

def serialize_payload(payload: dict) -> str:
    """Serializes payload into compact sorted JSON string identical to JS JSON.stringify."""
    if not payload:
        return "{}"
    return json.dumps(payload, separators=(',', ':'), sort_keys=True)

def cleanup_request_cache():
    """Removes stale request IDs older than 60 seconds."""
    current_time = time.time()
    stale_ids = [req_id for req_id, ts in _seen_timestamps.items() if current_time - ts > CACHE_CLEANUP_INTERVAL_SECONDS]
    for req_id in stale_ids:
        _seen_request_ids.discard(req_id)
        _seen_timestamps.pop(req_id, None)

def verify_replay_protection(request_id: str, timestamp_ms: int, window_ms: int = 5000) -> bool:
    """
    Verifies that the request timestamp is fresh (+/- 5000ms) and the requestId has not been replayed.
    """
    cleanup_request_cache()

    now_ms = int(time.time() * 1000)
    if abs(now_ms - timestamp_ms) > window_ms:
        return False

    if request_id in _seen_request_ids:
        return False

    _seen_request_ids.add(request_id)
    _seen_timestamps[request_id] = time.time()
    return True

def compute_hmac_signature(secret: str, timestamp_ms: int, nonce: str, payload_str: str) -> str:
    """Computes HMAC-SHA256 signature for message payload."""
    message = f"{timestamp_ms}:{nonce}:{payload_str}"
    return hmac.new(secret.encode('utf-8'), message.encode('utf-8'), hashlib.sha256).hexdigest()

def verify_hmac_signature(secret: str, timestamp_ms: int, nonce: str, payload_str: str, signature: str) -> bool:
    """Verifies HMAC-SHA256 signature against computed value."""
    expected = compute_hmac_signature(secret, timestamp_ms, nonce, payload_str)
    return hmac.compare_digest(expected, signature)

def is_path_allowed(target_path: str, allowed_roots: Optional[List[str]] = None) -> bool:
    """
    Strict Sandbox Root Boundary Evaluator.
    Prevents path traversal (../), UNC paths, symlink escapes, and device paths.
    """
    if not target_path or not target_path.strip():
        return False

    roots = allowed_roots or DEFAULT_ALLOWED_ROOTS

    # Reject explicit traversal tokens before resolution
    norm_raw = target_path.replace("\\", "/")
    if "../" in norm_raw or "/.." in norm_raw or norm_raw == "..":
        return False

    # Reject device paths and UNC network shares unless inside allowed root
    if target_path.startswith("\\\\") or target_path.startswith("//"):
        return False

    try:
        # Resolve canonical absolute path
        canonical_target = os.path.realpath(os.path.abspath(target_path))

        for root in roots:
            canonical_root = os.path.realpath(os.path.abspath(root))
            
            # Check if canonical_target is under canonical_root
            try:
                common = os.path.commonpath([canonical_root, canonical_target])
                if os.path.normcase(common) == os.path.normcase(canonical_root):
                    return True
            except ValueError:
                # Triggers on Windows if paths are on different drive letters (e.g. C: vs D:)
                continue
    except Exception:
        return False

    return False
