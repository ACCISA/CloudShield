import types
import pathlib
import pytest
import cloudshield.Server.tasks as tasks


class FakeProc:
    def __init__(self, lines, returncode=0):
        self._lines = lines
        self.returncode = returncode
        self.stdout = (l + "\n" for l in lines)

    def wait(self):
        # no-op
        pass


def test__run_success(monkeypatch, tmp_path):
    captured = []

    def fake_popen(cmd, cwd, env, stdout, stderr, text):  # noqa: D401 - signature mimic
        return FakeProc(["line1", "line2"], returncode=0)

    monkeypatch.setattr(tasks.subprocess, "Popen", fake_popen)
    for line in tasks._run(["terraform", "version"], cwd=str(tmp_path)):
        captured.append(line)
    assert captured == ["line1", "line2"]


def test__run_failure(monkeypatch, tmp_path):
    def fake_popen(cmd, cwd, env, stdout, stderr, text):
        return FakeProc(["err1", "err2"], returncode=1)

    monkeypatch.setattr(tasks.subprocess, "Popen", fake_popen)
    with pytest.raises(tasks.subprocess.CalledProcessError):
        list(tasks._run(["terraform", "init"], cwd=str(tmp_path)))


def test_provision_network_basic(monkeypatch, tmp_path):
    # Patch base_dir resolution so it uses our tmp structure
    base_dir = tmp_path
    templates = base_dir / "Cloud" / "templates"
    templates.mkdir(parents=True)
    (templates / "main.tf").write_text('region = "ca-central-1"\n# org_id placeholder', encoding="utf-8")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    # parents[1] will yield base_dir in tasks.provision_network
    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    # Patch _run to simulate terraform init/apply output
    def fake_run(cmd, cwd, env=None):  # noqa: D401
        yield f"executed: {' '.join(cmd)}"

    monkeypatch.setattr(tasks, "_run", fake_run)

    result = tasks.provision_network("acme", region="us-east-1", ubuntu_ami="ami-123")
    assert result["message"] == "Provisioning complete"
    work_dir = pathlib.Path(result["work_dir"])
    assert (work_dir / "main.tf").read_text(encoding="utf-8").find("acme") != -1
    assert (work_dir / "terraform.tfvars").exists()


def test_destroy_environment_missing(monkeypatch, tmp_path):
    base_dir = tmp_path
    (base_dir / "Cloud" / "runs").mkdir(parents=True)

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    res = tasks.destroy_environment("nope")
    assert res["removed_dir"] is False


def test_destroy_environment_success(monkeypatch, tmp_path):
    base_dir = tmp_path
    work_dir = base_dir / "Cloud" / "runs" / "org1"
    work_dir.mkdir(parents=True)
    (work_dir / "dummy.txt").write_text("x")

    def fake_resolve(self):
        return (base_dir / "dummy" / "dummy.py")

    monkeypatch.setattr(pathlib.Path, "resolve", fake_resolve, raising=False)

    def fake_run(cmd, cwd, env=None):
        yield "ok"

    monkeypatch.setattr(tasks, "_run", fake_run)

    res = tasks.destroy_environment("org1")
    assert res["removed_dir"] is True
    assert not work_dir.exists()
