import importlib.util
from pathlib import Path
from unittest.mock import MagicMock

_NP_PATH = Path(__file__).resolve().parents[1] / "tasks" / "network_provisioning.py"
_NP_SPEC = importlib.util.spec_from_file_location("_test_network_provisioning_ext", _NP_PATH)
np = importlib.util.module_from_spec(_NP_SPEC)
assert _NP_SPEC and _NP_SPEC.loader
_NP_SPEC.loader.exec_module(np)


def _stub_common_provision(monkeypatch, tmp_path, job_id="job-1"):
    job = MagicMock()
    job.id = job_id
    job.meta = {}

    monkeypatch.setattr(np, "get_current_job", lambda: job)
    monkeypatch.setattr(np, "get_job_id_fallback", lambda: job_id)
    monkeypatch.setattr(np, "get_logger", lambda *a, **k: MagicMock())
    monkeypatch.setattr(np, "_detect_mode", lambda *_: "terraform")
    monkeypatch.setattr(np, "CLOUDSHIELD_JOBS_DIR", str(tmp_path))
    monkeypatch.setattr(np, "organizations", type("_Org", (), {"find_one": staticmethod(lambda *_: {"workstation_limit": 1})})())
    monkeypatch.setattr(np, "org_filter", lambda org_id: {"_id": org_id})
    monkeypatch.setattr(np, "_update_org_provisioning_status", lambda *a, **k: None)
    monkeypatch.setattr(np, "set_progress", lambda text: job.meta.__setitem__("progress", text))
    monkeypatch.setattr(np, "map_metadata_to_ec2_instances", lambda m: m)
    monkeypatch.setattr(np, "_validate_inventory_assets", lambda lg, oid, assets: assets)
    monkeypatch.setattr(np, "insert_inventory", lambda **k: None)
    monkeypatch.setattr(np, "_enqueue_welcome_email_post_success", lambda *a, **k: None)
    monkeypatch.setattr(np, "provision_workstation", None)
    return job


def test_provision_network_basic(monkeypatch, tmp_path):
    job = _stub_common_provision(monkeypatch, tmp_path)
    monkeypatch.setattr(np, "provision_network_terraform", lambda **k: {"name": "test-instance", "instance_id": "i-123"})

    result = np.provision_network("acme", region="us-east-1")
    assert result["message"] == "Provisioning complete"
    assert isinstance(result["metadata"], list)
    assert job.meta.get("progress") == "completed"


def test_destroy_environment_missing(monkeypatch, tmp_path):
    monkeypatch.setattr(np, "CLOUDSHIELD_JOBS_DIR", str(tmp_path))
    monkeypatch.setattr(np, "_detect_mode", lambda *_: "terraform")
    monkeypatch.setattr(np, "get_current_job", lambda: None)
    monkeypatch.setattr(np, "get_job_id_fallback", lambda: "job-1")
    monkeypatch.setattr(np, "get_logger", lambda *a, **k: MagicMock())
    monkeypatch.setattr(np, "set_progress", lambda *_: None)

    res = np.destroy_environment("nope")
    assert res["removed_dir"] is False


def test_destroy_environment_success(monkeypatch, tmp_path):
    work_dir = tmp_path / "terraform" / "generated" / "org1"
    work_dir.mkdir(parents=True)
    (work_dir / "dummy.txt").write_text("x")

    monkeypatch.setattr(np, "CLOUDSHIELD_JOBS_DIR", str(tmp_path))
    monkeypatch.setattr(np, "_detect_mode", lambda *_: "terraform")
    monkeypatch.setattr(np, "get_current_job", lambda: None)
    monkeypatch.setattr(np, "get_job_id_fallback", lambda: "job-1")
    monkeypatch.setattr(np, "get_logger", lambda *a, **k: MagicMock())
    monkeypatch.setattr(np, "set_progress", lambda *_: None)
    monkeypatch.setattr(np, "_update_org_provisioning_status", lambda *a, **k: None)
    monkeypatch.setattr(np, "delete_inventory_by_org", lambda **k: None)
    monkeypatch.setattr(np, "destroy_infra", lambda *a, **k: None)

    res = np.destroy_environment("org1")
    assert res["removed_dir"] is True
