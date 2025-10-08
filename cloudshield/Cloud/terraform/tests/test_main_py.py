import os
import subprocess
import pytest
from datetime import datetime

from cloudshield.Cloud.terraform import main as terraform_main


# COPY AND REPLACE TESTS
def test_copy_and_replace_templates(tmp_path):
    # create fake templates
    templates = tmp_path / "templates"
    templates.mkdir()

    main_tf = templates / "main.tf"
    main_tf.write_text('resource "aws_instance" "t" { name = "org_id" }')

    vars_tf = templates / "variables.tf"
    vars_tf.write_text('variable "org_id" { type = string }')

    generated = tmp_path / "generated" / "TEST"
    terraform_main.copy_and_replace_templates("TEST", templates_dir=str(templates), generated_dir=str(generated))

    assert generated.exists()
    content = (generated / "main.tf").read_text()
    # main.tf should have 'org_id' replaced with the org id value
    assert "TEST" in content

    # variables.tf should be preserved
    vcontent = (generated / "variables.tf").read_text()
    assert 'variable "org_id"' in vcontent


# TERRAFORM APPLY TESTS
def test_run_terraform_apply_calls(monkeypatch, tmp_path):
    calls = []

    def fake_run(cmd, cwd=None, check=False):
        calls.append((cmd, cwd, check))
        return subprocess.CompletedProcess(cmd, 0)

    monkeypatch.setattr(terraform_main.subprocess, "run", fake_run)

    td = tmp_path / "generated" / "TEST"
    td.mkdir(parents=True)

    terraform_main.run_terraform_apply("TEST", region="ca-central-1", terraform_dir=str(td))

    assert len(calls) >= 2
    assert calls[0][0] == ["terraform", "init"]
    assert calls[0][1] == str(td)
    # second call should be apply
    assert "apply" in calls[1][0]

# EC2 FETCH TESTS
def test_get_ec2_ips(monkeypatch, capsys):
    """Covers standard EC2 instance retrieval and print output."""
    def fake_client(service_name, region_name=None):
        class C:
            def describe_instances(self):
                return {
                    "Reservations": [
                        {
                            "Instances": [
                                {
                                    "InstanceId": "i-123",
                                    "State": {"Name": "running"},
                                    "PrivateIpAddress": "10.0.0.1",
                                    "PublicIpAddress": "1.2.3.4",
                                    "Tags": [{"Key": "Name", "Value": "TEST-instance"}],
                                }
                            ]
                        }
                    ]
                }
        return C()

    class FakeBoto:
        def client(self, service_name, region_name=None):
            return fake_client(service_name, region_name=region_name)

    monkeypatch.setattr(terraform_main, "boto3", FakeBoto())

    instances = terraform_main.get_ec2_ips("ca-central-1", "TEST")
    assert instances
    assert instances[0]["InstanceId"] == "i-123"

    captured = capsys.readouterr()
    assert "EC2 Instances for TEST" in captured.out
    assert "Private IP" in captured.out
    assert "Public IP" in captured.out


def test_get_ec2_ips_no_instances(monkeypatch, capsys):
    """Covers the 'no instances found' branch."""
    class FakeBoto:
        def client(self, service_name, region_name=None):
            class C:
                def describe_instances(self):
                    # Simulate no EC2 instances for the org
                    return {"Reservations": []}
            return C()

    monkeypatch.setattr(terraform_main, "boto3", FakeBoto())

    result = terraform_main.get_ec2_ips("ca-central-1", "ORGEMPTY")
    captured = capsys.readouterr()

    assert result == []
    assert "[!] No EC2 instances found for org: ORGEMPTY" in captured.out


def test_get_ec2_ips_with_instances_print(monkeypatch, capsys):
    """Covers print loop and return path."""
    def fake_client(service_name, region_name=None):
        class C:
            def describe_instances(self):
                return {
                    "Reservations": [
                        {
                            "Instances": [
                                {
                                    "InstanceId": "i-456",
                                    "State": {"Name": "running"},
                                    "PrivateIpAddress": "10.0.0.2",
                                    "PublicIpAddress": "2.3.4.5",
                                    "Tags": [{"Key": "Name", "Value": "ORG-instance"}],
                                }
                            ]
                        }
                    ]
                }
        return C()

    class FakeBoto:
        def client(self, service_name, region_name=None):
            return fake_client(service_name, region_name=region_name)

    monkeypatch.setattr(terraform_main, "boto3", FakeBoto())

    instances = terraform_main.get_ec2_ips("ca-central-1", "ORG")
    captured = capsys.readouterr()

    assert instances
    assert instances[0]["InstanceId"] == "i-456"
    assert "EC2 Instances for ORG" in captured.out
    assert "Private IP" in captured.out
    assert "Public IP" in captured.out


