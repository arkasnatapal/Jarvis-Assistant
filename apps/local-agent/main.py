import sys
import os
import signal
import time

# Ensure parent directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.config import AGENT_ID, PLATFORM, VERSION, DEFAULT_ALLOWED_ROOTS, PAIRING_SECRET_FILE
from src.pairing import get_or_create_pairing_secret
from src.kill_switch import start_kill_switch_listener, is_kill_switch_active
from src.ws_client import LocalAgentWSClient

def print_banner():
    print("=" * 65)
    print(f"      JARVIS LOCAL WINDOWS DESKTOP AGENT v{VERSION}")
    print("=" * 65)
    print(f"  Agent ID:               {AGENT_ID}")
    print(f"  Platform:               {PLATFORM}")
    print(f"  Pairing Secret Key:     {PAIRING_SECRET_FILE}")
    print(f"  Emergency Kill Switch:  Ctrl + Alt + Shift + K")
    print(f"  Sandbox Root Boundary:")
    for root in DEFAULT_ALLOWED_ROOTS:
        print(f"    - {root}")
    print("=" * 65)

def main():
    print_banner()

    # Ensure pairing secret exists
    secret = get_or_create_pairing_secret()

    # Start emergency kill switch background listener
    start_kill_switch_listener()

    client = LocalAgentWSClient()

    def signal_handler(sig, frame):
        print("\n[Agent] Shutting down JARVIS Local Agent gracefully...")
        client.stop()
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        client.start()
    except KeyboardInterrupt:
        print("\n[Agent] Stopped by user.")

if __name__ == "__main__":
    main()
