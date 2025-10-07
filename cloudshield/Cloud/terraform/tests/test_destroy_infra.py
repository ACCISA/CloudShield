import os
import shutil
import subprocess
import pytest

from cloudshield.Cloud.terraform import destroy_infra


def test_destroy_no_dir(capfd, tmp_path):
    org = "NOPE"
    # point generated dir to tmp where it doesn't exist
    destroy_infra.GENERATED_DIR = str(tmp_path / "generated")

    destroy_infra.destroy(org)
    captured = capfd.readouterr()
    assert "No Terraform directory found" in captured.out


def test_destroy_success(monkeypatch, tmp_path):
    org = "TST"
    base = tmp_path / "generated" / org
    base.mkdir(parents=True)

    called = {}

    def fake_run(cmd, cwd=None, check=False):
        called['cmd'] = cmd
        called['cwd'] = cwd
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(destroy_infra.subprocess, "run", fake_run)

    # ensure directory exists then destroyed
    destroy_infra.GENERATED_DIR = str(tmp_path / "generated")
    destroy_infra.destroy(org)

    assert 'cmd' in called
    assert called['cwd'].endswith(org)
    # directory should be removed
    assert not base.exists()


def test_destroy_handles_calledprocesserror(monkeypatch, tmp_path, capfd):
    """Covers the except branch and directory removal after failure."""
    org = "ERR"
    base = tmp_path / "generated" / org
    base.mkdir(parents=True)

    class FakeError(subprocess.CalledProcessError):
        def __init__(self):
            super().__init__(1, "terraform destroy")

    def fake_run_fail(cmd, cwd=None, check=False):
        raise FakeError()

    monkeypatch.setattr(destroy_infra.subprocess, "run", fake_run_fail)

    destroy_infra.GENERATED_DIR = str(tmp_path / "generated")
    destroy_infra.destroy(org)

    captured = capfd.readouterr()
    assert "Terraform destroy failed" in captured.out
    assert "Directory removed" in captured.out
    assert not base.exists()


def test_destroy_entrypoint(monkeypatch):
    """Covers the __main__ block by reloading the module with sys.argv patched."""
    monkeypatch.setattr("sys.argv", ["destroy_infra.py", "--org-id", "XYZ", "--region", "ca-central-1"])
    monkeypatch.setattr(destroy_infra, "destroy", lambda org, region=None: True)

    import importlib
    importlib.reload(destroy_infra)
