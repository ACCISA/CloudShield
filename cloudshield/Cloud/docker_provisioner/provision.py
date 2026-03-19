# docker_provisioning is not part of code we release in prod. This is just to avoid spending money on aws therefore we dont need to meet coverage requirements for this code.

import os
import base64
import uuid
import json
import re
import concurrent.futures
import shutil
from datetime import datetime, timezone
import subprocess
from pathlib import Path

from python_on_whales import DockerClient

from .keygen import generate_ssh_key_pair

OVPN_VOLUME_NAME = "opvn-data-cloudshield"
PKI_INPUT = b"\n\n\n"
BASE_PATH = os.environ.get("CLOUDSHIELD_BASE_DIR", "/app")
COMPOSE_FILE = os.path.join(BASE_PATH, "docker-compose.yml")

try:
    docker = DockerClient(compose_files=[COMPOSE_FILE])
except TypeError:
    # Fallback for pytest FakeDockerClient mock
    docker = DockerClient()
except Exception:
    # Fallback for CI/pytest environments where docker-compose.yml doesn't exist
    class DummyDocker:
        pass
    docker = DummyDocker()

def short_uuid():
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b"=").decode("ascii")

def init_docker():
    # In our test env, to be efficient we will build our infra now. We can assume that during testing
    # we are probably going to be provisioning infra. When we provision we will just docker compose up.
    docker.compose.build(
        services=["samba-test", "openvpn-test","workstation"]
    )

def copy_file_container(server_logger, container_id, path_in, path_out):
    try:
        subprocess.run(
            ["docker", "cp", path_in, container_id + ":" + path_out],
            capture_output=True,
            text=True,
            check=True,
        )
        server_logger.info(f"Successfully copied file to container (file={path_in}, container_id={container_id})")
        return True
    except subprocess.CalledProcessError as e:
        server_logger.error(e)
        server_logger.error(f"Failed to copy file to container (file={path_in}, container_id={container_id})")
        return False


def setup_container(server_logger, container_id):
    try:
        result = subprocess.run(
            ["docker", "exec", "-i", container_id, "/usr/local/bin/docker-entrypoint.sh"],
            capture_output=True,
            text=True,
            check=True,
        )
        server_logger.info(result.stdout)
        server_logger.info("Successfully started setup script")
        return True
    except subprocess.CalledProcessError as e:
        server_logger.error(e)
        if e.stdout:
            server_logger.error(e.stdout)
        if e.stderr:
            server_logger.error(e.stderr)

        # Some systemd actions can fail in privileged test containers while
        # services are still usable. If the container is still running, continue.
        try:
            state = subprocess.run(
                ["docker", "inspect", "-f", "{{.State.Running}}", container_id],
                capture_output=True,
                text=True,
                check=True,
            )
            if state.stdout.strip().lower() == "true":
                server_logger.warning("Setup script exited non-zero, but container is still running; continuing")
                return True
        except Exception as inspect_exc:
            server_logger.warning(f"Could not inspect container state after setup failure: {inspect_exc}")

        server_logger.error("Failed to setup container")
        return False

def run_concurrent_tasks(server_logger, task_list):
    """
    Runs a list of tasks concurrently. Fails fast if any task returns False.

    task_list should be a list of dictionaries:
    [
        {"func": my_function, "args": (arg1, arg2), "error_msg": "Custom error string"}
    ]
    """
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=len(task_list))
    futures_map = {}

    for task in task_list:
        func = task["func"]
        args = task.get("args", ())

        future = executor.submit(func, *args)
        futures_map[future] = task["error_msg"]

    for completed_task in concurrent.futures.as_completed(futures_map):
        success = completed_task.result()

        if not success:
            error_message = futures_map[completed_task]
            server_logger.error(error_message)
            executor.shutdown(wait=False)
            return False

    executor.shutdown(wait=False)
    return True

def attach_api_to_network(server_logger, network_name):
    try:
        hostname = open("/etc/hostname", "r").read()
        
        result = subprocess.run(
                ["docker", "network", "connect", network_name, hostname],
                capture_output=True,
                text=True,
                check=True,
        )
        server_logger.info(result.stdout)
        server_logger.info("Successfully attached API to Infra network")
    except subprocess.CalledProcessError as e:
        server_logger.error(e)
        server_logger.error(e.stderr)
        server_logger.error("Failed to attach API to Infra network")


