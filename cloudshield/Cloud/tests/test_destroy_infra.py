import importlib
import os
import subprocess
import sys
from types import SimpleNamespace

import pytest

# needed to import destroyer.py
import cloudshield.Cloud.provisioner.destroyer as destroyer

@pytest.fixture(autouse=True)
def reset_module_state(monkeypatch, tmp_path):
    generated_root = tmp_path / "generated"
    generated_root.mkdir(parents=True, exist_ok=True)
    monkeypatch.setattr(destroyer, "GENERATED_DIR", str(generated_root))
    monkeypatch.setattr(destroyer, "BASE_DIR", str(tmp_path))
    yield


def test_run_cmd_invokes_subprocess(monkeypatch):
    recorded = {}

    def fake_run(cmd, cwd=None, check=None, capture_output=None, text=None):
        recorded["cmd"] = cmd
        recorded["cwd"] = cwd
        recorded["check"] = check
        recorded["capture_output"] = capture_output
        recorded["text"] = text
        return "ok"

    monkeypatch.setattr(destroyer.subprocess, "run", fake_run)

    result = destroyer.run_cmd(["terraform", "version"], cwd="/tmp", capture_output=True)

    assert result == "ok"
    assert recorded == {
        "cmd": ["terraform", "version"],
        "cwd": "/tmp",
        "check": True,
        "capture_output": True,
        "text": True,
    }


def test_terraform_init_if_needed_success(monkeypatch):
    calls = []

    monkeypatch.setattr(destroyer, "run_cmd", lambda cmd, cwd=None, capture_output=False: calls.append((cmd, cwd)))

    destroyer.terraform_init_if_needed("/org")

    assert calls == [(["terraform", "init", "-input=false"], "/org")]


def test_terraform_init_if_needed_failure(monkeypatch):
    class FakeError(subprocess.CalledProcessError):
        def __init__(self):
            super().__init__(1, "terraform init")

    def fake_run(*_args, **_kwargs):
        raise FakeError()

    monkeypatch.setattr(destroyer, "run_cmd", fake_run)

    with pytest.raises(FakeError):
        destroyer.terraform_init_if_needed("/org")


def test_terraform_destroy_success(monkeypatch):
    monkeypatch.setattr(destroyer, "run_cmd", lambda *args, **kwargs: None)

    assert destroyer.terraform_destroy("/org", "ORG", "ca-central-1") is True


def test_terraform_destroy_failure(monkeypatch):
    class FakeError(subprocess.CalledProcessError):
        def __init__(self):
            super().__init__(1, "terraform destroy")

    def fake_run(*_args, **_kwargs):
        raise FakeError()

    monkeypatch.setattr(destroyer, "run_cmd", fake_run)

    assert destroyer.terraform_destroy("/org", "ORG", "ca-central-1") is False


def test_get_terraform_output_returns_value(monkeypatch):
    result = SimpleNamespace(stdout="value\n")
    monkeypatch.setattr(destroyer, "run_cmd", lambda *args, **kwargs: result)

    assert destroyer.get_terraform_output("/org", "bucket") == "value"


def test_get_terraform_output_handles_error(monkeypatch):
    monkeypatch.setattr(destroyer, "run_cmd", lambda *args, **kwargs: (_ for _ in ()).throw(subprocess.CalledProcessError(1, "terraform output")))

    assert destroyer.get_terraform_output("/org", "bucket") is None


def test_empty_s3_bucket_without_boto3():
    destroyer.BOTO3_AVAILABLE = False

    assert destroyer.empty_s3_bucket("bucket", "region") is False


def test_empty_s3_bucket_success(monkeypatch):
    destroyer.BOTO3_AVAILABLE = True

    calls = {"deleted": False}

    class FakeBucket:
        def __init__(self, name):
            self.name = name
            self.object_versions = SimpleNamespace(delete=lambda: calls.setdefault("versions", True))
            self.objects = SimpleNamespace(delete=lambda: calls.setdefault("objects", True))

    class FakeS3:
        def Bucket(self, name):
            calls["bucket"] = name
            return FakeBucket(name)

    fake_boto3 = SimpleNamespace(resource=lambda _service, region_name=None: FakeS3())
    monkeypatch.setattr(destroyer, "boto3", fake_boto3)
    monkeypatch.setattr(destroyer.time, "sleep", lambda *_args: calls.setdefault("slept", True))

    assert destroyer.empty_s3_bucket("bucket", "ca" ) is True
    assert calls["bucket"] == "bucket"
    assert calls["versions"] is True
    assert calls["objects"] is True
    assert calls["slept"] is True


