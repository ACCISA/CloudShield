import functools
import os
from flask import request, jsonify, g
from .jwt_utils import verify_token
from bson import ObjectId

DEV_BYPASS_TOKEN = os.getenv("CLOUDSHIELD_DEV_TOKEN")
DEV_BYPASS_USER = {
    "id": os.getenv("CLOUDSHIELD_DEV_USER_ID", "dev-admin"),
    "role": os.getenv("CLOUDSHIELD_DEV_ROLE", "admin"),
    "org_id": os.getenv("CLOUDSHIELD_DEV_ORG", "dev-org"),
}
# Store separately for logging without mutating the shared dict
DEV_BYPASS_EMAIL = os.getenv("CLOUDSHIELD_DEV_EMAIL", "dev-admin@cloudshield.local")

try:
    from utils.audit import log_denied
except Exception:
    def log_denied(**kwargs):
        """Fallback no-op function when audit module is unavailable."""
        pass


def require_auth(fn):
    """
    Decorator to require JWT authentication on route.

    ---
    Behaviour:
        - Extracts the JWT from the 'Authorization' header.
        - Validates the token using 'verify_token()'.
        - On success, attaches decoded user claims to 'flask.g.user':
          '''python
          g.user = {
              "id": "<user_id>",
              "role": "<role>",
              "org_id": "<org_id>"
          }
          '''
        - On failure, returns '401 Unauthorized' JSON error.

    Responses:
        - 401: Missing or invalid Bearer token.

    Audit Logging:
        - Calls 'log_denied()' with context if a token is missing or invalid.

    Returns:
        Callable: Wrapped Flask view function.
    """
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        existing_user = getattr(g, "user", None)
        if existing_user:
            return fn(*args, **kwargs)

        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            log_denied(reason="missing_bearer", path=request.path, method=request.method)
            return jsonify({"error":"Unauthorized"}), 401
        token = auth.split(" ", 1)[1]

        if DEV_BYPASS_TOKEN and token == DEV_BYPASS_TOKEN:
            # Populate g.user for downstream role/org checks during local development
            g.user = dict(DEV_BYPASS_USER)
            g.user.setdefault("email", DEV_BYPASS_EMAIL)
            return fn(*args, **kwargs)

        try:
            payload = verify_token(token)
        except Exception as e:
            log_denied(reason="invalid_jwt", path=request.path, method=request.method, meta={"err": str(e)})
            return jsonify({"error":"Unauthorized"}), 401
        g.user = {
            "id": payload["sub"],
            "role": payload["role"],
            "org_id": payload["org_id"],
            "email": payload.get("email"),
            "full_name": payload.get("full_name"),
                }
        return fn(*args, **kwargs)
    return wrapper


def require_role(*roles):
    """
    Decorator to enforce user has one of specified roles.

    ---
    Args:
        *roles (str): One or more role names permitted to access the route.

    Behaviour:
        - Compares 'g.user["role"]' to the allowed roles list.
        - Returns '403 Forbidden' if the user's role is not permitted.
        - Should be used after '@require_auth' to ensure 'g.user' is populated.

    Responses:
        - 403: Insufficient permissions for current role.

    Audit Logging:
        - Logs denied attempts with 'reason="insufficient_role"' and role details.

    Returns:
        Callable: Wrapped Flask view function restricted to the given roles.
    """
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            if g.user["role"] not in roles:
                log_denied(user=g.user, reason="insufficient_role", required=roles, path=request.path, method=request.method)
                return jsonify({"error":"Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco


def enforce_same_org(from_param: str | None = None):
    """
    Decorator to ensure target organization matches user's org. Admins bypass this check.

    ---
    Args:
        from_param (str | None): 
            - If provided, reads the 'org_id' from the URL parameter.
            - If omitted, falls back to the JSON body field "org_id".

    Behaviour:
        - For admin users:
            > Skips the check (admins can access all orgs).
        - For non-admin users:
            > Compares target org with 'g.user["org_id"]'.
            > Returns '403 Forbidden (org)' if they differ.

    Responses:
        - 403: Cross-organization access attempt by a non-admin.

    Audit Logging:
        - Calls 'log_denied()' with 'reason="cross_org_access"' when the user attempts to act on a different organization.

    Returns:
        Callable: Wrapped Flask view enforcing organization ownership constraint.
    """
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            target_org = kwargs.get(from_param) if from_param else (request.get_json(silent=True) or {}).get("org_id")
            if g.user["role"] != "admin":
                if target_org and target_org != g.user["org_id"]:
                    log_denied(user=g.user, reason="cross_org_access", target_org=target_org, path=request.path, method=request.method)
                    return jsonify({"error":"Forbidden (org)"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco
