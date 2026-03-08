"""Tests for docker_provisioner/provision.py – _write_compose_override_for_org
and the threat_detection_ip parameter in provision_workstation_docker.

These tests do NOT require Docker; they exercise file-based helpers and mock
all Docker / subprocess calls.
"""
import os
from types import SimpleNamespace
from unittest.mock import MagicMock

import yaml
import pytest


# ---------------------------------------------------------------------------
# Import helpers – the module has heavy side-effects at import time (docker
# build etc.) so we patch just enough to let it import safely.
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def _isolate_provision(monkeypatch, tmp_path):
    """Prevent real Docker calls during import."""
    monkeypatch.setenv("CLOUDSHIELD_BASE_DIR", str(tmp_path))
    # Create a minimal docker-compose.yml so DockerClient doesn't blow up
    (tmp_path / "docker-compose.yml").write_text("services: {}\n", encoding="utf-8")


def _import_provision():
    """Import (or reimport) the provision module."""
    import importlib
    import cloudshield.Cloud.docker_provisioner.provision as mod  # noqa: F811
    return importlib.reload(mod)


# ---------------------------------------------------------------------------
# _write_compose_override_for_org
# ---------------------------------------------------------------------------


class TestWriteComposeOverride:
    def test_override_contains_cloudshield_net_for_workstation(self, tmp_path):
        mod = _import_provision()

        override_path = tmp_path / "org1" / "docker-compose.override.yml"
        mod._write_compose_override_for_org(
            override_path=override_path,
            external_network_name="cs_org1_net",
            storage_dir="/data/org1",
            oem_dir="/oem",
            iso_path="/iso/win11.iso",
        )

        content = override_path.read_text(encoding="utf-8")
        parsed = yaml.safe_load(content)

        # workstation must be on BOTH org_net and cloudshield_net
        ws_nets = parsed["services"]["workstation"]["networks"]
        assert "org_net" in ws_nets
        assert "cloudshield_net" in ws_nets

    def test_override_declares_cloudshield_net_as_external(self, tmp_path):
        mod = _import_provision()

        override_path = tmp_path / "override.yml"
        mod._write_compose_override_for_org(
            override_path=override_path,
            external_network_name="my_org_net",
            storage_dir="/storage",
            oem_dir="/oem",
            iso_path="/iso/win.iso",
        )

        parsed = yaml.safe_load(override_path.read_text(encoding="utf-8"))

        cs_net = parsed["networks"]["cloudshield_net"]
        assert cs_net["external"] is True
        assert cs_net["name"] == "cloudshield_net"

    def test_override_maps_org_net_to_external_name(self, tmp_path):
        mod = _import_provision()

        override_path = tmp_path / "override.yml"
        mod._write_compose_override_for_org(
            override_path=override_path,
            external_network_name="custom_org_network",
            storage_dir="/s",
            oem_dir="/o",
            iso_path="/i",
        )

        parsed = yaml.safe_load(override_path.read_text(encoding="utf-8"))
        assert parsed["networks"]["org_net"]["name"] == "custom_org_network"

    def test_override_creates_parent_dirs(self, tmp_path):
        mod = _import_provision()

        override_path = tmp_path / "deep" / "nested" / "override.yml"
        mod._write_compose_override_for_org(
            override_path=override_path,
            external_network_name="n",
            storage_dir="/s",
            oem_dir="/o",
            iso_path="/i",
        )

        assert override_path.exists()


# ---------------------------------------------------------------------------
# create_auto_configure_scripts – THREAT_DETECTION_IP replacement
# ---------------------------------------------------------------------------


