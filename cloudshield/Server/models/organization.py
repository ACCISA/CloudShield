"""Organization model for CloudShield multi-tenant infrastructure."""
from pydantic import BaseModel, field_validator
from typing import Literal, Optional, List
from datetime import datetime
import re

# Reuse the same org_id pattern from user.py
ORG_RX = re.compile(r"^[a-z0-9_-]{3,32}$")

# Package configuration - defines limits based on selected plan
PACKAGES = {
    "basic": {
        "workstation_limit": 5,
        "user_limit": 10,
        "storage_gb": 50,
        "description": "Perfect for small teams",
    },
    "pro": {
        "workstation_limit": 20,
        "user_limit": 50,
        "storage_gb": 200,
        "description": "For growing businesses",
    },
    "enterprise": {
        "workstation_limit": 100,
        "user_limit": 500,
        "storage_gb": 1000,
        "description": "Designed for enterprises requiring scale",
    },
}

PackageType = Literal["basic", "pro", "enterprise"]
ProvisioningStatus = Literal["pending", "in_progress", "completed", "failed"]


class OrganizationCreate(BaseModel):
    """
    Pydantic model for creating a new organization.

    Fields:
        org_id (str): Unique organization identifier (3-32 chars, lowercase alphanumeric, _, -).
        company_name (str): Display name of the company.
        package_type (PackageType): Selected subscription package.
        admin_email (str): Email of the founding admin user.
        domain (str, optional): Custom domain for the organization.

    Notes:
        - workstation_limit and user_limit are derived from package_type.
        - provisioning_status starts as "pending" until infrastructure is ready.
    """
    org_id: str
    company_name: str
    package_type: PackageType
    admin_email: str
    domain: Optional[str] = None

    @field_validator("org_id")
    @classmethod
    def valid_org_id(cls, v: str) -> str:
        """Validate organization identifier format."""
        v2 = v.strip().lower()
        if not v2:
            raise ValueError("org_id is required")
        if not ORG_RX.match(v2):
            raise ValueError("org_id must be 3-32 chars: a-z, 0-9, _ or -")
        return v2

    @field_validator("company_name")
    @classmethod
    def valid_company_name(cls, v: str) -> str:
        """Validate company name is non-empty."""
        v2 = v.strip()
        if len(v2) < 2:
            raise ValueError("company_name must be at least 2 characters")
        if len(v2) > 128:
            raise ValueError("company_name must be at most 128 characters")
        return v2

    @field_validator("admin_email")
    @classmethod
    def valid_admin_email(cls, v: str) -> str:
        """Basic email validation."""
        v2 = v.strip().lower()
        if "@" not in v2 or "." not in v2.split("@")[-1]:
            raise ValueError("Invalid email format")
        return v2


class OrganizationUpdate(BaseModel):
    """
    Pydantic model for updating an existing organization.

    All fields are optional - only provided fields will be updated.
    """
    company_name: Optional[str] = None
    package_type: Optional[PackageType] = None
    domain: Optional[str] = None
    provisioning_status: Optional[ProvisioningStatus] = None
    provisioning_job_id: Optional[str] = None

    @field_validator("company_name")
    @classmethod
    def valid_company_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        v2 = v.strip()
        if len(v2) < 2:
            raise ValueError("company_name must be at least 2 characters")
        return v2


class Organization(BaseModel):
    """
    Full organization model representing stored document.

    Fields:
        org_id (str): Unique organization identifier.
        company_name (str): Display name of the company.
        package_type (PackageType): Selected subscription package.
        workstation_limit (int): Max workstations allowed (from package).
        user_limit (int): Max users allowed (from package).
        storage_gb (int): Storage allocation in GB (from package).
        admins (List[str]): List of admin user IDs/emails.
        employees (List[str]): List of employee user IDs/emails.
        domain (str, optional): Custom domain for AD integration.
        provisioning_status (ProvisioningStatus): Infrastructure provisioning state.
        provisioning_job_id (str, optional): Current/last provisioning job ID.
        created_at (datetime): Organization creation timestamp.
        updated_at (datetime): Last update timestamp.
    """
    org_id: str
    company_name: str
    package_type: PackageType
    workstation_limit: int
    user_limit: int
    storage_gb: int
    admins: List[str] = []
    employees: List[str] = []
    domain: Optional[str] = None
    provisioning_status: ProvisioningStatus = "pending"
    provisioning_job_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


def get_package_limits(package_type: PackageType) -> dict:
    """
    Get resource limits for a given package type.

    Args:
        package_type: One of "basic", "pro", or "enterprise".

    Returns:
        dict with workstation_limit, user_limit, storage_gb, description.

    Raises:
        ValueError: If package_type is not recognized.
    """
    if package_type not in PACKAGES:
        raise ValueError(f"Unknown package type: {package_type}")
    return PACKAGES[package_type].copy()


def create_organization_doc(org_create: OrganizationCreate) -> dict:
    """
    Create a MongoDB document from OrganizationCreate input.

    Automatically:
        - Sets limits based on package_type
        - Initializes admins list with admin_email
        - Sets provisioning_status to "pending"
        - Sets created_at and updated_at timestamps

    Args:
        org_create: Validated OrganizationCreate model.

    Returns:
        dict ready for MongoDB insertion.
    """
    limits = get_package_limits(org_create.package_type)
    now = datetime.utcnow()

    return {
        "org_id": org_create.org_id,
        "company_name": org_create.company_name,
        "package_type": org_create.package_type,
        "workstation_limit": limits["workstation_limit"],
        "user_limit": limits["user_limit"],
        "storage_gb": limits["storage_gb"],
        "admins": [org_create.admin_email],
        "employees": [],
        "domain": org_create.domain,
        "provisioning_status": "pending",
        "provisioning_job_id": None,
        "created_at": now,
        "updated_at": now,
    }
