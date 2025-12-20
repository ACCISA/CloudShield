import paramiko
import socket
import threading
import re
import time
import uuid
import base64
from rq import get_current_job
from google.protobuf import empty_pb2
from .forward import forward_tunnel

from utils import get_logger, get_inventory_from_org_id
from services.user_service import persist_domain_user
from models import Inventory

import grpc
from genproto.infra_service import infra_service_pb2 as infra_pb2
from genproto.infra_service import infra_service_pb2_grpc as infra_pb2_grpc

from .task import ProxyRPCRequest, GetServerNodes, NodeType


def short_uuid():
    # Generate UUID4 and encode it in URL-safe Base64
    return base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip(b'=').decode('ascii')


USERNAME_RE = re.compile(r'^[A-Za-z0-9._-]{1,20}$')
MIN_PW_LEN = 8
MAX_PW_LEN = 128
PRIVATE_KEYS_PATH = "/var/lib/cloudshield/terraform/generated"

# Module-level logger for non-job logging
_module_logger = get_logger("tasks")

class SSHExecResult:
    def __init__(self, stdin, stdout, stderr):
        self.stdin = stdin
        self.stdout = stdout
        self.stderr = stderr

def forward_ssh_tunnel(local_port, remote_host, remote_port, transport, target_port, logger=None):
    """
    Create an SSH tunnel to forward comms via SSH transport.
    """
    if logger is None:
        logger = _module_logger
    
    logger.info(f"SSH tunnel created {local_port}:{remote_host}:{remote_port}")
    t = threading.Thread(
            target=forward_tunnel,
            args=(local_port, remote_host, target_port, transport),
            daemon=True
    )
    t.start()

def validate_username(username: str, logger=None):
    """
    Validate username to prevent CLI Injections
    """
    if logger is None:
        logger = _module_logger
    
    if not USERNAME_RE.fullmatch(username):
        logger.error(f"Invalid username: only A-Z a-z 0-9. Given: {username}")
        return False
    return True

def validate_password(password:str, logger=None):
    """
    Validate password to prevent CLI Injections
    """
    if logger is None:
        logger = _module_logger
    
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
        self.failed = False

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

        if None in [self.vpn_ip, self.vpn_key, self.dc_priv_ip, self.dc_key]:
            logger = _module_logger
            logger.error("missing data from inventory assets")
            logger.error(self.inventory)
            self.failed = True

def get_available_local_port():
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(('',0))
    return s.getsockname()[1]

def exec_ssh(org_id: str, command: str, logger=None):
    if logger is None:
        logger = _module_logger

    if len(command) == 0:
        return None

    inventory = get_inventory_from_org_id(org_id)

    if not inventory:
        logger.error(f"No ITAM inventory found for org_id={org_id}")
        return None

    exec_ssh_config = ExecSSHConfig(inventory)

    if exec_ssh_config.failed is True:
        logger.error("Database does not contain the necessary data for task management") 
        return None

    jump_host       = exec_ssh_config.vpn_ip
    dc_host         = exec_ssh_config.dc_priv_ip
    dc_host_port    = 22
    jump_key        = exec_ssh_config.vpn_key
    local_port      = get_available_local_port()
    target_port     = 22

    
    logger.info(f"Fetched VPN info (ipv4={jump_host}, key_filename={jump_key}")
    # Connect to the openvpn server
    jump_client = paramiko.SSHClient()
    jump_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    jump_client.connect(jump_host, username="root", key_filename=jump_key)

    transport = jump_client.get_transport()

    forward_ssh_tunnel(local_port, dc_host, dc_host_port, transport, target_port)
    
    # Avoid a race condition so let the creation of the ssh tunnel complete
    time.sleep(3)

    dc_client = paramiko.SSHClient()
    dc_client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    dc_client.connect("127.0.0.1", port=local_port, username="root", key_filename=jump_key)

    logger.info("Connected to dc through SSH tunnel")


    stdin, stdout, stderr = dc_client.exec_command(command)
    
    if stdout is None and stderr is None:
        logger.error("Failed to read output from command execution")
        return None
    stdout_str = stdout.read().decode().strip() if stdout is not None else None
    stderr_str = stderr.read().decode().strip() if stderr is not None else None

    return SSHExecResult(stdin, stdout_str, stderr_str)

def dc_restart_samba_service(org_id: str):
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_restart_samba_service"
        job.save_meta()
    
    nodes = GetServerNodes(org_id)

    proxy_response = ProxyRPCRequest(nodes, method_name="infra_service.v1.InfraService.RestartSambaService", request = empty_pb2.Empty())

    if proxy_response is None:
        logger.error("Failed to proxy rpc request")
        return {"status":"Failed", "message":"Failed to proxy rpc request"}

    proxy_status = proxy_response.status

    response = infra_pb2.RestartSambaServiceDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status
    
    logger.info("status: ", str(status))

    if status == infra_pb2.SUCCESS:
        logger.info("Successfully restart samba-ad-dc service");
        return {"status":"SUCCESS","message":"Successfully restared samba-ad-dc service"};
    if status == infra_pb2.FAILED:
        logger.info("Failed to restart samba-ad-dc service");
        return {"status":"FAILED", "message":"Failed to restart samba-ad-dc service"};


def dc_add_user(org_id: str, username: str, password: str):
    """
    Note: this job should only be executed if a network was provisioned for that org_id
    """

    # TODO add checks that network was provisioned for org_id aka just check if mongodb has that org_id
    job = get_current_job()
    job_id = job.id if job else "unknown"
    logger = get_logger("job", job_id=job_id)

    if job is not None:
        job.meta["progress"] = "starting dc_add_user"
        job.save_meta()

    if not validate_username(username, logger=logger):
        if job is not None:
            job.meta["progress"] = "invalid username"
            job.save_meta()
        return {"message":f"the provider username is invalid (username={username})"}
    if not validate_password(password, logger=logger):
        if job is not None:
            job.meta["progress"] = "invalid password"
            job.save_meta()
        return {"message":f"the provider password is invalid (password={password})"}
    
    
    # this tasks is meant for the domain controller so we get that node's ip
    nodes = GetServerNodes(org_id)

    request = infra_pb2.AddDomainUserData(username=username, password=password)

    # this request needs to be proxyed through the vpn server because it is destined for the domain controller
    proxy_response = ProxyRPCRequest(nodes, method_name="infra_service.v1.InfraService.AddDomainUser", request=request)
        
    if proxy_response is None:
        logger.error("Failed to prxy rpc")
        return {"status":"FAILED", "message":"Failed to proxy rpc request"}

    proxy_status = proxy_response.status

    # we have to first serialize the bytes from the proxy_response.response field
    response = infra_pb2.AddDomainUserDataAck()
    response.ParseFromString(proxy_response.response)

    status = response.status
    result = response.result

    logger.info("status: " + str(status))
    logger.info("result: " + str(result))

    #result = exec_ssh(org_id, command, logger=logger)
    
    if status == infra_pb2.SUCCESS:
        return {"status": "SUCCESS", "message":"Successfully added user"}

    if status == infra_pb2.FAILED:
        return {"status": "FAILED", "message":"Failed to add user"}
    
    if status == infra_pb2.DUPLICATE:
        return {"status": "DUPLICATE", "message":"User already exists"}

    return {"status":"UNKNOWN", "message":"Unexpected response"}
