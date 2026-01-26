import types
import pytest
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


# Additional coverage for job_service enqueue helpers and dispatcher


def _make_queue_stub(recorded):
    def _enqueue(func, *args, **kwargs):
        recorded["func"] = func
        recorded["args"] = args
        recorded["kwargs"] = kwargs
        return DummyJob(job_id=kwargs.get("job_id", "jobX"))

    return types.SimpleNamespace(enqueue=_enqueue)


def test_enqueue_dc_add_user(monkeypatch):
    recorded = {}
    monkeypatch.setattr(job_service, "task_queue", _make_queue_stub(recorded))
    job = job_service.enqueue_dc_add_user("org", "user", "pw", "email")
    assert job.id == "jobX"
    assert recorded["func"] == job_service.dc_add_user
    assert recorded["args"][:4] == ("org", "user", "pw", "email")


def test_enqueue_dc_create_user_with_group(monkeypatch):
    recorded = {}
    monkeypatch.setattr(job_service, "task_queue", _make_queue_stub(recorded))
    job = job_service.enqueue_dc_create_user_with_group("org", "user", "pw", "group")
    assert job.id == "jobX"
    assert recorded["func"] == job_service.dc_create_user_with_group
    assert recorded["args"][:4] == ("org", "user", "pw", "group")


def test_enqueue_dc_restart_samba_service(monkeypatch):
    recorded = {}
    monkeypatch.setattr(job_service, "task_queue", _make_queue_stub(recorded))
    job = job_service.enqueue_dc_restart_samba_service("org")
    assert job.id == "jobX"
    assert recorded["func"] == job_service.dc_restart_samba_service
    assert recorded["args"] == ("org",)


def test_enqueue_dc_user_list(monkeypatch):
    recorded = {}
    monkeypatch.setattr(job_service, "task_queue", _make_queue_stub(recorded))
    job = job_service.enqueue_dc_user_list("org")
    assert job.id == "jobX"
    assert recorded["func"] == job_service.dc_user_list
    assert recorded["args"] == ("org",)


def test_enqueue_dc_set_password(monkeypatch):
    recorded = {}
    monkeypatch.setattr(job_service, "task_queue", _make_queue_stub(recorded))
    job = job_service.enqueue_dc_set_password("org", "u", "np")
    assert job.id == "jobX"
    assert recorded["func"] == job_service.dc_set_password
    assert recorded["args"][:3] == ("org", "u", "np")


def test_enqueue_create_file_share(monkeypatch):
    recorded = {}
    monkeypatch.setattr(job_service, "task_queue", _make_queue_stub(recorded))
    job = job_service.enqueue_create_file_share("org", "share")
    assert job.id == "jobX"
    assert recorded["func"] == job_service.dc_create_file_share
    assert recorded["args"][:2] == ("org", "share")


def test_enqueue_delete_file_share(monkeypatch):
    recorded = {}
    monkeypatch.setattr(job_service, "task_queue", _make_queue_stub(recorded))
    job = job_service.enqueue_delete_file_share("org", "share", True)
    assert job.id == "jobX"
    assert recorded["func"] == job_service.dc_delete_file_share
    assert recorded["args"][:3] == ("org", "share", True)


def test_enqueue_dc_remove_user(monkeypatch):
    recorded = {}
    monkeypatch.setattr(job_service, "task_queue", _make_queue_stub(recorded))
    job = job_service.enqueue_dc_remove_user("org", "user")
    assert job.id == "jobX"
    assert recorded["func"] == job_service.dc_remove_user
    assert recorded["args"][:2] == ("org", "user")


def test_enqueue_provision_exception(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("enqueue fail")

    monkeypatch.setattr(job_service, "task_queue", types.SimpleNamespace(enqueue=boom))

    with pytest.raises(RuntimeError):
        job_service.enqueue_provision("org", region="r1")


def test_service_dispatcher_unknown():
    with pytest.raises(ValueError):
        job_service.service_dispatcher("nope")


def test_service_dispatcher_known(monkeypatch):
    called = {}

    def fake_enqueue(x):
        called["seen"] = x
        return "job-ok"

    monkeypatch.setitem(job_service.SERVICES, "dummy", fake_enqueue)
    result = job_service.service_dispatcher("dummy", 123)
    assert result == "job-ok"
    assert called["seen"] == 123
    # cleanup
    job_service.SERVICES.pop("dummy", None)


def test_enqueue_dc_change_password_noop():
    # Function is intentionally a placeholder; ensure it is callable
    assert job_service.enqueue_dc_change_password("org", "user", "pass") is None