def test_get_ec2_ips_with_volumes_and_metadata(monkeypatch, capsys):
    """Covers EBS volume size calculation, metadata dictionary, and print loop."""
    class FakeEC2Client:
        def describe_instances(self):
            return {
                "Reservations": [
                    {
                        "Instances": [
                            {
                                "InstanceId": "i-999",
                                "VpcId": "vpc-123",
                                "SubnetId": "subnet-999",
                                "KeyName": "test-key",
                                "ImageId": "ami-abc",
                                "PlatformDetails": "Linux",
                                "CpuOptions": {"CoreCount": 2},
                                "InstanceType": "t2.micro",
                                "BlockDeviceMappings": [
                                    {"Ebs": {"VolumeId": "vol-abc"}},
                                    {"Ebs": {"VolumeId": "vol-def"}}
                                ],
                                "LaunchTime": datetime(2024, 1, 1, 12, 0, 0),
                                "SecurityGroups": [{"GroupId": "sg-001"}],
                                "State": {"Name": "running"},
                                "PrivateIpAddress": "10.0.0.9",
                                "PublicIpAddress": "44.55.66.77",
                                "Tags": [{"Key": "Name", "Value": "VOLUMEORG-instance"}],
                            }
                        ]
                    }
                ]
            }

        def describe_volumes(self, VolumeIds):
            # Return different sizes for each volume
            if VolumeIds == ["vol-abc"]:
                return {"Volumes": [{"Size": 50}]}
            elif VolumeIds == ["vol-def"]:
                return {"Volumes": [{"Size": 75}]}
            return {"Volumes": [{"Size": 0}]}

    class FakeBoto:
        def client(self, service_name, region_name=None):
            return FakeEC2Client()

    monkeypatch.setattr(terraform_main, "boto3", FakeBoto())

    result = terraform_main.get_ec2_ips("ca-central-1", "VOLUMEORG")
    captured = capsys.readouterr()

    assert result and isinstance(result, list)
    instance = result[0]

    # Validate all metadata fields
    assert instance["storage_size_gb"] == 125
    assert instance["cpu"] == 2
    assert instance["ram_gb"] == "t2.micro"
    assert instance["os"] == "Linux"
    assert instance["vpc_id"] == "vpc-123"
    assert instance["subnet_id"] == "subnet-999"
    assert instance["ssh_key"] == "test-key"
    assert instance["ami_id"] == "ami-abc"
    assert instance["ports"] == ["sg-001"]
    assert instance["status"] == "running"
    assert instance["private_ip"] == "10.0.0.9"
    assert instance["public_ip"] == "44.55.66.77"
    assert "created_at" in instance and "updated_at" in instance

    # Validate printed output (covers print loop)
    assert "EC2 Instances for VOLUMEORG" in captured.out
    assert "VOLUMEORG-instance" in captured.out
    assert "Private IP" in captured.out
    assert "Public IP" in captured.out
    assert "running" in captured.out



# MAIN FUNCTION TEST


def test_main_invokes_all(monkeypatch, tmp_path, capsys):
    """Covers the main() function and argparse parsing path."""
    called = {"copy": False, "run": False, "ips": False}

    def fake_copy(org_id, templates_dir=None, generated_dir=None):
        called["copy"] = True

    def fake_run(org_id, region=None, terraform_dir=None):
        called["run"] = True

    def fake_ips(region, org_id):
        called["ips"] = True
        return []

    monkeypatch.setattr(terraform_main, "copy_and_replace_templates", fake_copy)
    monkeypatch.setattr(terraform_main, "run_terraform_apply", fake_run)
    monkeypatch.setattr(terraform_main, "get_ec2_ips", fake_ips)

    terraform_main.main([
        "--org-id", "TEST",
        "--region", "ca-central-1",
        "--templates-dir", str(tmp_path),
        "--generated-dir", str(tmp_path / "gen")
    ])

    captured = capsys.readouterr()
    assert "[*] Provisioning for org: TEST" in captured.out
    assert "[✓] Finished provisioning for TEST." in captured.out
    assert all(called.values())
