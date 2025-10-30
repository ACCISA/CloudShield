import functools
from flask import request, jsonify, g
from .jwt_utils import verify_token

# Optional audit logging
try:
    from utils.audit import log_denied
except Exception:
    def log_denied(**kwargs): pass  # no-op if audit logging not set up

# Decorator to require authentication via JWT
def require_auth(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            log_denied(reason="missing_bearer", path=request.path, method=request.method)
            return jsonify({"error":"Unauthorized"}), 401
        token = auth.split(" ", 1)[1]
        try:
            payload = verify_token(token)
        except Exception as e:
            log_denied(reason="invalid_jwt", path=request.path, method=request.method, meta={"err": str(e)})
            return jsonify({"error":"Unauthorized"}), 401
        g.user = {"id": payload["sub"], "role": payload["role"], "org_id": payload["org_id"]}
        return fn(*args, **kwargs)
    return wrapper

# Decorator to require specific user roles
def require_role(*roles):
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            if g.user["role"] not in roles:
                log_denied(user=g.user, reason="insufficient_role", required=roles, path=request.path, method=request.method)
                return jsonify({"error":"Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco

# Decorator to enforce that the target org matches g.user.org_id
def enforce_same_org(from_param: str | None = None):
    """
    Ensures the target org matches g.user.org_id.
    If from_param is set, it will read org_id from a URL param;
    otherwise it looks in JSON body field 'org_id'.
    """
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            target_org = kwargs.get(from_param) if from_param else (request.get_json(silent=True) or {}).get("org_id")
            # Admins bypass this check
            if g.user["role"] != "admin":
                if target_org and target_org != g.user["org_id"]:
                    log_denied(user=g.user, reason="cross_org_access", target_org=target_org, path=request.path, method=request.method)
                    return jsonify({"error":"Forbidden (org)"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return deco
