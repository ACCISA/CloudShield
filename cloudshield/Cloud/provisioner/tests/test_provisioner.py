from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

import pytest
import logging

import cloudshield.Cloud.provisioner.provision as terraform_main

def test_copy_and_replace_templates_replaces_org_id(tmp_path):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "variables.tf").write_text('variable "org_id" { type = string }', encoding="utf-8")
    (templates / "resource.tf").write_text(
        'resource "aws_vpc" "org_id_vpc" { name = "org_id" value = var.org_id }',
        encoding="utf-8",
    )
    (templates / "README.md").write_text("ignore me", encoding="utf-8")

    target_dir = terraform_main.copy_and_replace_templates(
        "ACME", templates_dir=str(templates), generated_dir=str(tmp_path / "out")
    )

    content = Path(target_dir, "resource.tf").read_text(encoding="utf-8")
    assert "ACME_vpc" in content
    assert 'name = "ACME"' in content
    assert "var.org_id" in content


def test_copy_and_replace_templates_overwrites_existing_directory(tmp_path, capsys):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "variables.tf").write_text('variable "org_id" { type = string }', encoding="utf-8")

    first_run = terraform_main.copy_and_replace_templates(
        "ACME", templates_dir=str(templates), generated_dir=str(tmp_path / "out")
    )
    assert Path(first_run).exists()

    second_run = terraform_main.copy_and_replace_templates(
        "ACME", templates_dir=str(templates), generated_dir=str(tmp_path / "out")
    )

    capsys.readouterr()
    assert second_run is None


class _FakeIAM:
    def __init__(self, calls):
        self.calls = calls

    def get_instance_profile(self, InstanceProfileName):
        self.calls.append(("get_instance_profile", InstanceProfileName))
        return {
            "InstanceProfile": {
                "Roles": [
                    {
                        "RoleName": "ACME-cloudshield-builder-role",
                    }
                ]
            }
        }

    def remove_role_from_instance_profile(self, InstanceProfileName, RoleName):
        self.calls.append(("remove_role", InstanceProfileName, RoleName))

    def delete_instance_profile(self, InstanceProfileName):
        self.calls.append(("delete_instance_profile", InstanceProfileName))

    def get_role(self, RoleName):
        self.calls.append(("get_role", RoleName))
        return {"Role": {"RoleName": RoleName}}

    def list_role_policies(self, RoleName):
        self.calls.append(("list_role_policies", RoleName))
        return {"PolicyNames": ["inline-policy"]}

    def delete_role_policy(self, RoleName, PolicyName):
        self.calls.append(("delete_role_policy", RoleName, PolicyName))

    def list_attached_role_policies(self, RoleName):
        self.calls.append(("list_attached", RoleName))
        return {
            "AttachedPolicies": [
                {
                    "PolicyArn": "arn:aws:iam::123:policy/managed",
                    "PolicyName": "managed",
                }
            ]
        }

    def detach_role_policy(self, RoleName, PolicyArn):
        self.calls.append(("detach_role_policy", RoleName, PolicyArn))

    def delete_role(self, RoleName):
        self.calls.append(("delete_role", RoleName))


class _FakeEC2:
    def __init__(self, calls, keypair_error=None):
        self.calls = calls
        self.keypair_error = keypair_error

    def delete_key_pair(self, KeyName):
        self.calls.append(("delete_key_pair", KeyName))
        if self.keypair_error:
            raise self.keypair_error

    def get_waiter(self, name):
        assert name == "image_available"

        calls = self.calls

        class Waiter:
            def wait(self_inner, ImageIds):
                calls.append(("wait", tuple(ImageIds)))

        return Waiter()

    def describe_instances(self):  # pragma: no cover - other tests use dedicated fakes
        return {}


def test_cleanup_iam_artifacts_removes_resources(monkeypatch):
    calls = []

    def fake_client(service_name, region_name=None):
        if service_name == "iam":
            return _FakeIAM(calls)
        if service_name == "ec2":
            return _FakeEC2(calls)
        raise AssertionError("unexpected service")

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=fake_client))

    terraform_main.cleanup_iam_artifacts("ACME", "ca-central-1")

    recorded_ops = {op[0] for op in calls}
    assert {
        "get_instance_profile",
        "remove_role",
        "delete_instance_profile",
        "get_role",
        "list_role_policies",
        "delete_role_policy",
        "list_attached",
        "detach_role_policy",
        "delete_role",
        "delete_key_pair",
    }.issubset(recorded_ops)


