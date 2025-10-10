from flask import Blueprint, request, jsonify, g
from datetime import datetime
from utils.database import db_admin
from security.guards import require_auth, require_role

audit_bp = Blueprint("audit", __name__)
_audit = db_admin["audit_logs"]

@audit_bp.route("/audit", methods=["GET"])
@require_auth
@require_role("admin")
def list_audit():
    q = {}
    action = request.args.get("action")
    actor  = request.args.get("actor")      # actor id
    target = request.args.get("target")     # target id
    since  = request.args.get("since")      # ISO8601
    until  = request.args.get("until")      # ISO8601
    if action: q["action"] = action
    if actor:  q["actor.id"] = actor
    if target: q["target.id"] = target
    if since or until:
        q["ts"] = {}
        if since: q["ts"]["$gte"] = datetime.fromisoformat(since.replace("Z","+00:00"))
        if until: q["ts"]["$lte"] = datetime.fromisoformat(until.replace("Z","+00:00"))
    cursor = _audit.find(q).sort("ts", -1).limit(200)
    items = []
    for d in cursor:
        d["_id"] = str(d["_id"])
        # keep payload compact by default
        items.append({k: d[k] for k in ["_id","ts","action","resource","actor","target","reason","before","after","ip","ua"] if k in d})
    return jsonify({"items": items}), 200
