from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from pydantic import BaseModel, field_validator
from pydantic_core import PydanticCustomError

GROUP_RX = re.compile(r"^[a-z0-9_-]{3,64}$")


def _coerce_object_id(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception as exc:
        raise PydanticCustomError("object_id_invalid", "Invalid ObjectId", {"value": v}) from exc


class AccessGroupBase(BaseModel):
    group_name: str
    description: Optional[str] = None
    members: List[str] = []

    @field_validator("group_name")
    @classmethod
    def valid_group_name(cls, v: str) -> str:
        v2 = (v or "").strip().lower()
        if not v2:
            raise PydanticCustomError("group_name_required", "group_name is required", {})
        if not GROUP_RX.match(v2):
            raise PydanticCustomError(
                "group_name_format",
                "group_name must be 3-64 chars: a-z, 0-9, _ or -",
                {},
            )
        return v2

    @field_validator("members")
    @classmethod
    def valid_members(cls, v: List[str]) -> List[str]:
        if v is None:
            return []
        if not isinstance(v, list):
            raise PydanticCustomError("members_format", "members must be a list", {})
        # Validate each is a valid ObjectId string
        for mid in v:
            if not isinstance(mid, str) or not mid.strip():
                raise PydanticCustomError("member_invalid", "member id must be a non-empty string", {})
            _coerce_object_id(mid.strip())
        # Normalize: strip + unique preserve order
        seen = set()
        out = []
        for mid in v:
            s = mid.strip()
            if s not in seen:
                out.append(s)
                seen.add(s)
        return out


class AccessGroupCreate(AccessGroupBase):
    pass


class AccessGroupAddMembers(BaseModel):
    group_name: str
    members: List[str] = []

    @field_validator("group_name")
    @classmethod
    def valid_group_name(cls, v: str) -> str:
        v2 = (v or "").strip().lower()
        if not v2:
            raise PydanticCustomError("group_name_required", "group_name is required", {})
        if not GROUP_RX.match(v2):
            raise PydanticCustomError(
                "group_name_format",
                "group_name must be 3-64 chars: a-z, 0-9, _ or -",
                {},
            )
        return v2

    @field_validator("members")
    @classmethod
    def valid_members(cls, v: List[str]) -> List[str]:
        if v is None:
            return []
        if not isinstance(v, list):
            raise PydanticCustomError("members_format", "members must be a list", {})
        for mid in v:
            if not isinstance(mid, str) or not mid.strip():
                raise PydanticCustomError("member_invalid", "member id must be a non-empty string", {})
            _coerce_object_id(mid.strip())
        # Normalize unique
        seen = set()
        out = []
        for mid in v:
            s = mid.strip()
            if s not in seen:
                out.append(s)
                seen.add(s)
        return out


def create_access_group_doc(group: AccessGroupCreate) -> dict:
    """Create a MongoDB-ready access group document."""
    now = datetime.now(timezone.utc)
    member_oids = [_coerce_object_id(m) for m in group.members]
    return {
        "name": group.group_name,            # stored name
        "description": group.description,    # text
        "members": member_oids,              # List[ObjectId] relations to users
        "created_at": now,
        "updated_at": now,
    }


def access_group_to_json(doc: dict) -> dict:
    """Convert MongoDB access group doc to JSON-safe payload."""
    if not doc:
        return {}
    return {
        "id": str(doc.get("_id")) if doc.get("_id") else None,
        "group_name": doc.get("name"),
        "description": doc.get("description"),
        "members": [str(x) for x in (doc.get("members") or [])],
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }
