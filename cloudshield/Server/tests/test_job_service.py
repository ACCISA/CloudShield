import types
from cloudshield.Server.services import job_service


class DummyJob:
    def __init__(self, job_id="jid123", status="queued", result=None, exc_info=None, meta=None):
        self.id = job_id
        self._status = status
        self.result = result
        self.exc_info = exc_info
        self.meta = meta or {}

    def get_status(self):
        return self._status


def test_enqueue_provision(monkeypatch):
    recorded = {}

    def fake_enqueue(func, *args, **kwargs):
        recorded["args"] = args
        recorded["kwargs"] = kwargs
        return DummyJob(job_id="prov1")

    monkeypatch.setattr(job_service, "task_queue", types.SimpleNamespace(enqueue=fake_enqueue))

    job = job_service.enqueue_provision("orgx", region="us-east-2", ubuntu_ami="ami-x")
    assert job.id == "prov1"
    assert recorded["args"][0] == "orgx"

def test_enqueue_provision_workstations(monkeypatch):
    recorded = {}

    def fake_enqueue(func, *args, **kwargs):
        recorded["args"] = args
        recorded["kwargs"] = kwargs
        return DummyJob(job_id="work1")

    monkeypatch.setattr(job_service, "task_queue", types.SimpleNamespace(enqueue=fake_enqueue))

    job = job_service.enqueue_provision_workstations("orgz", region="us-east-2", count=2)
    assert job.id == "work1"
    assert recorded["args"][0] == "orgz"

def test_enqueue_destroy(monkeypatch):
    def fake_enqueue(func, *args, **kwargs):
        return DummyJob(job_id="des1")

    monkeypatch.setattr(job_service, "task_queue", types.SimpleNamespace(enqueue=fake_enqueue))
    job = job_service.enqueue_destroy("orgy", force=True)
    assert job.id == "des1"


def test_get_job_status_finished(monkeypatch):
    job = DummyJob(status="finished", result={"ok": True}, meta={"progress": "done"})

    def fake_fetch(job_id, connection):
        return job

    monkeypatch.setattr(job_service.Job, "fetch", fake_fetch)
    payload, code = job_service.get_job_status("jid")
    assert code == 200
    assert payload["status"] == "finished"
    assert payload["result"] == {"ok": True}


def test_get_job_status_failed(monkeypatch):
    job = DummyJob(status="failed", exc_info="Traceback...\nValueError: boom", meta={"progress": "50%"})

    def fake_fetch(job_id, connection):
        return job

    monkeypatch.setattr(job_service.Job, "fetch", fake_fetch)
    payload, code = job_service.get_job_status("jid")
    assert code == 200
    assert payload["error"].startswith("ValueError")


def test_get_job_status_not_found(monkeypatch):
    def fake_fetch(job_id, connection):  # noqa: D401
        raise RuntimeError("not found")

    monkeypatch.setattr(job_service.Job, "fetch", fake_fetch)
    payload, code = job_service.get_job_status("missing")
    assert code == 404


def test_health_status_ok(monkeypatch):
    monkeypatch.setattr(job_service, "redis_conn", types.SimpleNamespace(ping=lambda: True))
    payload, code = job_service.health_status()
    assert code == 200 and payload["redis"] is True


def test_health_status_error(monkeypatch):
    def boom():
        raise RuntimeError("redis down")

    monkeypatch.setattr(job_service, "redis_conn", types.SimpleNamespace(ping=boom))
    payload, code = job_service.health_status()
    assert code == 503 and payload["status"] == "degraded"
