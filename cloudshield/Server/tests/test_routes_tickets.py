"""Tests for the /api/tickets/* routes."""
import sys
import types
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone
from bson import ObjectId
from flask import g

# Stub stripe so billing.py can be imported without the package installed
sys.modules.setdefault("stripe", types.ModuleType("stripe"))

FAKE_OID = ObjectId("65f1a2b3c4d5e6f7a8b9c0d1")
FAKE_OID_STR = str(FAKE_OID)

_NOW = datetime(2026, 3, 9, 10, 0, 0, tzinfo=timezone.utc)

FAKE_TICKET = {
    "_id": FAKE_OID,
    "title": "VPN not connecting",
    "description": "App stuck on connecting",
    "status": "Open",
    "priority": "Medium",
    "org_id": "org-1",
    "user_id": "user-1",
    "created_at": _NOW,
    "updated_at": _NOW,
    "ai_category": None,
    "ai_urgency": None,
}

FAKE_REPLY = {
    "_id": ObjectId("65f1a2b3c4d5e6f7a8b9c0d2"),
    "ticket_id": FAKE_OID,
    "user_id": "user@org.com",
    "message": "Still broken",
    "created_at": _NOW,
    "metadata": {"ai_generated": False},
}


def _make_client(monkeypatch, user, tickets_coll, replies_coll=None):
    import cloudshield.Server.routes.tickets as tickets_mod
    from cloudshield.Server.server import create_app

    if replies_coll is None:
        replies_coll = MagicMock()
        replies_coll.find.return_value = []

    monkeypatch.setattr(tickets_mod, "db_admin", {
        "tickets": tickets_coll,
        "ticket_replies": replies_coll,
    })
    # Prevent AI triage from actually running
    monkeypatch.setattr(tickets_mod, "trigger_ai_triage", lambda ticket_id: None)

    app = create_app()

    @app.before_request
    def _inject_user():
        g.user = user

    app.testing = True
    return app.test_client()


def test_create_ticket_success(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.insert_one.return_value = SimpleNamespace(inserted_id=FAKE_OID)
    tickets_coll.find_one.return_value = FAKE_TICKET

    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
    )

    response = client.post("/api/tickets", json={
        "title": "VPN not connecting",
        "description": "App stuck on connecting",
    })

    assert response.status_code == 201
    payload = response.get_json()
    assert payload["message"] == "Ticket created"
    assert "ticket" in payload
    tickets_coll.insert_one.assert_called_once()


def test_create_ticket_triggers_ai_triage(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.insert_one.return_value = SimpleNamespace(inserted_id=FAKE_OID)
    tickets_coll.find_one.return_value = FAKE_TICKET

    triggered = []

    import cloudshield.Server.routes.tickets as tickets_mod
    from cloudshield.Server.server import create_app

    monkeypatch.setattr(tickets_mod, "db_admin", {
        "tickets": tickets_coll,
        "ticket_replies": MagicMock(),
    })
    monkeypatch.setattr(tickets_mod, "trigger_ai_triage", lambda tid: triggered.append(tid))

    app = create_app()

    @app.before_request
    def _inject():
        g.user = {"id": "u1", "role": "employee", "org_id": "org-1", "email": "u@org.com"}

    app.testing = True
    client = app.test_client()

    client.post("/api/tickets", json={"title": "Test", "description": "Desc"})
    assert len(triggered) == 1
    assert triggered[0] == FAKE_OID_STR


def test_create_ticket_missing_org_id(monkeypatch):
    tickets_coll = MagicMock()
    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "", "email": "user@org.com"},
        tickets_coll,
    )

    response = client.post("/api/tickets", json={"title": "Test", "description": "Desc"})
    assert response.status_code == 500
    tickets_coll.insert_one.assert_not_called()


def test_create_ticket_validation_error(monkeypatch):
    tickets_coll = MagicMock()
    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
    )

    # Missing required fields
    response = client.post("/api/tickets", json={})
    assert response.status_code == 400
    payload = response.get_json()
    assert "error" in payload


