import pytest
import sys
import unittest.mock
import subprocess
import logging
from types import SimpleNamespace

# ======== run_stream tests ========
def test_run_stream_returns_tail_and_logs(monkeypatch, caplog):
    import logging
    from utils.shell import run_stream

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
    from utils.shell import run_stream

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
    from utils.shell import run_stream

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
    from tasks import provision_workstations

    # Mock get_current_job
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )

    # Mock logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    with pytest.raises((NotADirectoryError, FileNotFoundError)):
        provision_workstations("nonexistent_org")


def test_provision_workstations_success(monkeypatch, tmp_path):
    from tasks import provision_workstations
    import tasks.network_provisioning as np_module
    import unittest.mock

    monkeypatch.setattr(
        "tasks.network_provisioning.CLOUDSHIELD_JOBS_DIR",
        str(tmp_path)
    )
    # Create required directory structure
    base_dir = tmp_path / "cloudshield" / "Server"
    generated_dir = tmp_path / "terraform" / "generated" / "test_org"
    generated_dir.mkdir(parents=True, exist_ok=True)

    # Patch __file__ to point to our temp dir
    monkeypatch.setattr(np_module, "__file__", str(base_dir / "tasks" / "network_provisioning.py"))

    # Mock job/progress
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {"progress":""}
    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    # Mock set_progress to update mock_job.meta
    def fake_set_progress(text):
        mock_job.meta["progress"] = text
    monkeypatch.setattr(
        "tasks.network_provisioning.set_progress",
        fake_set_progress
    )
    # Mock logger
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    monkeypatch.setattr(
        "tasks.network_provisioning.get_target_dir",
        lambda org_id, generated_dir: None,
    )

    fake_collection = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.db_admin",
        {"workstations": fake_collection},
    )

    # Mock run_stream to simulate successful TF apply
    def fake_run_stream(cmd, cwd, env=None, logger=None, tail_keep=50):
        assert cwd == str(generated_dir)
        return ["Apply complete!"]

    monkeypatch.setattr(
        "tasks.network_provisioning.run_stream",
        fake_run_stream
    )

    def fake_get_workstation_count(org_id, env=None):
        return 0

    monkeypatch.setattr(
        "tasks.network_provisioning.get_workstation_count",
        fake_get_workstation_count
    )

    result = provision_workstations("test_org", count=2)
    assert "complete" in result["message"].lower()
    assert mock_job.meta["progress"] == "completed"
    fake_collection.update_many.assert_called_once()


def test_provision_workstations_failure(monkeypatch, tmp_path):
    from tasks.network_provisioning import provision_workstations
    import tasks.network_provisioning as np_module
    monkeypatch.setattr(
        "tasks.network_provisioning.CLOUDSHIELD_JOBS_DIR",
        str(tmp_path)
    )
    base_dir = tmp_path / "cloudshield" / "Server"
    generated_dir = tmp_path / "terraform" / "generated" / "test_org"
    generated_dir.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(np_module, "__file__", str(base_dir / "tasks" / "network_provisioning.py"))

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {"progress":""}
    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    # Mock set_progress to update mock_job.meta
    def fake_set_progress(text):
        mock_job.meta["progress"] = text
    monkeypatch.setattr(
        "tasks.network_provisioning.set_progress",
        fake_set_progress
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    def fake_run_stream(cmd, cwd, env=None, logger=None, tail_keep=50):
        raise subprocess.CalledProcessError(1, cmd)

    monkeypatch.setattr(
        "tasks.network_provisioning.run_stream",
        fake_run_stream
    )

    def fake_get_workstation_count(org_id, env=None):
        return 0

    monkeypatch.setattr(
        "tasks.network_provisioning.get_workstation_count",
        fake_get_workstation_count
    )

    with pytest.raises(subprocess.CalledProcessError):
        provision_workstations("test_org")

    assert "failed" in mock_job.meta["progress"]


def test_provision_network_success(monkeypatch, tmp_path):
    from tasks.network_provisioning import provision_network

    # Mock job/logger
    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}

    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    # Mock set_progress to update mock_job.meta
    def fake_set_progress(text):
        mock_job.meta["progress"] = text
    monkeypatch.setattr(
        "tasks.network_provisioning.set_progress",
        fake_set_progress
    )

    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    # TF metadata that provisioner returns
    metadata = [{
        "public_ip": "1.2.3.4",
        "port":"50055",
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
        "tasks.network_provisioning.provision_network_terraform",
        lambda org_data, region, templates_dir, generated_dir, count, server_logger: metadata
    )

    # Mock insert_inventory to return a fake result
    mock_insert_result = SimpleNamespace(inserted_id="inventory_123")
    monkeypatch.setattr(
        "tasks.network_provisioning.insert_inventory",
        lambda db, org_id, assets: mock_insert_result
    )

    # Still pass a mock db object into the module (used by insert_inventory call)
    mock_db = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.db",
        mock_db
    )

    result = provision_network("test_org")
    assert "complete" in result["message"].lower()
    assert result["metadata"] == metadata
    assert mock_job.meta["progress"] == "completed"


