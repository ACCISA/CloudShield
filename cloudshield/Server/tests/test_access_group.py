# test_access_group.py
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import pytest
from bson import ObjectId


# -----------------------------
# Robust imports (repo-layout agnostic)
# -----------------------------
try:
    # Most likely in your repo
    from cloudshield.Server.routes.access_groups import access_groups_bp
    import cloudshield.Server.routes.access_groups as access_groups_routes
    from cloudshield.Server.models.access_groups import (
        AccessGroupCreate,
        AccessGroupAddMembers,
        create_access_group_doc,
        access_group_to_json,
    )
except Exception:  # pragma: no cover
    from routes.access_groups import access_groups_bp
    import routes.access_groups as access_groups_routes
    from models.access_groups import (
        AccessGroupCreate,
        AccessGroupAddMembers,
        create_access_group_doc,
        access_group_to_json,
    )


# -----------------------------
# In-memory fake Mongo collection
# -----------------------------
class _InsertOneResult:
    def __init__(self, inserted_id: ObjectId):
        self.inserted_id = inserted_id


class _UpdateOneResult:
    def __init__(self, matched_count: int):
        self.matched_count = matched_count


class FakeAccessGroupsCollection:
    """
    Minimal Mongo-like collection for:
      - find_one
      - insert_one
      - update_one with $addToSet/$each and $set
    """
    def __init__(self):
        self._docs: List[Dict[str, Any]] = []

    def find_one(self, query: Dict[str, Any], projection: Optional[Dict[str, int]] = None) -> Optional[Dict[str, Any]]:
        def _match(doc: Dict[str, Any]) -> bool:
            for k, v in query.items():
                if k not in doc:
                    return False
                if doc[k] != v:
                    return False
            return True

        for doc in self._docs:
            if _match(doc):
                if not projection:
                    return dict(doc)

                # Very small projection support: include only keys with value 1.
                # If projection is {"_id": 1}, return {"_id": doc["_id"]}.
                out: Dict[str, Any] = {}
                for key, include in projection.items():
                    if include and key in doc:
                        out[key] = doc[key]
                return out
        return None

    def insert_one(self, doc: Dict[str, Any]) -> _InsertOneResult:
        new_doc = dict(doc)
        new_doc["_id"] = ObjectId()
        self._docs.append(new_doc)
        return _InsertOneResult(new_doc["_id"])

    def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> _UpdateOneResult:
        doc = self.find_one(query)
        if not doc:
            return _UpdateOneResult(matched_count=0)

        # Apply updates to stored doc
        stored = None
        for d in self._docs:
            if all(d.get(k) == v for k, v in query.items()):
                stored = d
                break
        if stored is None:
            return _UpdateOneResult(matched_count=0)

        # $addToSet with $each
        add_to_set = update.get("$addToSet") or {}
        if "members" in add_to_set:
            members_spec = add_to_set["members"]
            each = members_spec.get("$each", [])
            if "members" not in stored or stored["members"] is None:
                stored["members"] = []
            # ensure list
            if not isinstance(stored["members"], list):
                stored["members"] = list(stored["members"])
            existing = set(stored["members"])
            for oid in each:
                if oid not in existing:
                    stored["members"].append(oid)
                    existing.add(oid)

        # $set
        to_set = update.get("$set") or {}
        for k, v in to_set.items():
            stored[k] = v

        return _UpdateOneResult(matched_count=1)


# -----------------------------
# Flask app fixture
# -----------------------------
@pytest.fixture()
def app(monkeypatch):
    from flask import Flask

    fake_coll = FakeAccessGroupsCollection()

    # Patch the imported module-level collection handle used by routes.
    monkeypatch.setattr(access_groups_routes, "access_groups", fake_coll, raising=True)

    app = Flask(__name__)
    app.register_blueprint(access_groups_bp, url_prefix="/api")
    app.testing = True

    # Expose fake collection to tests
    app.fake_access_groups = fake_coll  # type: ignore[attr-defined]
    return app


@pytest.fixture()
def client(app):
    return app.test_client()


# -----------------------------
# Model/helper unit tests
# -----------------------------
def test_model_normalizes_group_name_and_members_unique():
    oid1 = str(ObjectId())
    oid2 = str(ObjectId())
    data = AccessGroupCreate(
        group_name="  Marketing  ",
        description="x",
        members=[oid1, oid1, f"  {oid2}  "],
    )
    assert data.group_name == "marketing"
    assert data.members == [oid1, oid2]


