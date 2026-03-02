import types
import unittest.mock

import pytest
from flask import Flask, g

from cloudshield.Server.security import guards


@pytest.fixture()
def app():
    return Flask(__name__)


def _call(handler, app, path="/resource", method="GET", headers=None):
    headers = headers or {}
    with app.test_request_context(path, method=method, headers=headers):
        return handler()


def test_require_auth_skips_when_user_present(app):
    called = types.SimpleNamespace(value=False)

    @guards.require_auth
    def handler():
        called.value = True
        return "ok"

    with app.test_request_context("/resource"):
        g.user = {"id": "existing"}
        assert handler() == "ok"
        assert called.value is True


def test_require_auth_missing_bearer_returns_401(app, monkeypatch):
    log = unittest.mock.MagicMock()
    monkeypatch.setattr(guards, "log_denied", log)

    @guards.require_auth
    def handler():
        return "never"

    response, status = _call(handler, app)
    assert status == 401
    assert response.get_json()["error"] == "Unauthorized"
    log.assert_called_once()


def test_require_auth_invalid_token_returns_401(app, monkeypatch):
    log = unittest.mock.MagicMock()
    verify = unittest.mock.MagicMock(side_effect=ValueError("bad"))
    monkeypatch.setattr(guards, "log_denied", log)
    monkeypatch.setattr(guards, "verify_token", verify)

    @guards.require_auth
    def handler():
        return "never"

    headers = {"Authorization": "Bearer token"}
    response, status = _call(handler, app, headers=headers)
    assert status == 401
    assert response.get_json()["error"] == "Unauthorized"
    log.assert_called_once()


def test_require_auth_dev_bypass_sets_user(app, monkeypatch):
    verify = unittest.mock.MagicMock(side_effect=AssertionError("should not verify"))
    monkeypatch.setattr(guards, "verify_token", verify)
    monkeypatch.setattr(guards, "DEV_BYPASS_TOKEN", "devtoken")
    monkeypatch.setattr(guards, "DEV_BYPASS_USER", {"id": "dev", "role": "admin", "org_id": "dev-org"})
    monkeypatch.setattr(guards, "DEV_BYPASS_EMAIL", "dev@example.com")

    @guards.require_auth
    def handler():
        return g.user

    result = _call(handler, app, headers={"Authorization": "Bearer devtoken"})
    assert result["id"] == "dev"
    assert result["email"] == "dev@example.com"
    verify.assert_not_called()


def test_require_auth_success_sets_user(app, monkeypatch):
    verify = unittest.mock.MagicMock(return_value={
        "sub": "user1",
        "role": "employee",
        "org_id": "org99",
        "email": "user1@example.com",
        "full_name": "User One",
    })
    monkeypatch.setattr(guards, "verify_token", verify)

    @guards.require_auth
    def handler():
        return g.user

    result = _call(handler, app, headers={"Authorization": "Bearer goodtoken"})
    assert result == {
        "id": "user1",
        "role": "employee",
        "org_id": "org99",
        "email": "user1@example.com",
        "full_name": "User One",
    }


def test_require_role_denies_without_role(app, monkeypatch):
    log = unittest.mock.MagicMock()
    monkeypatch.setattr(guards, "log_denied", log)

    @guards.require_role("admin")
    def handler():
        return "never"

    with app.test_request_context("/admin"):
        g.user = {"role": "employee", "org_id": "o1"}
        response, status = handler()

    assert status == 403
    assert response.get_json()["error"] == "Forbidden"
    log.assert_called_once()


def test_require_role_allows_authorized_role(app):
    @guards.require_role("admin")
    def handler():
        return "ok"

    with app.test_request_context("/admin"):
        g.user = {"role": "admin"}
        assert handler() == "ok"


def test_enforce_same_org_blocks_cross_org(app, monkeypatch):
    log = unittest.mock.MagicMock()
    monkeypatch.setattr(guards, "log_denied", log)

    @guards.enforce_same_org("org_id")
    def handler(org_id):
        return "never"

    with app.test_request_context("/org/123"):
        g.user = {"role": "employee", "org_id": "org-1"}
        response, status = handler(org_id="org-2")

    assert status == 403
    assert response.get_json()["error"] == "Forbidden (org)"
    log.assert_called_once()


def test_enforce_same_org_allows_matching_org(app):
    @guards.enforce_same_org("org_id")
    def handler(org_id):
        return "ok"

    with app.test_request_context("/org/123"):
        g.user = {"role": "employee", "org_id": "org-1"}
        assert handler(org_id="org-1") == "ok"


def test_enforce_same_org_allows_admin(app):
    @guards.enforce_same_org("org_id")
    def handler(org_id):
        return "ok"

    with app.test_request_context("/org/123"):
        g.user = {"role": "admin", "org_id": "org-1"}
        assert handler(org_id="anything") == "ok"


def test_enforce_same_org_uses_body_when_param_missing(app, monkeypatch):
    log = unittest.mock.MagicMock()
    monkeypatch.setattr(guards, "log_denied", log)

    @guards.enforce_same_org()
    def handler():
        return "never"

    with app.test_request_context("/org", json={"org_id": "wrong"}):
        g.user = {"role": "employee", "org_id": "right"}
        response, status = handler()

    assert status == 403
    assert response.get_json()["error"] == "Forbidden (org)"
    log.assert_called_once()


def test_enforce_same_org_with_body_ok(app):
    @guards.enforce_same_org()
    def handler():
        return "ok"

    with app.test_request_context("/org", json={"org_id": "right"}):
        g.user = {"role": "employee", "org_id": "right"}
        assert handler() == "ok"