def test_provision_network_returns_none(monkeypatch):
    from tasks.network_provisioning import provision_network

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {"progress":""}
    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    # Mock set_progress to update mock_job.meta
    def fake_set_progress(text):
        mock_job.meta["progress"] = text
    monkeypatch.setattr(
        "tasks.network_provisioning.set_progress",
        fake_set_progress
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    monkeypatch.setattr(
        "tasks.network_provisioning.provision_network_terraform",
        lambda org_data, region, templates_dir, generated_dir, count, server_logger: None
    )

    result = provision_network("test_org")
    assert "failed" in result["message"].lower()
    assert mock_job.meta["progress"] == "failed"
    assert "details" in mock_job.meta


def test_provision_network_without_job(monkeypatch):
    from tasks.network_provisioning import provision_network

    # No job present
    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: None
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )

    # Empty metadata
    monkeypatch.setattr(
        "tasks.network_provisioning.provision_network_terraform",
        lambda org_data, region, templates_dir, generated_dir, count, server_logger: []
    )
    # insert_inventory still called; stub it
    monkeypatch.setattr(
        "tasks.network_provisioning.insert_inventory",
        lambda db, org_id, assets: SimpleNamespace(inserted_id="x")
    )
    monkeypatch.setattr(
        "tasks.network_provisioning.db",
        unittest.mock.MagicMock()
    )

    result = provision_network("test_org")
    assert result is not None


def test_destroy_environment_success(monkeypatch, tmp_path):
    from tasks.network_provisioning import destroy_environment

    # Create generated directory under CLOUDSHIELD_JOBS_DIR/terraform/generated/{org}
    jobs_dir = tmp_path
    generated_dir = jobs_dir / "terraform" / "generated" / "test_org"
    generated_dir.mkdir(parents=True, exist_ok=True)

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {}
    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    # Mock set_progress to update mock_job.meta
    def fake_set_progress(text):
        mock_job.meta["progress"] = text
    monkeypatch.setattr(
        "tasks.network_provisioning.set_progress",
        fake_set_progress
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )
    monkeypatch.setattr(
        "tasks.network_provisioning.CLOUDSHIELD_JOBS_DIR",
        str(jobs_dir)
    )
    monkeypatch.setattr(
        "tasks.network_provisioning.destroy_infra",
        lambda org_id, region, force_empty_s3, org_dir, server_logger: None
    )

    # Mock delete_inventory_by_org
    monkeypatch.setattr(
        "tasks.network_provisioning.delete_inventory_by_org",
        lambda db, org_id: {"org_id": org_id}
    )
    monkeypatch.setattr(
        "tasks.network_provisioning.db",
        unittest.mock.MagicMock()
    )

    result = destroy_environment("test_org", force=True)
    assert "complete" in result["message"].lower()
    assert result["removed_dir"] is True
    assert mock_job.meta["progress"] == "completed destroy"


def test_coerce_int_handles_bool_and_default():
    from tasks.network_provisioning import _coerce_int

    assert _coerce_int(True, default=5) == 5
    assert _coerce_int(7, default=1) == 7
    assert _coerce_int("x", default=3) == 3


