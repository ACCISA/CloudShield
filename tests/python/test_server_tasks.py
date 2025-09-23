import importlib.util
import pathlib


def _load_module(path_parts, name="mod"):
    path = pathlib.Path(__file__).parents[2].joinpath(*path_parts)
    spec = importlib.util.spec_from_file_location(name, str(path))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def test_create_ec2_returns_string():
    tasks = _load_module(["cloudshield", "Server", "tasks.py"], "tasks_mod")

    res = tasks.create_ec2(instance_type="t2.micro", ami="ami-test")
    assert isinstance(res, str)
    assert "EC2" in res or "instance" in res


def test_create_vpc_returns_string():
    tasks = _load_module(["cloudshield", "Server", "tasks.py"], "tasks_mod")

    res = tasks.create_vpc(cidr="10.1.0.0/16")
    assert isinstance(res, str)
    assert "VPC" in res or "VPC".lower()
