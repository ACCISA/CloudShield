# docker_provisioning is not part of code we release in prod. This is just to avoid spendng money on aws therefore we dont need to meet coverage requirements for this code.
import os
import sys
import base64
import uuid
from datetime import datetime, timezone
import subprocess
from python_on_whales import DockerClient
from pathlib import Path

from .keygen import generate_ssh_key_pair

docker = DockerClient(compose_files=["/app/docker-compose.yml"])

OVPN_VOLUME_NAME = "opvn-data-cloudshield"
PKI_INPUT = b"\n\n\n"

def init_docker():
    # In our test env, to be efficient we will build our infra now. We can assume that during testing
    # we are probably going to be provisioning infra. When we provision we will just docker compose up.
    docker.compose.build(
        services=["samba-test", "openvpn-test","workstation"]
    )


def short_uuid():
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b'=').decode('ascii')

# Copy a file to a container
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

def wait_workstation_completion(cid, server_logger):
    target_string = "Windows started successfully"
    server_logger.info(f"Monitoring logs for ID {cid}...")

    for stream_type, data in docker.logs(cid, stream=True):
        try:
            clean_line = data.decode('utf-8').strip()
        except UnicodeDecodeError:
            clean_line = data.decode('latin-1').strip()

        server_logger.debug(f"[{stream_type}] {clean_line}")

        if target_string in clean_line:
            server_logger.info("Target string detected. Task complete.")
            return True

    return False

def create_auto_configure_scripts(variables: dict, container_id: str, server_logger):
    """
    Reads all .ps1 files in a folder and replaces variable placeholders
    with values provided in the variables dictionary.
    """
    source_folder = "/app/docker/workstation/oem/"
    output_folder = os.path.join(source_folder, "scripts")

    if not os.path.exists(output_folder):
        os.makedirs(output_folder)

    for filename in os.listdir(source_folder):
        if filename.endswith(".ps1"):
            source_path = os.path.join(source_folder, filename)
            output_path = os.path.join(output_folder, filename)

            with open(source_path, 'r', encoding='utf-8') as file:
                content = file.read()

            new_content = content
            for key, value in variables.items():
                new_content = new_content.replace(key, str(value))

            with open(output_path, 'w', encoding='utf-8') as file:
                file.write(new_content)

            if not copy_file_container(server_logger, container_id, output_path, "/oem/"+filename):
                return

def provision_workstation_docker(org_id, server_logger):
    global PRAGMA_ONCE
    
    if PRAGMA_ONCE is False:
        PRAGMA_ONCE = True

    container_ws = docker.compose.run(
            service="workstation",
            detach=True,
            tty=False
    )

    container_id_ws = container_ws.id
    container_ws.reload()

    container_ws_ip = container_ws.network_settings.networks["vpc_net"].ip_address


    server_logger.info("Creating OEM scripts")
    # all variables in docker/workstation/oem need to be set here
    create_auto_configure_scripts({
        "DOMAIN_NAME":"samdom.example.com",
        "ADMIN_USER":"Administrator",
        "ADMIN_PASS":"letmein123%",
        "SAMBA_IP":"172.23.0.10"}, container_id_ws, server_logger) 

    if not copy_file_container(server_logger, container_id_ws, "/app/docker/workstation/oem/install.bat", "/oem/install.bat"):
        return

    server_logger.info("Windows workstation installation has started, this will take some time")
    return {
        "port": "NA",
        "org_id": org_id,
        "name": org_id+"_"+short_uuid()+"_"+"_workstation",
        "instance_id": container_id_ws,
        "vpc_id": "vpc_net_docker",
        "subnet_id": "subnet_id",
        "ssh_key": org_id+"_key",
        "ami_id": "windows_default_ami_id",
        "os": "windows11",
        "cpu": "2",
        "ram_gb":"4",
        "storage_size_gb":10,
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
        "ports": ["80","169"],
        "status": "running",
        "private_ip": container_ws_ip,
        "public_ip": container_ws_ip,
    }


def provision_network_docker(org_data, region, templates_dir, generated_dir, count, server_logger):

    server_logger.info("count "+str(count))
    server_logger.info("region "+str(region))
    server_logger.info("gen_dir "+str(generated_dir))
    server_logger.info("tmp_dir "+str(templates_dir))
    
    org_id = org_data.get("org_id", None)
    domain_name = org_data.get("domain_name", None)
    realm_name = org_data.get("realm_name", None)
    dc_admin_password = org_data.get("dc_admin_password", None)

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

    os.environ["DOMAIN_NAME"] = domain_name
    os.environ["DC_ADMIN_PASSWORD"] = dc_admin_password
    os.environ["REALM_NAME"] = realm_name
    os.environ["REALM_NAME_LWR"] = realm_name.lower()
    
    # We already built our containers so just start them
    container_dc = docker.compose.run(
        service="samba-test",
        detach=True,
        tty=False,
        envs={
        "DOMAIN_NAME": "ANISS",
        "DC_ADMIN_PASSWORD": "4162728abb29acc12090e6432cdb6fd8%$@!",
        "REALM_NAME": "ANISS.LOCAL"
        })
    
    container_id = container_dc.id
    container_dc.reload()
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
    container_vpn.reload()
    
    container_vpn_ip = container_vpn.network_settings.networks["vpc_net"].ip_address
    container_dc_ip = container_dc.network_settings.networks["vpc_net"].ip_address

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

        wait_workstation_completion(container_id_ws, server_logger)

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
        "private_ip": container_dc_ip,
        "public_ip": container_dc_ip,
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
        "private_ip": container_vpn_ip,
        "public_ip": container_vpn_ip
    }]
 


    return metadata


def get_target_dir(*args, **kwargs):
    # docker provisioning doesn't need this, but callers may pass args
    return None


def destroy_network_docker():
    # will dev this last cus we dont really care about destroying containers and we should hopefully have a seperate db for testing
    pass