def test_provision_network_raises_when_exceeding_org_limit(monkeypatch):
    import tasks.network_provisioning as np

    orgs = unittest.mock.MagicMock()
    orgs.find_one.return_value = {"workstation_limit": 1}
    monkeypatch.setattr(np, "organizations", orgs)

    with pytest.raises(ValueError):
        np.provision_network("test_org", workstation_count=2)


def test_provision_network_uses_org_limit_and_updates_status(monkeypatch):
    import tasks.network_provisioning as np

    updates = []

    monkeypatch.setattr(np, "get_job_id_fallback", lambda: "job-123")
    monkeypatch.setattr(np, "set_progress", lambda *_args, **_kwargs: None)
    monkeypatch.setattr(np, "get_logger", lambda *args, **kwargs: unittest.mock.MagicMock())

    orgs = unittest.mock.MagicMock()
    orgs.find_one.return_value = {"workstation_limit": 2}
    monkeypatch.setattr(np, "organizations", orgs)

    monkeypatch.setattr(np, "_update_org_provisioning_status", lambda org_id, status, job_id, logger=None: updates.append(status))
    monkeypatch.setattr(np, "provision_network_terraform", lambda **kwargs: [{"id": "asset"}])
    monkeypatch.setattr(np, "map_metadata_to_ec2_instances", lambda metadata: ["asset"])
    monkeypatch.setattr(np, "insert_inventory", lambda db, org_id, assets: SimpleNamespace(inserted_id="inv1"))
    monkeypatch.setattr(np, "db", unittest.mock.MagicMock())

    result = np.provision_network("test_org")
    assert {"id": "asset"} in result["metadata"]
    assert updates[0] == "in_progress"
    assert updates[-1] == "completed"


def test_destroy_environment_no_directory(monkeypatch, tmp_path):
    from tasks.network_provisioning import destroy_environment

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {"progress":""}
    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )
    monkeypatch.setattr(
        "tasks.network_provisioning.CLOUDSHIELD_JOBS_DIR",
        str(tmp_path)
    )

    result = destroy_environment("nonexistent_org")
    assert "No run directory found" in result["message"]
    assert result["removed_dir"] is False


def test_destroy_environment_failure(monkeypatch, tmp_path):
    from tasks.network_provisioning import destroy_environment

    jobs_dir = tmp_path
    generated_dir = jobs_dir / "terraform" / "generated" / "test_org"
    generated_dir.mkdir(parents=True, exist_ok=True)

    mock_job = unittest.mock.MagicMock()
    mock_job.id = "test_job"
    mock_job.meta = {"progress":""}
    monkeypatch.setattr(
        "tasks.network_provisioning.get_current_job",
        lambda: mock_job
    )
    # Mock set_progress to update mock_job.meta
    def fake_set_progress(text):
        mock_job.meta["progress"] = text
    monkeypatch.setattr(
        "tasks.network_provisioning.set_progress",
        fake_set_progress
    )
    mock_logger = unittest.mock.MagicMock()
    monkeypatch.setattr(
        "tasks.network_provisioning.get_logger",
        lambda name, job_id=None: mock_logger
    )
    monkeypatch.setattr(
        "tasks.network_provisioning.CLOUDSHIELD_JOBS_DIR",
        str(jobs_dir)
    )

    def fake_destroy(*args, **kwargs):
        raise Exception("Destroy failed")

    monkeypatch.setattr(
        "tasks.network_provisioning.destroy_infra",
        fake_destroy
    )

    destroy_environment("test_org")

    assert "failed destroy" in mock_job.meta["progress"]


# ======== _run function tests ========
def test_network_provisioning_run_success(monkeypatch, caplog):
    """Test _run function yields output and succeeds."""
    import logging
    from tasks.network_provisioning import _run

    logger = logging.getLogger("test_run")
    caplog.set_level(logging.DEBUG, logger="test_run")

    # Mock Popen
    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["output1\n", "output2\n", "output3\n"])
    mock_proc.returncode = 0

    def fake_popen(*args, **kwargs):
        return mock_proc

    monkeypatch.setattr(subprocess, "Popen", fake_popen)

    result = list(_run(["echo", "test"], cwd="/tmp", logger=logger))
    assert result == ["output1", "output2", "output3"]
    assert "Executing command:" in caplog.text
    assert "Command succeeded:" in caplog.text


