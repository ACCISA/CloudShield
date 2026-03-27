"""Access Groups API endpoints."""
from __future__ import annotations

import csv
import io
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

from services import service_dispatcher


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

        # Dispatch DC group creation (non-blocking async job)
        dc_job_id = None
        try:
            group_name = group_data.group_name
            if org_id and group_name:
                job = service_dispatcher(
                    service_name="dc_add_group",
                    org_id=org_id,
                    group_name=group_name,
                )
                dc_job_id = job.id
                logger.info("Dispatched dc_add_group job %s for group %s", job.id, group_name)
        except Exception as dc_err:
            logger.warning("DC sync failed for group create (non-blocking): %s", dc_err)

        resp = {"access_group": access_group_to_json(created)}
        if dc_job_id:
            resp["dc_job_id"] = dc_job_id
        return jsonify(resp), 201

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

        # If group_name changed, sync a new group to DC (non-blocking)
        dc_job_id = None
        try:
            gname = patch.group_name or existing.get("name", "")
            if org_id and gname:
                job = service_dispatcher(
                    service_name="dc_add_group",
                    org_id=org_id,
                    group_name=gname,
                )
                dc_job_id = job.id
                logger.info("Dispatched dc_add_group (update sync) job %s for group %s", job.id, gname)
        except Exception as dc_err:
            logger.warning("DC sync failed for group update (non-blocking): %s", dc_err)

        resp = {"access_group": access_group_to_json(updated)}
        if dc_job_id:
            resp["dc_job_id"] = dc_job_id
        return jsonify(resp), 200

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

        # Fetch the group doc first so we have the name for DC dispatch
        existing = coll.find_one({"_id": gid, "org_id": org_id})
        if not existing:
            return jsonify({"error": "access group not found"}), 404

        group_name = existing.get("name", "")

        res = coll.delete_one({"_id": gid, "org_id": org_id})
        if res.deleted_count == 0:
            return jsonify({"error": "access group not found"}), 404

        # Dispatch DC group removal (non-blocking async job)
        dc_job_id = None
        try:
            if org_id and group_name:
                job = service_dispatcher(
                    service_name="dc_remove_group",
                    org_id=org_id,
                    group_name=group_name,
                )
                dc_job_id = job.id
                logger.info("Dispatched dc_remove_group job %s for group %s", job.id, group_name)
        except Exception as dc_err:
            logger.warning("DC sync failed for group delete (non-blocking): %s", dc_err)

        logger.info("Group %s deleted from DB.", group_id)

        resp = {"status": "deleted", "id": group_id}
        if dc_job_id:
            resp["dc_job_id"] = dc_job_id
        return jsonify(resp), 200

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

        # Sync group existence to DC (ensures group is created on DC side)
        try:
            if org_id and add_req.group_name:
                service_dispatcher(
                    service_name="dc_add_group",
                    org_id=org_id,
                    group_name=add_req.group_name,
                )
                logger.info("Dispatched dc_add_group (add-members sync) for group %s", add_req.group_name)
        except Exception as dc_err:
            logger.warning("DC sync failed for add-members (non-blocking): %s", dc_err)

        return jsonify({"access_group": access_group_to_json(updated)}), 200

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


def _get_users_collection():
    """Get the users collection for member email lookup."""
    try:
        from utils.database import users_admin
    except Exception:
        from cloudshield.Server.utils.database import users_admin
    return users_admin


