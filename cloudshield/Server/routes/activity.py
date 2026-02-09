"""Activity logging endpoints with pagination."""
from flask import Blueprint, jsonify, request
from cloudshield.Server.utils.database import activity
from cloudshield.Server.utils.logging_setup import get_logger

activity_bp = Blueprint("activity", __name__)
logger = get_logger("api.activity")

ERROR_ORG_ID_REQUIRED = "org_id is required"

def _activity_doc_to_payload(doc: dict) -> dict:
    return {
        "id": str(doc.get("_id")) if doc.get("_id") else None,
        "org_id": doc.get("org_id"),
        "event_type": doc.get("event_type"),
        "description": doc.get("description"),
        "actor": doc.get("actor"),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }

@activity_bp.route("/activity/<org_id>", methods=["GET"])
def get_recent_activity(org_id: str):
    """
    Get paginated activity logs.
    Example: GET /api/activity/123?page=1&limit=20
    """
    if not org_id:
        return jsonify({"error": ERROR_ORG_ID_REQUIRED}), 422

    try:
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 20))
    except ValueError:
        page = 1
        limit = 20

    if page < 1:
        page = 1

    if limit < 1:
        limit = 20

    if limit > 100:
        limit = 100  # cap max limit

    skip = (page - 1) * limit
    filter_query = {"org_id": org_id}

    total_count = activity.count_documents(filter_query)

    cursor = activity.find(filter_query)\
                  .sort("created_at", -1)\
                  .skip(skip)\
                  .limit(limit)
    
    items = [_activity_doc_to_payload(doc) for doc in cursor]

    return jsonify({
        "items": items,
        "total": total_count,
        "page": page,
        "limit": limit
    }), 200