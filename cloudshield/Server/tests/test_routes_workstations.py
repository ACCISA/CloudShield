from types import SimpleNamespace
from unittest.mock import MagicMock

from bson import ObjectId
from flask import g


def _make_client(monkeypatch, user, collection, access_groups_collection=None):
    import cloudshield.Server.routes.workstations as ws_mod
    from cloudshield.Server.server import create_app

    db_mock = {"workstations": collection}
    if access_groups_collection is not None:
        db_mock["access_groups"] = access_groups_collection

    monkeypatch.setattr(ws_mod, "db_admin", db_mock)

    app = create_app()

    @app.before_request
    def _inject_user():
        g.user = user

    app.testing = True
    return app.test_client()


class TestGetAssignedWorkstations:
    """Tests for GET /workstations/assigned (lines 26-50)."""

    def test_admin_gets_all_org_workstations(self, monkeypatch):
        ws_id = ObjectId()
        coll = MagicMock()
        coll.find.return_value = [{"_id": ws_id, "name": "ws1"}]
        user = {"id": "u1", "role": "admin", "org_id": "org-1", "email": "a@b.com"}
        client = _make_client(monkeypatch, user, coll)

        resp = client.get("/api/workstations/assigned")
        assert resp.status_code == 200
        query_used = coll.find.call_args[0][0]
        assert "$or" not in query_used
        assert query_used["org_id"] == "org-1"

    def test_non_admin_query_uses_or_filter(self, monkeypatch):
        coll = MagicMock()
        coll.find.return_value = []
        user = {"id": "u2", "role": "member", "org_id": "org-2", "email": "x@y.com"}
        client = _make_client(monkeypatch, user, coll)

        resp = client.get("/api/workstations/assigned")
        assert resp.status_code == 200
        query_used = coll.find.call_args[0][0]
        assert "$or" in query_used

    def test_response_converts_objectid_to_string(self, monkeypatch):
        ws_id = ObjectId()
        coll = MagicMock()
        coll.find.return_value = [{"_id": ws_id, "name": "ws"}]
        user = {"id": "u1", "role": "admin", "org_id": "org-1", "email": ""}
        client = _make_client(monkeypatch, user, coll)

        items = client.get("/api/workstations/assigned").get_json()["items"]
        assert items[0]["_id"] == str(ws_id)


class TestCreateWorkstation:
    """Tests for POST /workstations — admin create (lines 73-112)."""

    def test_non_admin_is_forbidden(self, monkeypatch):
        coll = MagicMock()
        user = {"id": "u1", "role": "member", "org_id": "org-1"}
        client = _make_client(monkeypatch, user, coll)
        assert client.post("/api/workstations", json={"name": "ws"}).status_code == 403

    def test_admin_missing_org_id_returns_400(self, monkeypatch):
        coll = MagicMock()
        user = {"id": "u1", "role": "admin", "org_id": ""}
        client = _make_client(monkeypatch, user, coll)
        assert client.post("/api/workstations", json={"name": "ws"}).status_code == 400

    def test_admin_creates_workstation_returns_201(self, monkeypatch):
        inserted_id = ObjectId()
        coll = MagicMock()
        coll.insert_one.return_value = SimpleNamespace(inserted_id=inserted_id)
        user = {"id": "u1", "role": "admin", "org_id": "org-1"}
        client = _make_client(monkeypatch, user, coll)

        resp = client.post("/api/workstations", json={"name": "My WS"})
        assert resp.status_code == 201
        assert resp.get_json()["id"] == str(inserted_id)

    def test_create_workstation_default_name(self, monkeypatch):
        inserted_id = ObjectId()
        coll = MagicMock()
        coll.insert_one.return_value = SimpleNamespace(inserted_id=inserted_id)
        user = {"id": "u1", "role": "admin", "org_id": "org-1"}
        client = _make_client(monkeypatch, user, coll)

        client.post("/api/workstations", json={})
        assert coll.insert_one.call_args[0][0]["name"] == "Workstation"

    def test_create_workstation_with_groups_updates_access_groups(self, monkeypatch):
        inserted_id = ObjectId()
        ws_coll = MagicMock()
        ws_coll.insert_one.return_value = SimpleNamespace(inserted_id=inserted_id)
        ag_coll = MagicMock()
        user = {"id": "u1", "role": "admin", "org_id": "org-1"}
        client = _make_client(monkeypatch, user, ws_coll, access_groups_collection=ag_coll)

        resp = client.post("/api/workstations", json={"groups": [str(ObjectId())]})
        assert resp.status_code == 201
        ag_coll.update_many.assert_called_once()

    def test_create_workstation_empty_groups_skips_update(self, monkeypatch):
        inserted_id = ObjectId()
        ws_coll = MagicMock()
        ws_coll.insert_one.return_value = SimpleNamespace(inserted_id=inserted_id)
        ag_coll = MagicMock()
        user = {"id": "u1", "role": "admin", "org_id": "org-1"}
        client = _make_client(monkeypatch, user, ws_coll, access_groups_collection=ag_coll)

        resp = client.post("/api/workstations", json={"groups": []})
        assert resp.status_code == 201
        ag_coll.update_many.assert_not_called()