def test_get_tickets_admin_sees_org_tickets(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find.return_value = MagicMock()
    tickets_coll.find.return_value.sort.return_value = [FAKE_TICKET]

    client = _make_client(
        monkeypatch,
        {"id": "admin-1", "role": "admin", "org_id": "org-1", "email": "admin@org.com"},
        tickets_coll,
    )

    response = client.get("/api/tickets")
    assert response.status_code == 200
    payload = response.get_json()
    assert "tickets" in payload
    call_args = tickets_coll.find.call_args[0][0]
    assert call_args["org_id"] == "org-1"


def test_get_tickets_employee_sees_own_tickets(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find.return_value = MagicMock()
    tickets_coll.find.return_value.sort.return_value = [FAKE_TICKET]

    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
    )

    response = client.get("/api/tickets")
    assert response.status_code == 200
    call_args = tickets_coll.find.call_args[0][0]
    assert call_args["org_id"] == "org-1"
    assert call_args["user_id"] == "user-1"


def test_get_tickets_super_admin_sees_all(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find.return_value = MagicMock()
    tickets_coll.find.return_value.sort.return_value = [FAKE_TICKET]

    client = _make_client(
        monkeypatch,
        {"id": "support", "role": "admin", "org_id": "support-org", "email": "support@cloudshield.com"},
        tickets_coll,
    )

    response = client.get("/api/tickets")
    assert response.status_code == 200
    # Super admin query should have no filter (empty dict)
    call_args = tickets_coll.find.call_args[0][0]
    assert call_args == {}


def test_get_ticket_detail_success(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET

    replies_coll = MagicMock()
    replies_coll.find.return_value = MagicMock()
    replies_coll.find.return_value.sort.return_value = [FAKE_REPLY]

    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
        replies_coll,
    )

    response = client.get(f"/api/tickets/{FAKE_OID_STR}")
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["title"] == "VPN not connecting"
    assert "replies" in payload


def test_get_ticket_detail_not_found(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = None

    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
    )

    response = client.get(f"/api/tickets/{FAKE_OID_STR}")
    assert response.status_code == 404
    assert response.get_json()["error"] == "Ticket not found"


def test_get_ticket_detail_super_admin_bypass(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET

    replies_coll = MagicMock()
    replies_coll.find.return_value = MagicMock()
    replies_coll.find.return_value.sort.return_value = []

    client = _make_client(
        monkeypatch,
        {"id": "support", "role": "admin", "org_id": "support-org", "email": "support@cloudshield.com"},
        tickets_coll,
        replies_coll,
    )

    response = client.get(f"/api/tickets/{FAKE_OID_STR}")
    assert response.status_code == 200
    # Super admin query should not include org_id filter
    call_args = tickets_coll.find_one.call_args[0][0]
    assert "org_id" not in call_args


def test_add_reply_success(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET

    replies_coll = MagicMock()

    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
        replies_coll,
    )

    response = client.post(f"/api/tickets/{FAKE_OID_STR}/reply", json={"message": "Still broken"})
    assert response.status_code == 201
    assert response.get_json()["message"] == "Reply added successfully"
    replies_coll.insert_one.assert_called_once()


def test_add_reply_ticket_not_found(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = None

    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
    )

    response = client.post(f"/api/tickets/{FAKE_OID_STR}/reply", json={"message": "Hello"})
    assert response.status_code == 404


def test_add_reply_triggers_ai(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET
    replies_coll = MagicMock()

    triggered = []

    import cloudshield.Server.routes.tickets as tickets_mod
    from cloudshield.Server.server import create_app

    monkeypatch.setattr(tickets_mod, "db_admin", {
        "tickets": tickets_coll,
        "ticket_replies": replies_coll,
    })
    monkeypatch.setattr(tickets_mod, "trigger_ai_triage", lambda tid: triggered.append(tid))

    app = create_app()

    @app.before_request
    def _inject():
        g.user = {"id": "u1", "role": "employee", "org_id": "org-1", "email": "user@org.com"}

    app.testing = True
    client = app.test_client()

    client.post(f"/api/tickets/{FAKE_OID_STR}/reply", json={"message": "Help me"})
    assert len(triggered) == 1


def test_add_reply_support_does_not_trigger_ai(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET
    replies_coll = MagicMock()

    triggered = []

    import cloudshield.Server.routes.tickets as tickets_mod
    from cloudshield.Server.server import create_app

    monkeypatch.setattr(tickets_mod, "db_admin", {
        "tickets": tickets_coll,
        "ticket_replies": replies_coll,
    })
    monkeypatch.setattr(tickets_mod, "trigger_ai_triage", lambda tid: triggered.append(tid))

    app = create_app()

    @app.before_request
    def _inject():
        g.user = {"id": "support", "role": "admin", "org_id": "support-org", "email": "support@cloudshield.com"}

    app.testing = True
    client = app.test_client()

    client.post(f"/api/tickets/{FAKE_OID_STR}/reply", json={"message": "Here is the fix"})
    assert len(triggered) == 0


def test_add_reply_system_escalation_does_not_trigger_ai(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET
    replies_coll = MagicMock()

    triggered = []

    import cloudshield.Server.routes.tickets as tickets_mod
    from cloudshield.Server.server import create_app

    monkeypatch.setattr(tickets_mod, "db_admin", {
        "tickets": tickets_coll,
        "ticket_replies": replies_coll,
    })
    monkeypatch.setattr(tickets_mod, "trigger_ai_triage", lambda tid: triggered.append(tid))

    app = create_app()

    @app.before_request
    def _inject():
        g.user = {"id": "u1", "role": "employee", "org_id": "org-1", "email": "user@org.com"}

    app.testing = True
    client = app.test_client()

    client.post(f"/api/tickets/{FAKE_OID_STR}/reply", json={"message": "[SYSTEM] Escalated to human agent"})
    assert len(triggered) == 0

def test_update_status_success(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET

    client = _make_client(
        monkeypatch,
        {"id": "admin-1", "role": "admin", "org_id": "org-1", "email": "admin@org.com"},
        tickets_coll,
    )

    response = client.patch(f"/api/tickets/{FAKE_OID_STR}/status", json={"status": "Closed"})
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["message"] == "Ticket updated"
    tickets_coll.update_one.assert_called_once()


def test_update_status_not_found(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = None

    client = _make_client(
        monkeypatch,
        {"id": "admin-1", "role": "admin", "org_id": "org-1", "email": "admin@org.com"},
        tickets_coll,
    )

    response = client.patch(f"/api/tickets/{FAKE_OID_STR}/status", json={"status": "Closed"})
    assert response.status_code == 404
    assert response.get_json()["error"] == "Ticket not found"


def test_update_priority(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET

    client = _make_client(
        monkeypatch,
        {"id": "admin-1", "role": "admin", "org_id": "org-1", "email": "admin@org.com"},
        tickets_coll,
    )

    response = client.patch(f"/api/tickets/{FAKE_OID_STR}/status", json={"priority": "High"})
    assert response.status_code == 200
    update_args = tickets_coll.update_one.call_args[0][1]["$set"]
    assert update_args["priority"] == "High"


def test_update_status_super_admin_bypass(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.return_value = FAKE_TICKET

    client = _make_client(
        monkeypatch,
        {"id": "support", "role": "admin", "org_id": "support-org", "email": "support@cloudshield.com"},
        tickets_coll,
    )

    response = client.patch(f"/api/tickets/{FAKE_OID_STR}/status", json={"status": "Closed"})
    assert response.status_code == 200
    # Super admin find_one should not filter by org_id
    call_args = tickets_coll.find_one.call_args_list[0][0][0]
    assert "org_id" not in call_args



def test_get_tickets_db_exception(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find.side_effect = Exception("DB connection lost")

    client = _make_client(
        monkeypatch,
        {"id": "admin-1", "role": "admin", "org_id": "org-1", "email": "admin@org.com"},
        tickets_coll,
    )

    response = client.get("/api/tickets")
    assert response.status_code == 500
    assert "Internal server error" in response.get_json()["error"]


def test_get_ticket_detail_db_exception(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.side_effect = Exception("DB timeout")

    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
    )

    response = client.get(f"/api/tickets/{FAKE_OID_STR}")
    assert response.status_code == 500
    assert "Internal server error" in response.get_json()["error"]


def test_add_reply_db_exception(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.side_effect = Exception("Write failed")

    client = _make_client(
        monkeypatch,
        {"id": "user-1", "role": "employee", "org_id": "org-1", "email": "user@org.com"},
        tickets_coll,
    )

    response = client.post(f"/api/tickets/{FAKE_OID_STR}/reply", json={"message": "Hello"})
    assert response.status_code == 500
    assert "Internal server error" in response.get_json()["error"]


def test_update_status_db_exception(monkeypatch):
    tickets_coll = MagicMock()
    tickets_coll.find_one.side_effect = Exception("Timeout")

    client = _make_client(
        monkeypatch,
        {"id": "admin-1", "role": "admin", "org_id": "org-1", "email": "admin@org.com"},
        tickets_coll,
    )

    response = client.patch(f"/api/tickets/{FAKE_OID_STR}/status", json={"status": "Closed"})
    assert response.status_code == 500
    assert "Internal server error" in response.get_json()["error"]