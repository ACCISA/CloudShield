import os
import sys
import base64
import uuid
import socket
from datetime import datetime, timezone
import subprocess
from python_on_whales import DockerClient
from pathlib import Path

from .keygen import generate_ssh_key_pair

# FIX: Added compose_profiles=["templates"] so we can see the hidden services
docker = DockerClient(compose_files=["/app/docker-compose.yml"], compose_profiles=["templates"])

# In our test env, to be efficient we will build our infra now.
print("BUILDING")
PRAGMA_ONCE = False
if PRAGMA_ONCE is False:
    docker.compose.build(
        services=["samba-test", "openvpn-test"]
    )
    # We pull alpine for the workstation instead of building the Windows image
    try:
        docker.image.pull("alpine:latest")
    except:
        pass

def short_uuid():
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b'=').decode('ascii')

def ensure_clean_state(container_name, server_logger):
    if docker.container.exists(container_name):
        server_logger.info(f"Removing existing container: {container_name}")
        docker.container.remove(container_name, force=True)

def get_service_image(service_name):
    image_name = docker.compose.config().services[service_name].image
    if not image_name:
        raise ValueError(f"Service '{service_name}' has no 'image' defined in docker-compose.yml")
    return image_name

def copy_file_container(server_logger, container_id, path_in, path_out):
    try:
        subprocess.run(
                ["docker","cp",path_in,container_id+":"+path_out],
                capture_output=True,
                text=True,
                check=True
        )
        server_logger.info(f"Successfully copied file to container (file={path_in}, container_id={container_id})")
        return True
    except subprocess.CalledProcessError as e:
        server_logger.error(e)
        server_logger.error(f"Failed to copy file to container (file={path_in}, container_id={container_id})")
        return False

def setup_ssh_keys(server_logger, private_key_path):
    server_logger.info("Generating ssh keys for samba-test container...")
    public_key_path, private_key_path = generate_ssh_key_pair(private_key_path=private_key_path)
    if not Path(public_key_path).exists() or not Path(private_key_path).exists():
        return None, None

    os.chmod(public_key_path, 0o600)
    os.chmod(private_key_path, 0o600)
    os.rename(private_key_path, private_key_path+".pem")
    private_key_path=private_key_path+".pem"
    
    server_logger.info("SSH Key generation complete")
    return public_key_path, private_key_path

def wait_workstation_completion(cid, server_logger):
    server_logger.info(f"Workstation {cid} started (Lightweight Mode).")
    return True

def create_auto_configure_scripts(variables: dict, container_id: str, server_logger):
    pass

def provision_workstation_docker(org_id, network_name, samba_ip, server_logger):
    ensure_clean_state(f"{org_id}-workstation", server_logger)

    server_logger.info(f"Requesting dynamic Host Port -> Container 3389")

    # FIX: Use Port 0. This asks Docker/Windows to pick a valid port automatically.
    # This prevents the 'Forbidden Socket' crash.
    container_ws = docker.run(
        image="alpine:latest",
        name=f"{org_id}-workstation",
        networks=[network_name],
        detach=True,
        tty=True,
        command=["sh", "-c", "apk add --no-cache iputils && sleep infinity"],
        publish=[(0, 3389)]
    )

    container_id_ws = container_ws.id
    container_ws.reload()
    container_ws_ip = container_ws.network_settings.networks[network_name].ip_address

    # FIX: Ask Docker which port it actually picked
    host_rdp_port = "0"
    try:
        # returns dict like {'3389/tcp': [{'HostIp': '0.0.0.0', 'HostPort': '32768'}]}
        ports_map = container_ws.network_settings.ports
        if ports_map and "3389/tcp" in ports_map:
             host_rdp_port = ports_map["3389/tcp"][0]["HostPort"]
    except Exception as e:
        server_logger.warning(f"Could not determine assigned port: {e}")

    server_logger.info(f"Lightweight workstation started on port {host_rdp_port}")
    
    return {
        "port": str(host_rdp_port),
        "org_id": org_id,
        "name": f"{org_id}-workstation",
        "instance_id": container_id_ws,
        "vpc_id": network_name,
        "subnet_id": "subnet_id",
        "ssh_key": org_id+"_key",
        "ami_id": "alpine_lightweight_id",
        "os": "alpine",
        "cpu": "0.5",
        "ram_gb":"0.5",
        "storage_size_gb":1,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "ports": ["80","169"],
        "status": "running",
        "private_ip": container_ws_ip,
        "public_ip": container_ws_ip,
    }

