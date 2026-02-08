import os
import socket
import time
import shutil
import random
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta
from python_on_whales import DockerClient
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

docker = DockerClient(compose_files=["/app/docker-compose.yml"])
template_vm_path = Path("/data/workstations/templates")

def generate_mac():
    return ":".join(f"{random.randint(0, 255):02X}" for _ in range(6))

def assign_mac(vm_path):
    mac_file = vm_path / "windows.mac"
    f = open(str(mac_file), "w")
    mac = generate_mac()
    f.write(mac)
    f.close()
    return mac

def copy_with_status(src, dst):

    shutil.copy2(src, dst)

    return True


def copy_image(org_id, template_id, vm_path, job = None, updater = None, logger = None):

    template_path = template_vm_path / org_id / template_id

    files = [
        (str(template_path / 'data.img'), str(vm_path / 'data.img')),
        (str(template_path / 'windows.base'), str(vm_path / 'data.img')),
        (str(template_path / 'windows.mac'), str(vm_path / 'windows.mac')),
        (str(template_path / 'windows.vars'), str(vm_path / 'windows.vars')),
        (str(template_path / 'windows.ver'), str(vm_path / 'windows.ver')),
        (str(template_path / 'windows.rom'), str(vm_path / 'windows.rom')),
    ]

    n = len(files)


    if not template_vm_path.exists():
        updater(job, "failed to retrieve image")
        return

    with ThreadPoolExecutor(max_workers=n) as executor:

        futures = [executor.submit(copy_with_status, src, dst) for src, dst in files]
    
        for future in futures:
            try:
                logger.info(future.result())
            except Exception as e:
                logger.info(f"A copy task failed: {e}")

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

def provision_default_workstation(org_id, template_id, job = None, updater = None, logger = None):

    if updater is None:
        updater = lambda *args, **kwargs: None
    
    default_vm_path = template_vm_path / org_id / template_id
    default_vm_path.mkdir(parents=True, exist_ok=True)

    updater(job, "starting workstation service")

    host_vm_storage_path = Path(os.getenv("WORKSTATIONS_MOUNT_DIR")) / "workstations/templates/"/ org_id / template_id

    container_ws = docker.compose.run(
            service="workstation",
            volumes=[(str(host_vm_storage_path),"/storage","rw")],
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

    updater(job, "workstation image created")

    return True

def provision_workstation_vm(org_id, template_id, vm_id, job = None, updater = None, logger = None):

    if updater is None:
        updater = lambda *args, **kwargs: None

    vm_path = Path("/data/workstations/") / org_id / vm_id
    vm_path.mkdir(parents=True, exist_ok=True)
    updater(job, "copying workstation image")

    logger.info(f"Copying template to vm (template_id={template_id}, vm_id={vm_id})")

    copy_image(org_id, template_id, vm_path, job=job, updater=updater, logger=logger)
    assigned_mac = assign_mac(vm_path)

    updater(job, "starting workstation vm")

    host_vm_storage_path = Path(os.getenv("WORKSTATIONS_MOUNT_DIR")) / "workstations" / org_id / vm_id

    container_ws = docker.compose.run(
            service="workstation",
            command=["skip"],
            publish=[(8006, 8006)],
            volumes=[(str(host_vm_storage_path), "/storage", "rw")],
            detach=True,
            tty=False
    )

    container_ws_id = container_ws.id
    container_ws_ip = container_ws.network_settings.networks["vpc_net"].ip_address

    updater(job, "waiting for workstation startup completion")

    wait_for_rdp(container_ws_ip, logger=logger)

    return {
        "status": True,
        "ipv4_address": container_ws_ip,
        "mac": assigned_mac
    }

def provision_custom_workstation():
    pass
