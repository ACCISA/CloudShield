from types import SimpleNamespace
from unittest.mock import MagicMock

from flask import g


def _make_client(monkeypatch, user, collection):
    import cloudshield.Server.routes.workstations as ws_mod
    from cloudshield.Server.server import create_app

    monkeypatch.setattr(ws_mod, "db_admin", {"workstations": collection})

    app = create_app()

    @app.before_request
    def _inject_user():
        g.user = user

    app.testing = True
    return app.test_client()


def test_list_assigned_workstations_admin(monkeypatch):
    collection = MagicMock()
    collection.find.return_value = [
        {"_id": 123, "org_id": "org-1", "name": "WS-1"}
    ]
    client = _make_client(
        monkeypatch,
        {"id": "admin1", "role": "admin", "org_id": "org-1"},
        collection,
    )

    response = client.get("/api/workstations/assigned")

    assert response.status_code == 200
    collection.find.assert_called_once_with({"org_id": "org-1"})
    payload = response.get_json()
    assert payload["items"][0]["_id"] == "123"


def test_list_assigned_workstations_non_admin(monkeypatch):
    collection = MagicMock()
    collection.find.return_value = []
    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@example.com"},
        collection,
    )

    response = client.get("/api/workstations/assigned")

    assert response.status_code == 200
    args, _ = collection.find.call_args
    assert args[0]["org_id"] == "org-1"
    assert {"assigned_user_id": "user-1"} in args[0]["$or"]
    assert {"assigned_user": "user-1"} in args[0]["$or"]
    assert {"assigned_user": "user@example.com"} in args[0]["$or"]


def test_create_workstation_forbidden_for_non_admin(monkeypatch):
    collection = MagicMock()
    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1"},
        collection,
    )

    response = client.post("/api/workstations", json={"name": "WS"})

    assert response.status_code == 403
    collection.insert_one.assert_not_called()


def test_create_workstation_missing_org_id(monkeypatch):
    collection = MagicMock()
    client = _make_client(
        monkeypatch,
        {"id": "admin-1", "role": "admin", "org_id": ""},
        collection,
    )

    response = client.post("/api/workstations", json={})

    assert response.status_code == 400
    assert response.get_json()["error"] == "org_id is required"


def test_create_workstation_defaults(monkeypatch):
    collection = MagicMock()
    collection.insert_one.return_value = SimpleNamespace(inserted_id="abc123")
    client = _make_client(
        monkeypatch,
        {"id": "admin-1", "role": "admin", "org_id": "org-1"},
        collection,
    )

    response = client.post("/api/workstations", json={})

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["id"] == "abc123"
    args, _ = collection.insert_one.call_args
    doc = args[0]
    assert doc["org_id"] == "org-1"
    assert doc["name"] == "Workstation"
    assert doc["status"] == "offline"
    assert doc["assigned_user"] is None
    assert doc["assigned_user_id"] is None
