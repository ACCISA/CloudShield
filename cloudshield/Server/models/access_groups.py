from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List, Optional

from bson import ObjectId
from pydantic import BaseModel, Field, field_validator
from pydantic_core import PydanticCustomError

GROUP_RX = re.compile(r"^[a-z0-9_-]{3,64}$")


def _coerce_object_id(v: str) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception as exc:
        raise PydanticCustomError("object_id_invalid", "Invalid ObjectId", {"value": v}) from exc


def _normalize_group_name(v: str) -> str:
    v2 = (v or "").strip().lower()
    if not v2:
        raise PydanticCustomError("group_name_required", "group_name is required", {})

    # Be user-friendly: allow spaces and common separators in UI, but store a safe slug.
    # Examples:
    #   "My Group" -> "my-group"
    #   "Eng.Team" -> "eng-team"
    #   "R&D"      -> "r-d"
    v2 = re.sub(r"\s+", "-", v2)
    v2 = re.sub(r"[^a-z0-9_-]", "-", v2)
    v2 = re.sub(r"-+", "-", v2).strip("-_")
    if not v2:
        raise PydanticCustomError("group_name_required", "group_name is required", {})

    if not GROUP_RX.match(v2):
        raise PydanticCustomError(
            "group_name_format",
            "group_name must be 3-64 chars: a-z, 0-9, _ or -",
            {},
        )
    return v2


def _normalize_member_ids(v: Optional[List[str]]) -> List[str]:
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
    out: List[str] = []
    for mid in v:
        s = mid.strip()
        if s not in seen:
            out.append(s)
            seen.add(s)
    return out


def _normalize_string_ids(v: Optional[List[str]], field_name: str) -> List[str]:
    """
    Generic normalizer for list[str] ids (workstations, file_shares).
    We don't assume these are ObjectIds.
    """
    if v is None:
        return []
    if not isinstance(v, list):
        raise PydanticCustomError(f"{field_name}_format", f"{field_name} must be a list", {})

    seen = set()
    out: List[str] = []
    for x in v:
        if not isinstance(x, str) or not x.strip():
            raise PydanticCustomError(f"{field_name}_invalid", f"{field_name} id must be a non-empty string", {})
        s = x.strip()
        if s not in seen:
            out.append(s)
            seen.add(s)
    return out


class AccessGroupBase(BaseModel):
    group_name: str
    description: Optional[str] = None

    # Base64 data URL (from FileReader), optional
    group_image: Optional[str] = None

    members: List[str] = Field(default_factory=list, description="List of user ObjectId strings")

    # New: store workstation IDs (or names/ids) as strings
    workstations: List[str] = Field(default_factory=list, description="List of workstation ids/keys")

    # New: store file share ids as strings
    file_shares: List[str] = Field(default_factory=list, description="List of file share ids")

    @field_validator("group_name")
    @classmethod
    def valid_group_name(cls, v: str) -> str:
        return _normalize_group_name(v)

    @field_validator("members")
    @classmethod
    def valid_members(cls, v: Optional[List[str]]) -> List[str]:
        return _normalize_member_ids(v)

    @field_validator("workstations")
    @classmethod
    def valid_workstations(cls, v: Optional[List[str]]) -> List[str]:
        return _normalize_string_ids(v, "workstations")

    @field_validator("file_shares")
    @classmethod
    def valid_file_shares(cls, v: Optional[List[str]]) -> List[str]:
        return _normalize_string_ids(v, "file_shares")


class AccessGroupCreate(AccessGroupBase):
    pass


class AccessGroupAddMembers(AccessGroupBase):
    """
    Reuses the same validation as AccessGroupBase, but does not accept description.
    """
    description: None = None
    group_image: None = None
    workstations: List[str] = Field(default_factory=list)
    file_shares: List[str] = Field(default_factory=list)


class AccessGroupUpdate(BaseModel):
    """
    Patch-style update. All fields optional.
    """
    group_name: Optional[str] = None
    description: Optional[str] = None
    group_image: Optional[str] = None
    members: Optional[List[str]] = None
    workstations: Optional[List[str]] = None
    file_shares: Optional[List[str]] = None

    @field_validator("group_name")
    @classmethod
    def valid_group_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return _normalize_group_name(v)

    @field_validator("members")
    @classmethod
    def valid_members(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        return _normalize_member_ids(v)

    @field_validator("workstations")
    @classmethod
    def valid_workstations(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        return _normalize_string_ids(v, "workstations")

    @field_validator("file_shares")
    @classmethod
    def valid_file_shares(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        return _normalize_string_ids(v, "file_shares")


def create_access_group_doc(group: AccessGroupCreate) -> dict:
    """Create a MongoDB-ready access group document."""
    now = datetime.now(timezone.utc)
    member_oids = [_coerce_object_id(m) for m in group.members]
    return {
        "name": group.group_name,            # stored name
        "description": group.description,    # text
        "group_image": group.group_image,    # base64 data URL (optional)
        "members": member_oids,              # List[ObjectId] relations to users
        "workstations": group.workstations,  # List[str]
        "file_shares": group.file_shares,    # List[str]
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
        "group_image": doc.get("group_image"),
        "members": [str(x) for x in (doc.get("members") or [])],
        "workstations": list(doc.get("workstations") or []),
        "file_shares": list(doc.get("file_shares") or []),
        "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
        "updated_at": doc.get("updated_at").isoformat() if doc.get("updated_at") else None,
    }