def setup_ssh_keys(server_logger, private_key_path):
    from .keygen import generate_ssh_key_pair

    server_logger.info("Generating ssh keys for samba-test container...")
    public_key_path, private_key_path = generate_ssh_key_pair(private_key_path=private_key_path)

    if not Path(public_key_path).exists():
        server_logger.error(f"Failed to find public key path {public_key_path}")
        return None, None
    if not Path(private_key_path).exists():
        server_logger.error(f"Failed to find private key path {private_key_path}")
        return None, None

    os.chmod(public_key_path, 0o600)
    os.chmod(private_key_path, 0o600)

    os.rename(private_key_path, private_key_path + ".pem")
    private_key_path = private_key_path + ".pem"

    server_logger.info("SSH Key generation complete")
    return public_key_path, private_key_path


def wait_workstation_completion(cid, server_logger):
    target_string = "Windows started successfully"
    server_logger.info(f"Monitoring logs for ID {cid}...")

    # Some docker client wrappers (e.g., lightweight dummy stubs) don't expose logs().
    # In that case, skip active log tailing so provisioning can still complete.
    if not hasattr(docker, "logs"):
        server_logger.warning("Docker logs API unavailable; skipping workstation completion log wait")
        return True

    try:
        for stream_type, data in docker.logs(cid, stream=True):
            try:
                clean_line = data.decode("utf-8").strip()
            except UnicodeDecodeError:
                clean_line = data.decode("latin-1").strip()

            server_logger.debug(f"[{stream_type}] {clean_line}")

            if target_string in clean_line:
                server_logger.info("Target string detected. Task complete.")
                return True
    except Exception as exc:
        server_logger.warning(f"Could not stream workstation logs; continuing without wait: {exc}")
        return True

    return False


def create_auto_configure_scripts(variables: dict, container_id: str, server_logger):
    source_folder = "/app/docker/workstation/oem/"
    output_folder = os.path.join(source_folder, "scripts")

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(source_folder):
        if filename.endswith(".ps1"):
            source_path = os.path.join(source_folder, filename)
            output_path = os.path.join(output_folder, filename)

            with open(source_path, "r", encoding="utf-8") as file:
                content = file.read()

            new_content = content
            for key, value in variables.items():
                new_content = new_content.replace(key, str(value))

            with open(output_path, "w", encoding="utf-8") as file:
                file.write(new_content)

            if not copy_file_container(server_logger, container_id, output_path, "/oem/" + filename):
                return


def _stage_agent_binary_into_oem(server_logger) -> str | None:
    """Ensure cloudshield_agent.exe is available in docker/workstation/oem.

    Priority:
      1) Existing OEM binary (/app/docker/workstation/oem/cloudshield_agent.exe)
      2) Built binary from agent dist (/app/cloudshield/Agent/dist/cloudshield_agent.exe)

    If only dist exists, copy it into OEM so future builds/provisions reuse it.
    """
    oem_binary = Path("/app/docker/workstation/oem/cloudshield_agent.exe")
    dist_binary = Path("/app/cloudshield/Agent/dist/cloudshield_agent.exe")

    if oem_binary.exists():
        server_logger.info(f"Using OEM agent binary: {oem_binary}")
        return str(oem_binary)

    if dist_binary.exists():
        try:
            oem_binary.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dist_binary, oem_binary)
            server_logger.info(f"Staged agent binary from dist to OEM: {oem_binary}")
            return str(oem_binary)
        except Exception as exc:
            server_logger.error(f"Failed to stage agent binary into OEM: {exc}")
            return None

    server_logger.error(
        "cloudshield_agent.exe not found in OEM or dist. Build it first with cloudshield/Agent/build_agent.ps1"
    )
    return None


def _upsert_threat_detection_agent(server_logger, agent_id: str, agent_ip: str, hostname: str) -> None:
    """Ensure the ThreatDetection allowlist contains the provisioned workstation agent.

    ThreatDetection currently authenticates agents by matching both source IP and
    agent_id from cloudshield/ThreatDetection/agents.json.
    """
    agents_file = Path("/app/cloudshield/ThreatDetection/agents.json")

    if not agent_id or not agent_ip:
        server_logger.warning("Skipping ThreatDetection allowlist update: missing agent_id or agent_ip")
        return

    if not agents_file.exists():
        server_logger.warning(f"ThreatDetection agents file not found: {agents_file}")
        return

    payload = _load_td_agents_payload(server_logger, agents_file)
    if payload is None:
        return

    agents = _ensure_td_agents_list(payload)
    existing = _find_td_agent_entry(agents, agent_id, agent_ip)
    if existing is not None:
        if not existing.get("hostname") and hostname:
            existing["hostname"] = hostname
            _persist_td_agents_payload(server_logger, agents_file, payload, "hostname update")
        server_logger.info(f"ThreatDetection allowlist already has agent {agent_id}@{agent_ip}")
        return

    agents.append({"agent_id": agent_id, "ip": agent_ip, "hostname": hostname})
    _persist_td_agents_payload(server_logger, agents_file, payload, "agent add")
    server_logger.info(f"Added workstation agent to ThreatDetection allowlist: {agent_id}@{agent_ip}")


