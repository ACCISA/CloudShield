"""Organization models and helpers for package-based resource limits."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, Literal, Optional

from pydantic import BaseModel, field_validator
from pydantic_core import PydanticCustomError

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
    logo: Optional[str] = None
    package: Literal["basic", "pro", "enterprise"] = "basic"
    workstation_limit: Optional[int] = None
    user_limit: Optional[int] = None
    storage_limit_gb: Optional[int] = None
    provisioning_status: Literal["pending", "in_progress", "completed", "failed"] = "pending"
    provisioning_job_id: Optional[str] = None

    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: Optional[str] = "incomplete" # 'active', 'past_due', 'canceled'

    domain_name: str
    dc_admin_password: str
    realm_name: str

    @field_validator("workstation_limit", "user_limit")
    @classmethod
    def non_negative_limit(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise PydanticCustomError("limit_negative", "Limits must be non-negative", {})
        return v


class OrganizationCreate(OrganizationBase):
    """Schema for creating a new organization. ID is handled by MongoDB."""
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None
    package: Optional[Literal["basic", "pro", "enterprise"]] = None
    workstation_limit: Optional[int] = None
    user_limit: Optional[int] = None
    storage_limit_gb: Optional[int] = None
    provisioning_status: Optional[Literal["pending", "in_progress", "completed", "failed"]] = None
    provisioning_job_id: Optional[str] = None

    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: Optional[str] = None

    @field_validator("workstation_limit", "user_limit")
    @classmethod
    def non_negative_limit(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise PydanticCustomError("limit_negative", "Limits must be non-negative", {})
        return v


class Organization(OrganizationCreate):
    """Schema representing an existing organization fetched from the DB."""
    id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


def create_organization_doc(org: OrganizationCreate) -> dict:
    """Create a MongoDB-ready organization document with derived limits (No _id, handled by DB)."""
    limits = get_package_limits(org.package)

    workstation_limit = org.workstation_limit if org.workstation_limit is not None else limits["workstation_limit"]
    user_limit = org.user_limit if org.user_limit is not None else limits["user_limit"]
    storage_limit_gb = org.storage_limit_gb if org.storage_limit_gb is not None else limits["storage_limit_gb"]

    now = datetime.now(timezone.utc)
    return {
        "name": org.name,
        "package": org.package,
        "domain_name": org.domain_name,
        "realm_name": org.realm_name,
        "dc_admin_password": org.dc_admin_password,
        "workstation_limit": workstation_limit,
        "user_limit": user_limit,
        "storage_limit_gb": storage_limit_gb,
        "provisioning_status": org.provisioning_status,
        "provisioning_job_id": org.provisioning_job_id,
        "created_at": now,
        "updated_at": now,
    }