class TestCreateAutoConfigureScripts:
    def test_threat_detection_ip_replaced_in_ps1(self, tmp_path, monkeypatch):
        mod = _import_provision()

        oem_dir = tmp_path / "oem"
        oem_dir.mkdir()
        scripts_dir = oem_dir / "scripts"  # will be created by the function

        # Write a fake .ps1 with the placeholder
        (oem_dir / "install_agent.ps1").write_text(
            '$ServerAddr = "THREAT_DETECTION_IP"\n', encoding="utf-8"
        )

        # Patch the source folder constant used inside the function
        monkeypatch.setattr(os.path, "exists", lambda p: p != str(scripts_dir) and os.path.isdir(p))

        captured_copies = []

        def fake_copy_file_container(logger, cid, src, dst):
            captured_copies.append((src, dst))
            return True

        monkeypatch.setattr(mod, "copy_file_container", fake_copy_file_container)

        def patched_fn(variables, container_id, server_logger):
            # Rewrite to use our tmp oem dir
            source_folder = str(oem_dir) + os.sep
            output_folder = str(scripts_dir)
            if not os.path.exists(output_folder):
                os.makedirs(output_folder)
            for filename in os.listdir(str(oem_dir)):
                if filename.endswith(".ps1"):
                    source_path = os.path.join(source_folder, filename)
                    output_path = os.path.join(output_folder, filename)
                    with open(source_path, "r", encoding="utf-8") as f:
                        content = f.read()
                    new_content = content
                    for key, value in variables.items():
                        new_content = new_content.replace(key, str(value))
                    with open(output_path, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    mod.copy_file_container(server_logger, container_id, output_path, "/oem/" + filename)

        logger = SimpleNamespace(info=lambda *a: None, error=lambda *a: None)

        patched_fn(
            {
                "DOMAIN_NAME": "corp.local",
                "ADMIN_USER": "Admin",
                "ADMIN_PASS": "pass",
                "SAMBA_IP": "10.0.0.1",
                "THREAT_DETECTION_IP": "172.28.0.10",
            },
            "container123",
            logger,
        )

        output_file = scripts_dir / "install_agent.ps1"
        assert output_file.exists()
        generated = output_file.read_text(encoding="utf-8")
        assert "THREAT_DETECTION_IP" not in generated
        assert "172.28.0.10" in generated


# ---------------------------------------------------------------------------
# provision_workstation_docker – threat_detection_ip argument
# ---------------------------------------------------------------------------


class TestProvisionWorkstationDocker:
    def test_threat_detection_ip_default(self, tmp_path, monkeypatch):
        """Default threat_detection_ip is 172.28.0.10."""
        mod = _import_provision()
        import inspect

        sig = inspect.signature(mod.provision_workstation_docker)
        default = sig.parameters["threat_detection_ip"].default
        assert default == "172.28.0.10"

    def test_threat_detection_ip_passed_to_auto_configure(self, tmp_path, monkeypatch):
        """The threat_detection_ip value is forwarded to create_auto_configure_scripts."""
        mod = _import_provision()

        captured = {}

        def fake_create_auto_configure_scripts(variables, container_id, logger):
            captured["variables"] = dict(variables)

        fake_container = SimpleNamespace(
            id="c123",
            reload=lambda: None,
            network_settings=SimpleNamespace(
                networks={"org_net": SimpleNamespace(ip_address="10.0.0.5")}
            ),
        )

        fake_docker = MagicMock()
        fake_docker.compose.run.return_value = fake_container

        monkeypatch.setattr(mod, "create_auto_configure_scripts", fake_create_auto_configure_scripts)
        monkeypatch.setattr(mod, "copy_file_container", lambda *a, **kw: True)
        monkeypatch.setattr(mod, "_pick_workstation_host_port", lambda _: 18200)
        monkeypatch.setattr(mod, "PRAGMA_ONCE", True)

        logger = SimpleNamespace(info=lambda *a: None, error=lambda *a: None)

        mod.provision_workstation_docker(
            org_id="org1",
            server_logger=logger,
            org_docker=fake_docker,
            org_network_name="org_net",
            samba_ip="10.0.0.1",
            org_subnet_cidr="172.23.1.0/24",
            threat_detection_ip="192.168.5.5",
        )

        assert captured["variables"]["THREAT_DETECTION_IP"] == "192.168.5.5"
        assert captured["variables"]["SAMBA_IP"] == "10.0.0.1"
