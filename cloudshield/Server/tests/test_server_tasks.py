import importlib
import sys
import pathlib
import secrets


def _repo_root():
    return pathlib.Path(__file__).parents[3]


def test_create_ec2_returns_string():
    repo = str(_repo_root())
    if repo not in sys.path:
        sys.path.insert(0, repo)

    tasks = importlib.import_module("cloudshield.Server.tasks")

    res = tasks.create_ec2(instance_type="t2.micro", ami="ami-test")
    assert isinstance(res, str)
    assert "EC2" in res or "instance" in res


def test_create_vpc_returns_string():
    repo = str(_repo_root())
    if repo not in sys.path:
        sys.path.insert(0, repo)

    tasks = importlib.import_module("cloudshield.Server.tasks")

    # avoid hardcoding a single IP in tests — generate a safe RFC1918 private CIDR
    # Use 10.<random>.0.0/16 so tests don't rely on any real infrastructure address
    cidr = f"10.{secrets.randbelow(256)}.0.0/16"

    res = tasks.create_vpc(cidr=cidr)
    assert isinstance(res, str)
    assert "VPC" in res or "vpc" in res.lower()
