"""Password hashing and verification using bcrypt with legacy plaintext support."""
import bcrypt
import hmac


def hash_password(plain: str) -> str:
    """
    Generate bcrypt hash from plaintext password.

    Args:
        plain (str): The user's plaintext password.

    Returns:
        str: A bcrypt hash string.
    """
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def is_bcrypt_string(s: str) -> bool:
    """
    Check if string is a bcrypt hash.

    Args:
        s (str): The string to inspect (password field from DB).

    Returns:
        bool: True if the string looks like a valid bcrypt hash; False otherwise.
    """
    return isinstance(s, str) and len(s) >= 55 and s.startswith("$2")


def verify_password(plain: str, stored: str) -> bool:
    """
    Verify password against stored hash. Supports legacy plaintext temporarily.

    Args:
        plain (str): The plaintext password provided by the user.
        stored (str): The stored password hash or legacy plaintext.

    Returns:
        bool: True if the password matches, False otherwise.
    """
    try:
        if is_bcrypt_string(stored):
            return bcrypt.checkpw(plain.encode("utf-8"), stored.encode("utf-8"))
        return hmac.compare_digest(plain, stored)
    except Exception:
        return False
