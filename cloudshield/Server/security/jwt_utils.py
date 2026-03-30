"""JWT token generation and verification for CloudShield authentication."""
import os
import time
try:
    import jwt  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    jwt = None  # type: ignore

JWT_SECRET   = os.getenv("JWT_SECRET")
JWT_ISSUER   = os.getenv("JWT_ISSUER", "cloudshield")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "cloudshield-app")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))


def _validate_jwt_secret(secret: str | None) -> str:
    """Validate JWT secret at runtime and fail fast on weak/missing config."""
    if not secret:
        raise RuntimeError("JWT_SECRET is not configured; refusing to issue/verify tokens")

    normalized = secret.strip()
    weak_values = {
        "secret",
        "changeme",
        "change-me",
        "default",
        "password",
        "jwt_secret",
        "jwt-secret",
        "replace-me",
    }
    if len(normalized) < 12 or normalized.lower() in weak_values:
        raise RuntimeError(
            "JWT_SECRET is weak; use a random secret with at least 12 characters"
        )
    return secret


def issue_token(sub: str, role: str, org_id: str, email: str, full_name: str):
    """
    Generate JWT access token with user claims.

    Args:
        sub (str): The subject identifier --> the user's unique ID.
        role (str): The user's role ("admin" or "employee").
        org_id (str): The organization ID the user belongs to.
        email (str): The user's email address.
        full_name (str): The user's full name.

    Returns:
        str: Encoded JWT string signed with HS256.

    Behaviour:
        - Includes standard claims:
            > 'sub': subject (user ID)
            > 'iss': issuer (application ID)
            > 'aud': audience (expected app consumer)
            > 'iat': issued-at timestamp (slightly backdated to avoid iat skew errors)
            > 'exp': expiration time (current time + JWT_EXPIRES_MINUTES)
        - The token is signed using the secret stored in 'JWT_SECRET'.
        - Adds a 10-second offset to 'iat' to prevent invalid token errors.
    """
    if jwt is None:  # pragma: no cover
        raise RuntimeError("PyJWT is required to issue tokens (install 'PyJWT')")

    secret = _validate_jwt_secret(JWT_SECRET)

    now = int(time.time())
    payload = {
        "sub": sub,
        "role": role,
        "org_id": org_id,
        "email": email,
        "full_name": full_name,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now - 10,
        "exp": now + (JWT_EXPIRES_MINUTES * 60)
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def verify_token(token: str):
    """
    Decode and validate JWT token. Raises exception on invalid token.

    Args:
        token (str): Encoded JWT string (as sent in Authorization header).

    Returns:
        dict: Decoded token payload containing validated claims.

    Behaviour:
        - Validates:
            > Signature (using 'JWT_SECRET').
            > Audience ('aud') against 'JWT_AUDIENCE'.
            > Issuer ('iss') against `JWT_ISSUER`.
            > Expiration ('exp') and issued-at ('iat') timestamps.
        - Allows up to 30 seconds of leeway for clock skew.
        - Does not strictly enforce 'verify_iat' (to avoid rejecting new tokens).
    """
    if jwt is None:  # pragma: no cover
        raise RuntimeError("PyJWT is required to verify tokens (install 'PyJWT')")

    secret = _validate_jwt_secret(JWT_SECRET)

    return jwt.decode(
        token,
        secret,
        algorithms=["HS256"],
        audience=JWT_AUDIENCE,
        issuer=JWT_ISSUER,
        leeway=30,
        options={
            "require": ["sub", "role", "org_id", "email", "full_name", "exp", "iss", "aud"],
            "verify_iat": False,
        },
    )