@access_groups_bp.route("/access-groups/import-csv", methods=["POST"])
@require_auth
def import_groups_csv():
    """
    Bulk import access groups from a CSV file.

    Endpoint:
        POST /api/access-groups/import-csv

    Request:
        - Content-Type: multipart/form-data
        - file: CSV file with columns: group_name,description,member_emails,workstations
        - member_emails is a semicolon-separated list of user emails
        - workstations is a semicolon-separated list of workstation names/IDs

    CSV Format:
        group_name,description,member_emails,workstations
        marketing,Marketing team group,john@example.com;jane@example.com,WS001;WS002
        engineering,Engineering department,dev1@example.com;dev2@example.com,WS003;WS004;WS005

    Responses:
        200: { "created": N, "errors": [...] }
        400: { "error": "No file provided" }
        500: { "error": "Internal server error" }
    """
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file provided"}), 400

        file = request.files["file"]
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400

        if not file.filename.lower().endswith(".csv"):
            return jsonify({"error": "File must be a CSV"}), 400

        # Read and decode CSV content
        content = file.read().decode("utf-8-sig")
        reader = csv.DictReader(io.StringIO(content))
        rows = list(reader)

        org_id = _require_org_id()
        coll = _get_access_groups_collection()
        users_coll = _get_users_collection()

        # Build email -> user_id mapping for the org using only emails present in the CSV
        email_to_id = {}
        unique_emails = set()
        for row in rows:
            member_emails_raw = (row.get("member_emails") or "").strip()
            if not member_emails_raw:
                continue
            # Support both comma- and semicolon-separated email lists
            normalized = member_emails_raw.replace(";", ",")
            for part in normalized.split(","):
                email = part.strip().lower()
                if email:
                    unique_emails.add(email)

        if unique_emails:
            org_users = list(
                users_coll.find(
                    {"org_id": org_id, "email": {"$in": list(unique_emails)}},
                    {"_id": 1, "email": 1},
                )
            )
            for u in org_users:
                email = (u.get("email") or "").strip().lower()
                if email:
                    email_to_id[email] = str(u["_id"])

        created_count = 0
        errors = []
        dc_job_ids = []

        for row_num, row in enumerate(rows, start=2):  # Start at 2 (row 1 is header)
            try:
                group_name = (row.get("group_name") or "").strip()
                description = (row.get("description") or "").strip()
                member_emails_raw = (row.get("member_emails") or "").strip()
                workstations_raw = (row.get("workstations") or "").strip()

                if not group_name:
                    errors.append({
                        "row": row_num,
                        "error": "Missing required field: group_name"
                    })
                    continue

                # Parse member emails (semicolon-separated)
                member_ids = []
                missing_emails = []
                if member_emails_raw:
                    for email in member_emails_raw.split(";"):
                        email = email.strip().lower()
                        if not email:
                            continue
                        user_id = email_to_id.get(email)
                        if user_id:
                            member_ids.append(user_id)
                        else:
                            missing_emails.append(email)

                # Parse workstations (semicolon-separated)
                workstations = []
                if workstations_raw:
                    for ws in workstations_raw.split(";"):
                        ws = ws.strip()
                        if ws:
                            workstations.append(ws)

                # Create the group
                group_data = AccessGroupCreate(
                    group_name=group_name,
                    description=description or None,
                    members=member_ids,
                    workstations=workstations,
                )

                # Check for duplicate group name within org using normalized value.
                existing = coll.find_one({"name": group_data.group_name, "org_id": org_id}, {"_id": 1})
                if existing:
                    errors.append({
                        "row": row_num,
                        "error": f"Group '{group_name}' already exists"
                    })
                    continue

                doc = create_access_group_doc(group_data)
                doc["org_id"] = org_id
                coll.insert_one(doc)

                # Dispatch DC group creation
                try:
                    job = service_dispatcher(
                        service_name="dc_add_group",
                        org_id=org_id,
                        group_name=group_data.group_name,
                    )
                    dc_job_ids.append(job.id)
                except Exception as dc_err:
                    logger.warning("DC sync failed for group '%s' (non-blocking): %s", group_name, dc_err)

                created_count += 1

                # Report any missing member emails as warnings
                if missing_emails:
                    errors.append({
                        "row": row_num,
                        "warning": f"Group created but some members not found: {', '.join(missing_emails)}"
                    })

            except ValidationError as e:
                errors.append({"row": row_num, "error": e.errors()})
            except Exception as e:
                errors.append({"row": row_num, "error": str(e)})

        return jsonify({
            "created": created_count,
            "dc_job_ids": dc_job_ids,
            "errors": errors
        }), 200

    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        logger.error("CSV import failed: %s", e)
        return jsonify({"error": "Internal server error", "details": str(e)}), 500
