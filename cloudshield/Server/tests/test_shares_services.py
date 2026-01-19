import sys
import unittest.mock
from datetime import datetime, timezone
import os

import pytest


mock_pymongo = unittest.mock.MagicMock()
mock_pymongo_errors = unittest.mock.MagicMock()
mock_pymongo_errors.PyMongoError = Exception


@pytest.fixture(autouse=True, scope="module")
def setup_module_mocks():
    server_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if server_root not in sys.path:
        sys.path.insert(0, server_root)

    original_pymongo = sys.modules.get("pymongo")
    original_pymongo_errors = sys.modules.get("pymongo.errors")
    sys.modules["pymongo"] = mock_pymongo
    sys.modules["pymongo.errors"] = mock_pymongo_errors
    yield
    for name, original in [
        ("pymongo", original_pymongo),
        ("pymongo.errors", original_pymongo_errors),
    ]:
        if original is None:
            sys.modules.pop(name, None)
        else:
            sys.modules[name] = original


class FakeInsertResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class FakeCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, key, direction):
        self._docs.sort(key=lambda d: d.get(key))
        return self

    def __iter__(self):
        return iter(self._docs)


class FakeCollection:
    def __init__(self, docs=None):
        self._docs = list(docs or [])
        self._next_id = 1

    def _match(self, doc, flt):
        for key, value in flt.items():
            if doc.get(key) != value:
                return False
        return True

    def find(self, flt, projection=None):
        matched = [doc for doc in self._docs if self._match(doc, flt)]
        if projection:
            keys = {k for k, v in projection.items() if v}
            trimmed = []
            for doc in matched:
                trimmed.append({k: doc.get(k) for k in keys})
            matched = trimmed
        return FakeCursor(matched)

    def insert_one(self, doc):
        new_doc = dict(doc)
        new_doc["_id"] = new_doc.get("_id") or str(self._next_id)
        self._next_id += 1
        self._docs.append(new_doc)
        return FakeInsertResult(new_doc["_id"])

    def find_one_and_delete(self, flt):
        for idx, doc in enumerate(self._docs):
            if self._match(doc, flt):
                return self._docs.pop(idx)
        return None


def test_allocate_drive_letter_picks_z(monkeypatch):
    import cloudshield.Server.services.shares_services as shares_services

    fake = FakeCollection([])
    monkeypatch.setattr(shares_services, "shares", fake)

    assert shares_services.allocate_drive_letter("org1") == "Z"


def test_allocate_drive_letter_skips_used(monkeypatch):
    import cloudshield.Server.services.shares_services as shares_services

    fake = FakeCollection([
        {"org_id": "org1", "drive": "Z"},
        {"org_id": "org1", "drive": "Y"},
        {"org_id": "org1", "drive": "C"},
    ])
    monkeypatch.setattr(shares_services, "shares", fake)

    assert shares_services.allocate_drive_letter("org1") == "X"


def test_allocate_drive_letter_reserves_c(monkeypatch):
    import cloudshield.Server.services.shares_services as shares_services

    used = [{"org_id": "org1", "drive": d} for d in "ZYXWVUTSRQPONMLKJIHGFED"]
    fake = FakeCollection(used)
    monkeypatch.setattr(shares_services, "shares", fake)

    assert shares_services.allocate_drive_letter("org1") == "B"


def test_create_share_duplicate_drive_raises(monkeypatch):
    import cloudshield.Server.services.shares_services as shares_services

    class DuplicateDriveError(Exception):
        pass

    class FailInsertCollection(FakeCollection):
        def insert_one(self, doc):
            raise shares_services.PyMongoError("duplicate key")

    fake = FailInsertCollection([])
    monkeypatch.setattr(shares_services, "shares", fake)

    with pytest.raises(ValueError):
        shares_services.create_share(
            org_id="org1",
            name="Docs",
            groups=["groupA"],
        )


def test_create_share_inserts(monkeypatch):
    import cloudshield.Server.services.shares_services as shares_services

    fake = FakeCollection([])
    monkeypatch.setattr(shares_services, "shares", fake)

    result = shares_services.create_share(
        org_id="org1",
        name="Docs",
        groups=["groupA"],
        description="Shared docs",
        owner="admin@example.com",
    )

    assert result["org_id"] == "org1"
    assert result["name"] == "Docs"
    assert result["drive"] == "Z"
    assert len(fake._docs) == 1


def test_list_shares_sorted(monkeypatch):
    import cloudshield.Server.services.shares_services as shares_services

    fake = FakeCollection([
        {"org_id": "org1", "name": "B", "created_at": datetime(2020, 1, 2, tzinfo=timezone.utc)},
        {"org_id": "org1", "name": "A", "created_at": datetime(2020, 1, 1, tzinfo=timezone.utc)},
    ])
    monkeypatch.setattr(shares_services, "shares", fake)

    docs = shares_services.list_shares("org1")
    assert [doc["name"] for doc in docs] == ["A", "B"]


def test_list_groups_with_shares(monkeypatch):
    import cloudshield.Server.services.shares_services as shares_services

    fake = FakeCollection([
        {"org_id": "org1", "name": "Share1", "groups": ["g1", "g2"]},
        {"org_id": "org1", "name": "Share2", "groups": ["g1"]},
        {"org_id": "org1", "name": "Share3", "groups": []},
    ])
    monkeypatch.setattr(shares_services, "shares", fake)

    result = shares_services.list_groups_with_shares("org1")
    payload = {item["group"]["name"]: item["group"]["shares"] for item in result}
    assert payload["g1"] == ["Share1", "Share2"]
    assert payload["g2"] == ["Share1"]


def test_delete_share(monkeypatch):
    import cloudshield.Server.services.shares_services as shares_services

    fake = FakeCollection([
        {"org_id": "org1", "name": "Share1"},
    ])
    monkeypatch.setattr(shares_services, "shares", fake)

    assert shares_services.delete_share("org1", "Share1") is True
    assert shares_services.delete_share("org1", "Share1") is False
