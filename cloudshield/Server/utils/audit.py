from datetime import datetime
from flask import Blueprint, request, jsonify, has_request_context
from cloudshield.Server.utils.database import db_admin
from cloudshield.Server.security.guards import require_auth, require_role

audit_bp = Blueprint("audit", __name__)
_audit = db_admin["audit_logs"]

# Ensure indexes
try:
    _audit.create_index([("ts", -1)])
    _audit.create_index([("action", 1), ("resource", 1)])
    _audit.create_index([("actor.id", 1), ("ts", -1)])
    _audit.create_index([("target.id", 1), ("ts", -1)])
except Exception:
    pass

def log_audit(
    *,
    action: str,
    resource: str,
    actor: dict | None = None,   # {"id","role","org_id"}
    target: dict | None = None,  # {"id","email",...}
    reason: str | None = None,
    before: dict | None = None,
    after: dict | None = None,
    severity: str = "info",
    meta: dict | None = None
) -> str:
    """Write a single audit record; returns inserted _id as str."""
    ip = ua = None
    if has_request_context():
        ip = request.headers.get("X-Forwarded-For") or request.remote_addr
        ua = request.headers.get("User-Agent")

    doc = {
        "ts": datetime.utcnow(),
        "severity": severity,
        "action": action,           # e.g., "create", "update", "deactivate", "delete"
        "resource": resource,       # e.g., "users"
        "actor": actor,             # who initiated
        "target": target,           # what was acted on
        "reason": reason,
        "before": before or {},
        "after": after or {},
        "ip": ip,
        "ua": ua,
        "meta": meta or {}
    }
    try:
        res = _audit.insert_one(doc)
        return str(res.inserted_id)
    except Exception:
        # swallow audit failures; you can print/log e if you want during dev
        return ""

# List audit records (admin only)
@audit_bp.route("/audit", methods=["GET"])
@require_auth
@require_role("admin")
def list_audit():
    q = {}
    action = request.args.get("action")
    actor  = request.args.get("actor")
    target = request.args.get("target")
    since  = request.args.get("since")
    until  = request.args.get("until")

    if action: 
        q["action"] = action
    if actor:  
        q["actor.id"] = actor
    if target: 
        q["target.id"] = target
    if since or until:
        from datetime import datetime as _dt
        q["ts"] = {}
        if since: 
            q["ts"]["$gte"] = _dt.fromisoformat(since.replace("Z","+00:00"))
        if until: 
            q["ts"]["$lte"] = _dt.fromisoformat(until.replace("Z","+00:00"))

    cursor = _audit.find(q).sort("ts", -1).limit(200)
    items = []
    for d in cursor:
        d["_id"] = str(d["_id"])
        items.append({k: d.get(k) for k in [
            "_id","ts","severity","action","resource","actor","target","reason","before","after","ip","ua"
        ]})
    return jsonify({"items": items}), 200

__all__ = ["audit_bp", "log_audit"]
