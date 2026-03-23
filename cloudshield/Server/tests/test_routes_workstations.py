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
