import pathlib
import pytest
import cloudshield.Server.tasks as tasks


class DummyJob:
    def __init__(self):
        self.meta = {}

    def save_meta(self):
        pass


def test_provision_overwrite_existing_dir(monkeypatch, tmp_path):
    # Arrange a fake templates dir and existing run dir
    base_dir = tmp_path
    templates = base_dir / "Cloud" / "templates"
    templates.mkdir(parents=True)
    (templates / "main.tf").write_text('region = "ca-central-1"\n# org_id placeholder', encoding="utf-8")

    # Create existing run dir for same org
    runs = base_dir / "Cloud" / "runs" / "acme"
    runs.mkdir(parents=True)
    (runs / "old.txt").write_text("old")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    # Fake _run to be no-op
    monkeypatch.setattr(tasks, "_run", lambda *a, **k: iter(["ok"]))

    # Fake get_current_job to simulate meta updates
    monkeypatch.setattr(tasks, "get_current_job", lambda: DummyJob())

    res = tasks.provision_network("acme")
    assert res["message"].startswith("Provisioning complete")
    assert (base_dir / "Cloud" / "runs" / "acme" / "main.tf").exists()


def test_provision_failure_updates_meta(monkeypatch, tmp_path):
    base_dir = tmp_path
    templates = base_dir / "Cloud" / "templates"
    templates.mkdir(parents=True)
    (templates / "main.tf").write_text('region = "ca-central-1"\n# org_id placeholder', encoding="utf-8")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    # _run will raise on apply
    def fake_run(cmd, cwd, env=None):
        if "apply" in cmd:
            raise RuntimeError("boom")
        return iter(["init ok"])  # first call succeeds

    monkeypatch.setattr(tasks, "_run", fake_run)

    # Capture job meta and ensure it's updated on failure
    job = DummyJob()
    monkeypatch.setattr(tasks, "get_current_job", lambda: job)

    with pytest.raises(RuntimeError):
        tasks.provision_network("oops")

    assert "failed" in job.meta.get("progress", "")
    assert "logs_tail" in job.meta


def test_destroy_failure_force_cleanup(monkeypatch, tmp_path):
    base_dir = tmp_path
    work_dir = base_dir / "Cloud" / "runs" / "org1"
    work_dir.mkdir(parents=True)
    (work_dir / "keep.txt").write_text("x")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    # _run raises on destroy
    def fake_run(cmd, cwd, env=None):
        raise RuntimeError("destroy failed")

    monkeypatch.setattr(tasks, "_run", fake_run)

    with pytest.raises(RuntimeError):
        tasks.destroy_environment("org1", force=True)

    # Directory should be removed due to force flag
    assert not work_dir.exists()
