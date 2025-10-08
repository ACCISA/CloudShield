import os, time, jwt
from datetime import datetime, timedelta

# Load environment variables
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ISSUER = os.getenv("JWT_ISSUER", "cloudshield")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "cloudshield-app")
JWT_EXPIRES_MINUTES = int(os.getenv("JWT_EXPIRES_MINUTES", "60"))

# Function to issue a JWT token
def issue_token(sub: str, role: str, org_id: str):
    now = datetime.utcnow()
    payload = {
        "sub": sub,
        "role": role,
        "org_id": org_id,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=JWT_EXPIRES_MINUTES)).timestamp())
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

# Function to verify a JWT token
def verify_token(token: str):
    return jwt.decode(
        token,
        JWT_SECRET,
        audience=JWT_AUDIENCE,
        algorithms=["HS256"],
        options={"require": ["sub", "role", "org_id", "exp", "iat"]}
    )