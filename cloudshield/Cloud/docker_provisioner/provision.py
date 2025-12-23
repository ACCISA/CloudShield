import os
from datetime import datetime, timezone
import subprocess
from python_on_whales import DockerClient
from pathlib import Path

from .keygen import generate_ssh_key_pair

docker = DockerClient(compose_files=["/app/docker-compose.yml"])

# In our test env, to be efficient we will build our infra now. We can assume that during testing
# we are probably going to be provisioning infra. When we provision we will just docker compose up.
OVPN_VOLUME_NAME = "opvn-data-cloudshield"
PKI_INPUT = b"\n\n\n"

docker.compose.build(
    services=["samba-test", "openvpn-test"]
)

# Copy a file to a container
def copy_file_container(server_logger, container_id, path_in, path_out):
    try:
        subprocess.run(
                ["docker","cp",path_in,container_id+":"+path_out],
                capture_output=True,
                text=True,
                check=True
        )
        server_logger.info(f"Successfully copied file to contianer (file={path_in}, container_id={container_id})")
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
                check=True
        )
        server_logger.info(result.stdout)
        server_logger.info("Successfully started samba setup script")
        return True
    except subprocess.CalledProcessError as e:
        server_logger.error(e)
        server_logger.error(e.stderr)
        server_logger.error("Failed to setup samba")
        return False

# create ssh keys and make sure pub and priv key exists
def setup_ssh_keys(server_logger, private_key_path):

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

    # to match expectations from prod we add .pem extension to our private key
    os.rename(private_key_path, private_key_path+".pem")

    private_key_path=private_key_path+".pem"

    server_logger.info("SSH Key generation complete")
    return public_key_path, private_key_path




# MAIN
def provision_network_docker(org_id, region, templates_dir, generated_dir, count, server_logger):

    cloudshield_path = Path("/var/lib/cloudshield/terraform/generated/"+str(org_id))

    try:
        cloudshield_path.mkdir(parents=True, exist_ok=True)
        server_logger.info("Cloudshield data directory created (or already exists)")
    except Exception:
        server_logger.error("Failed to create cloudshield work directory")
        return

    server_logger.debug("Env Variables:")
    for key, value in os.environ.items():
        server_logger.debug(f"{key}: {value}")

    # create our ssh keys for our samab container
    public_key_path, private_key_path = setup_ssh_keys(server_logger, str(cloudshield_path)+f"/{org_id}_key")
    if public_key_path is None or private_key_path is None:
        server_logger.error("Failed to generate ssh keys")
        return

    server_logger.info("Running docker provisioning")

    os.environ["DOMAIN_NAME"] = "ANISS"
    os.environ["DC_ADMIN_PASSWORD"] = "4162728abb29acc12090e6432cdb6fd8%$@!"
    os.environ["REALM_NAME"] = "ANISS.LOCAL"

    # We already built our containers so just start them
    container = docker.compose.run(
        service="samba-test",
        detach=True,
        tty=False,
        envs={
        "DOMAIN_NAME": "ANISS",
        "DC_ADMIN_PASSWORD": "4162728abb29acc12090e6432cdb6fd8%$@!",
        "REALM_NAME": "ANISS.LOCAL"
        })

    container_id = container.id
    server_logger.info(f"samba-test container id: {container_id}")

    os.environ["OPENVPN_PORT"] = "1194"
    os.environ["OPENVPN_PROTOCOL"] = "udp"
    os.environ["OPENVPN_CLIENT_NAME"] = "client1"

    container_vpn = docker.compose.run(
        service="openvpn-test",
        detach=True,
        tty=False
    )

    container_id_vpn = container_vpn.id
    server_logger.info(f"openvpn-test container id: {container_id_vpn}")

    if not setup_container(server_logger, container_id):
        server_logger.error("Failed to run samba setup script")
        return
    if not setup_container(server_logger, container_id_vpn):
        server_logger.error("Failed to run openvpn setup script")
        return


    # copy ssh pub key to created container
    if not copy_file_container(server_logger, container_id, public_key_path, "/root/.ssh/authorized_keys"):
        return

    if not copy_file_container(server_logger, container_id_vpn, public_key_path, "/root/.ssh/authorized_keys"):
        return

    #docker.compose.run(
    #        service="openvpn-test",
    #        command=["ovpn_genconfig", "-u", f"udp://VPN.ANISS.LOCAL"],
    #        #volumes=volume_mount,
    #        volumes=[("/app/docker/openvpn", "/etc/openvpn")],
    #        remove=True,
    #        detach=True,
    #        tty=False
    #)

    metadata = [{
        "port": "50055",
        "org_id": org_id,
        "name": org_id+"_samba",
        "instance_id": container_id,
        "vpc_id": "vpc_net_docker",
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
        "private_ip": "172.23.0.10",
        "public_ip": "172.23.0.10",
    },{
        "port":"50055",
        "org_id": org_id,
        "name": org_id+"_openvpn_server",
        "instance_id": container_id,
        "vpc_id": "vpc_net_docker",
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
        "private_ip": "172.23.0.12",
        "public_ip": "172.23.0.12"
    }]



    return metadata


def get_target_dir():
    pass

def destroy_network_docker():
    # will dev this last cus we dont really care about destroying containers and we should hopefully have a seperate db for testing
    pass
