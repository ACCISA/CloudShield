from pathlib import Path
from subprocess import CalledProcessError
from types import SimpleNamespace
from unittest.mock import MagicMock

import cloudshield.Cloud.docker_provisioner.provision as docker_provision


def _cp(returncode=0, stdout="", stderr=""):
    return SimpleNamespace(returncode=returncode, stdout=stdout, stderr=stderr)


def test_connect_container_to_network_skips_blank_name(monkeypatch):
    logger = MagicMock()

    called = []

    def _run(*_a, **_k):
        called.append(True)
        return _cp(0)

    monkeypatch.setattr(docker_provision.subprocess, "run", _run)

    docker_provision._connect_container_to_network("org-net", "  ", logger)

    assert called == []


def test_connect_container_to_network_skips_missing_container(monkeypatch):
    logger = MagicMock()

    calls = []

    def _run(cmd, **_kwargs):
        calls.append(cmd)
        return _cp(returncode=1, stderr="No such container")

    monkeypatch.setattr(docker_provision.subprocess, "run", _run)

    docker_provision._connect_container_to_network("org-net", "cs-ui-dev", logger)

    assert len(calls) == 1
    assert calls[0][:2] == ["docker", "inspect"]
    logger.info.assert_called()


def test_connect_container_to_network_handles_already_connected(monkeypatch):
    logger = MagicMock()

    calls = []

    def _run(cmd, **_kwargs):
        calls.append(cmd)
        if cmd[:2] == ["docker", "inspect"]:
            return _cp(returncode=0)
        raise CalledProcessError(1, cmd, output="", stderr="already connected")

    monkeypatch.setattr(docker_provision.subprocess, "run", _run)

    docker_provision._connect_container_to_network("org-net", "cs-api-test-dev", logger)

    assert len(calls) == 2
    logger.warning.assert_not_called()
    logger.info.assert_called()


def test_connect_runtime_containers_to_org_network_uses_defaults(monkeypatch):
    logger = MagicMock()
    monkeypatch.delenv("CS_API_CONTAINER", raising=False)
    monkeypatch.delenv("CS_UI_CONTAINER", raising=False)

    connected = []

    def _connect(network_name, container_name, _logger):
        connected.append((network_name, container_name))

    monkeypatch.setattr(docker_provision, "_connect_container_to_network", _connect)

    docker_provision.connect_runtime_containers_to_org_network("org-net", logger)

    assert connected == [
        ("org-net", "cs-api-test-dev"),
        ("org-net", "cs-ui-dev"),
    ]


def test_provision_network_docker_calls_runtime_network_connect(monkeypatch, tmp_path):
    logger = MagicMock()

    connected_networks = []
    monkeypatch.setattr(
        docker_provision,
        "connect_runtime_containers_to_org_network",
        lambda network_name, _logger: connected_networks.append(network_name),
    )

    monkeypatch.setattr(
        docker_provision,
        "ensure_org_network_with_subnet",
        lambda org_id, _logger: ("org-net", "172.23.2.0/24", "172.23.2.1"),
    )
    monkeypatch.setattr(docker_provision, "_resolve_windows_iso_path", lambda _logger: str(tmp_path / "win.iso"))
    monkeypatch.setattr(docker_provision, "_write_compose_override_for_org", lambda **_kwargs: None)
    monkeypatch.setattr(docker_provision, "DockerClient", lambda *a, **k: object())
    monkeypatch.setattr(docker_provision, "setup_ssh_keys", lambda *_a, **_k: (None, None))

    # Avoid writing under /var/lib during this unit test.
    monkeypatch.setattr(docker_provision.Path, "mkdir", lambda self, parents=False, exist_ok=False: None)

    org_data = {
        "org_id": "org1",
        "domain_name": "cloudshield.local",
        "realm_name": "CLOUDSHIELD.LOCAL",
        "dc_admin_password": "Password123!",
    }

    result = docker_provision.provision_network_docker(
        org_data=org_data,
        region="ca-central-1",
        templates_dir=str(tmp_path / "templates"),
        generated_dir=str(tmp_path / "generated"),
        count=1,
        server_logger=logger,
    )

    assert result is None
    assert connected_networks == ["org-net"]