def test_create_access_group_doc_converts_members_to_objectids():
    oid1 = str(ObjectId())
    oid2 = str(ObjectId())
    m = AccessGroupCreate(group_name="marketing", description="desc", members=[oid1, oid2])
    doc = create_access_group_doc(m)

    assert doc["name"] == "marketing"
    assert doc["description"] == "desc"
    assert isinstance(doc["created_at"], datetime)
    assert isinstance(doc["updated_at"], datetime)
    assert all(isinstance(x, ObjectId) for x in doc["members"])
    assert [str(x) for x in doc["members"]] == [oid1, oid2]


def test_access_group_to_json_converts_objectids_to_strings():
    _id = ObjectId()
    members = [ObjectId(), ObjectId()]
    now = datetime.now(timezone.utc)
    doc = {"_id": _id, "name": "marketing", "description": "d", "members": members, "created_at": now, "updated_at": now}

    out = access_group_to_json(doc)
    assert out["id"] == str(_id)
    assert out["group_name"] == "marketing"
    assert out["members"] == [str(m) for m in members]
    assert out["created_at"] is not None
    assert out["updated_at"] is not None


# -----------------------------
# API route tests
# -----------------------------
def test_create_access_group_success(client, app):
    u1 = str(ObjectId())
    u2 = str(ObjectId())

    resp = client.post(
        "/api/access-groups",
        json={
            "group_name": "marketing",
            "description": "access group for members of the marketing team",
            "members": [u1, u2],
        },
    )
    assert resp.status_code == 201
    payload = resp.get_json()
    assert "access_group" in payload
    ag = payload["access_group"]
    assert ag["group_name"] == "marketing"
    assert ag["description"] == "access group for members of the marketing team"
    assert ag["members"] == [u1, u2]

    # Verify stored doc uses ObjectIds
    stored = app.fake_access_groups.find_one({"name": "marketing"})  # type: ignore[attr-defined]
    assert stored is not None
    assert all(isinstance(x, ObjectId) for x in stored["members"])


def test_create_access_group_duplicate_returns_409(client):
    u1 = str(ObjectId())

    # first create
    r1 = client.post("/api/access-groups", json={"group_name": "marketing", "description": "d", "members": [u1]})
    assert r1.status_code == 201

    # duplicate create
    r2 = client.post("/api/access-groups", json={"group_name": "marketing", "description": "d2", "members": []})
    assert r2.status_code == 409
    assert r2.get_json()["error"] == "access group already exists"


def test_create_access_group_validation_error_invalid_member_objectid(client):
    resp = client.post(
        "/api/access-groups",
        json={"group_name": "marketing", "description": "d", "members": ["not-an-objectid"]},
    )
    assert resp.status_code == 400
    payload = resp.get_json()
    assert payload["error"] == "Validation failed"
    assert isinstance(payload.get("details"), list)


def test_add_members_success(client, app):
    # Create group first (with one member)
    existing_member = str(ObjectId())
    new_member1 = str(ObjectId())
    new_member2 = str(ObjectId())

    r1 = client.post(
        "/api/access-groups",
        json={"group_name": "marketing", "description": "d", "members": [existing_member]},
    )
    assert r1.status_code == 201

    before = app.fake_access_groups.find_one({"name": "marketing"})  # type: ignore[attr-defined]
    assert before is not None
    before_updated_at = before["updated_at"]

    # Add members
    r2 = client.post(
        "/api/access-groups/add-members",
        json={"group_name": "marketing", "members": [new_member1, new_member2, new_member1]},
    )
    assert r2.status_code == 200
    payload = r2.get_json()
    ag = payload["access_group"]

    # response members should contain all unique string ids
    assert existing_member in ag["members"]
    assert new_member1 in ag["members"]
    assert new_member2 in ag["members"]
    assert len(ag["members"]) == 3

    # stored doc members are ObjectIds and unique
    stored = app.fake_access_groups.find_one({"name": "marketing"})  # type: ignore[attr-defined]
    assert stored is not None
    assert sorted([str(x) for x in stored["members"]]) == sorted([existing_member, new_member1, new_member2])

    # updated_at should change
    assert stored["updated_at"] >= before_updated_at


def test_add_members_group_not_found_404(client):
    u1 = str(ObjectId())
    resp = client.post("/api/access-groups/add-members", json={"group_name": "does-not-exist", "members": [u1]})
    assert resp.status_code == 404
    assert resp.get_json()["error"] == "access group not found"


def test_add_members_validation_error_invalid_objectid(client):
    resp = client.post(
        "/api/access-groups/add-members",
        json={"group_name": "marketing", "members": ["bad"]},
    )
    assert resp.status_code == 400
    payload = resp.get_json()
    assert payload["error"] == "Validation failed"
    assert isinstance(payload.get("details"), list)
