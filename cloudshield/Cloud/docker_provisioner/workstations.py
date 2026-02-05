import os
import socket
import time
from datetime import datetime, timedelta
from python_on_whales import DockerClient
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

docker = DockerClient(compose_files=["/app/docker-compose.yml"])

def wait_for_rdp(ip_address, port=3389, timeout_minutes=30, check_interval=30,logger=None):
    """
    Polls an IP on port 3389 until open or timeout is reached.
    """
    start_time = datetime.now()
    end_time = start_time + timedelta(minutes=timeout_minutes)

    logger.info(f"[{start_time.strftime('%H:%M:%S')}] Waiting for RDP on {ip_address}...")

    while datetime.now() < end_time:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(3)
            try:
                result = s.connect_ex((ip_address, port))
                if result == 0:
                    logger.info(f"Port {port} is OPEN on {ip_address}. Provisioning can continue.")
                    return True
            except Exception as e:
                logger.error(f"Connection error: {e}")

        time.sleep(check_interval)

    logger.info(f"Timeout reached: Port {port} did not open within {timeout_minutes} minutes.")
    return False

def provision_default_workstation(job = None, updater = None, logger = None):

    if updater is None:
        updater = lambda *args, **kwargs: None

    template_vm_path = Path("/data/workstations/templates/default/")
    template_vm_path.mkdir(parents=True, exist_ok=True)

    updater(job, "starting workstation service")

    host_vm_storage_path = os.getenv("WORKSTATIONS_MOUNT_DIR")

    container_ws = docker.compose.run(
            service="workstation",
            volumes=[(host_vm_storage_path+"/workstations/templates/default/","/storage","rw")],
            publish=[(8009, 8006)],
            detach=True,
            tty=False
    )
    
    container_ws_id = container_ws.id
    container_ws_ip = container_ws.network_settings.networks["vpc_net"].ip_address

    logger.info(f"default workstation container id: {container_ws.id}")

    updater(job, "initializing image")

    wait_for_rdp(container_ws_ip, logger=logger)

    docker.container.kill(container_ws_id)

    updater(job, "copying workstation image")

def povision_workstation_vm():
    pass

def provision_custom_workstation():
    pass
