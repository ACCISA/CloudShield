import pytest
from pydantic import ValidationError

from cloudshield.Server.models.organization import (
    OrganizationCreate,
    create_organization_doc,
    PACKAGE_LIMITS,
)


def test_create_organization_doc_applies_package_defaults():
    org = OrganizationCreate(name="Acme", package="pro", domain_name="test", dc_admin_password="aa", realm_name="samdom.test.com")

    doc = create_organization_doc(org)

    # Note: org_id/_id is handled by MongoDB at insertion time, not by create_organization_doc
    assert doc["name"] == "Acme"
    assert doc["package"] == "pro"
    assert doc["workstation_limit"] == PACKAGE_LIMITS["pro"]["workstation_limit"]
    assert doc["user_limit"] == PACKAGE_LIMITS["pro"]["user_limit"]
    assert doc["provisioning_status"] == "pending"
    assert doc["provisioning_job_id"] is None


def test_create_organization_doc_respects_overrides():
    org = OrganizationCreate(
        name="Override",
        package="basic",
        workstation_limit=1,
        user_limit=2,
        domain_name="test",
        dc_admin_password="aa",
        realm_name="samdom.test.com"
    )

    doc = create_organization_doc(org)

    assert doc["workstation_limit"] == 1
    assert doc["user_limit"] == 2


def test_organization_validation_rejects_negative_limits():
    """Test that negative limits raise a ValidationError"""
    with pytest.raises(ValidationError):
        OrganizationCreate(name="Bad", workstation_limit=-1, domain_name="test", dc_admin_password="aa", realm_name="samdom.test.com")