def test_network_provisioning_run_failure(monkeypatch, caplog):
    """Test _run function raises CalledProcessError on failure."""
    import logging
    from tasks.network_provisioning import _run

    logger = logging.getLogger("test_run_fail")
    caplog.set_level(logging.ERROR, logger="test_run_fail")

    # Mock Popen
    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["error line 1\n", "error line 2\n"])
    mock_proc.returncode = 1

    def fake_popen(*args, **kwargs):
        return mock_proc

    monkeypatch.setattr(subprocess, "Popen", fake_popen)

    with pytest.raises(subprocess.CalledProcessError) as exc_info:
        list(_run(["false"], cwd="/tmp", logger=logger))
    
    assert exc_info.value.returncode == 1
    assert "Command failed" in caplog.text
    assert "Last 30 lines of output:" in caplog.text


def test_network_provisioning_run_with_env(monkeypatch):
    """Test _run function passes environment variables."""
    import logging
    from tasks.network_provisioning import _run

    logger = logging.getLogger("test_run_env")

    popen_kwargs = {}
    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["ok\n"])
    mock_proc.returncode = 0

    def fake_popen(*args, **kwargs):
        popen_kwargs.update(kwargs)
        return mock_proc

    monkeypatch.setattr(subprocess, "Popen", fake_popen)

    env = {"TEST_VAR": "value123"}
    list(_run(["echo", "test"], cwd="/tmp", env=env, logger=logger))
    
    assert popen_kwargs["env"] == env
    assert popen_kwargs["cwd"] == "/tmp"


def test_network_provisioning_run_default_logger(monkeypatch):
    """Test _run function uses module logger when none provided."""
    from tasks.network_provisioning import _run

    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["line\n"])
    mock_proc.returncode = 0

    def fake_popen(*args, **kwargs):
        return mock_proc

    monkeypatch.setattr(subprocess, "Popen", fake_popen)

    # Should not raise even without logger
    result = list(_run(["echo", "test"], cwd="/tmp"))
    assert result == ["line"]

def _fake_job(job_id: str = "job-1"):
    job = SimpleNamespace()
    job.id = job_id
    job.meta = {}
    return job


def test_detect_mode_forces_docker_when_runtime_detected(monkeypatch):
    import cloudshield.Server.tasks.network_provisioning as np

    # DEPLOYMENT_MODE not docker, but docker.sock + provisioner file "exist"
    monkeypatch.setenv("DEPLOYMENT_MODE", "terraform")

    orig_exists = np.Path.exists

    def fake_exists(self):
        s = str(self)
        if s in ("/var/run/docker.sock", "/app/provisioner/provision.py"):
            return True
        return orig_exists(self)

    monkeypatch.setattr(np.Path, "exists", fake_exists, raising=True)

    logger = logging.getLogger("test")
    assert np._detect_mode(logger) == "docker"


def test_coerce_int_expected_rules():
    import cloudshield.Server.tasks.network_provisioning as np

    assert np._coerce_int(True, default=5) == 5
    assert np._coerce_int(False, default=7) == 7
    assert np._coerce_int("10", default=3) == 3
    assert np._coerce_int("x", default=3) == 3
    assert np._coerce_int(10, default=None) == 10
    assert np._coerce_int(10.9, default=None) == 10


def test_validate_inventory_assets_success(monkeypatch):
    import cloudshield.Server.tasks.network_provisioning as np

    class FakeInv:
        def model_dump(self, **_kwargs):
            return {
                "org_id": "ACME",
                "assets": [
                    {"name": "a", "_id": "x"},
                    {"name": "b", "_id": "y"},
                ],
            }

    monkeypatch.setattr(np.Inventory, "model_validate", lambda *_args, **_kwargs: FakeInv())

    logger = logging.getLogger("test")
    assets = np._validate_inventory_assets(logger, "ACME", assets_raw=[{"name": "a"}, {"name": "b"}])

    assert assets == [{"name": "a"}, {"name": "b"}]  # _id removed


