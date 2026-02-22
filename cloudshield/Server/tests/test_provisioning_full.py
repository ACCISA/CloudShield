import pytest
import unittest.mock
import subprocess
import sys

from cloudshield.Server.tasks.network_provisioning import (
    provision_network, 
    provision_workstations,
    destroy_environment,
    _run,
    _coerce_int
)
import cloudshield.Server.tasks.network_provisioning as np_module

@pytest.fixture
def mock_dependencies(monkeypatch, tmp_path):
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job_123"
    mock_job.meta = {"progress": ""}
    
    mock_logger = unittest.mock.MagicMock()
    
    monkeypatch.setattr(np_module, "get_current_job", lambda: mock_job)
    monkeypatch.setattr(np_module, "get_logger", lambda *args, **kwargs: mock_logger)
    
    def fake_set_progress(text):
        mock_job.meta["progress"] = text
    monkeypatch.setattr(np_module, "set_progress", fake_set_progress)

    mock_db = unittest.mock.MagicMock()
    monkeypatch.setattr(np_module, "db", mock_db)
    monkeypatch.setattr(np_module, "db_admin", {"workstations": unittest.mock.MagicMock()})
    monkeypatch.setattr(np_module, "organizations", unittest.mock.MagicMock())
    
    monkeypatch.setattr(np_module, "CLOUDSHIELD_JOBS_DIR", str(tmp_path))
    
    monkeypatch.setattr(np_module, "insert_inventory", lambda db, org_id, assets: None)
    monkeypatch.setattr(np_module, "delete_inventory_by_org", lambda db, org_id: None)
    monkeypatch.setattr(np_module, "map_metadata_to_ec2_instances", lambda m: m)
    monkeypatch.setattr(np_module, "_update_org_provisioning_status", lambda *args, **kwargs: None)

    return mock_job

def test_provision_network_docker_success(mock_dependencies, monkeypatch):
    monkeypatch.setenv("DEPLOYMENT_MODE", "docker")
    
    fake_metadata = [{"id": "docker-1", "private_ip": "10.0.0.1"}]
    monkeypatch.setattr(np_module, "provision_network_docker", lambda **kwargs: fake_metadata)

    result = provision_network("org_docker_1")
    
    assert result["status"] == "success"
    assert result["metadata"] == fake_metadata
    assert mock_dependencies.meta["progress"] == "completed"

def test_provision_network_docker_failure_no_metadata(mock_dependencies, monkeypatch):
    monkeypatch.setenv("DEPLOYMENT_MODE", "docker")
    monkeypatch.setattr(np_module, "provision_network_docker", lambda **kwargs: None)

    result = provision_network("org_docker_fail")
    
    assert result["status"] == "error"
    assert "failed" in mock_dependencies.meta["progress"]

def test_provision_network_terraform_success(mock_dependencies, monkeypatch):
    monkeypatch.setenv("DEPLOYMENT_MODE", "terraform")
    
    fake_meta = {"id": "tf-1"}
    monkeypatch.setattr(np_module, "provision_network_terraform", lambda **kwargs: fake_meta)
    monkeypatch.setattr(np_module, "provision_workstation", lambda *args: {})

    result = provision_network("org_tf_1")
    
    assert result["status"] == "success"
    assert isinstance(result["metadata"], list) 
    assert result["metadata"][0] == fake_meta

def test_provision_network_exception_handling(mock_dependencies, monkeypatch):
    def crash(**kwargs):
        raise ValueError("Boom")
    
    monkeypatch.setenv("DEPLOYMENT_MODE", "terraform")
    monkeypatch.setattr(np_module, "provision_network_terraform", crash)

    with pytest.raises(ValueError):
        provision_network("org_crash")
    
    assert "failed: Boom" in mock_dependencies.meta["progress"]

def test_provision_workstations_success(mock_dependencies, monkeypatch):
    monkeypatch.setattr(np_module, "run_stream", lambda *args, **kwargs: ["Success"])
    monkeypatch.setattr(np_module, "get_workstation_count", lambda *args, **kwargs: 1)
    monkeypatch.setattr(np_module, "get_target_dir", lambda *args: "/tmp/tf")

    result = provision_workstations("org_ws_1", count=2)
    assert "complete" in result["message"]

