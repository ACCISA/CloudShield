import pathlib
import pytest
import cloudshield.Server.tasks as tasks


class DummyJob:
    def __init__(self):
        self.meta = {}

    def save_meta(self):
        pass


def test_provision_overwrite_existing_dir(monkeypatch, tmp_path):
    # Mock provision_main to simulate successful provisioning
    def fake_provision_main(args):
        return [{"name": "test-instance"}]
    
    monkeypatch.setattr("cloudshield.Server.tasks.provision_main", fake_provision_main)
    
    base_dir = tmp_path
    generated_dir = base_dir / "Cloud" / "terraform" / "generated" / "acme"
    generated_dir.mkdir(parents=True)
    (generated_dir / "old.txt").write_text("old")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)
    monkeypatch.setattr(tasks, "get_current_job", lambda: DummyJob())

    res = tasks.provision_network("acme")
    assert res["message"].startswith("Provisioning complete")


def test_provision_failure_updates_meta(monkeypatch, tmp_path):
    # Mock provision_main to raise an error
    def fake_provision_main(args):
        raise RuntimeError("boom")
    
    monkeypatch.setattr("cloudshield.Server.tasks.provision_main", fake_provision_main)

    base_dir = tmp_path

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    # Capture job meta and ensure it's updated on failure
    job = DummyJob()
    monkeypatch.setattr(tasks, "get_current_job", lambda: job)

    with pytest.raises(RuntimeError):
        tasks.provision_network("oops")

    assert "failed" in job.meta.get("progress", "")


def test_destroy_failure_force_cleanup(monkeypatch, tmp_path):
    # Mock destroy_infra to raise an error
    def fake_destroy(org_id, region="ca-central-1", force_empty_s3=False):
        raise RuntimeError("destroy failed")
    
    monkeypatch.setattr("cloudshield.Server.tasks.destroy_infra", fake_destroy)
    
    base_dir = tmp_path
    work_dir = base_dir / "Cloud" / "terraform" / "generated" / "org1"
    work_dir.mkdir(parents=True)
    (work_dir / "keep.txt").write_text("x")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    with pytest.raises(RuntimeError):
        tasks.destroy_environment("org1", force=True)

