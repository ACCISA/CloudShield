"""Access Groups API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError

from models.access_groups import (
    AccessGroupCreate,
    AccessGroupAddMembers,
    AccessGroupUpdate,
    create_access_group_doc,
    access_group_to_json,
)
from utils.logging_setup import get_logger

from cloudshield.Server.security.guards import require_auth


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


def _require_org_id() -> str:
    org_id = (getattr(g, "user", {}) or {}).get("org_id")
    org_id = (org_id or "").strip()
    if not org_id:
        raise ValueError("Missing org_id for authenticated user")
    return org_id


@access_groups_bp.route("/access-groups", methods=["GET"])
@require_auth
def list_access_groups():
    """
    Fetch all access groups with optional member enrichment.

    GET /api/access-groups
    
    Query Parameters:
        - summary (str, optional): If "1", returns lightweight data without user enrichment.
          Faster queries, smaller payloads. Use for dropdowns and selection lists.
    
    Returns groups with members_info (full user objects) by default, or with member_count only if summary=1.
    """
    try:
        summary = (request.args.get("summary") or "").strip() in {"1", "true", "yes"}
        coll = _get_access_groups_collection()
        org_id = _require_org_id()

        group_docs = list(coll.find({"org_id": org_id}).sort("created_at", -1))

        if summary:
            out = []
            for gdoc in group_docs:
                g_json = access_group_to_json(gdoc)
                g_json["member_count"] = len(gdoc.get("members") or [])
                out.append(g_json)
            return jsonify({"access_groups": out}), 200

        # Lazily import users collection (admin view; excludes password via projection)
        try:
            from utils.database import users_admin as users_coll
        except Exception:  # pragma: no cover
            from cloudshield.Server.utils.database import users_admin as users_coll  # type: ignore[no-redef]

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
            # Enforce org boundary even if a group doc contains foreign member IDs.
            user_docs = list(
                users_coll.find({"_id": {"$in": member_oids}, "org_id": org_id}, projection)
            )
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
@require_auth
def create_access_group():
    """
    Create a new access group and store it in MongoDB.

    POST /api/access-groups
    Body:
    {
        "group_name": "marketing",
        "description": "access group for members of the marketing team",
        "group_image": "data:image/png;base64,...",
        "members": ["<user_id1>", "<user_id2>"],
        "workstations": ["<ws_id1>", "<ws_id2>"],
        "file_shares": ["<share_id1>", "<share_id2>"]
    }
    """
    try:
        data = request.get_json() or {}
        group_data = AccessGroupCreate(**data)

        org_id = _require_org_id()

        # Unique group name within an org.
        coll = _get_access_groups_collection()
        existing = coll.find_one({"name": group_data.group_name, "org_id": org_id}, {"_id": 1})
        if existing:
            return jsonify({"error": "access group already exists"}), 409

        doc = create_access_group_doc(group_data)
        doc["org_id"] = org_id
        res = coll.insert_one(doc)
        created = coll.find_one({"_id": res.inserted_id})

        #TODO rpc_sync_access_group(created)

        return jsonify({"access_group": access_group_to_json(created)}), 201

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@access_groups_bp.route("/access-groups/<group_id>", methods=["PATCH"])
@require_auth
def update_access_group(group_id: str):
    """
    Update an existing access group.

    PATCH /api/access-groups/<group_id>
    Body (any subset):
    {
        "group_name": "marketing",
        "description": "...",
        "group_image": "data:image/png;base64,...",
        "members": ["..."],
        "workstations": ["..."],
        "file_shares": ["..."]
    }
    """
    try:
        data = request.get_json() or {}
        patch = AccessGroupUpdate(**data)

        coll = _get_access_groups_collection()
        org_id = _require_org_id()
        gid = ObjectId(group_id)

        existing = coll.find_one({"_id": gid, "org_id": org_id})
        if not existing:
            return jsonify({"error": "access group not found"}), 404

        now = datetime.now(timezone.utc)
        set_doc = {}

        # group_name (unique)
        if patch.group_name is not None:
            dup = coll.find_one({"name": patch.group_name, "org_id": org_id, "_id": {"$ne": gid}}, {"_id": 1})
            if dup:
                return jsonify({"error": "access group already exists"}), 409
            set_doc["name"] = patch.group_name

        if patch.description is not None:
            set_doc["description"] = patch.description

        if patch.group_image is not None:
            set_doc["group_image"] = patch.group_image

        if patch.members is not None:
            set_doc["members"] = [ObjectId(m) for m in patch.members]

        if patch.workstations is not None:
            set_doc["workstations"] = patch.workstations

        if patch.file_shares is not None:
            set_doc["file_shares"] = patch.file_shares

        if not set_doc:
            current = coll.find_one({"_id": gid, "org_id": org_id})
            return jsonify({"access_group": access_group_to_json(current)}), 200

        set_doc["updated_at"] = now
        coll.update_one({"_id": gid, "org_id": org_id}, {"$set": set_doc})
        updated = coll.find_one({"_id": gid, "org_id": org_id})

        #TODO rpc_sync_access_group(updated)

        return jsonify({"access_group": access_group_to_json(updated)}), 200

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@access_groups_bp.route("/access-groups/<group_id>", methods=["DELETE"])
@require_auth
def delete_access_group(group_id: str):
    """
    Delete an access group.

    DELETE /api/access-groups/<group_id>
    """
    try:
        coll = _get_access_groups_collection()
        org_id = _require_org_id()
        gid = ObjectId(group_id)

        res = coll.delete_one({"_id": gid, "org_id": org_id})
        if res.deleted_count == 0:
            return jsonify({"error": "access group not found"}), 404

        #TODO rpc_sync_access_group_deleted(group_id)

        return jsonify({"status": "deleted", "id": group_id}), 200

    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@access_groups_bp.route("/access-groups/add-members", methods=["POST"])
@require_auth
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
        org_id = _require_org_id()
        member_oids = [ObjectId(m) for m in add_req.members]
        now = datetime.now(timezone.utc)

        update_res = coll.update_one(
            {"name": add_req.group_name, "org_id": org_id},
            {
                "$addToSet": {"members": {"$each": member_oids}},
                "$set": {"updated_at": now},
            },
        )

        if update_res.matched_count == 0:
            return jsonify({"error": "access group not found"}), 404

        updated = coll.find_one({"name": add_req.group_name, "org_id": org_id})

        #TODO rpc_sync_access_group(updated)

        return jsonify({"access_group": access_group_to_json(updated)}), 200

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