def provision_network_docker(org_data, region, templates_dir, generated_dir, count, server_logger):
    org_id = org_data.get("org_id", None)
    domain_name = org_data.get("domain_name", None)
    realm_name = org_data.get("realm_name", None)
    dc_admin_password = org_data.get("dc_admin_password", None)

    cloudshield_path = Path("/var/lib/cloudshield/terraform/generated/"+str(org_id))
    try:
        cloudshield_path.mkdir(parents=True, exist_ok=True)
    except Exception:
        server_logger.error("Failed to create cloudshield work directory")
        return

    network_name = f"{org_id}-net"
    try:
        if not docker.network.list(filters={"name": network_name}):
            docker.network.create(network_name)
            server_logger.info(f"Created network {network_name}")
    except Exception as e:
        server_logger.warning(f"Network creation warning: {e}")

    public_key_path, private_key_path = setup_ssh_keys(server_logger, str(cloudshield_path)+f"/{org_id}_key")
    if public_key_path is None or private_key_path is None:
        return

    server_logger.info("Running docker provisioning")

    os.environ["DOMAIN_NAME"] = domain_name
    os.environ["DC_ADMIN_PASSWORD"] = dc_admin_password
    os.environ["REALM_NAME"] = realm_name
    os.environ["REALM_NAME_LWR"] = realm_name.lower()
    
    # 1. Start Samba
    ensure_clean_state(f"{org_id}-samba-test", server_logger)
    container_dc = docker.run(
        image=get_service_image("samba-test"),
        name=f"{org_id}-samba-test",
        networks=[network_name],
        detach=True,
        tty=True,
        privileged=True,
        cgroupns="host",
        tmpfs=["/run", "/run/lock", "/tmp"],
        volumes=[("/sys/fs/cgroup", "/sys/fs/cgroup", "rw")],
        devices=[
            "/dev/loop0:/dev/loop0", "/dev/loop1:/dev/loop1", 
            "/dev/loop2:/dev/loop2", "/dev/loop3:/dev/loop3",
            "/dev/loop4:/dev/loop4", "/dev/loop5:/dev/loop5",
            "/dev/loop6:/dev/loop6", "/dev/loop7:/dev/loop7",
            "/dev/loop-control:/dev/loop-control"
        ],
        envs={
            "DOMAIN_NAME": "ANISS",
            "DC_ADMIN_PASSWORD": "4162728abb29acc12090e6432cdb6fd8%$@!",
            "REALM_NAME": "ANISS.LOCAL"
        }
    )
    container_id = container_dc.id
    container_dc.reload()
    container_dc_ip = container_dc.network_settings.networks[network_name].ip_address
    server_logger.info(f"samba-test container id: {container_id} | IP: {container_dc_ip}")

    # 2. Start OpenVPN
    ensure_clean_state(f"{org_id}-openvpn-test", server_logger)
    os.environ["OPENVPN_PORT"] = "1194"
    os.environ["OPENVPN_PROTOCOL"] = "udp"
    os.environ["OPENVPN_CLIENT_NAME"] = "client1"
    
    container_vpn = docker.run(
        image=get_service_image("openvpn-test"),
        name=f"{org_id}-openvpn-test",
        networks=[network_name],
        detach=True,
        tty=True,
        privileged=True,
        cap_add=["NET_ADMIN"],
        tmpfs=["/run", "/run/lock", "/tmp"],
        volumes=[("/sys/fs/cgroup", "/sys/fs/cgroup", "rw")],
        devices=["/dev/net/tun:/dev/net/tun"]
    )
    container_id_vpn = container_vpn.id
    container_vpn.reload()
    container_vpn_ip = container_vpn.network_settings.networks[network_name].ip_address
    server_logger.info(f"openvpn-test container id: {container_id_vpn} | IP: {container_vpn_ip}")

    # Setup keys
    if not copy_file_container(server_logger, container_id, public_key_path, "/root/.ssh/authorized_keys"):
        return
    if not copy_file_container(server_logger, container_id_vpn, public_key_path, "/root/.ssh/authorized_keys"):
        return

    # 3. Provision Workstation
    workstation_meta = provision_workstation_docker(org_id, network_name, container_dc_ip, server_logger)
    if workstation_meta:
         wait_workstation_completion(workstation_meta["instance_id"], server_logger)

    metadata = [{
        "port": "50055",
        "org_id": org_id,
        "name": f"{org_id}-samba-test",
        "instance_id": container_id,
        "vpc_id": network_name,
        "subnet_id": "subnet_id",
        "ssh_key": org_id+"_key",
        "ami_id": "samba_ami_id",
        "os": "ubuntu:22.04",
        "cpu": "2",
        "ram_gb":"4",
        "storage_size_gb":10,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "ports": ["80","169"],
        "status": "running",
        "private_ip": container_dc_ip,
        "public_ip": container_dc_ip,
    },{
        "port":"50055",
        "org_id": org_id,
        "name": f"{org_id}-openvpn-test",
        "instance_id": container_id,
        "vpc_id": network_name,
        "subnet_id": "subnet_id",
        "ssh_key": org_id+"_key",
        "ami_id": "samba_ami_id",
        "os": "ubuntu:22.04",
        "cpu": "2",
        "ram_gb":"4",
        "storage_size_gb":10,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "ports": ["80","169"],
        "status": "running",
        "private_ip": container_vpn_ip,
        "public_ip": container_vpn_ip
    }]
    
    if workstation_meta:
        metadata.append(workstation_meta)

    return metadata

def get_target_dir(*args, **kwargs):
    return None

def destroy_network_docker():
    pass
