import sys
import types
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from flask import Flask

fake_database = types.ModuleType("cloudshield.Server.utils.database")
fake_database.activity = MagicMock()
sys.modules.setdefault("cloudshield.Server.utils.database", fake_database)

import cloudshield.Server.routes.activity as activity_routes


@pytest.fixture
def client(monkeypatch):
    mock_activity = MagicMock()
    monkeypatch.setattr(activity_routes, "activity", mock_activity)

    app = Flask(__name__)
    app.register_blueprint(activity_routes.activity_bp, url_prefix="/api")
    app.testing = True

    with app.test_client() as test_client:
        yield test_client, mock_activity


def _build_cursor(docs):
  cursor = MagicMock()
  cursor.sort.return_value = cursor
  cursor.skip.return_value = cursor
  cursor.limit.return_value = docs
  return cursor


def test_activity_doc_to_payload_formats_fields():
  now = datetime(2026, 2, 10, 10, 30, tzinfo=timezone.utc)
  doc = {
    "_id": "507f1f77bcf86cd799439011",
    "org_id": "org-123",
    "event_type": "share.created",
    "description": "Created new share",
    "actor": "alice@example.com",
    "created_at": now,
  }

  payload = activity_routes._activity_doc_to_payload(doc)

  assert payload["id"] == "507f1f77bcf86cd799439011"
  assert payload["org_id"] == "org-123"
  assert payload["event_type"] == "share.created"
  assert payload["description"] == "Created new share"
  assert payload["actor"] == "alice@example.com"
  assert payload["created_at"] == now.isoformat()


def test_get_recent_activity_paginates_and_sorts(client):
  test_client, mock_activity = client
  docs = [
    {
      "_id": "a1",
      "org_id": "org-123",
      "event_type": "user.created",
      "description": "Created user",
      "actor": "admin@example.com",
      "created_at": datetime(2026, 2, 10, 8, 0, tzinfo=timezone.utc),
    }
  ]
  cursor = _build_cursor(docs)
  mock_activity.count_documents.return_value = 17
  mock_activity.find.return_value = cursor

  response = test_client.get("/api/activity/org-123?page=2&limit=5")

  assert response.status_code == 200
  payload = response.get_json()
  assert payload["total"] == 17
  assert payload["page"] == 2
  assert payload["limit"] == 5
  assert len(payload["items"]) == 1
  assert payload["items"][0]["id"] == "a1"

  mock_activity.count_documents.assert_called_once_with({"org_id": "org-123"})
  mock_activity.find.assert_called_once_with({"org_id": "org-123"})
  cursor.sort.assert_called_once_with("created_at", -1)
  cursor.skip.assert_called_once_with(5)
  cursor.limit.assert_called_once_with(5)


def test_get_recent_activity_sanitizes_invalid_query_params(client):
  test_client, mock_activity = client
  cursor = _build_cursor([])
  mock_activity.count_documents.return_value = 0
  mock_activity.find.return_value = cursor

  response = test_client.get("/api/activity/org-123?page=not-a-number&limit=-4")

  assert response.status_code == 200
  payload = response.get_json()
  assert payload["page"] == 1
  assert payload["limit"] == 20
  cursor.skip.assert_called_once_with(0)
  cursor.limit.assert_called_once_with(20)


def test_get_recent_activity_caps_limit_to_100(client):
  test_client, mock_activity = client
  cursor = _build_cursor([])
  mock_activity.count_documents.return_value = 0
  mock_activity.find.return_value = cursor

  response = test_client.get("/api/activity/org-123?page=1&limit=500")

  assert response.status_code == 200
  payload = response.get_json()
  assert payload["limit"] == 100
  cursor.limit.assert_called_once_with(100)


def test_get_recent_activity_requires_org_id():
  app = Flask(__name__)
  with app.test_request_context("/api/activity/?page=1&limit=20"):
    response, status = activity_routes.get_recent_activity("")

  assert status == 422
  assert response.get_json()["error"] == activity_routes.ERROR_ORG_ID_REQUIRED