def test_empty_s3_bucket_client_error(monkeypatch):
    destroyer.BOTO3_AVAILABLE = True

    class FakeClientError(Exception):
        pass

    class FakeBucket:
        def object_versions(self):
            raise FakeClientError()

    class FakeS3:
        def Bucket(self, _name):
            class _Bucket:
                object_versions = SimpleNamespace(delete=lambda: (_ for _ in ()).throw(FakeClientError("boom")))
                objects = SimpleNamespace(delete=lambda: None)
            return _Bucket()

    monkeypatch.setattr(destroyer, "ClientError", FakeClientError)
    monkeypatch.setattr(destroyer, "boto3", SimpleNamespace(resource=lambda *_args, **_kwargs: FakeS3()))

    assert destroyer.empty_s3_bucket("bucket", "ca") is False


def test_destroy_missing_directory(caplog):
    destroyer.destroy_infra("UNKNOWN", "UNKNOWN")

    assert "No Terraform directory" in caplog.text


def test_destroy_successful_cleanup(monkeypatch, tmp_path, caplog):
    import logging
    caplog.set_level(logging.INFO)
    
    org = "SUCCESS"
    org_dir = os.path.join(destroyer.GENERATED_DIR, org)
    os.makedirs(org_dir)

    monkeypatch.setattr(destroyer, "terraform_init_if_needed", lambda _dir: None)
    monkeypatch.setattr(destroyer, "terraform_destroy", lambda _dir, _org, _region: True)

    removed = []
    monkeypatch.setattr(destroyer.shutil, "rmtree", lambda path: removed.append(path))

    destroyer.destroy_infra(org, region="ca", force_empty_s3=False, org_dir=org_dir)

    assert "Terraform resources destroyed successfully" in caplog.text
    assert removed == [org_dir]


def test_destroy_failure_no_force(monkeypatch, tmp_path, caplog):
    org = "FAIL"
    org_dir = os.path.join(destroyer.GENERATED_DIR, org)
    os.makedirs(org_dir)

    monkeypatch.setattr(destroyer, "terraform_init_if_needed", lambda _dir: None)
    monkeypatch.setattr(destroyer, "terraform_destroy", lambda *_args: False)

    destroyer.destroy_infra(org, region="ca", force_empty_s3=False,org_dir=org_dir)

    assert "destroy still failed" in caplog.text
    assert os.path.exists(org_dir)


def test_destroy_force_empty_retry_success(monkeypatch, tmp_path, caplog):
    import logging
    caplog.set_level(logging.INFO)
    
    org = "RETRY"
    org_dir = os.path.join(destroyer.GENERATED_DIR, org)
    os.makedirs(org_dir)

    monkeypatch.setattr(destroyer, "terraform_init_if_needed", lambda _dir: None)

    destroy_calls = {"count": 0}

    def fake_destroy(*_args):
        destroy_calls["count"] += 1
        return destroy_calls["count"] == 2

    monkeypatch.setattr(destroyer, "terraform_destroy", fake_destroy)
    monkeypatch.setattr(destroyer, "get_terraform_output", lambda *_args: "bucket")
    monkeypatch.setattr(destroyer, "empty_s3_bucket", lambda *_args: True)
    monkeypatch.setattr(destroyer.shutil, "rmtree", lambda path: None)

    destroyer.destroy_infra(org, region="ca", force_empty_s3=True, org_dir=org_dir)

    assert "Retrying terraform destroy" in caplog.text
    assert destroy_calls["count"] == 2


def test_destroy_force_empty_bucket_missing(monkeypatch, tmp_path, caplog):
    org = "NOBUCKET"
    org_dir = os.path.join(destroyer.GENERATED_DIR, org)
    os.makedirs(org_dir)

    monkeypatch.setattr(destroyer, "terraform_init_if_needed", lambda _dir: None)
    monkeypatch.setattr(destroyer, "terraform_destroy", lambda *_args: False)
    monkeypatch.setattr(destroyer, "get_terraform_output", lambda *_args: None)

    destroyer.destroy_infra(org, region="ca", force_empty_s3=True, org_dir=org_dir)

    assert "Could not find 'agent_s3_bucket'" in caplog.text
    assert os.path.exists(org_dir)


