import unittest
import os
import time
import sys

# Ensure apps/local-agent is in PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from src.security import (
    compute_hmac_signature,
    verify_hmac_signature,
    verify_replay_protection,
    is_path_allowed
)
from src.kill_switch import is_kill_switch_active, activate_kill_switch, reset_kill_switch
from src.capabilities.applications import launch_application
from src.capabilities.filesystem import list_filesystem, read_filesystem, exists_filesystem

class TestAgentSecurity(unittest.TestCase):
    def test_hmac_signature_verification(self):
        secret = "super_secret_key_12345"
        now_ms = int(time.time() * 1000)
        nonce = "test_nonce_001"
        payload = '{"test":"value"}'

        sig = compute_hmac_signature(secret, now_ms, nonce, payload)
        self.assertTrue(verify_hmac_signature(secret, now_ms, nonce, payload, sig))
        self.assertFalse(verify_hmac_signature("wrong_secret", now_ms, nonce, payload, sig))

    def test_replay_protection(self):
        req_id = f"req_{time.time()}"
        now_ms = int(time.time() * 1000)

        # First request should pass
        self.assertTrue(verify_replay_protection(req_id, now_ms))

        # Replay duplicate request should fail
        self.assertFalse(verify_replay_protection(req_id, now_ms))

        # Stale request (> 5000ms) should fail
        stale_ms = now_ms - 10000
        self.assertFalse(verify_replay_protection(f"req_stale_{time.time()}", stale_ms))

    def test_sandbox_path_isolation(self):
        allowed_roots = [os.path.abspath("d:\\Jarvis"), os.path.abspath("C:\\Users\\Test\\Documents")]

        # Valid paths
        self.assertTrue(is_path_allowed("d:\\Jarvis\\readme.md", allowed_roots))
        self.assertTrue(is_path_allowed("C:\\Users\\Test\\Documents\\file.txt", allowed_roots))

        # Traversal attempts
        self.assertFalse(is_path_allowed("d:\\Jarvis\\..\\Windows\\System32", allowed_roots))
        self.assertFalse(is_path_allowed("C:\\Users\\Test\\Documents\\..\\..\\Windows", allowed_roots))

        # Outside boundaries
        self.assertFalse(is_path_allowed("C:\\Windows\\System32\\cmd.exe", allowed_roots))

    def test_allowlist_app_launching(self):
        # Reject un-registered app IDs
        with self.assertRaises(ValueError):
            launch_application("arbitrary_malicious_script.exe")

    def test_kill_switch_toggle(self):
        self.assertFalse(is_kill_switch_active())
        activate_kill_switch("Unit test trigger")
        self.assertTrue(is_kill_switch_active())
        reset_kill_switch()
        self.assertFalse(is_kill_switch_active())

if __name__ == "__main__":
    unittest.main()