def test_validate_inventory_assets_falls_back_on_validation_error(monkeypatch, caplog):
    import cloudshield.Server.tasks.network_provisioning as np

    def boom(*_args, **_kwargs):
        raise ValueError("bad inventory")

    monkeypatch.setattr(np.Inventory, "model_validate", boom)

    caplog.set_level(logging.WARNING)

    logger = logging.getLogger("test")
    assets = np._validate_inventory_assets(logger, "ACME", assets_raw=[{"_id": "x", "k": 1}])

    assert assets == [{"k": 1}]
    assert "Inventory validation failed" in caplog.text


def test_run_streams_lines_and_succeeds(monkeypatch, caplog):
    import cloudshield.Server.tasks.network_provisioning as np

    caplog.set_level(logging.DEBUG, logger="np_test")

    logger = logging.getLogger("np_test")

    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["l1\n", "l2\n", "l3\n"])
    mock_proc.returncode = 0

    def fake_popen(*_args, **_kwargs):
        return mock_proc

    monkeypatch.setattr(np.subprocess, "Popen", fake_popen)

    out = list(np._run(["echo", "x"], cwd="/tmp", logger=logger))
    assert out == ["l1", "l2", "l3"]
    assert "Executing command" in caplog.text
    assert "Command succeeded" in caplog.text


def test_run_calls_wait_if_returncode_none(monkeypatch):
    import cloudshield.Server.tasks.network_provisioning as np

    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["ok\n"])
    mock_proc.returncode = None
    mock_proc.wait.return_value = 0

    monkeypatch.setattr(np.subprocess, "Popen", lambda *_a, **_k: mock_proc)

    out = list(np._run(["echo", "x"], cwd="/tmp"))
    assert out == ["ok"]
    mock_proc.wait.assert_called_once()


def test_run_raises_calledprocesserror_on_failure(monkeypatch, caplog):
    import cloudshield.Server.tasks.network_provisioning as np

    caplog.set_level(logging.ERROR, logger="np_fail")
    logger = logging.getLogger("np_fail")

    mock_proc = unittest.mock.MagicMock()
    mock_proc.stdout = iter(["e1\n", "e2\n"])
    mock_proc.returncode = 1

    monkeypatch.setattr(np.subprocess, "Popen", lambda *_a, **_k: mock_proc)

    with unittest.mock.patch.object(logger, "error") as _:
        try:
            list(np._run(["false"], cwd="/tmp", logger=logger))
            assert False, "expected CalledProcessError"
        except subprocess.CalledProcessError as exc:
            assert exc.returncode == 1


def test_provision_network_docker_success_inserts_inventory(monkeypatch):
    import cloudshield.Server.tasks.network_provisioning as np

    job = _fake_job("job-1")
    monkeypatch.setattr(np, "get_current_job", lambda: job)
    monkeypatch.setattr(np, "get_job_id_fallback", lambda: "job-fallback")

    monkeypatch.setattr(np, "set_progress", lambda *_a, **_k: None)
    monkeypatch.setattr(np, "get_logger", lambda *_a, **_k: unittest.mock.MagicMock())

    orgs = unittest.mock.MagicMock()
    orgs.find_one.return_value = {"workstation_limit": 3}
    monkeypatch.setattr(np, "organizations", orgs)
    monkeypatch.setattr(np, "org_filter", lambda org_id: {"org_id": org_id})

    # Force docker path
    monkeypatch.setenv("DEPLOYMENT_MODE", "docker")

    fake_meta = [{"name": "x"}]
    monkeypatch.setattr(np, "provision_network_docker", lambda **_kwargs: fake_meta)

    monkeypatch.setattr(np, "map_metadata_to_ec2_instances", lambda metadata: [{"asset": 1}])

    inserted = []
    monkeypatch.setattr(
        np,
        "insert_inventory",
        lambda db, org_id, assets: inserted.append((org_id, assets)) or SimpleNamespace(inserted_id="inv"),
    )
    monkeypatch.setattr(np, "db", unittest.mock.MagicMock())

    # avoid pydantic dependency in test: validate just returns normalized
    monkeypatch.setattr(np, "_validate_inventory_assets", lambda logger, org_id, assets_raw: assets_raw)

    res = np.provision_network("ACME", workstation_count=2)
    assert res["status"] == "success"
    assert inserted and inserted[0][0] == "ACME"


