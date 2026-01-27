"""Organization models and helpers for package-based resource limits."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Dict, Literal, Optional

from pydantic import BaseModel, field_validator
from pydantic_core import PydanticCustomError

ORG_RX = re.compile(r"^[a-z0-9_-]{3,32}$")

PACKAGE_LIMITS: Dict[str, Dict[str, int | None]] = {
    "basic": {"workstation_limit": 5, "user_limit": 10, "storage_limit_gb": None},
    "pro": {"workstation_limit": 20, "user_limit": 50, "storage_limit_gb": None},
    "enterprise": {"workstation_limit": 100, "user_limit": 500, "storage_limit_gb": None},
}


def get_package_limits(package: Literal["basic", "pro", "enterprise"]) -> Dict[str, int | None]:
    """Return immutable limits for the given package tier."""
    try:
        return dict(PACKAGE_LIMITS[package])
    except KeyError as exc:  # pragma: no cover - defensive branch
        raise ValueError(f"Unknown package '{package}'") from exc


class OrganizationBase(BaseModel):
    name: Optional[str] = None
    package: Literal["basic", "pro", "enterprise"] = "basic"
    workstation_limit: Optional[int] = None
    user_limit: Optional[int] = None
    storage_limit_gb: Optional[int] = None
    provisioning_status: Literal["pending", "in_progress", "completed", "failed"] = "pending"
    provisioning_job_id: Optional[str] = None

    @field_validator("workstation_limit", "user_limit")
    @classmethod
    def non_negative_limit(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise PydanticCustomError("limit_negative", "Limits must be non-negative", {})
        return v


class OrganizationCreate(OrganizationBase):
    org_id: str
    domain_name: str
    dc_admin_password: str
    realm_name: str

    @field_validator("org_id")
    @classmethod
    def valid_org(cls, v: str) -> str:
        v2 = v.strip()
        if not v2:
            raise PydanticCustomError("org_id_required", "org_id is required", {})
        if not ORG_RX.match(v2):
            raise PydanticCustomError(
                "org_id_format",
                "org_id must be 3-32 chars: a-z, 0-9, _ or -",
                {},
            )
        return v2


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    package: Optional[Literal["basic", "pro", "enterprise"]] = None
    workstation_limit: Optional[int] = None
    user_limit: Optional[int] = None
    storage_limit_gb: Optional[int] = None
    provisioning_status: Optional[Literal["pending", "in_progress", "completed", "failed"]] = None
    provisioning_job_id: Optional[str] = None

    @field_validator("workstation_limit", "user_limit")
    @classmethod
    def non_negative_limit(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise PydanticCustomError("limit_negative", "Limits must be non-negative", {})
        return v


class Organization(OrganizationCreate):
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def create_organization_doc(org: OrganizationCreate) -> dict:
    """Create a MongoDB-ready organization document with derived limits."""
    limits = get_package_limits(org.package)

    workstation_limit = org.workstation_limit if org.workstation_limit is not None else limits["workstation_limit"]
    user_limit = org.user_limit if org.user_limit is not None else limits["user_limit"]
    storage_limit_gb = org.storage_limit_gb if org.storage_limit_gb is not None else limits["storage_limit_gb"]

    now = datetime.now(timezone.utc)
    return {
        "org_id": org.org_id,
        "name": org.name,
        "package": org.package,
        "workstation_limit": workstation_limit,
        "user_limit": user_limit,
        "storage_limit_gb": storage_limit_gb,
        "provisioning_status": org.provisioning_status,
        "provisioning_job_id": org.provisioning_job_id,
        "created_at": now,
        "updated_at": now,
    }
