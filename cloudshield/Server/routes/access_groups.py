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
from utils import access_groups

logger = get_logger("access_groups")

access_groups_bp = Blueprint("access_groups", __name__)

ERROR_GROUP_NAME_REQUIRED = "group_name is required"



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
        existing = access_groups.find_one({"name": group_data.group_name}, {"_id": 1})
        if existing:
            return jsonify({"error": "access group already exists"}), 409

        doc = create_access_group_doc(group_data)
        res = access_groups.insert_one(doc)
        created = access_groups.find_one({"_id": res.inserted_id})

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

        member_oids = [ObjectId(m) for m in add_req.members]
        now = datetime.now(timezone.utc)

        update_res = access_groups.update_one(
            {"name": add_req.group_name},
            {
                "$addToSet": {"members": {"$each": member_oids}},
                "$set": {"updated_at": now},
            },
        )

        if update_res.matched_count == 0:
            return jsonify({"error": "access group not found"}), 404

        updated = access_groups.find_one({"name": add_req.group_name})

        #TODO rpc_sync_access_group(updated)

        return jsonify({"access_group": access_group_to_json(updated)}), 200

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
