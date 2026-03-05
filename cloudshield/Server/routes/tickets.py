"""Support Tickets API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from bson import ObjectId
from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError

from cloudshield.Server.security.guards import require_auth
from cloudshield.Server.utils.database import db_admin
from cloudshield.Server.utils.logging_setup import get_logger

from models.tickets import (
    TicketCreate,
    TicketUpdate,
    TicketReplyCreate,
    create_ticket_doc,
    ticket_to_json,
    create_ticket_reply_doc,
    ticket_reply_to_json,
    _coerce_object_id
)

logger = get_logger("tickets")
tickets_bp = Blueprint("tickets", __name__)


def _require_org_id() -> str:
    """Helper to safely extract org_id from the authenticated user context."""
    org_id = (getattr(g, "user", {}) or {}).get("org_id")
    org_id = (org_id or "").strip()
    if not org_id:
        raise ValueError("Missing org_id for authenticated user")
    return org_id


@tickets_bp.route("/tickets", methods=["POST"])
@require_auth
def create_ticket():
    try:
        data = request.get_json() or {}
        validated_data = TicketCreate(**data)
        
        org_id = _require_org_id()
        user_id = getattr(g, "user", {}).get("id", "unknown_user")

        doc = create_ticket_doc(validated_data, user_id, org_id)
        
        tickets_coll = db_admin["tickets"]
        res = tickets_coll.insert_one(doc)
        
        created_ticket = tickets_coll.find_one({"_id": res.inserted_id})
        logger.info("User %s created ticket %s", user_id, res.inserted_id)

        return jsonify({"message": "Ticket created", "ticket": ticket_to_json(created_ticket)}), 201

    except ValidationError as e:
        return jsonify({"error": "Validation failed", "details": e.errors()}), 400
    except Exception as e:
        logger.error("Failed to create ticket: %s", e)
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@tickets_bp.route("/tickets", methods=["GET"])
@require_auth
def get_tickets():
    try:
        org_id = _require_org_id()
        # Safely get the email and force lowercase to prevent case-sensitivity bugs
        user_email = getattr(g, "user", {}).get("email", "").lower()
        tickets_coll = db_admin["tickets"]

        # --- THE SUPER ADMIN BYPASS ---
        if user_email == "support@cloudshield.com":
            # Support team sees EVERY ticket in the database
            cursor = tickets_coll.find({}).sort("created_at", -1)
        else:
            # Normal users only see their organization's tickets
            filter_query = {"org_id": org_id}
            if g.user.get("role") != "admin":
                filter_query["user_id"] = g.user.get("id")

            cursor = tickets_coll.find(filter_query).sort("created_at", -1)

        items = [ticket_to_json(doc) for doc in cursor]

        return jsonify({"tickets": items}), 200

    except Exception as e:
        logger.error("Failed to fetch tickets: %s", e)
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@tickets_bp.route("/tickets/<ticket_id>", methods=["GET"])
@require_auth
def get_ticket_detail(ticket_id: str):
    try:
        org_id = _require_org_id()
        user_email = getattr(g, "user", {}).get("email", "").lower()
        oid = _coerce_object_id(ticket_id)
        
        tickets_coll = db_admin["tickets"]
        replies_coll = db_admin["ticket_replies"]

        # Support can fetch any ticket detail, normal users restricted by org_id
        if user_email == "support@cloudshield.com":
            ticket_doc = tickets_coll.find_one({"_id": oid})
        else:
            ticket_doc = tickets_coll.find_one({"_id": oid, "org_id": org_id})
            
        if not ticket_doc:
            return jsonify({"error": "Ticket not found"}), 404

        replies_cursor = replies_coll.find({"ticket_id": oid}).sort("created_at", 1)
        
        result = ticket_to_json(ticket_doc)
        result["replies"] = [ticket_reply_to_json(r) for r in replies_cursor]

        return jsonify(result), 200

    except Exception as e:
        logger.error("Failed to fetch ticket detail: %s", e)
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@tickets_bp.route("/tickets/<ticket_id>/reply", methods=["POST"])
@require_auth
def add_reply(ticket_id: str):
    try:
        data = request.get_json() or {}
        validated_data = TicketReplyCreate(**data)
        
        org_id = _require_org_id()
        user_email = getattr(g, "user", {}).get("email", "").lower()
        # Use email for support replies so it shows clearly in the chat, otherwise use user ID
        user_id = "CloudShield Support" if user_email == "support@cloudshield.com" else getattr(g, "user", {}).get("email", "unknown_user")
        oid = _coerce_object_id(ticket_id)

        tickets_coll = db_admin["tickets"]
        replies_coll = db_admin["ticket_replies"]

        if user_email == "support@cloudshield.com":
            ticket_doc = tickets_coll.find_one({"_id": oid})
        else:
            ticket_doc = tickets_coll.find_one({"_id": oid, "org_id": org_id})
            
        if not ticket_doc:
            return jsonify({"error": "Ticket not found"}), 404

        doc = create_ticket_reply_doc(validated_data, str(oid), user_id)
        replies_coll.insert_one(doc)
        
        tickets_coll.update_one(
            {"_id": oid},
            {"$set": {"updated_at": datetime.now(timezone.utc)}}
        )

        return jsonify({"message": "Reply added successfully"}), 201

    except Exception as e:
        logger.error("Failed to add reply: %s", e)
        return jsonify({"error": "Internal server error", "details": str(e)}), 500


@tickets_bp.route("/tickets/<ticket_id>/status", methods=["PATCH"])
@require_auth
def update_status(ticket_id: str):
    try:
        data = request.get_json() or {}
        validated_data = TicketUpdate(**data)
        
        org_id = _require_org_id()
        user_email = getattr(g, "user", {}).get("email", "").lower()
        oid = _coerce_object_id(ticket_id)
        tickets_coll = db_admin["tickets"]

        if user_email == "support@cloudshield.com":
            existing = tickets_coll.find_one({"_id": oid})
        else:
            existing = tickets_coll.find_one({"_id": oid, "org_id": org_id})
            
        if not existing:
            return jsonify({"error": "Ticket not found"}), 404

        update_fields = {"updated_at": datetime.now(timezone.utc)}
        if validated_data.status is not None:
            update_fields["status"] = validated_data.status
        if validated_data.priority is not None:
            update_fields["priority"] = validated_data.priority

        tickets_coll.update_one({"_id": oid}, {"$set": update_fields})
        updated_doc = tickets_coll.find_one({"_id": oid})

        return jsonify({"message": "Ticket updated", "ticket": ticket_to_json(updated_doc)}), 200

    except Exception as e:
        logger.error("Failed to update ticket: %s", e)
        return jsonify({"error": "Internal server error", "details": str(e)}), 500