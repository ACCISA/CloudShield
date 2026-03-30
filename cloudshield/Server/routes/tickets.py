"""Support Tickets API endpoints."""
from __future__ import annotations

from datetime import datetime, timezone

from flask import Blueprint, request, jsonify, g
from pydantic import ValidationError

from cloudshield.Server.security.guards import require_auth
from cloudshield.Server.utils.database import db_admin
from cloudshield.Server.utils.logging_setup import get_logger

# --- AI INTEGRATION ---
from cloudshield.Server.utils.ai_agent import trigger_ai_triage

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


def _error_response(message: str, code: str, details, status: int):
    payload = {
        "message": message,
        "code": code,
        "details": details,
        # Keep legacy key for backward compatibility with existing clients/tests.
        "error": message,
    }
    return jsonify(payload), status


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

        # --- TRIGGER AI TRIAGE AGENT ---
        trigger_ai_triage(str(res.inserted_id))
        
        created_ticket = tickets_coll.find_one({"_id": res.inserted_id})
        logger.info("User %s created ticket %s and triggered AI triage", user_id, res.inserted_id)

        return jsonify({
            "message": "Ticket created", 
            "ticket": ticket_to_json(created_ticket)
        }), 201

    except ValidationError as e:
        return _error_response("Validation failed", "VALIDATION_ERROR", e.errors(), 400)
    except Exception as e:
        logger.exception("Failed to create ticket org_id=%s actor=%s", (getattr(g, "user", {}) or {}).get("org_id"), (getattr(g, "user", {}) or {}).get("email"))
        return _error_response("Internal server error", "INTERNAL_ERROR", str(e), 500)


@tickets_bp.route("/tickets", methods=["GET"])
@require_auth
def get_tickets():
    try:
        org_id = _require_org_id()
        user_email = getattr(g, "user", {}).get("email", "").lower()
        tickets_coll = db_admin["tickets"]

        # --- THE SUPER ADMIN BYPASS ---
        if user_email == "support@cloudshield.com":
            cursor = tickets_coll.find({}).sort("created_at", -1)
        else:
            filter_query = {"org_id": org_id}
            if g.user.get("role") != "admin":
                filter_query["user_id"] = g.user.get("id")

            cursor = tickets_coll.find(filter_query).sort("created_at", -1)

        items = [ticket_to_json(doc) for doc in cursor]

        return jsonify({"tickets": items}), 200

    except Exception as e:
        logger.exception("Failed to fetch tickets org_id=%s actor=%s", (getattr(g, "user", {}) or {}).get("org_id"), (getattr(g, "user", {}) or {}).get("email"))
        return _error_response("Internal server error", "INTERNAL_ERROR", str(e), 500)


@tickets_bp.route("/tickets/<ticket_id>", methods=["GET"])
@require_auth
def get_ticket_detail(ticket_id: str):
    try:
        org_id = _require_org_id()
        user_email = getattr(g, "user", {}).get("email", "").lower()
        oid = _coerce_object_id(ticket_id)
        
        tickets_coll = db_admin["tickets"]
        replies_coll = db_admin["ticket_replies"]

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
        logger.exception("Failed to fetch ticket detail ticket_id=%s org_id=%s actor=%s", ticket_id, (getattr(g, "user", {}) or {}).get("org_id"), (getattr(g, "user", {}) or {}).get("email"))
        return _error_response("Internal server error", "INTERNAL_ERROR", str(e), 500)


@tickets_bp.route("/tickets/<ticket_id>/reply", methods=["POST"])
@require_auth
def add_reply(ticket_id: str):
    try:
        data = request.get_json() or {}
        validated_data = TicketReplyCreate(**data)
        
        org_id = _require_org_id()
        user_email = getattr(g, "user", {}).get("email", "").lower()
        
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

        # --- AI CONVERSATION TRIGGER ---
        # Trigger the bot to reply to the user, UNLESS they escalated or a human admin sent the message
        if user_email != "support@cloudshield.com" and "[SYSTEM]" not in validated_data.message:
            trigger_ai_triage(str(oid))

        return jsonify({"message": "Reply added successfully"}), 201

    except Exception as e:
        logger.exception("Failed to add ticket reply ticket_id=%s org_id=%s actor=%s", ticket_id, (getattr(g, "user", {}) or {}).get("org_id"), (getattr(g, "user", {}) or {}).get("email"))
        return _error_response("Internal server error", "INTERNAL_ERROR", str(e), 500)


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
        logger.exception("Failed to update ticket ticket_id=%s org_id=%s actor=%s", ticket_id, (getattr(g, "user", {}) or {}).get("org_id"), (getattr(g, "user", {}) or {}).get("email"))
        return _error_response("Internal server error", "INTERNAL_ERROR", str(e), 500)