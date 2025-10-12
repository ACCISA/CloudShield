import importlib
import types
import sys


def test_database_import_monkeypatched(monkeypatch, tmp_path):
    # Ensure env vars point to dummy values
    monkeypatch.setenv("MONGO_URL", "mongodb://example:27017/")
    monkeypatch.setenv("MONGO_DB", "testdb")

    # Create a fake MongoClient class
    class FakeClient:
        def __init__(self, uri):
            self.uri = uri
            self.admin = types.SimpleNamespace(command=lambda x: {"ok": 1})

        def __getitem__(self, name):
            return {"name": name}

    fake_pymongo = types.SimpleNamespace(MongoClient=FakeClient)

    # Inject fake pymongo into sys.modules before import
    monkeypatch.setitem(sys.modules, "pymongo", fake_pymongo)

    mod = importlib.import_module("cloudshield.Server.utils.database")
    assert mod.client is not None
    assert mod.db == {"name": "testdb"}
