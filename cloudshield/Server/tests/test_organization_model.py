import os
import sys
from datetime import datetime
import pytest

# Ensure Server package is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cloudshield.Server.models.organization import (  # noqa: E402
    OrganizationCreate,
    OrganizationUpdate,
    create_organization_doc,
    get_package_limits,
    PACKAGES,
)


def test_create_organization_doc_sets_limits_and_defaults():
    org = OrganizationCreate(
        org_id="Acme-Co",
        company_name="Acme Corp",
        package_type="pro",
        admin_email="Admin@Example.com",
        domain="acme.local",
    )

    doc = create_organization_doc(org)

    assert doc["org_id"] == "acme-co"
    assert doc["admins"] == ["admin@example.com"]
    assert doc["company_name"] == "Acme Corp"
    assert doc["package_type"] == "pro"
    assert doc["workstation_limit"] == PACKAGES["pro"]["workstation_limit"]
    assert doc["user_limit"] == PACKAGES["pro"]["user_limit"]
    assert doc["storage_gb"] == PACKAGES["pro"]["storage_gb"]
    assert doc["provisioning_status"] == "pending"
    assert isinstance(doc["created_at"], datetime)
    assert isinstance(doc["updated_at"], datetime)


def test_get_package_limits_rejects_unknown_package():
    with pytest.raises(ValueError):
        get_package_limits("unknown")  # type: ignore[arg-type]


def test_company_name_validator_enforces_length():
    with pytest.raises(ValueError):
        OrganizationUpdate(company_name="x")

    updated = OrganizationUpdate(company_name="Valid Name")
    assert updated.company_name == "Valid Name"
