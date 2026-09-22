import os
import secrets
from pathlib import Path
from src.config import PAIRING_SECRET_FILE, CREDENTIALS_DIR

def get_or_create_pairing_secret() -> str:
    """
    Retrieves existing pairing secret or generates a new cryptographically secure 256-bit key.
    """
    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)

    if PAIRING_SECRET_FILE.exists():
        try:
            with open(PAIRING_SECRET_FILE, "r", encoding="utf-8") as f:
                secret = f.read().strip()
                if len(secret) >= 32:
                    return secret
        except Exception:
            pass

    # Generate new secure secret
    new_secret = secrets.token_hex(32)
    try:
        with open(PAIRING_SECRET_FILE, "w", encoding="utf-8") as f:
            f.write(new_secret)
        # Windows file permissions restriction if needed
    except Exception as e:
        print(f"[Pairing] Warning: Failed to write pairing secret to file: {e}")

    return new_secret

def verify_pairing_token(token: str) -> bool:
    """Verifies a pairing token against the active secret."""
    secret = get_or_create_pairing_secret()
    return secret == token.strip()
