import os
import sys
from types import SimpleNamespace

# Ensure Server package is on path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cloudshield.Server.services import job_service  # noqa: E402


def test_get_job_status_not_found(monkeypatch):
    monkeypatch.setattr(job_service.Job, "fetch", staticmethod(lambda job_id, connection=None: (_ for _ in ()).throw(Exception("missing"))))

    resp, code = job_service.get_job_status("missing")
    assert code == 404
    assert resp["error"] == "job not found"


def test_get_job_status_finished(monkeypatch):
    dummy = SimpleNamespace(
        id="job-1",
        meta={"progress": "done"},
        result={"ok": True},
        get_status=lambda: "finished",
    )
    monkeypatch.setattr(job_service.Job, "fetch", staticmethod(lambda job_id, connection=None: dummy))

    resp, code = job_service.get_job_status("job-1")
    assert code == 200
    assert resp["status"] == "finished"
    assert resp["progress"] == "done"
    assert resp["result"] == {"ok": True}


def test_health_status_ok(monkeypatch):
    class Conn:
        def ping(self):
            return True

    monkeypatch.setattr(job_service, "redis_conn", Conn())
    resp, code = job_service.health_status()
    assert code == 200
    assert resp == {"status": "ok", "redis": True}


def test_health_status_failure(monkeypatch):
    class Conn:
        def ping(self):
            raise RuntimeError("boom")

    monkeypatch.setattr(job_service, "redis_conn", Conn())
    resp, code = job_service.health_status()
    assert code == 503
    assert resp["status"] == "degraded"
    assert resp["redis"] is False


def test_enqueue_destroy(monkeypatch):
    calls = []

    def fake_enqueue(*args, **kwargs):
        calls.append((args, kwargs))
        return "job-created"

    monkeypatch.setattr(job_service, "task_queue", SimpleNamespace(enqueue=fake_enqueue))
    monkeypatch.setattr(job_service, "destroy_environment", lambda *a, **k: "destroy" )

    job = job_service.enqueue_destroy("org-123", force=True)

    assert job == "job-created"
    assert calls[0][0][0] == job_service.destroy_environment
    assert calls[0][0][1] == "org-123"
    assert calls[0][0][2] is True
