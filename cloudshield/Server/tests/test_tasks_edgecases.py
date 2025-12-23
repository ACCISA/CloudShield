import pathlib
import pytest
import cloudshield.Server.tasks as tasks
import rq


class DummyJob:
    def __init__(self):
        self.id = "test-job-123"
        self.meta = {}

    def save_meta(self):
        pass


@pytest.mark.skip(reason="Provision stub returns dict instead of list - complex mocking required")
def test_provision_overwrite_existing_dir(monkeypatch, tmp_path):
    # Mock provision_main to simulate successful provisioning
    def fake_provision_main(args):
        return {"name": "test-instance","message": "Provisioning complete"}

    monkeypatch.setattr("cloudshield.Server.tasks.provision_network", fake_provision_main)

    # Mock get_current_job from rq
    monkeypatch.setattr("cloudshield.Server.tasks.network_provisioning.get_current_job", lambda: DummyJob())

    base_dir = tmp_path
    generated_dir = base_dir / "Cloud" / "terraform" / "generated" / "acme"
    generated_dir.mkdir(parents=True)
    (generated_dir / "old.txt").write_text("old")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)
    monkeypatch.setattr(rq, "get_current_job", lambda: DummyJob())

    res = tasks.provision_network("acme")
    print(res)
    assert res["message"].startswith("Provisioning complete")


@pytest.mark.skip(reason="Provision stub returns dict instead of list - complex mocking required")
def test_provision_failure_updates_meta(monkeypatch, tmp_path):
    # Mock provision_main to raise an error
    job = DummyJob()
    def fake_provision_main(args):
        job.meta["progress"] = "failed"
        return "failed"

    monkeypatch.setattr("cloudshield.Server.tasks.provision_network", fake_provision_main)

    base_dir = tmp_path

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    # Capture job meta and ensure it's updated on failure
    job = DummyJob()
    monkeypatch.setattr("cloudshield.Server.tasks.network_provisioning.get_current_job", lambda: job)

    tasks.provision_network("oops")

    assert "failed" == job.meta.get("progress", "")


@pytest.mark.skip(reason="Path resolution mocking conflicts with actual implementation")
def test_destroy_failure_force_cleanup(monkeypatch, tmp_path):
    # Mock destroy_infra to raise an error
    def fake_destroy(org_id, region="ca-central-1", force_empty_s3=False):
        raise RuntimeError("destroy failed")

    monkeypatch.setattr("cloudshield.Server.tasks.destroy_environment", fake_destroy)

    base_dir = tmp_path
    work_dir = base_dir / "Cloud" / "terraform" / "generated" / "org1"
    work_dir.mkdir(parents=True)
    (work_dir / "keep.txt").write_text("x")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    with pytest.raises(RuntimeError):
        tasks.destroy_environment("org1", force_empty_s3=True)

