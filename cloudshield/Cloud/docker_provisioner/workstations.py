import os
import uuid
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

storage_path = Path("/data/workstations/")
template_vm_path = Path("/data/workstations/templates")
default_oem_path = Path("/app/docker/workstation/oem")

PROVISIONING_STATE = {}

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

    failed_status = {
            "status":False,
            "reason":""
    }

    files = [
        (str(template_path / 'data.img'), str(vm_path / 'data.img')),
        (str(template_path / 'windows.base'), str(vm_path / 'windows.base')),
 #       (str(template_path / 'windows.mac'), str(vm_path / 'windows.mac')),
        (str(template_path / 'windows.vars'), str(vm_path / 'windows.vars')),
        (str(template_path / 'windows.ver'), str(vm_path / 'windows.ver')),
        (str(template_path / 'windows.rom'), str(vm_path / 'windows.rom')),
    ]

    n = len(files)


    if not template_vm_path.exists():
        logger.error(f"Path not found {str(template_vm_path)}")
        updater(job, "failed to retrieve image")
        return False

    with ThreadPoolExecutor(max_workers=n) as executor:

        futures = [executor.submit(copy_with_status, src, dst) for src, dst in files]
    
        for future in futures:
            try:
                logger.info(future.result())
                if future.result() is False:
                    return False

            except Exception as e:
                logger.info(f"A copy task failed: {e}")
                return False
    return True

def set_workstation_update_id(org_id, template_id, update_id, logger):
    source_path = storage_path / "software" / org_id / template_id / "install.bat"
    fr = open(str(source_path), "r", encoding='utf-8')
    content = fr.read()
    new_content = content
    new_content.replace("WORKSTATION_UPDATE_ID_PLACEHOLDER", update_id)

    fw = open(str(source_path), "w", encoding='utf-8')
    fw.write(new_content)
    fr.close()
    fw.close()
    
    logger.info("Set workstation update id to install.bat")


def create_auto_configure_scripts(variables: dict, org_id, template_id, server_logger):
    """
    Reads all .ps1 files in a folder and replaces variable placeholders
    with values provided in the variables dictionary.
    """
    source_folder = storage_path / "software" / org_id / template_id
    server_logger.info(f"OEM source folder {str(source_folder)}")
    for filename in os.listdir(str(source_folder)):
        if filename.endswith(".ps1"):
            source_path = source_folder / filename

            with open(str(source_path), 'r', encoding='utf-8') as file:
                content = file.read()

            new_content = content
            for key, value in variables.items():
                new_content = new_content.replace(key.upper(), str(value))
            server_logger.info(f"Update OEM script {source_path}")
            with open(str(source_path), 'w', encoding='utf-8') as file:
                file.write(new_content)



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

def import_oem(oem_path):

    shutil.copytree(str(default_oem_path), str(oem_path))

def import_software(org_id, template_id, software_id):
    pass

def prepare_software(org_id, templated_id, software,oem_path,logger):
    """
    Move chosen software files for custom templates
    """
    logger.info("Importing default OEM scripts")
    import_oem(oem_path)
    for soft in software:
        logger.info(f"Importing software (software_id={soft}")
        import_software(org_id, template_id, soft)



def provision_default_workstation(org_data, template_id, software, job = None, updater = None, logger = None):

    global PROVISIONING_STATE

    if updater is None:
        updater = lambda *args, **kwargs: None

    org_id = org_data["id"]

    default_vm_path = template_vm_path / org_id / template_id
    default_vm_path.mkdir(parents=True, exist_ok=True)

    updater(job, "importing oem scripts")
    oem_path = storage_path / "software" / org_id / template_id

    update_id = uuid.uuid4()

    prepare_software(org_id, template_id, software,oem_path, logger)
    
    create_auto_configure_scripts({
        "domain_name":org_data["realm_name"].lower(),
        "admin_user":"administrator",
        "admin_pass":org_data["dc_admin_password"],
        "samba_ip":org_data["samba_ip"]}, org_id, template_id, logger) 

    #set_workstation_update_id(org_id, template_org_id, template_id, update_id, logger)
    

    updater(job, "starting workstation service")

    host_vm_storage_path = Path(os.getenv("WORKSTATIONS_MOUNT_DIR")) / "workstations" / "templates" / org_id / template_id
    host_oem_storage_path = Path(os.getenv("WORKSTATIONS_MOUNT_DIR")) / "workstations" / "software" / org_id / template_id
    
    logger.info(f"mounting storage path {str(host_vm_storage_path/'storage')}")
    logger.info(f"mounting oem path {str(oem_path)}")

    container_ws = docker.compose.run(
            service="workstation",
            volumes=[
                (str(host_vm_storage_path),"/storage","rw"),
                (str(host_oem_storage_path), "/oem", "rw")
            ],
            detach=True,
            tty=False
    )
    
    container_ws_id = container_ws.id
    container_ws_ip = container_ws.network_settings.networks["vpc_net"].ip_address

    PROVISIONING_STATE[update_id] = container_ws_id

    logger.info(f"default workstation container id: {container_ws.id}")

    updater(job, "initializing image")

    wait_for_rdp(container_ws_ip, logger=logger)


    updater(job, "workstation image created")

    return True

def provision_workstation_vm(org_id, template_id, vm_id, job = None, updater = None, logger = None):

    if updater is None:
        updater = lambda *args, **kwargs: None

    vm_path = Path("/data/workstations/") / org_id / vm_id
    vm_path.mkdir(parents=True, exist_ok=True)
    updater(job, "copying workstation image")

    failed_status = {"status":False}

    logger.info(f"Copying template to vm (template_id={template_id}, vm_id={vm_id})")

    if not copy_image(org_id, template_id, vm_path, job=job, updater=updater, logger=logger):
        logger.error("Failed to copy template image")
        failed_status["reason"] = "Failed to copy template image"
        return failed_status

    # assigned_mac = assign_mac(vm_path)

    updater(job, "starting workstation vm")

    host_vm_storage_path = Path(os.getenv("WORKSTATIONS_MOUNT_DIR")) / "workstations" / org_id / vm_id

    name = "ws-"+str(vm_id)

    container_ws = docker.compose.run(
            service="workstation",
            command=["skip"],
            name=name,
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
        #"mac": assigned_mac
    }

def provision_custom_workstation():
    pass

def provision_update(workstation_id, status, job = None, updater = None, logger = None):
    global PROVISIONING_STATE

    if updater is None:
        updater = lambda *args, **kwargs: None

    if status == 1:
        container_id = PROVISIONING_STATE.get(workstation_id)
        docker.container.kill(container_id)
        logger.info("Update recieved from provisioning")
    pass
