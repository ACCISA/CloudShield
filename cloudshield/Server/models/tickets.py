from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional

from bson import ObjectId
from pydantic import BaseModel, Field
from pydantic_core import PydanticCustomError


def _coerce_object_id(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception as exc:
        raise PydanticCustomError("object_id_invalid", "Invalid ObjectId", {"value": v}) from exc


class TicketCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1)
    priority: Literal["Low", "Medium", "High"] = "Medium"


class TicketUpdate(BaseModel):
    status: Optional[Literal["Open", "Pending", "Closed"]] = None
    priority: Optional[Literal["Low", "Medium", "High"]] = None


class TicketReplyCreate(BaseModel):
    message: str = Field(..., min_length=1)


def create_ticket_doc(ticket: TicketCreate, user_id: str, org_id: str) -> dict:
    """Create a MongoDB-ready ticket document."""
    now = datetime.now(timezone.utc)
    return {
        "title": ticket.title,
        "description": ticket.description,
        "status": "Open",
        "priority": ticket.priority,
        "user_id": user_id,
        "org_id": org_id,
        "created_at": now,
        "updated_at": now,
    }


def ticket_to_json(doc: dict) -> dict:
    """Convert MongoDB ticket doc to JSON-safe payload."""
    if not doc:
        return {}
    return {
        "id": str(doc.get("_id")) if doc.get("_id") else None,
        "title": doc.get("title"),
        "description": doc.get("description"),
        "status": doc.get("status"),
        "priority": doc.get("priority"),
        "user_id": doc.get("user_id"),
        "org_id": doc.get("org_id"),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }


def create_ticket_reply_doc(reply: TicketReplyCreate, ticket_id: str, user_id: str) -> dict:
    """Create a MongoDB-ready ticket reply document."""
    now = datetime.now(timezone.utc)
    return {
        "ticket_id": _coerce_object_id(ticket_id),
        "user_id": user_id,
        "message": reply.message,
        "created_at": now,
    }


def ticket_reply_to_json(doc: dict) -> dict:
    """Convert MongoDB ticket reply doc to JSON-safe payload."""
    if not doc:
        return {}
    return {
        "id": str(doc.get("_id")) if doc.get("_id") else None,
        "ticket_id": str(doc.get("ticket_id")) if doc.get("ticket_id") else None,
        "user_id": doc.get("user_id"),
        "message": doc.get("message"),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
    }