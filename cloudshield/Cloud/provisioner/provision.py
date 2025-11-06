"""Terraform-based AWS infrastructure provisioning for CloudShield organizations."""
import os
import shutil
import subprocess
from datetime import datetime

import boto3
import logging
from botocore.exceptions import ClientError, WaiterError


BASE_DIR = os.path.dirname(__file__)
DEFAULT_TEMPLATES_DIR = os.path.join(BASE_DIR, "../templates")
logger = logging.getLogger()


def copy_and_replace_templates(org_id: str, templates_dir: str = DEFAULT_TEMPLATES_DIR, generated_dir: str | None = None) -> str:
    """Copy Terraform templates to org-specific folder and inject organization ID."""
    target_dir = generated_dir or os.path.join(BASE_DIR, f"generated/{org_id}")
    target_dir = os.path.abspath(target_dir)

    if os.path.exists(target_dir):
        logger.info(f"[!] Directory for {org_id} already exists. Assuming this is a duplicate provision request")
        return None

    shutil.copytree(templates_dir, target_dir)

    for root, _, files in os.walk(target_dir):
        for fname in files:
            path = os.path.join(root, fname)
            if not fname.endswith((".tf", ".tfvars")):
                continue

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            if fname == "variables.tf":
                new_content = content
            else:
                sentinel = "__VAR_ORG_ID__"
                new_content = content.replace("var.org_id", sentinel)
                new_content = new_content.replace("org_id", org_id)
                new_content = new_content.replace(sentinel, "var.org_id")

            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)

    logger.info(f"[✓] Prepared Terraform configuration at {target_dir}")
    return target_dir


def cleanup_iam_artifacts(org_id: str, region: str) -> None:
    """Remove leftover IAM resources to allow Terraform clean recreation."""
    iam = boto3.client("iam")
    role_name = f"{org_id}-cloudshield-builder-role"
    profile_name = f"{org_id}-cloudshield-builder-profile"
    policy_name = f"{org_id}-allow-get-agent"

    logger.info(f"[~] Checking for leftover IAM role/profile for {org_id}...")

    try:
        profile = iam.get_instance_profile(InstanceProfileName=profile_name)
    except ClientError as exc:
        if exc.response["Error"].get("Code") != "NoSuchEntity":
            raise
        profile = None

    if profile:
        for role in profile["InstanceProfile"].get("Roles", []):
            try:
                iam.remove_role_from_instance_profile(
                    InstanceProfileName=profile_name,
                    RoleName=role["RoleName"],
                )
                logger.info(f"[~]   Removed role '{role['RoleName']}' from instance profile '{profile_name}'.")
            except ClientError as exc:
                if exc.response["Error"].get("Code") != "NoSuchEntity":
                    raise  # pragma: no cover
        try:
            iam.delete_instance_profile(InstanceProfileName=profile_name)
            logger.info(f"[~]   Deleted instance profile '{profile_name}'.")
        except ClientError as exc:
            if exc.response["Error"].get("Code") != "NoSuchEntity":
                raise  # pragma: no cover

    # Delete inline policies and detach managed policies prior to removing the role
    try:
        iam.get_role(RoleName=role_name)
    except ClientError as exc:
        if exc.response["Error"].get("Code") != "NoSuchEntity":
            raise  # pragma: no cover
        role_exists = False
    else:
        role_exists = True

    if role_exists:
        inline_policies = iam.list_role_policies(RoleName=role_name)["PolicyNames"]
        for policy in inline_policies:
            try:
                iam.delete_role_policy(RoleName=role_name, PolicyName=policy)
                logger.info(f"[~]   Deleted inline IAM policy '{policy}'.")
            except ClientError as exc:
                if exc.response["Error"].get("Code") != "NoSuchEntity":
                    raise  # pragma: no cover

        attached = iam.list_attached_role_policies(RoleName=role_name)["AttachedPolicies"]
        for policy in attached:
            try:
                iam.detach_role_policy(RoleName=role_name, PolicyArn=policy["PolicyArn"])
                logger.info(f"[~]   Detached managed policy '{policy['PolicyName']}'.")
            except ClientError as exc:
                if exc.response["Error"].get("Code") != "NoSuchEntity":
                    raise  # pragma: no cover

        # Remove specific inline policy name if we reached this point without listing it (e.g., throttled call above)
        if policy_name not in inline_policies:
            try:
                iam.delete_role_policy(RoleName=role_name, PolicyName=policy_name)
            except ClientError as exc:
                if exc.response["Error"].get("Code") not in {"NoSuchEntity", "NoSuchEntityException"}:
                    raise  # pragma: no cover

        try:
            iam.delete_role(RoleName=role_name)
            logger.info(f"[~]   Deleted IAM role '{role_name}'.")
        except ClientError as exc:
            if exc.response["Error"].get("Code") != "NoSuchEntity":
                raise  # pragma: no cover
    else:
        logger.info(f"[~]   No leftover IAM role named '{role_name}'.")

    # Key pairs are regional
    ec2 = boto3.client("ec2", region_name=region)
    key_name = f"{org_id}_key"
    try:
        ec2.delete_key_pair(KeyName=key_name)
        logger.info(f"[~]   Deleted existing EC2 key pair '{key_name}'.")
    except ClientError as exc:
        if exc.response["Error"].get("Code") not in {"InvalidKeyPair.NotFound", "InvalidKeyPair.NotFoundException"}:
            raise  # pragma: no cover