def _load_td_agents_payload(server_logger, agents_file: Path) -> dict | None:
    try:
        payload = json.loads(agents_file.read_text(encoding="utf-8"))
        if isinstance(payload, dict):
            return payload
        server_logger.error("ThreatDetection agents file must contain a JSON object")
        return None
    except Exception as exc:
        server_logger.error(f"Unable to read ThreatDetection agents file: {exc}")
        return None


def _ensure_td_agents_list(payload: dict) -> list:
    agents = payload.get("agents")
    if isinstance(agents, list):
        return agents
    payload["agents"] = []
    return payload["agents"]


def _find_td_agent_entry(agents: list, agent_id: str, agent_ip: str) -> dict | None:
    for entry in agents:
        if not isinstance(entry, dict):
            continue
        if entry.get("agent_id") == agent_id and entry.get("ip") == agent_ip:
            return entry
    return None


def _persist_td_agents_payload(server_logger, agents_file: Path, payload: dict, action: str) -> None:
    try:
        agents_file.write_text(json.dumps(payload, indent=4), encoding="utf-8")
        _sync_td_agents_to_runtime_containers(server_logger, agents_file)
    except Exception as exc:
        server_logger.error(f"Failed to persist ThreatDetection allowlist {action}: {exc}")


def _sync_td_agents_to_runtime_containers(server_logger, agents_file: Path) -> None:
    """Propagate ThreatDetection allowlist updates to running server containers.

    In docker mode, provisioning runs in the API container and updates the local
    checkout file at /app/cloudshield/ThreatDetection/agents.json. The runtime
    gRPC server may run in a different container (e.g., server-dev), so copy the
    file there as well to keep authentication state in sync.
    """
    try:
        result = subprocess.run(
            ["docker", "ps", "--format", "{{.Names}}"],
            check=True,
            capture_output=True,
            text=True,
        )
    except Exception as exc:
        server_logger.warning(f"Skipping ThreatDetection allowlist sync: cannot list containers ({exc})")
        return

    names = [line.strip() for line in (result.stdout or "").splitlines() if line.strip()]
    targets = [name for name in names if re.match(r"^server(?:-|$)", name)]
    if not targets:
        return

    for container_name in targets:
        try:
            subprocess.run(
                [
                    "docker",
                    "cp",
                    str(agents_file),
                    f"{container_name}:/app/cloudshield/ThreatDetection/agents.json",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            server_logger.info(f"Synced ThreatDetection allowlist into container: {container_name}")
        except Exception as exc:
            server_logger.warning(
                f"Failed to sync ThreatDetection allowlist into {container_name}: {exc}"
            )


def _docker_network_exists(name: str) -> bool:
    r = subprocess.run(
        ["docker", "network", "ls", "--format", "{{.Name}}"],
        check=True,
        capture_output=True,
        text=True,
    )
    return name in r.stdout.splitlines()


def _list_network_names() -> list[str]:
    r = subprocess.run(
        ["docker", "network", "ls", "--format", "{{.Name}}"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in r.stdout.splitlines() if line.strip()]


def _network_subnets(name: str) -> list[str]:
    r = subprocess.run(
        ["docker", "network", "inspect", name, "--format", "{{json .IPAM.Config}}"],
        check=True,
        capture_output=True,
        text=True,
    )
    raw = (r.stdout or "").strip()
    if not raw:
        return []
    try:
        cfg = json.loads(raw)
    except Exception:
        return []

    subnets: list[str] = []
    for item in cfg or []:
        if not isinstance(item, dict):
            continue
        s = item.get("Subnet")
        if s:
            subnets.append(str(s))
    return subnets


def ensure_org_network_with_subnet(org_id: str, server_logger) -> tuple[str, str, str]:
    network_name = f"{org_id}-net"

    if _docker_network_exists(network_name):
        subnet = "unknown"
        gateway = "unknown"
        try:
            subs = _network_subnets(network_name)
            if subs:
                subnet = subs[0]
                m = re.match(r"^172\.23\.(\d+)\.0/24$", subnet)
                if m:
                    gateway = f"172.23.{int(m.group(1))}.1"
        except Exception:
            pass
        server_logger.info(f"Network already exists: {network_name} ({subnet})")
        return network_name, subnet, gateway

    used_octets: set[int] = set()
    for n in _list_network_names():
        try:
            for s in _network_subnets(n):
                m = re.match(r"^172\.23\.(\d+)\.0/24$", s)
                if m:
                    used_octets.add(int(m.group(1)))
        except Exception:
            continue

    for octet in range(2, 255):
        if octet in used_octets:
            continue

        subnet = f"172.23.{octet}.0/24"
        gateway = f"172.23.{octet}.1"

        try:
            subprocess.run(
                [
                    "docker",
                    "network",
                    "create",
                    "--driver",
                    "bridge",
                    "--subnet",
                    subnet,
                    "--gateway",
                    gateway,
                    network_name,
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            server_logger.info(f"Created network {network_name} ({subnet})")
            return network_name, subnet, gateway

        except subprocess.CalledProcessError as e:
            msg = ((e.stdout or "") + "\n" + (e.stderr or "")).lower()

            if "overlap" in msg or "pool overlaps" in msg:
                continue

            if "already exists" in msg:
                server_logger.info(f"Network already exists (race): {network_name}")
                return network_name, subnet, gateway

            raise

    raise RuntimeError("No free 172.23.X.0/24 subnet left for org networks (X=2..254)")


def _connect_container_to_network(network_name: str, container_name: str, server_logger) -> None:
    """Best-effort network connect for a running container."""
    if not container_name or not str(container_name).strip():
        return

    container_name = str(container_name).strip()

    # Skip missing containers (e.g., optional desktop UI not running)
    inspect = subprocess.run(
        ["docker", "inspect", container_name],
        capture_output=True,
        text=True,
    )
    if inspect.returncode != 0:
        server_logger.info(f"Skipping network attach: container not found ({container_name})")
        return

    try:
        subprocess.run(
            ["docker", "network", "connect", network_name, container_name],
            check=True,
            capture_output=True,
            text=True,
        )
        server_logger.info(f"Connected container to org network: {container_name} -> {network_name}")
    except subprocess.CalledProcessError as e:
        msg = ((e.stdout or "") + "\n" + (e.stderr or "")).lower()
        if "already exists" in msg or "already connected" in msg:
            server_logger.info(f"Container already connected: {container_name} -> {network_name}")
            return
        server_logger.warning(
            f"Failed to connect container '{container_name}' to network '{network_name}': {e}"
        )


def connect_runtime_containers_to_org_network(network_name: str, server_logger) -> None:
    """Attach app runtime containers to the org network so API proxying can reach org nodes."""
    target_containers = [
        os.environ.get("CS_API_CONTAINER", "cs-api-test-dev"),
        os.environ.get("CS_UI_CONTAINER", "cs-ui-dev"),
    ]

    for container_name in target_containers:
        _connect_container_to_network(network_name, container_name, server_logger)


def _workstation_storage_dir(org_id: str) -> str:
    base = os.environ.get("WORKSTATION_STORAGE_BASE")
    if base and str(base).strip():
        return os.path.join(str(base).strip(), org_id)

    mount = os.environ.get("WORKSTATIONS_MOUNT_DIR", "/home/cena")
    return os.path.join(mount, "workstations", org_id)


def _workstation_oem_dir(org_id: str) -> str:
    return os.path.join(_workstation_storage_dir(org_id), "oem")


def _resolve_windows_iso_path(server_logger) -> str:
    # Notice we skip python Path().exists() checking because this script 
    # runs inside the api container but the docker daemon evaluates paths
    # from the context of the host machine.
    p = os.environ.get("WINDOWS_ISO_PATH")
    if p and str(p).strip():
        iso = str(p).strip()
    else:
        mount = os.environ.get("WORKSTATIONS_MOUNT_DIR", "/home/cena")
        iso = os.path.join(mount, "win11x64.iso")
    
    server_logger.info(f"WINDOWS_ISO_PATH resolved to: {iso} (will be evaluated by Host Docker Daemon)")
    return iso


def _write_compose_override_for_org(
    override_path: Path,
    external_network_name: str,
    storage_dir: str,
    oem_dir: str,
    iso_path: str,
) -> None:
    def _yaml_quote(value: str) -> str:
        return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"') + '"'

    kvm_enabled = str(os.environ.get("KVM", "N")).strip().upper() in {"Y", "YES", "TRUE", "1"}
    kvm_volume = ""
    if kvm_enabled:
        kvm_volume = (
            "      - type: bind\n"
            "        source: \"/dev/kvm\"\n"
            "        target: \"/dev/kvm\"\n"
        )

    override_yaml = (
        "services:\n"
        "  samba-test:\n"
        "    networks: [org_net]\n"
        "  openvpn-test:\n"
        "    networks: [org_net]\n"
        "  workstation:\n"
        "    networks:\n"
        "      - org_net\n"
        "      - cloudshield_net\n"
        "    volumes:\n"
        f"{kvm_volume}"
        "      - type: bind\n"
        f"        source: {_yaml_quote(storage_dir)}\n"
        "        target: /storage\n"
        "      - type: bind\n"
        f"        source: {_yaml_quote(oem_dir)}\n"
        "        target: /oem\n"
        "      - type: bind\n"
        f"        source: {_yaml_quote(iso_path)}\n"
        "        target: /storage/win11x64.iso\n"
        "        read_only: true\n"
        "\n"
        "networks:\n"
        "  org_net:\n"
        "    external: true\n"
        f"    name: {_yaml_quote(external_network_name)}\n"
        "  cloudshield_net:\n"
        "    external: true\n"
        "    name: \"cloudshield_net\"\n"
    )

    override_path.parent.mkdir(parents=True, exist_ok=True)
    override_path.write_text(override_yaml, encoding="utf-8")


def _docker_host_port_in_use(port: int) -> bool:
    r = subprocess.run(
        ["docker", "ps", "--format", "{{.Ports}}"],
        check=True,
        capture_output=True,
        text=True,
    )
    needle = f":{port}->"
    for line in (r.stdout or "").splitlines():
        if needle in line:
            return True
    return False


def _pick_workstation_host_port(org_subnet_cidr: str) -> int:
    base = int(os.environ.get("WORKSTATION_PORT_BASE", "18000"))
    m = re.match(r"^172\.23\.(\d+)\.0/24$", (org_subnet_cidr or "").strip())
    octet = int(m.group(1)) if m else 200

    port = base + octet
    while port <= 65535 and _docker_host_port_in_use(port):
        port += 1

    if port > 65535:
        raise RuntimeError("No free host port available for workstation publish")
    return port


def provision_workstation_docker(
    org_id,
    server_logger,
    org_docker: DockerClient,
    org_network_name: str,
    samba_ip: str,
    org_subnet_cidr: str,
    threat_detection_ip: str = "host.lan",
):

    host_port = _pick_workstation_host_port(org_subnet_cidr)

    container_ws = org_docker.compose.run(
        service="workstation",
        publish=[(host_port, 8006)],
        detach=True,
        tty=False,
    )

    container_id_ws = container_ws.id
    container_ws.reload()

    ws_networks = container_ws.network_settings.networks
    container_ws_ip = ws_networks[org_network_name].ip_address
    cloudshield_ws_ip = None
    if "cloudshield_net" in ws_networks:
        cloudshield_ws_ip = ws_networks["cloudshield_net"].ip_address

    agent_id = f"ws-{org_id}-{container_id_ws[:8]}"
    _upsert_threat_detection_agent(
        server_logger,
        agent_id=agent_id,
        agent_ip=cloudshield_ws_ip or container_ws_ip,
        hostname=f"{org_id}-workstation",
    )

    agent_binary_path = _stage_agent_binary_into_oem(server_logger)
    if not agent_binary_path:
        server_logger.error("Cannot provision workstation without CloudShield agent binary")
        return

    server_logger.info("Creating OEM scripts")
    create_auto_configure_scripts(
        {
            "DOMAIN_NAME": "samdom.example.com",
            "ADMIN_USER": "Administrator",
            "ADMIN_PASS": "letmein123%",
            "SAMBA_IP": samba_ip,
            "THREAT_DETECTION_IP": threat_detection_ip,
            "__AGENT_ID__": agent_id,
        },
        container_id_ws,
        server_logger,
    )

    if not copy_file_container(
        server_logger,
        container_id_ws,
        agent_binary_path,
        "/oem/cloudshield_agent.exe",
    ):
        return

    if not copy_file_container(server_logger, container_id_ws, "/app/docker/workstation/oem/install.bat", "/oem/install.bat"):
        server_logger.error("Workstation startup canceled")
        return

    server_logger.info("Windows workstation installation has started, this will take some time")

    return {
        "port": str(host_port),
        "org_id": org_id,
        "name": org_id + "_" + short_uuid() + "_" + "_workstation",
        "instance_id": container_id_ws,
        "vpc_id": org_network_name,
        "subnet_id": org_subnet_cidr,
        "ssh_key": org_id + "_key",
        "ami_id": "windows_default_ami_id",
        "os": "windows11",
        "cpu": "2",
        "ram_gb": "4",
        "storage_size_gb": 10,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "ports": [str(host_port)],
        "status": "running",
        "private_ip": container_ws_ip,
        "public_ip": container_ws_ip,
        "agent_id": agent_id,
    }


def _is_blank(v: str | None) -> bool:
    return v is None or str(v).strip() == ""


def provision_network_docker(org_data, region, templates_dir, generated_dir, count, server_logger):
    server_logger.info("count " + str(count))
    server_logger.info("region " + str(region))
    server_logger.info("gen_dir " + str(generated_dir))
    server_logger.info("tmp_dir " + str(templates_dir))

    org_id = org_data.get("org_id", None)
    domain_name = org_data.get("domain_name", None)
    realm_name = org_data.get("realm_name", None)
    dc_admin_password = org_data.get("dc_admin_password", None)

    if _is_blank(org_id):
        server_logger.error("Missing org_id in org_data")
        return

    org_id = str(org_id).strip()

    if _is_blank(domain_name):
        server_logger.warning("Missing domain_name. Using default cloudshield.local")
        domain_name = "cloudshield.local"
    else:
        domain_name = str(domain_name).strip()

    if _is_blank(realm_name):
        server_logger.warning("Missing realm_name. Using default CLOUDSHIELD.LOCAL")
        realm_name = "CLOUDSHIELD.LOCAL"
    else:
        realm_name = str(realm_name).strip()

    if _is_blank(dc_admin_password):
        server_logger.warning("Missing dc_admin_password. Using default Password123!")
        dc_admin_password = "Password123!"
    else:
        dc_admin_password = str(dc_admin_password)

    cloudshield_path = Path("/var/lib/cloudshield/terraform/generated/" + org_id)
    cloudshield_gen_path = Path(generated_dir)

    try:
        cloudshield_path.mkdir(parents=True, exist_ok=True)
        cloudshield_gen_path.mkdir(parents=True, exist_ok=True)
        server_logger.info("Cloudshield data directory created (or already exists)")
    except Exception:
        server_logger.error("Failed to create cloudshield work directory")
        return

    iso_path = _resolve_windows_iso_path(server_logger)

    org_network_name, org_subnet_cidr, org_gateway = ensure_org_network_with_subnet(org_id, server_logger)

    # Required for task proxying (api -> openvpn -> samba) and UI/Desktop access.
    connect_runtime_containers_to_org_network(org_network_name, server_logger)

    storage_dir = _workstation_storage_dir(org_id)
    oem_dir = _workstation_oem_dir(org_id)

    server_logger.info(f"WORKSTATION_STORAGE_DIR={storage_dir}")
    server_logger.info(f"WORKSTATION_OEM_DIR={oem_dir}")

    override_path = cloudshield_path / "docker-compose.org.override.yml"
    _write_compose_override_for_org(
        override_path=override_path,
        external_network_name=org_network_name,
        storage_dir=storage_dir,
        oem_dir=oem_dir,
        iso_path=iso_path,
    )

    org_docker = DockerClient(compose_files=[COMPOSE_FILE, str(override_path)])

    public_key_path, private_key_path = setup_ssh_keys(server_logger, str(cloudshield_path) + f"/{org_id}_key")
    if public_key_path is None or private_key_path is None:
        server_logger.error("Failed to generate ssh keys")
        return

    server_logger.info("Running docker provisioning")

    os.environ["DOMAIN_NAME"] = domain_name
    os.environ["DC_ADMIN_PASSWORD"] = dc_admin_password
    os.environ["REALM_NAME"] = realm_name
    os.environ["REALM_NAME_LWR"] = realm_name.lower()

    container_dc = org_docker.compose.run(
        name="samba-test-"+str(org_id),
        service="samba-test",
        detach=True,
        tty=False,
        envs={
            "DOMAIN_NAME": domain_name,
            "DC_ADMIN_PASSWORD": dc_admin_password,
            "REALM_NAME": realm_name,
            "REALM_NAME_LWR": realm_name.lower(),
        },
    )

    container_id_samba = container_dc.id
    container_dc.reload()
    container_dc_ip = container_dc.network_settings.networks[org_network_name].ip_address
    server_logger.info(f"samba-test container id: {container_id_samba} | IP: {container_dc_ip}")

    container_vpn = org_docker.compose.run(
        name="openvpn-test-"+str(org_id),
        service="openvpn-test",
        detach=True,
        tty=False,
        envs={
            "OPENVPN_PORT": "1194",
            "OPENVPN_PROTOCOL": "udp",
            "OPENVPN_CLIENT_NAME": "client1",
            "OPENVPN_DNS": container_dc_ip,
            "ORG_SUBNET_CIDR": org_subnet_cidr,
        },
    )

    container_id_vpn = container_vpn.id
    container_vpn.reload()
    container_vpn_ip = container_vpn.network_settings.networks[org_network_name].ip_address
    server_logger.info(f"openvpn-test container id: {container_id_vpn} | IP: {container_vpn_ip}")

    # run container setup scripts concurrently
    setup_container_tasks = [
        {
            "func": setup_container,
            "args": (server_logger, container_id_samba),
            "error_msg": "failed to run setup script for samba container"
        },
        {
            "func": setup_container,
            "args": (server_logger, container_id_vpn),
            "error_msg": "failed to run setup script for vpn container"
        }
    ]

    if not run_concurrent_tasks(server_logger, setup_container_tasks):
        return



    copy_files_tasks = [
            {
                "func": copy_file_container,
                "args": (server_logger, container_id_samba, public_key_path, "/root/.ssh/authorized_keys"),
                "error_msg": "failed to copy public key to samba container"
            },
            {
                "func": copy_file_container,
                "args": (server_logger, container_id_vpn, public_key_path, "/root/.ssh/authorized_keys"),
                "error_msg": "failed to copy public key to vpn container"
            }
    ]

    if not run_concurrent_tasks(server_logger, copy_files_tasks):
        return

    attach_api_to_network(server_logger, org_network_name)

    workstation_meta = provision_workstation_docker(
        org_id,
        server_logger,
        org_docker=org_docker,
        org_network_name=org_network_name,
        samba_ip=container_dc_ip,
        org_subnet_cidr=org_subnet_cidr,
        # ThreatDetection gRPC server from the Windows guest perspective.
        # Default to host.lan since container-only IPs (e.g., 172.28.x.x) are
        # not always reachable from inside the nested Windows VM.
        threat_detection_ip=os.environ.get("THREAT_DETECTION_IP", "host.lan"),
    )
    if workstation_meta:
        wait_workstation_completion(workstation_meta["instance_id"], server_logger)

    metadata = [
        {
            "port": "50055",
            "org_id": org_id,
            "name": org_id + "_samba",
            "instance_id": container_id_samba,
            "vpc_id": org_network_name,
            "subnet_id": org_subnet_cidr,
            "ssh_key": org_id + "_key",
            "ami_id": "samba_ami_id",
            "os": "ubuntu:22.04",
            "cpu": "2",
            "ram_gb": "4",
            "storage_size_gb": 10,
            "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "ports": ["80", "169"],
            "status": "running",
            "private_ip": container_dc_ip,
            "public_ip": container_dc_ip,
        },
        {
            "port": "50055",
            "org_id": org_id,
            "name": org_id + "_openvpn_server",
            "instance_id": container_id_vpn,
            "vpc_id": org_network_name,
            "subnet_id": org_subnet_cidr,
            "ssh_key": org_id + "_key",
            "ami_id": "openvpn_ami_id",
            "os": "ubuntu:22.04",
            "cpu": "2",
            "ram_gb": "4",
            "storage_size_gb": 10,
            "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            "ports": ["80", "169"],
            "status": "running",
            "private_ip": container_vpn_ip,
            "public_ip": container_vpn_ip,
        },
    ]

    return metadata


def get_target_dir(*args, **kwargs):
    return None


def destroy_network_docker():
    pass
