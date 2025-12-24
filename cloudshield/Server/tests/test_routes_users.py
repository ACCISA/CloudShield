import importlib

import sys

from flask import Flask


def make_client(monkeypatch, *, list_fn=None, create_fn=None, update_fn=None, deactivate_fn=None, delete_fn=None):
    """Build a fresh Flask client with patched route handlers."""
    monkeypatch.setenv("CLOUDSHIELD_DEV_TOKEN", "devtoken")
    monkeypatch.setenv("CLOUDSHIELD_DEV_ROLE", "admin")
    monkeypatch.setenv("CLOUDSHIELD_DEV_ORG", "org-1")

    if "cloudshield.Server.routes.users" in sys.modules:
        del sys.modules["cloudshield.Server.routes.users"]

    users_mod = importlib.import_module("cloudshield.Server.routes.users")

    # Patch service functions inside the module so the endpoints exercise branches deterministically.
    if list_fn:
        monkeypatch.setattr(users_mod, "list_users", list_fn)
    if create_fn:
        monkeypatch.setattr(users_mod, "create_user", create_fn)
    if update_fn:
        monkeypatch.setattr(users_mod, "update_user", update_fn)
    if deactivate_fn:
        monkeypatch.setattr(users_mod, "deactivate_user", deactivate_fn)
    if delete_fn:
        monkeypatch.setattr(users_mod, "delete_user", delete_fn)

    app = Flask(__name__)
    app.register_blueprint(users_mod.users_bp)
    return app.test_client()


def auth_headers():
    return {"Authorization": "Bearer devtoken"}


def test_list_users_success(monkeypatch):
    client = make_client(monkeypatch, list_fn=lambda current_user=None: [{"id": 1}])
    res = client.get("/users", headers=auth_headers())
    assert res.status_code == 200
    assert res.get_json()["items"] == [{"id": 1}]


def test_list_users_permission(monkeypatch):
    client = make_client(monkeypatch, list_fn=lambda current_user=None: (_ for _ in ()).throw(PermissionError("nope")))
    res = client.get("/users", headers=auth_headers())
    assert res.status_code == 403
    assert res.get_json()["error"] == "nope"


def test_list_users_generic_error(monkeypatch):
    client = make_client(monkeypatch, list_fn=lambda current_user=None: (_ for _ in ()).throw(RuntimeError("boom")))
    res = client.get("/users", headers=auth_headers())
    assert res.status_code == 500
    assert res.get_json()["error"] == "Internal server error"


def valid_create_payload():
    return {
        "email": "new@example.com",
        "password": "StrongPass123!",
        "role": "employee",
        "full_name": "New User",
        "org_id": "org-1",
    }


def test_create_user_success(monkeypatch):
    client = make_client(monkeypatch, create_fn=lambda *_, **__: "abc123")
    res = client.post("/users", headers=auth_headers(), json=valid_create_payload())
    assert res.status_code == 201
    assert res.get_json()["user_id"] == "abc123"


def test_create_user_validation_error(monkeypatch):
    client = make_client(monkeypatch)
    bad_payload = {"email": "x", "password": "short", "role": "employee", "full_name": "N", "org_id": ""}
    res = client.post("/users", headers=auth_headers(), json=bad_payload)
    assert res.status_code == 400
    body = res.get_json()
    assert body["error"] == "Validation failed"
    assert isinstance(body.get("details"), list)


def test_create_user_permission(monkeypatch):
    def raise_perm(*_, **__):
        raise PermissionError("forbidden")
    client = make_client(monkeypatch, create_fn=raise_perm)
    res = client.post("/users", headers=auth_headers(), json=valid_create_payload())
    assert res.status_code == 403
    assert res.get_json()["error"] == "forbidden"


def test_create_user_conflict(monkeypatch):
    def raise_conflict(*_, **__):
        raise ValueError("duplicate")
    client = make_client(monkeypatch, create_fn=raise_conflict)
    res = client.post("/users", headers=auth_headers(), json=valid_create_payload())
    assert res.status_code == 409
    assert res.get_json()["error"] == "duplicate"


def test_create_user_generic_error(monkeypatch):
    def raise_generic(*_, **__):
        raise RuntimeError("fail")
    client = make_client(monkeypatch, create_fn=raise_generic)
    res = client.post("/users", headers=auth_headers(), json=valid_create_payload())
    assert res.status_code == 500
    assert res.get_json()["error"] == "Internal server error"


