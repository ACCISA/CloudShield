from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

from cloudshield.Cloud.terraform import main as terraform_main


def test_copy_and_replace_templates_replaces_org_id(tmp_path):
    templates = tmp_path / "templates"
    templates.mkdir()
    (templates / "variables.tf").write_text('variable "org_id" { type = string }', encoding="utf-8")
    (templates / "resource.tf").write_text(
        'resource "aws_vpc" "org_id_vpc" { name = "org_id" value = var.org_id }',
        encoding="utf-8",
    )

    target_dir = terraform_main.copy_and_replace_templates(
        "ACME", templates_dir=str(templates), generated_dir=str(tmp_path / "out")
    )

    content = Path(target_dir, "resource.tf").read_text(encoding="utf-8")
    assert "ACME_vpc" in content
    assert 'name = "ACME"' in content
    assert "var.org_id" in content


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


def test_run_terraform_two_phase_apply_executes_commands(tmp_path, monkeypatch):
    commands = []

    def fake_run(cmd, cwd=None, check=None, capture_output=False, text=False):
        commands.append((tuple(cmd), cwd, capture_output, text))
        if cmd[:3] == ["terraform", "output", "-raw"]:
            return SimpleNamespace(stdout="ami-9999")
        return SimpleNamespace()

    monkeypatch.setattr(terraform_main, "cleanup_iam_artifacts", lambda org, region: commands.append(("cleanup", org, region)))
    monkeypatch.setattr(terraform_main, "wait_for_ami", lambda ami, region: commands.append(("wait_for_ami", ami, region)))
    monkeypatch.setattr(terraform_main.subprocess, "run", fake_run)

    terraform_main.run_terraform_two_phase_apply("ACME", "ca-central-1", terraform_dir=str(tmp_path))

    init_cmd = next(entry for entry in commands if isinstance(entry[0], tuple) and entry[0][0] == "terraform")
    assert init_cmd[0][:2] == ("terraform", "init")
    assert ("cleanup", "ACME", "ca-central-1") in commands
    assert ("wait_for_ami", "ami-9999", "ca-central-1") in commands


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
        lambda org, region, terraform_dir: calls.append(("run", org, region, terraform_dir)),
    )
    monkeypatch.setattr(terraform_main, "get_ec2_ips", lambda region, org: calls.append(("ips", region, org)) or ["meta"])

    result = terraform_main.main([
        "--org-id",
        "ACME",
        "--region",
        "us-west-2",
        "--templates-dir",
        str(tmp_path / "templates"),
        "--generated-dir",
        str(tmp_path / "generated"),
    ])

    assert result == ["meta"]
    assert any(op[0] == "run" for op in calls)
