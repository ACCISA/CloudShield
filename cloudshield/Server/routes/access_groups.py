"""Access Groups API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, request, jsonify
from pydantic import ValidationError

from models.access_groups import (
    AccessGroupCreate,
    AccessGroupAddMembers,
    create_access_group_doc,
    access_group_to_json,
)
from utils.logging_setup import get_logger


# Collection handle. In production this is resolved lazily.
# In tests, this is monkeypatched to an in-memory fake.
access_groups = None

logger = get_logger("access_groups")

access_groups_bp = Blueprint("access_groups", __name__)

ERROR_GROUP_NAME_REQUIRED = "group_name is required"


def _get_access_groups_collection():
    global access_groups
    if access_groups is not None:
        return access_groups

    # Import lazily to avoid DB/network access at import time (unit-test friendly).
    try:
        from utils.database import access_groups as coll
    except Exception:  # pragma: no cover
        from cloudshield.Server.utils.database import access_groups as coll  # type: ignore[no-redef]

    access_groups = coll
    return access_groups


@access_groups_bp.route("/access-groups", methods=["GET"])
def list_access_groups():
    """
    Fetch all access groups and include enriched member user info.

    GET /api/access-groups

    Response:
    {
      "access_groups": [
        {
          "id": "...",
          "group_name": "marketing",
          "description": "...",
          "members": ["<user_id>", ...],
          "members_info": [
            {
              "_id": "<user_id>",
              "email": "...",
              "full_name": "...",
              "role": "...",
              "org_id": "...",
              "status": "...",
              "created_at": "...",
              "updated_at": "..."
            }
          ],
          "members_missing": ["<user_id_not_found>", ...],
          "created_at": "...",
          "updated_at": "..."
        }
      ]
    }
    """
    try:
        coll = _get_access_groups_collection()

        # Lazily import users collection (admin view; excludes password via projection)
        try:
            from utils.database import users_admin as users_coll
        except Exception:  # pragma: no cover
            from cloudshield.Server.utils.database import users_admin as users_coll  # type: ignore[no-redef]

        group_docs = list(coll.find({}).sort("created_at", -1))

        # Collect all member ObjectIds across all groups (dedup)
        member_oids = []
        seen = set()
        for gdoc in group_docs:
            for oid in (gdoc.get("members") or []):
                if isinstance(oid, ObjectId):
                    key = str(oid)
                    if key not in seen:
                        seen.add(key)
                        member_oids.append(oid)

        # Fetch user docs in one query
        user_map = {}
        if member_oids:
            projection = {"password": 0}
            user_docs = list(users_coll.find({"_id": {"$in": member_oids}}, projection))
            for u in user_docs:
                uid = str(u.get("_id"))
                u["_id"] = uid
                # make datetimes JSON friendly if present
                if u.get("created_at"):
                    u["created_at"] = u["created_at"].isoformat()
                if u.get("updated_at"):
                    u["updated_at"] = u["updated_at"].isoformat()
                user_map[uid] = u

        # Build response
        out = []
        for gdoc in group_docs:
            g_json = access_group_to_json(gdoc)

            # Attach enriched members
            member_ids = g_json.get("members") or []
            members_info = []
            members_missing = []

            for mid in member_ids:
                u = user_map.get(mid)
                if u:
                    members_info.append(u)
                else:
                    members_missing.append(mid)

            g_json["members_info"] = members_info
            g_json["members_missing"] = members_missing
            out.append(g_json)

        return jsonify({"access_groups": out}), 200

    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@access_groups_bp.route("/access-groups", methods=["POST"])
def create_access_group():
    """
    Create a new access group and store it in MongoDB.

    POST /api/access-groups
    Body:
    {
        "group_name": "marketing",
        "description": "access group for members of the marketing team",
        "members": ["<user_id1>", "<user_id2>"]
    }
    """
    try:
        data = request.get_json() or {}
        group_data = AccessGroupCreate(**data)

        # Unique group name (global). If you later want per-org uniqueness, add org_id to doc + query.
        coll = _get_access_groups_collection()
        existing = coll.find_one({"name": group_data.group_name}, {"_id": 1})
        if existing:
            return jsonify({"error": "access group already exists"}), 409

        doc = create_access_group_doc(group_data)
        res = coll.insert_one(doc)
        created = coll.find_one({"_id": res.inserted_id})

        #TODO rpc_sync_access_group(created)

        return jsonify({"access_group": access_group_to_json(created)}), 201

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@access_groups_bp.route("/access-groups/add-members", methods=["POST"])
def add_members_to_access_group():
    """
    Add users to an existing access group.

    POST /api/access-groups/add-members
    Body:
    {
        "group_name": "marketing",
        "members": ["<user_id3>", "<user_id4>"]
    }
    """
    try:
        data = request.get_json() or {}
        add_req = AccessGroupAddMembers(**data)

        coll = _get_access_groups_collection()
        member_oids = [ObjectId(m) for m in add_req.members]
        now = datetime.now(timezone.utc)

        update_res = coll.update_one(
            {"name": add_req.group_name},
            {
                "$addToSet": {"members": {"$each": member_oids}},
                "$set": {"updated_at": now},
            },
        )

        if update_res.matched_count == 0:
            return jsonify({"error": "access group not found"}), 404

        updated = coll.find_one({"name": add_req.group_name})

        #TODO rpc_sync_access_group(updated)

        return jsonify({"access_group": access_group_to_json(updated)}), 200

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
