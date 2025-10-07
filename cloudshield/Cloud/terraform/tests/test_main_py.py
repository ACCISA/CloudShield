import os
import subprocess
import pytest

from cloudshield.Cloud.terraform import main as terraform_main


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


def test_get_ec2_ips(monkeypatch, capsys):
    # fake boto3 client
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

    # replace the boto3 module in the imported module with a fake one
    class FakeBoto:
        def client(self, service_name, region_name=None):
            return fake_client(service_name, region_name=region_name)

    monkeypatch.setattr(terraform_main, "boto3", FakeBoto())

    instances = terraform_main.get_ec2_ips("ca-central-1", "TEST")
    assert instances
    assert instances[0]["InstanceId"] == "i-123"

    captured = capsys.readouterr()
    assert "EC2 Instances for TEST" in captured.out