def test_update_user_success(monkeypatch):
    client = make_client(monkeypatch, update_fn=lambda *_, **__: True)
    res = client.patch("/users/u1", headers=auth_headers(), json={"full_name": "Updated"})
    assert res.status_code == 200
    assert res.get_json()["message"] == "User updated"


def test_update_user_validation_error(monkeypatch):
    client = make_client(monkeypatch, update_fn=lambda *_, **__: True)
    res = client.patch("/users/u1", headers=auth_headers(), json={"email": "not-an-email"})
    assert res.status_code == 400
    assert res.get_json()["error"] == "Validation failed"


def test_update_user_permission(monkeypatch):
    client = make_client(monkeypatch, update_fn=lambda *_, **__: (_ for _ in ()).throw(PermissionError("nope")))
    res = client.patch("/users/u1", headers=auth_headers(), json={"full_name": "Updated"})
    assert res.status_code == 403
    assert res.get_json()["error"] == "nope"


def test_update_user_not_found(monkeypatch):
    client = make_client(monkeypatch, update_fn=lambda *_, **__: (_ for _ in ()).throw(ValueError("not found")))
    res = client.patch("/users/u1", headers=auth_headers(), json={"full_name": "Updated"})
    assert res.status_code == 404
    assert res.get_json()["error"] == "not found"


def test_update_user_generic_error(monkeypatch):
    client = make_client(monkeypatch, update_fn=lambda *_, **__: (_ for _ in ()).throw(RuntimeError("boom")))
    res = client.patch("/users/u1", headers=auth_headers(), json={"full_name": "Updated"})
    assert res.status_code == 500
    assert res.get_json()["error"] == "Internal server error"


def test_deactivate_success(monkeypatch):
    client = make_client(monkeypatch, deactivate_fn=lambda *_, **__: True)
    res = client.post("/users/u1/deactivate", headers=auth_headers())
    assert res.status_code == 200
    assert res.get_json()["message"] == "User deactivated"


def test_deactivate_permission(monkeypatch):
    client = make_client(monkeypatch, deactivate_fn=lambda *_, **__: (_ for _ in ()).throw(PermissionError("nope")))
    res = client.post("/users/u1/deactivate", headers=auth_headers())
    assert res.status_code == 403
    assert res.get_json()["error"] == "nope"


def test_deactivate_not_found(monkeypatch):
    client = make_client(monkeypatch, deactivate_fn=lambda *_, **__: (_ for _ in ()).throw(ValueError("missing")))
    res = client.post("/users/u1/deactivate", headers=auth_headers())
    assert res.status_code == 404
    assert res.get_json()["error"] == "missing"


def test_deactivate_generic_error(monkeypatch):
    client = make_client(monkeypatch, deactivate_fn=lambda *_, **__: (_ for _ in ()).throw(RuntimeError("boom")))
    res = client.post("/users/u1/deactivate", headers=auth_headers())
    assert res.status_code == 500
    assert res.get_json()["error"] == "Internal server error"


def test_delete_success(monkeypatch):
    client = make_client(monkeypatch, delete_fn=lambda *_, **__: True)
    res = client.delete("/users/u1", headers=auth_headers())
    assert res.status_code == 200
    assert res.get_json()["message"] == "User deleted"


def test_delete_permission(monkeypatch):
    client = make_client(monkeypatch, delete_fn=lambda *_, **__: (_ for _ in ()).throw(PermissionError("nope")))
    res = client.delete("/users/u1", headers=auth_headers())
    assert res.status_code == 403
    assert res.get_json()["error"] == "nope"


def test_delete_not_found(monkeypatch):
    client = make_client(monkeypatch, delete_fn=lambda *_, **__: (_ for _ in ()).throw(ValueError("missing")))
    res = client.delete("/users/u1", headers=auth_headers())
    assert res.status_code == 404
    assert res.get_json()["error"] == "missing"


def test_delete_generic_error(monkeypatch):
    client = make_client(monkeypatch, delete_fn=lambda *_, **__: (_ for _ in ()).throw(RuntimeError("boom")))
    res = client.delete("/users/u1", headers=auth_headers())
    assert res.status_code == 500
    assert res.get_json()["error"] == "Internal server error"
