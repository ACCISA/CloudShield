import pytest
from pydantic import ValidationError

from cloudshield.Server.models.organization import (
    OrganizationCreate,
    create_organization_doc,
    PACKAGE_LIMITS,
)


def test_create_organization_doc_applies_package_defaults():
    org = OrganizationCreate(org_id="acme-1", name="Acme", package="pro")

    doc = create_organization_doc(org)

    assert doc["org_id"] == "acme-1"
    assert doc["name"] == "Acme"
    assert doc["package"] == "pro"
    assert doc["workstation_limit"] == PACKAGE_LIMITS["pro"]["workstation_limit"]
    assert doc["user_limit"] == PACKAGE_LIMITS["pro"]["user_limit"]
    assert doc["provisioning_status"] == "pending"
    assert doc["provisioning_job_id"] is None


def test_create_organization_doc_respects_overrides():
    org = OrganizationCreate(
        org_id="acme-2",
        name="Override",
        package="basic",
        workstation_limit=1,
        user_limit=2,
    )

    doc = create_organization_doc(org)

    assert doc["workstation_limit"] == 1
    assert doc["user_limit"] == 2


def test_organization_validation_rejects_invalid_org_id():
    with pytest.raises(ValidationError):
        OrganizationCreate(org_id="Bad Org", name="Bad")