def test_cleanup_iam_artifacts_handles_absent_resources(monkeypatch):
    calls = []

    def fake_client(service_name, region_name=None):
        if service_name == "iam":
            return _FakeIAM(calls)
        if service_name == "ec2":
            return _FakeEC2(
                calls,
                keypair_error=terraform_main.ClientError(
                    {"Error": {"Code": "InvalidKeyPair.NotFound"}}, "delete_key_pair"
                ),
            )
        raise AssertionError("unexpected service")

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=fake_client))

    terraform_main.cleanup_iam_artifacts("ACME", "ca-central-1")
    assert any(op[0] == "delete_key_pair" for op in calls)


def test_cleanup_iam_artifacts_swallows_nosuchentity_errors(monkeypatch):
    class MissingIAM:
        def __init__(self):
            self.profile_called = False

        def get_instance_profile(self, InstanceProfileName):
            return {
                "InstanceProfile": {
                    "Roles": [
                        {
                            "RoleName": "ACME-cloudshield-builder-role",
                        }
                    ]
                }
            }

        def remove_role_from_instance_profile(self, InstanceProfileName, RoleName):
            raise terraform_main.ClientError({"Error": {"Code": "NoSuchEntity"}}, "remove_role")

        def delete_instance_profile(self, InstanceProfileName):
            raise terraform_main.ClientError({"Error": {"Code": "NoSuchEntity"}}, "delete_profile")

        def get_role(self, RoleName):
            return {"Role": {"RoleName": RoleName}}

        def list_role_policies(self, RoleName):
            return {"PolicyNames": []}

        def delete_role_policy(self, RoleName, PolicyName):
            raise terraform_main.ClientError(
                {"Error": {"Code": "NoSuchEntityException"}}, "delete_role_policy"
            )

        def list_attached_role_policies(self, RoleName):
            return {"AttachedPolicies": [{"PolicyArn": "arn", "PolicyName": "managed"}]}

        def detach_role_policy(self, RoleName, PolicyArn):
            raise terraform_main.ClientError({"Error": {"Code": "NoSuchEntity"}}, "detach_role_policy")

        def delete_role(self, RoleName):
            raise terraform_main.ClientError({"Error": {"Code": "NoSuchEntity"}}, "delete_role")

    class SilentEC2:
        def delete_key_pair(self, KeyName):
            return None

    def fake_client(service_name, region_name=None):
        if service_name == "iam":
            return MissingIAM()
        if service_name == "ec2":
            return SilentEC2()
        raise AssertionError("unexpected service")

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=fake_client))

    terraform_main.cleanup_iam_artifacts("ACME", "ca-central-1")


def test_cleanup_iam_artifacts_handles_absent_role(monkeypatch, capsys):
    class MissingRoleIAM:
        def get_instance_profile(self, InstanceProfileName):
            raise terraform_main.ClientError({"Error": {"Code": "NoSuchEntity"}}, "get_instance_profile")

        def get_role(self, RoleName):
            raise terraform_main.ClientError({"Error": {"Code": "NoSuchEntity"}}, "get_role")

    class SilentEC2:
        def delete_key_pair(self, KeyName):
            return None

    def fake_client(service_name, region_name=None):
        if service_name == "iam":
            return MissingRoleIAM()
        if service_name == "ec2":
            return SilentEC2()
        raise AssertionError("unexpected service")

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=fake_client))

    terraform_main.cleanup_iam_artifacts("ACME", "ca-central-1")
    captured = capsys.readouterr()
    assert "" == captured.out


def test_wait_for_ami_uses_waiter(monkeypatch):
    wait_calls = []

    class FakeEC2:
        def get_waiter(self, name):
            assert name == "image_available"

            class Waiter:
                def wait(self_inner, ImageIds):
                    wait_calls.append(tuple(ImageIds))

            return Waiter()

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=lambda svc, region_name=None: FakeEC2()))
    terraform_main.wait_for_ami("ami-123", "ca-central-1")
    assert wait_calls == [("ami-123",)]


def test_wait_for_ami_raises_on_timeout(monkeypatch):
    class FakeWaiter:
        def wait(self, ImageIds):
            raise terraform_main.WaiterError(name="image_available", reason="timeout", last_response={})

    class FakeEC2:
        def get_waiter(self, name):
            return FakeWaiter()

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=lambda svc, region_name=None: FakeEC2()))

    with pytest.raises(RuntimeError) as exc:
        terraform_main.wait_for_ami("ami-123", "ca-central-1")

    assert "did not become available" in str(exc.value)


