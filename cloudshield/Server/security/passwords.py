import bcrypt
import hmac

def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def is_bcrypt_string(s: str) -> bool:
    # bcrypt hashes typically start with $2a$, $2b$, or $2y$, length ~60
    return isinstance(s, str) and len(s) >= 55 and s.startswith("$2")

def verify_password(plain: str, stored: str) -> bool:
    """
    Returns True/False only (never raises). Supports legacy plaintext temporarily.
    """
    try:
        if is_bcrypt_string(stored):
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        # Legacy plaintext fallback (temporary): constant-time compare
        return hmac.compare_digest(plain, stored)
    except Exception:
        return False