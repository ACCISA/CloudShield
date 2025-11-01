import paramiko
import socket
import threading
import re
from rq import get_current_job
from .forward import forward_tunnel

from utils import get_logger, db, get_inventory_from_org_id
from models import Inventory, EC2Instance

USERNAME_RE = re.compile(r'^[A-Za-z0-9._-]{1,20}$')
MIN_PW_LEN = 8
MAX_PW_LEN = 128
PRIVATE_KEYS_PATH = "/var/lib/cloudshield/terraform/generated"

logger = get_logger("tasks")

class SSHExecResult:
    def __init__(self, stdin, stdout, stderr):
        self.stdin = stdin
        self.stdout = stdout
        self.stderr = stderr

def forward_ssh_tunnel(local_port, remote_host, remote_port, transport, target_port):
    """
    Create an SSH tunnel to forward comms via SSH transport.
    """
    logger.info(f"SSH tunnel created {local_port}:{remote_host}:{remote_port}")
    t = threading.Thread(
            target=forward_tunnel,
            args=(local_port, remote_host, target_port, transport),
            daemon=True
    )
    t.start()

def validate_username(username: str):
    """
    Validate username to prevent CLI Injections
    """
    if not USERNAME_RE.fullmatch(username):
        logger.error(f"Invalid username: only A-Z a-z 0-9. Given: {username}")
        return False
    return True

def validate_password(password:str ):
    """
    Validate password to prevent CLI Injections
    """
    if not (MIN_PW_LEN <= len(password) <= MAX_PW_LEN):
        logger.error(f"Password length must be between {MIN_PW_LEN} and {MAX_PW_LEN}")
        return False
    if '\n' in password or '\r' in password:
        logger.error("Password must not contain newline characters")
        return False
    if any(ord(c) < 32 for c in password):
        logger.error("Password contains control characters; not allowed")
        return False
    return True

class ExecSSHConfig:
    
    def __init__(self, inventory: Inventory):
        self.inventory = inventory
        self.org_id = inventory.org_id
        self.openvpn_server_name = f"{inventory.org_id}_openvpn_server"
        self.dc_name = f"{inventory.org_id}_samba"
        self.vpn_ip = None
        self.vpn_key = None
        self.dc_priv_ip = None
        self.dc_key = None

        self.populate_config()

    def populate_config(self):
        for asset in self.inventory.assets:
            if asset.name == self.openvpn_server_name:
                self.vpn_ip      = asset.public_ip
                self.vpn_key     = f"{PRIVATE_KEYS_PATH}/{self.org_id}/{asset.priv_key_path}.pem"
                continue
            if asset.name == self.dc_name:
                self.dc_priv_ip = asset.private_ip
                self.dc_key     = f"{PRIVATE_KEYS_PATH}/{self.org_id}/{asset.priv_key_path}.pem"
                continue

def get_available_local_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('',0))
    return s.getsockname()[1]

def exec_ssh(org_id: str, command: str):
    
    inventory = get_inventory_from_org_id(org_id)

    if not inventory:
        job
        return

    exec_ssh_config = ExecSSHConfig(inventory)

    jump_host       = exec_ssh_config.vpn_ip
    dc_host         = exec_ssh_config.dc_priv_ip
    dc_host_port    = 22
    jump_key        = exec_ssh_config.vpn_key
    local_port      = get_available_local_port()
    target_port     = 22

    logger.info(f"Fetched VPN IPv4: {jump_host}")
    
    # Connect to the openvpn server
    jump_client = paramiko.SSHClient()
    jump_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    jump_client.connect(jump_host, username="ubuntu", key_filename=jump_key)

    transport = jump_client.get_transport()

    forward_ssh_tunnel(local_port, dc_host, dc_host_port, transport, target_port)

    dc_client = paramiko.SSHClient()
    dc_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    dc_client.connect("127.0.0.1", port=local_port, username="ubuntu", key_filename=jump_key)

    logger.info("Connected to dc through SSH tunnel")


    stdin, stdout, stderr = dc_client.exec_command(command)
    
    return SSHExecResult(stdin, stdout.read().decode().strip(), stderr.read().decode().strip())

def dc_add_user(org_id: str, username: str, password: str):
    """
    Note: this job should only be executed if a network was provisioned for that org_id
    """

    job = get_current_job()

    if job is not None:
        job.meta["progress"] = "starting dc_add_user"
        job.save_meta()

    if not validate_username(username):
        job.meta["progress"] = "invalid username"
        job.save_meta()
        return {"message":f"the provider username is invalid (username={username})"}
    if not validate_password(password):
        job.meta["progress"] = "invalid password"
        job.save_meta()
        return {"message":f"the provider password is invalid (password={password})"}

    command = f"sudo samba-tool user create {username} {password} --profile-path='\\\\SAMBA.LOCAL\\profiles\\%USERNAME%'"

    result = exec_ssh(org_id, command)
    logger.info(result.stdout)
    logger.info(result.stderr)
    logger.info("User added to samba ad-dc")