def test_get_ec2_ips_skips_instances_without_matching_name(monkeypatch):
    class FakeEC2:
        def describe_instances(self):
            return {
                "Reservations": [
                    {
                        "Instances": [
                            {
                                "InstanceId": "i-1",
                                "Tags": [{"Key": "Owner", "Value": "Other"}],
                                "State": {"Name": "running"},
                            }
                        ]
                    }
                ]
            }

        def describe_volumes(self, VolumeIds):
            raise AssertionError("volume lookup should not happen")

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=lambda svc, region_name=None: FakeEC2()))

    assert terraform_main.get_ec2_ips("ca-central-1", "ACME") == []


def test_get_ec2_ips_returns_metadata(monkeypatch):
    now = datetime.utcnow()

    class FakeEC2:
        def describe_instances(self):
            return {
                "Reservations": [
                    {
                        "Instances": [
                            {
                                "InstanceId": "i-123",
                                "ImageId": "ami-1",
                                "InstanceType": "t3.micro",
                                "Tags": [{"Key": "Name", "Value": "cloudshield-ACME-node"}],
                                "State": {"Name": "running"},
                                "VpcId": "vpc-1",
                                "SubnetId": "subnet-1",
                                "KeyName": "ACME_key",
                                "CpuOptions": {"CoreCount": 2},
                                "LaunchTime": now,
                                "SecurityGroups": [{"GroupId": "sg-1"}],
                                "PrivateIpAddress": "10.0.0.10",
                                "PublicIpAddress": "3.3.3.3",
                                "PlatformDetails": "Windows",
                                "BlockDeviceMappings": [
                                    {"Ebs": {"VolumeId": "vol-1"}},
                                    {"Ebs": {"VolumeId": "vol-2"}},
                                ],
                            }
                        ]
                    }
                ]
            }

        def describe_volumes(self, VolumeIds):
            return {"Volumes": [{"Size": 15} for _ in VolumeIds]}

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=lambda svc, region_name=None: FakeEC2()))

    results = terraform_main.get_ec2_ips("ca-central-1", "ACME")
    assert results
    instance = results[0]
    assert instance["storage_size_gb"] == 30
    assert instance["cpu"] == 2
    assert instance["ram_gb"] == "t3.micro"
    assert instance["os"] == "Windows"
    assert instance["ports"] == ["sg-1"]


def test_get_ec2_ips_returns_empty(monkeypatch):
    class FakeEC2:
        def describe_instances(self):
            return {"Reservations": []}

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=lambda svc, region_name=None: FakeEC2()))
    assert terraform_main.get_ec2_ips("ca-central-1", "ACME") == []


def test_main_invokes_helpers(monkeypatch, tmp_path):
    calls = []

    def fake_copy(org_id, templates_dir=None, generated_dir=None):
        calls.append(("copy", org_id, templates_dir, generated_dir))
        target = tmp_path / "generated"
        target.mkdir(exist_ok=True)
        return str(target)

    monkeypatch.setattr(terraform_main, "copy_and_replace_templates", fake_copy)
    monkeypatch.setattr(
        terraform_main,
        "run_terraform_two_phase_apply",
        lambda org, region, terraform_dir, count: calls.append(("run", org, region, terraform_dir, count)),
    )
    monkeypatch.setattr(terraform_main, "get_ec2_ips", lambda region, org: calls.append(("ips", region, org)) or ["meta"])

    result = terraform_main.provision_network_terraform(
        "ACME",
        "us-west-2",
        str(tmp_path / "templates"),
        str(tmp_path / "generated"),
        0,
        server_logger=logging.getLogger()
    )

    assert result == ["meta"]
    assert any(op[0] == "run" for op in calls)


def test_main_returns_none_when_copy_returns_none(monkeypatch, tmp_path):
    monkeypatch.setattr(terraform_main, "copy_and_replace_templates", lambda *args, **kwargs: None)

    result = terraform_main.provision_network_terraform(
        "ACME",
        "us-west-2",
        str(tmp_path / "templates"),
        str(tmp_path / "generated"),
        0,
        server_logger=logging.getLogger()
    )

    assert result is None


def test_run_terraform_two_phase_apply_runs_init_and_apply(monkeypatch, tmp_path):
    import subprocess
    calls = []

    class FakeCompletedProcess:
        def __init__(self, returncode=0, stdout="", stderr=""):
            self.returncode = returncode
            self.stdout = stdout
            self.stderr = stderr

    def fake_run(cmd, cwd=None, capture_output=False, text=False):
        calls.append(("run", cmd, cwd))
        return FakeCompletedProcess()

    monkeypatch.setattr(subprocess, "run", fake_run)

    terraform_main.run_terraform_two_phase_apply("ACME", "ca-central-1", str(tmp_path),0)

    # Should have init and apply calls
    assert any("init" in str(call) for call in calls)
    assert any("apply" in str(call) for call in calls)


