"""Password hashing and verification using bcrypt with legacy plaintext support."""
import bcrypt
import hmac


def hash_password(plain: str) -> str:
    """Generate bcrypt hash from plaintext password."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def is_bcrypt_string(s: str) -> bool:
    """Check if string is a bcrypt hash."""
    return isinstance(s, str) and len(s) >= 55 and s.startswith("$2")


def verify_password(plain: str, stored: str) -> bool:
    """Verify password against stored hash. Supports legacy plaintext temporarily."""
    try:
        if is_bcrypt_string(stored):
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        return hmac.compare_digest(plain, stored)
    except Exception:
        return False