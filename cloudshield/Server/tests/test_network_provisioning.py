import pytest
import unittest.mock
import subprocess
from types import SimpleNamespace

# ======== run_stream tests ========
def test_run_stream_returns_tail_and_logs(monkeypatch, caplog):
    import logging
    from cloudshield.Server.utils.shell import run_stream

    logger = logging.getLogger("test")
    caplog.set_level(logging.DEBUG, logger="test")

    # Mock Popen
    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["line1\n", "line2\n", "line3\n"])
    mock_proc.returncode = 0

    def fake_popen(*args, **kwargs):
        return mock_proc

    monkeypatch.setattr(subprocess, "Popen", fake_popen)

    tail = run_stream(["echo", "test"], cwd="/tmp", logger=logger, tail_keep=50)
    assert tail == ["line1", "line2", "line3"]
    assert "line1" in caplog.text


def test_run_stream_raises_on_failure(monkeypatch):
    import logging
    from cloudshield.Server.utils.shell import run_stream

    logger = logging.getLogger("test")

    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["error line\n"])
    mock_proc.returncode = 1

    def fake_popen(*args, **kwargs):
        return mock_proc

    monkeypatch.setattr(subprocess, "Popen", fake_popen)

    with pytest.raises(subprocess.CalledProcessError):
        run_stream(["false"], cwd="/tmp", logger=logger)


def test_run_stream_passes_env(monkeypatch):
    import logging
    from cloudshield.Server.utils.shell import run_stream

    logger = logging.getLogger("test")

    popen_kwargs = {}
    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["ok\n"])
    mock_proc.returncode = 0

    def fake_popen(*args, **kwargs):
        popen_kwargs.update(kwargs)
        return mock_proc

    monkeypatch.setattr(subprocess, "Popen", fake_popen)

    env = {"TEST_VAR": "value"}
    run_stream(["echo", "ok"], cwd="/tmp", env=env, logger=logger)
    assert popen_kwargs["env"] == env


# ======== provision_workstations tests ========
def test_provision_workstations_work_dir_missing(monkeypatch):
    from cloudshield.Server.tasks.network_provisioning import provision_workstations

    # Mock get_current_job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )

    # Mock logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    with pytest.raises(FileNotFoundError):
        provision_workstations("nonexistent_org")


def test_provision_workstations_success(monkeypatch, tmp_path):
    from cloudshield.Server.tasks.network_provisioning import provision_workstations
    import cloudshield.Server.tasks.network_provisioning as np_module

    # Create required directory structure
    base_dir = tmp_path / "cloudshield" / "Server"
    runs_dir = base_dir / "Cloud" / "runs" / "test_org"
    runs_dir.mkdir(parents=True, exist_ok=True)

    # Patch __file__ to point to our temp dir
    monkeypatch.setattr(np_module, "__file__", str(base_dir / "tasks" / "network_provisioning.py"))

    # Mock job/progress
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.progress.get_current_job",
        lambda: mock_job
    )
    # Mock logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    # Mock run_stream to simulate successful TF apply
    def fake_run_stream(cmd, cwd, env=None, logger=None, tail_keep=50):
        return ["Apply complete!"]

    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.run_stream",
        fake_run_stream
    )

    result = provision_workstations("test_org", count=2)
    assert "complete" in result["message"].lower()
    assert mock_job.meta["progress"] == "completed"


def test_provision_workstations_failure(monkeypatch, tmp_path):
    from cloudshield.Server.tasks.network_provisioning import provision_workstations
    import cloudshield.Server.tasks.network_provisioning as np_module

    base_dir = tmp_path / "cloudshield" / "Server"
    runs_dir = base_dir / "Cloud" / "runs" / "test_org"
    runs_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(np_module, "__file__", str(base_dir / "tasks" / "network_provisioning.py"))

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.progress.get_current_job",
        lambda: mock_job
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    def fake_run_stream(cmd, cwd, env=None, logger=None, tail_keep=50):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.run_stream",
        fake_run_stream
    )

    with pytest.raises(subprocess.CalledProcessError):
        provision_workstations("test_org")

    assert "failed" in mock_job.meta["progress"]