def test_destroy_directory_removal_failure(monkeypatch, tmp_path, caplog):
    org = "RMERR"
    org_dir = os.path.join(destroyer.GENERATED_DIR, org)
    os.makedirs(org_dir)

    monkeypatch.setattr(destroyer, "terraform_init_if_needed", lambda _dir: None)
    monkeypatch.setattr(destroyer, "terraform_destroy", lambda *_args: True)

    def failing_rmtree(path):
        raise OSError("cannot remove")

    monkeypatch.setattr(destroyer.shutil, "rmtree", failing_rmtree)

    destroyer.destroy_infra(org, region="ca", force_empty_s3=False, org_dir=org_dir)

    assert "Failed to remove local directory" in caplog.text


def test_destroy_force_empty_retry_failure(monkeypatch, tmp_path, caplog):
    org = "RETRYFAIL"
    org_dir = os.path.join(destroyer.GENERATED_DIR, org)
    os.makedirs(org_dir)

    monkeypatch.setattr(destroyer, "terraform_init_if_needed", lambda _dir: None)
    monkeypatch.setattr(destroyer, "terraform_destroy", lambda *_args: False)
    monkeypatch.setattr(destroyer, "get_terraform_output", lambda *_args: "bucket")
    monkeypatch.setattr(destroyer, "empty_s3_bucket", lambda *_args: False)

    destroyer.destroy_infra(org, region="ca", force_empty_s3=True, org_dir=org_dir)

    assert "destroy still failed" in caplog.text
    assert os.path.exists(org_dir)


def test_main_warns_when_force_empty_without_boto3(monkeypatch, caplog):
    module_name = "cloudshield.Cloud.provisioner.destroyer"
    sys.modules.pop(module_name, None)



    monkeypatch.setattr(os.path, "exists", lambda _path: False)

    destroyer.destroy_infra("CLI", "CLI", force_empty_s3=True)
    
    assert "No Terraform directory found for org CLI" in caplog.text


    module = importlib.import_module(module_name)
    globals()["destroyer"] = module


def test_destroy_init_failure(monkeypatch, tmp_path, caplog):
    org = "INITFAIL"
    org_dir = os.path.join(destroyer.GENERATED_DIR, org)
    os.makedirs(org_dir)
    
    def fake_init(_dir):
        raise Exception("Init failed")
    
    monkeypatch.setattr(destroyer, "terraform_init_if_needed", fake_init)
    
    destroyer.destroy_infra(org, region="ca", force_empty_s3=False, org_dir=org_dir)
    
    assert "Aborting due to terraform init failure" in caplog.text
    assert os.path.exists(org_dir)


def test_destroy_with_server_logger(monkeypatch, tmp_path, caplog):
    import logging
    custom_logger = logging.getLogger("custom")
    caplog.set_level(logging.INFO, logger="custom")
    
    org = "LOGTEST"
    org_dir = os.path.join(destroyer.GENERATED_DIR, org)
    os.makedirs(org_dir)
    
    monkeypatch.setattr(destroyer, "terraform_init_if_needed", lambda _dir: None)
    monkeypatch.setattr(destroyer, "terraform_destroy", lambda *_args: True)
    monkeypatch.setattr(destroyer.shutil, "rmtree", lambda path: None)
    
    destroyer.destroy_infra(org, region="ca", force_empty_s3=False, org_dir=org_dir, server_logger=custom_logger)
    
    assert "Destroying infrastructure" in caplog.text


def test_empty_s3_bucket_handles_empty_bucket(monkeypatch):
    destroyer.BOTO3_AVAILABLE = True

    class FakeBucket:
        def __init__(self, name):
            self.name = name
            self.object_versions = SimpleNamespace(delete=lambda: None)
            self.objects = SimpleNamespace(delete=lambda: None)

    class FakeS3:
        def Bucket(self, name):
            return FakeBucket(name)

    fake_boto3 = SimpleNamespace(resource=lambda _service, region_name=None: FakeS3())
    monkeypatch.setattr(destroyer, "boto3", fake_boto3)
    monkeypatch.setattr(destroyer.time, "sleep", lambda *_args: None)

    assert destroyer.empty_s3_bucket("empty-bucket", "ca") is True


def test_get_terraform_output_strips_whitespace(monkeypatch):
    result = SimpleNamespace(stdout="  value  \n\t")
    monkeypatch.setattr(destroyer, "run_cmd", lambda *args, **kwargs: result)

    assert destroyer.get_terraform_output("/org", "bucket") == "value"


def test_terraform_destroy_with_different_region(monkeypatch):
    calls = []
    
    def fake_run(cmd, cwd=None, capture_output=False):
        calls.append(cmd)
        return None
    
    monkeypatch.setattr(destroyer, "run_cmd", fake_run)

    assert destroyer.terraform_destroy("/org", "ORG", "us-east-1") is True
    assert any("us-east-1" in str(call) for call in calls)
