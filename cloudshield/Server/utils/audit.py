"""
Audit logging system with MongoDB persistence and admin API.
"""
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, has_request_context
from . import db_admin

try:
    from cloudshield.Server.security import require_auth, require_role
except ImportError:
    try:
        from ..security import require_auth, require_role
    except ImportError:
        from security import require_auth, require_role  # type: ignore[import]

audit_bp = Blueprint("audit", __name__)
_audit = db_admin["audit_logs"]

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
    actor: dict | None = None,
    target: dict | None = None,
    reason: str | None = None,
    before: dict | None = None,
    after: dict | None = None,
    severity: str = "info",
    meta: dict | None = None
) -> str:
    """
    Write audit record to MongoDB and return inserted document ID.

    Args:
        action (str): Short action label, e.g., "create", "update", "delete".
        resource (str): Resource type affected, e.g., "users", "jobs".
        actor (dict | None): Metadata about the initiator of the action.
         Example: {"id": "user123", "role": "admin"}.
        target (dict | None): Information about the affected resource or record.
        reason (str | None): Optional explanation for the action.
        before (dict | None): Snapshot of fields before the change.
        after (dict | None): Snapshot of fields after the change.
        severity (str): Log level (default "info"). Can be "warning" or "critical".
        meta (dict | None): Optional structured metadata, such as job_id or request_id.

    Returns:
        str: Inserted audit document '_id' as a string, or an empty string on failure.

    Behaviour:
        - If the Flask request context is available, automatically records:
            > IP address
            > User-Agent header
        - Catches and suppresses any database insertion errors.
        - Indexes are pre-created for common query patterns (by timestamp, actor, target).
    """
    ip = ua = None
    if has_request_context():
        ip = request.headers.get("X-Forwarded-For") or request.remote_addr
        ua = request.headers.get("User-Agent")

    doc = {
        "ts": datetime.now(timezone.utc),
        "severity": severity,
        "action": action,
        "resource": resource,
        "actor": actor,
        "target": target,
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
        return ""


@audit_bp.route("/audit", methods=["GET"])
@require_auth
@require_role("admin")
def list_audit():
    """
    Retrieve audit logs with optional filtering (admin only).

    ---
    Endpoint: 'GET /api/audit'

    Query Parameters (optional):
        - 'action' (str): Filter by action type (e.g., "create", "update").
        - 'actor' (str): Filter by actor ID ('actor.id' field).
        - 'target' (str): Filter by target ID ('target.id' field).
        - 'since' (ISO datetime): Start timestamp.
        - 'until' (ISO datetime): End timestamp.

    Access Control:
        - Requires a valid admin JWT ('@require_auth' + '@require_role("admin")').
    
    Returns:
        JSON response with list of audit log entries.

    Notes:
        - This endpoint is intended for administrative monitoring and auditing.
        - Logs are stored in the 'audit_logs' collection inside the admin database.
    """
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