def test_provision_network_success(monkeypatch, tmp_path):
    from cloudshield.Server.tasks.network_provisioning import provision_network

    # Mock job/logger
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.progress.get_current_job",
        lambda: mock_job
    )

    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    # TF metadata that provisioner returns
    metadata = [{
        "public_ip": "1.2.3.4",
        "private_ip": "10.0.0.1",
        "vpc_id": "vpc-123",
        "name": "test-instance",
        "ssh_key": "test_key",
        "ami_id": "ami-123",
        "cpu": 2,
        "created_at": "2025-01-01",
        "instance_id": "i-123",
        "os": "Ubuntu",
        "ports": ["sg-123"],
        "ram_gb": "4GB",
        "status": "running",
        "storage_size_gb": 50,
        "subnet_id": "subnet-123",
        "updated_at": "2025-01-01",
    }]

    # Mock provisioner
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.provision_network_terraform",
        lambda org_id, region, templates_dir, generated_dir, count, server_logger: metadata
    )

    # Mock insert_inventory to return a fake result
    mock_insert_result = SimpleNamespace(inserted_id="inventory_123")
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.insert_inventory",
        lambda db, org_id, assets: mock_insert_result
    )

    # Still pass a mock db object into the module (used by insert_inventory call)
    mock_db = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.db",
        mock_db
    )

    result = provision_network("test_org")
    assert "complete" in result["message"].lower()
    assert result["metadata"] == metadata
    assert mock_job.meta["progress"] == "completed"


def test_provision_network_returns_none(monkeypatch):
    from cloudshield.Server.tasks.network_provisioning import provision_network

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.progress.get_current_job",
        lambda: mock_job
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.provision_network_terraform",
        lambda org_id, region, templates_dir, generated_dir, count, server_logger: None
    )

    result = provision_network("test_org")
    assert "failed" in result["message"].lower()
    assert mock_job.meta["progress"] == "failed"
    assert "details" in mock_job.meta


def test_provision_network_without_job(monkeypatch):
    from cloudshield.Server.tasks.network_provisioning import provision_network

    # No job present
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: None
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.progress.get_current_job",
        lambda: None
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    # Empty metadata
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.provision_network_terraform",
        lambda org_id, region, templates_dir, generated_dir, count, server_logger: []
    )
    # insert_inventory still called; stub it
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.insert_inventory",
        lambda db, org_id, assets: SimpleNamespace(inserted_id="x")
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.db",
        unittest.mock.MagicMock()
    )

    result = provision_network("test_org")
    assert result is not None


def test_destroy_environment_success(monkeypatch, tmp_path):
    from cloudshield.Server.tasks.network_provisioning import destroy_environment

    # Create generated directory under CLOUDSHIELD_JOBS_DIR/terraform/generated/{org}
    jobs_dir = tmp_path
    generated_dir = jobs_dir / "terraform" / "generated" / "test_org"
    generated_dir.mkdir(parents=True, exist_ok=True)

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.progress.get_current_job",
        lambda: mock_job
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.CLOUDSHIELD_JOBS_DIR",
        str(jobs_dir)
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.destroy_infra",
        lambda org_id, region, force_empty_s3, org_dir, server_logger: None
    )

    # Mock delete_inventory_by_org
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.delete_inventory_by_org",
        lambda db, org_id: {"org_id": org_id}
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.db",
        unittest.mock.MagicMock()
    )

    result = destroy_environment("test_org", force=True)
    assert "complete" in result["message"].lower()
    assert result["removed_dir"] is True
    assert mock_job.meta["progress"] == "completed destroy"


def test_destroy_environment_no_directory(monkeypatch, tmp_path):
    from cloudshield.Server.tasks.network_provisioning import destroy_environment

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.progress.get_current_job",
        lambda: mock_job
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.CLOUDSHIELD_JOBS_DIR",
        str(tmp_path)
    )

    result = destroy_environment("nonexistent_org")
    assert "No run directory found" in result["message"]
    assert result["removed_dir"] is False


def test_destroy_environment_failure(monkeypatch, tmp_path):
    from cloudshield.Server.tasks.network_provisioning import destroy_environment

    jobs_dir = tmp_path
    generated_dir = jobs_dir / "terraform" / "generated" / "test_org"
    generated_dir.mkdir(parents=True, exist_ok=True)

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    monkeypatch.setattr(
        "cloudshield.Server.utils.progress.get_current_job",
        lambda: mock_job
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )
    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.CLOUDSHIELD_JOBS_DIR",
        str(jobs_dir)
    )

    def fake_destroy(*args, **kwargs):
        raise Exception("Destroy failed")

    monkeypatch.setattr(
        "cloudshield.Server.tasks.network_provisioning.destroy_infra",
        fake_destroy
    )

    with pytest.raises(Exception):
        destroy_environment("test_org")

    assert "failed destroy" in mock_job.meta["progress"]
