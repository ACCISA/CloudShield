import os, time, jwt
from datetime import datetime, timedelta

JWT_SECRET   = os.getenv("JWT_SECRET")
JWT_ISSUER   = os.getenv("JWT_ISSUER", "cloudshield")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "cloudshield-app")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

def issue_token(sub: str, role: str, org_id: str):
    now = int(time.time())
    payload = {
        "sub": sub,
        "role": role,
        "org_id": org_id,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": now - 10,                        # <-- 10s in the past
        # "nbf": now - 10,                      # <-- 10s in the past
        "exp": now + (JWT_EXPIRES_MINUTES * 60)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token: str):
    return jwt.decode(
        token,
        JWT_SECRET,
        algorithms=["HS256"],
        audience=JWT_AUDIENCE,
        issuer=JWT_ISSUER,
        leeway=30,  # tolerate 30s skew for iat/nbf/exp
        options={
            "require": ["sub", "role", "org_id", "exp", "iss", "aud"],
            "verify_iat": False,   # <-- don't 401 solely on iat being "future"
            # "verify_nbf": True,  # default True; keep if you use nbf
        },
    )