def test_provision_network_docker_no_metadata_sets_details(monkeypatch):
    import cloudshield.Server.tasks.network_provisioning as np

    job = _fake_job("job-2")
    monkeypatch.setattr(np, "get_current_job", lambda: job)
    monkeypatch.setattr(np, "get_job_id_fallback", lambda: "job-fallback")
    monkeypatch.setattr(np, "set_progress", lambda *_a, **_k: None)
    monkeypatch.setattr(np, "get_logger", lambda *_a, **_k: unittest.mock.MagicMock())

    orgs = unittest.mock.MagicMock()
    orgs.find_one.return_value = {}
    monkeypatch.setattr(np, "organizations", orgs)
    monkeypatch.setattr(np, "org_filter", lambda org_id: {"org_id": org_id})

    monkeypatch.setenv("DEPLOYMENT_MODE", "docker")

    monkeypatch.setattr(np, "provision_network_docker", lambda **_kwargs: None)

    res = np.provision_network("ACME")
    assert res["status"] == "error"
    assert "details" in job.meta


def test_provision_network_terraform_none_sets_details(monkeypatch):
    import cloudshield.Server.tasks.network_provisioning as np

    job = _fake_job("job-3")
    monkeypatch.setattr(np, "get_current_job", lambda: job)
    monkeypatch.setattr(np, "get_job_id_fallback", lambda: "job-fallback")
    monkeypatch.setattr(np, "set_progress", lambda *_a, **_k: None)
    monkeypatch.setattr(np, "get_logger", lambda *_a, **_k: unittest.mock.MagicMock())

    orgs = unittest.mock.MagicMock()
    orgs.find_one.return_value = {}
    monkeypatch.setattr(np, "organizations", orgs)
    monkeypatch.setattr(np, "org_filter", lambda org_id: {"org_id": org_id})

    monkeypatch.delenv("DEPLOYMENT_MODE", raising=False)
    monkeypatch.setattr(np, "_detect_mode", lambda _logger: "terraform")

    monkeypatch.setattr(
        np,
        "provision_network_terraform",
        lambda **_kwargs: None,
    )

    res = np.provision_network("ACME")
    assert res["status"] == "error"
    assert "details" in job.meta


def test_destroy_environment_docker_branch(monkeypatch):
    import cloudshield.Server.tasks.network_provisioning as np

    job = _fake_job("job-4")
    monkeypatch.setattr(np, "get_current_job", lambda: job)
    monkeypatch.setattr(np, "get_job_id_fallback", lambda: "job-fallback")
    monkeypatch.setattr(np, "set_progress", lambda *_a, **_k: None)
    monkeypatch.setattr(np, "get_logger", lambda *_a, **_k: unittest.mock.MagicMock())

    monkeypatch.setattr(np, "_detect_mode", lambda _logger: "docker")

    removed = {"count": 0}

    class FakeContainer:
        def remove(self, force=False):
            removed["count"] += 1

    class FakeDockerClient:
        def __init__(self):
            self.container = self

        def list(self, filters=None):
            return [FakeContainer(), FakeContainer()]

    sys.modules["python_on_whales"] = SimpleNamespace(DockerClient=FakeDockerClient)

    monkeypatch.setattr(np, "delete_inventory_by_org", lambda db, org_id: None)
    monkeypatch.setattr(np, "db", unittest.mock.MagicMock())
    monkeypatch.setattr(np, "_update_org_provisioning_status", lambda *_a, **_k: None)

    res = np.destroy_environment("ACME", force=True)
    assert "Destroy complete" in res["message"]
    assert removed["count"] == 2