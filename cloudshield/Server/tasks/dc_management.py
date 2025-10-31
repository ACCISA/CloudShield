import paramiko
import socket
import threading
import re
from .forward import forward_tunnel

from utils import get_logger

USERNAME_RE = re.compile(r'^[A-Za-z0-9._-]{1,20}$')
MIN_PW_LEN = 8
MAX_PW_LEN = 128

logger = get_logger("tasks")

class SSHExecResult:
    def __init__(self, stdin, stdout, stderr):
        self.stdin = stdin
        self.stdout = stdout
        self.stderr = stderr

def forward_ssh_tunnel(local_port, remote_host, remote_port, transport):
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


def get_priv_key(org_id: str):
    """
    Given an org_id, fetch the SSH private key associated to it.
    """
    # some mongodb call
    # keys are stored in /var/lib/cloudshield/<org_id>/
    return "/var/lib/cloudshield/abc/abc_key.pem"

def get_vpn_ip(org_id: str):
    """
    Given an org_id, fetch the IPv4 address of the OpenVPN server.
    """
    # some mongodb call
    return ""

def get_dc_ip(org_id: str):
    """
    Given an org_id, fetch the IPv4 address of the samba active directory domain controller.
    """
    # some mongodb call
    return ""

def get_available_local_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('',0))
    return s.getsockname()[1]

def exec_ssh(org_id: str):


    jump_host       = get_vpn_ip(org_id)
    dc_host         = get_dc_ip(org_id)
    dc_host_port    = 22
    jump_key        = get_priv_key(org_id)
    local_port      = get_available_local_port()

    logger.info(f"Fetched VPN IPv4: {jump_host}")
    
    # Connect to the openvpn server
    jump_client = paramiko.SSHClient()
    jump_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    jump_client.connect(jump_host, username="ubuntu", key_filename=jump_key)

    transport = jump_client.get_transport()

    forward_ssh_tunnel(local_port, dc_host, dc_host_port, transport)

    dc_client = paramiko.SSHClient()
    dc_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    dc_client.connect("127.0.0.1", port=local_port, username="ubuntu", key_filename=jump_key)

    logger.info("Connected to dc through SSH tunnel")


    stdin, stdout, stderr = dc_client.exec_command(command)
    
    return SSHExecResult(stdin, stdout, stderr)

def dc_add_user(org_id: str, username: str, password: str):

    if not validate_username(username):
        return
    if not validate_password(password):
        return

    command = f"sudo samba-tool user create {username} {password}"

    result = exec_ssh(org_id, command)
    logger.info(result.stdout)
    logger.info(result.stderr)
    logger.info("User added to samba ad-dc")