def test_run_terraform_two_phase_apply_raises_on_init_failure(monkeypatch, tmp_path):
    import subprocess

    class FakeCompletedProcess:
        def __init__(self, returncode=0, stdout="", stderr="", args=None):
            self.returncode = returncode
            self.stdout = stdout
            self.stderr = stderr
            self.args = args or []

    def fake_run(cmd, cwd=None, capture_output=False, text=False):
        if "init" in cmd:
            return FakeCompletedProcess(returncode=1, stderr="init failed", args=cmd)
        return FakeCompletedProcess(args=cmd)

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(subprocess.CalledProcessError):
        terraform_main.run_terraform_two_phase_apply("ACME", "ca-central-1", str(tmp_path),0)


def test_run_terraform_two_phase_apply_raises_on_apply_failure(monkeypatch, tmp_path):
    import subprocess

    class FakeCompletedProcess:
        def __init__(self, returncode=0, stdout="", stderr="", args=None):
            self.returncode = returncode
            self.stdout = stdout
            self.stderr = stderr
            self.args = args or []

    def fake_run(cmd, cwd=None, capture_output=False, text=False):
        if "apply" in cmd:
            return FakeCompletedProcess(returncode=1, stderr="apply failed", args=cmd)
        return FakeCompletedProcess(args=cmd)

    monkeypatch.setattr(subprocess, "run", fake_run)

    with pytest.raises(subprocess.CalledProcessError):
        terraform_main.run_terraform_two_phase_apply("ACME", "ca-central-1", str(tmp_path),0)


def test_cleanup_iam_artifacts_handles_key_pair_not_found_exception(monkeypatch):
    calls = []

    def fake_client(service_name, region_name=None):
        if service_name == "iam":
            return _FakeIAM(calls)
        if service_name == "ec2":
            return _FakeEC2(
                calls,
                keypair_error=terraform_main.ClientError(
                    {"Error": {"Code": "InvalidKeyPair.NotFoundException"}}, "delete_key_pair"
                ),
            )
        raise AssertionError("unexpected service")

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=fake_client))

    terraform_main.cleanup_iam_artifacts("ACME", "ca-central-1")
    assert any(op[0] == "delete_key_pair" for op in calls)


def test_get_ec2_ips_skips_non_running_instances(monkeypatch):
    class FakeEC2:
        def describe_instances(self):
            return {
                "Reservations": [
                    {
                        "Instances": [
                            {
                                "InstanceId": "i-1",
                                "Tags": [{"Key": "Name", "Value": "ACME-instance"}],
                                "State": {"Name": "stopped"},
                            }
                        ]
                    }
                ]
            }

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=lambda svc, region_name=None: FakeEC2()))

    assert terraform_main.get_ec2_ips("ca-central-1", "ACME") == []


def test_get_ec2_ips_handles_instances_without_tags(monkeypatch):
    class FakeEC2:
        def describe_instances(self):
            return {
                "Reservations": [
                    {
                        "Instances": [
                            {
                                "InstanceId": "i-1",
                                "State": {"Name": "running"},
                            }
                        ]
                    }
                ]
            }

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=lambda svc, region_name=None: FakeEC2()))

    assert terraform_main.get_ec2_ips("ca-central-1", "ACME") == []


def test_get_ec2_ips_handles_missing_optional_fields(monkeypatch):
    now = datetime.utcnow()

    class FakeEC2:
        def describe_instances(self):
            return {
                "Reservations": [
                    {
                        "Instances": [
                            {
                                "InstanceId": "i-123",
                                "Tags": [{"Key": "Name", "Value": "ACME-node"}],
                                "State": {"Name": "running"},
                                "LaunchTime": now,
                                "BlockDeviceMappings": [],
                            }
                        ]
                    }
                ]
            }

        def describe_volumes(self, VolumeIds):
            return {"Volumes": []}

    monkeypatch.setattr(terraform_main, "boto3", SimpleNamespace(client=lambda svc, region_name=None: FakeEC2()))

    results = terraform_main.get_ec2_ips("ca-central-1", "ACME")
    assert len(results) == 1
    assert results[0]["storage_size_gb"] == 0
