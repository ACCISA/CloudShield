"""JWT token generation and verification for CloudShield authentication."""
import os
import time
import jwt

JWT_SECRET   = os.getenv("JWT_SECRET")
JWT_ISSUER   = os.getenv("JWT_ISSUER", "cloudshield")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "cloudshield-app")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))


def issue_token(sub: str, role: str, org_id: str):
    """
    Generate JWT access token with user claims.

    Args:
        sub (str): The subject identifier --> the user's unique ID.
        role (str): The user's role ("admin" or "employee").
        org_id (str): The organization ID the user belongs to.

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
    now = int(time.time())
    payload = {
        "sub": sub,
        "role": role,
        "org_id": org_id,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now - 10,
        "exp": now + (JWT_EXPIRES_MINUTES * 60)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")


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
    return jwt.decode(
        token,
        JWT_SECRET,
        algorithms=["HS256"],
        audience=JWT_AUDIENCE,
        issuer=JWT_ISSUER,
        leeway=30,
        options={
            "require": ["sub", "role", "org_id", "exp", "iss", "aud"],
            "verify_iat": False,
        },
    )