def test_coerce_int():
    assert _coerce_int("10", 0) == 0  
    assert _coerce_int(None, 5) == 5
    assert _coerce_int(7, 1) == 7

def test_run_command_wrapper(mock_dependencies, monkeypatch):
    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["line1\n", "line2\n"])
    mock_proc.returncode = 0
    monkeypatch.setattr(subprocess, "Popen", lambda *args, **kwargs: mock_proc)

    lines = list(_run(["echo", "hi"], cwd="/tmp"))
    assert lines == ["line1", "line2"]

def test_destroy_docker(mock_dependencies, monkeypatch):
    monkeypatch.setenv("DEPLOYMENT_MODE", "docker")
    
    mock_docker = unittest.mock.MagicMock()
    mock_container = unittest.mock.MagicMock()
    mock_docker.DockerClient.return_value.container.list.return_value = [mock_container]
    
    with unittest.mock.patch.dict(sys.modules, {"python_on_whales": mock_docker}):
        result = destroy_environment("org_destroy", force=True)
        
    assert result["message"] == "Destroy complete"
    mock_container.remove.assert_called_with(force=True)

def test_destroy_terraform_success(mock_dependencies, monkeypatch, tmp_path):
    monkeypatch.setenv("DEPLOYMENT_MODE", "terraform")
    
    generated_dir = tmp_path / "terraform" / "generated" / "org_destroy_tf"
    generated_dir.mkdir(parents=True, exist_ok=True)
    
    monkeypatch.setattr(np_module, "destroy_infra", lambda *args, **kwargs: None)

    result = destroy_environment("org_destroy_tf", force=False)
    
    assert result is not None
    assert result["message"] == "Destroy complete"
    assert result["removed_dir"] is True
    assert mock_dependencies.meta["progress"] == "completed destroy"

def test_provision_network_limit_exceeded(mock_dependencies, monkeypatch):
    mock_orgs = unittest.mock.MagicMock()
    mock_orgs.find_one.return_value = {"workstation_limit": 2}
    monkeypatch.setattr(np_module, "organizations", mock_orgs)

    with pytest.raises(ValueError) as exc:
        provision_network("org_limit_test", workstation_count=5)
    
    assert "exceeds organization limit" in str(exc.value)

def test_run_command_failure(mock_dependencies, monkeypatch):
    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["Error: Disk full\n"])
    mock_proc.returncode = 1
    
    monkeypatch.setattr(subprocess, "Popen", lambda *args, **kwargs: mock_proc)

    with pytest.raises(subprocess.CalledProcessError):
        list(_run(["terraform", "apply"], cwd="/tmp"))

def test_coerce_int_branches():
    assert _coerce_int(True, default=99) == 99
    assert _coerce_int(5.5, default=0) == 5
    assert _coerce_int(10, default=0) == 10

def test_update_status_db_failure(mock_dependencies, monkeypatch):
    mock_orgs = unittest.mock.MagicMock()
    mock_orgs.update_one.side_effect = Exception("DB Connection Failed")
    monkeypatch.setattr(np_module, "organizations", mock_orgs)
    
    np_module._update_org_provisioning_status("org_fail", "failed", "job_123", logger=mock_dependencies)
    
def test_destroy_exception_handling(mock_dependencies, monkeypatch, tmp_path):
    monkeypatch.setenv("DEPLOYMENT_MODE", "terraform")
    
    generated_dir = tmp_path / "terraform" / "generated" / "org_destroy_fail"
    generated_dir.mkdir(parents=True, exist_ok=True)

    def crash(*args, **kwargs):
        raise RuntimeError("Terraform is burning!")
    
    monkeypatch.setattr(np_module, "destroy_infra", crash)

    result = destroy_environment("org_destroy_fail", force=False)
    
    assert "failed destroy" in mock_dependencies.meta["progress"]
    assert result is None

def test_noop_function():
    np_module.destroy_network_docker()