def wait_for_ami(ami_id: str, region: str) -> None:
    """Block until the new AMI is available to launch."""
    ec2 = boto3.client("ec2", region_name=region)
    waiter = ec2.get_waiter("image_available")
    try:
        waiter.wait(ImageIds=[ami_id])
    except WaiterError as exc:
        raise RuntimeError(f"AMI {ami_id} did not become available in time") from exc


def run_terraform_two_phase_apply(org_id: str, region: str, terraform_dir: str) -> None:
    """
    Phase 1: targeted apply to create S3 bucket, upload agent, create IAM role, create builder instance and AMI.
    Phase 2: full apply for the rest of the infra, passing the created Windows AMI id as workstation_ami.
    """


    # ---------- PHASE 2: full apply for the rest of the infra, using the new AMI ----------
    logger.info("[~] Running terraform init...")
    init_result = subprocess.run(
        ["terraform", "init"], 
        cwd=terraform_dir, 
        capture_output=True, 
        text=True
    )
    if init_result.returncode != 0:
        logger.error(f"Terraform init failed:\n{init_result.stdout}\n{init_result.stderr}")
        raise subprocess.CalledProcessError(init_result.returncode, init_result.args, init_result.stdout, init_result.stderr)
    logger.info(f"Terraform init output:\n{init_result.stdout}")
    
    logger.info("[~] Phase 2: provisioning remaining infrastructure with the new AMI...")
    phase2_plan_cmd = [
        "terraform", "apply","-auto-approve",
        "-var", f"org_id={org_id}",
        "-var", f"region={region}",
    ]
    
    apply_result = subprocess.run(phase2_plan_cmd, cwd=terraform_dir, capture_output=True, text=True)
    if apply_result.returncode != 0:
        logger.error(f"Terraform apply failed:\n{apply_result.stdout}\n{apply_result.stderr}")
        raise subprocess.CalledProcessError(apply_result.returncode, apply_result.args, apply_result.stdout, apply_result.stderr)
    logger.info(f"Terraform apply output:\n{apply_result.stdout}")

    logger.info("[~] Applying phase2.plan ...")

    logger.info("[✓] Terraform apply complete for all resources.")


def get_ec2_ips(region: str, org_id: str):
    """Fetch detailed EC2 instance metadata for a given org."""
    global logger
    ec2 = boto3.client("ec2", region_name=region)
    reservations = ec2.describe_instances()["Reservations"]

    def extract_name(tags):
        for tag in tags or []:
            if tag["Key"] == "Name":
                return tag["Value"]
        return None

    instances = []
    for res in reservations:
        for inst in res["Instances"]:
            state = inst["State"]["Name"]
            if state != "running":
                continue
            name = extract_name(inst.get("Tags"))
            if not name or org_id not in name:
                continue

            # Get key and volume info
            volumes = inst.get("BlockDeviceMappings", [])
            storage_size_gb = 0
            for vol in volumes:
                ebs = vol.get("Ebs")
                if ebs:
                    vol_info = ec2.describe_volumes(VolumeIds=[ebs["VolumeId"]])["Volumes"][0]
                    storage_size_gb += vol_info["Size"]

            metadata = {
                "org_id": org_id,
                "name": name,
                "instance_id": inst["InstanceId"],
                "vpc_id": inst.get("VpcId"),
                "subnet_id": inst.get("SubnetId"),
                "ssh_key": inst.get("KeyName"),
                "ami_id": inst.get("ImageId"),
                "os": inst.get("PlatformDetails", "Linux/UNIX"),
                "cpu": inst.get("CpuOptions", {}).get("CoreCount"),
                "ram_gb": inst.get("InstanceType"),
                "storage_size_gb": storage_size_gb,
                "created_at": inst["LaunchTime"].strftime("%Y-%m-%d %H:%M:%S"),
                "updated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                "ports": [sg["GroupId"] for sg in inst.get("SecurityGroups", [])],
                "status": inst["State"]["Name"],
                "private_ip": inst.get("PrivateIpAddress"),
                "public_ip": inst.get("PublicIpAddress"),
            }

            instances.append(metadata)

    if not instances:
        logger.info(f"[!] No EC2 instances found for org: {org_id}")
        return []

    logger.info(f"\n[+] EC2 Instances for {org_id}:")
    for i in instances:
        logger.info(f"  - {i['name']} ({i['instance_id']}) → {i['status']}")
        logger.info(f"      Private IP: {i['private_ip']}")
        logger.info(f"      Public IP:  {i['public_ip']}\n")

    return instances


# MAIN
def provision_network_terraform(org_id, region, templates_dir, generated_dir, server_logger):
    global logger
    logger = server_logger
    templates_dir = os.path.abspath(templates_dir)

    logger.info(f"[*] Provisioning for org: {org_id} in region: {region}")
    target_dir = copy_and_replace_templates(org_id, templates_dir=templates_dir, generated_dir=generated_dir)

    if target_dir is None:
        return None

    run_terraform_two_phase_apply(org_id, region=region, terraform_dir=target_dir)
    
    # Get EC2 metadata
    metadata = get_ec2_ips(region, org_id)
    
    logger.info(f"[✓] Finished provisioning for {org_id}.")
    return metadata
