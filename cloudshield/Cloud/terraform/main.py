# python cloudshield/Cloud/terraform/main.py --org-id=<THE ORG ID>

import argparse
import os
import re
import shutil
import subprocess
from datetime import datetime

import boto3
from botocore.exceptions import ClientError, WaiterError


# PATHS
BASE_DIR = os.path.dirname(__file__)
DEFAULT_TEMPLATES_DIR = os.path.join(BASE_DIR, "../templates")


# COPY & REPLACE TEMPLATES
def copy_and_replace_templates(org_id: str, templates_dir: str = DEFAULT_TEMPLATES_DIR, generated_dir: str | None = None) -> str:
    """
    Copies Terraform templates into a dedicated org folder
    and replaces placeholders with the organization ID.
    """
    target_dir = generated_dir or os.path.join(BASE_DIR, f"generated/{org_id}")
    target_dir = os.path.abspath(target_dir)

    if os.path.exists(target_dir):
        print(f"[!] Directory for {org_id} already exists. Removing it to start fresh...")
        shutil.rmtree(target_dir)

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

    print(f"[✓] Prepared Terraform configuration at {target_dir}")
    return target_dir


# RUN TERRAFORM
def cleanup_iam_artifacts(org_id: str, region: str) -> None:
    """Remove leftover IAM role/profile/key pair from previous runs so Terraform can recreate them cleanly."""
    iam = boto3.client("iam")
    role_name = f"{org_id}-cloudshield-builder-role"
    profile_name = f"{org_id}-cloudshield-builder-profile"
    policy_name = f"{org_id}-allow-get-agent"

    print(f"[~] Checking for leftover IAM role/profile for {org_id}...")

    # Instance profile must no longer reference the role before either can be deleted
    try:
        profile = iam.get_instance_profile(InstanceProfileName=profile_name)
    except ClientError as exc:
        if exc.response["Error"].get("Code") != "NoSuchEntity":
            raise  # pragma: no cover
        profile = None

    if profile:
        for role in profile["InstanceProfile"].get("Roles", []):
            try:
                iam.remove_role_from_instance_profile(
                    InstanceProfileName=profile_name,
                    RoleName=role["RoleName"],
                )
                print(f"[~]   Removed role '{role['RoleName']}' from instance profile '{profile_name}'.")
            except ClientError as exc:
                if exc.response["Error"].get("Code") != "NoSuchEntity":
                    raise  # pragma: no cover
        try:
            iam.delete_instance_profile(InstanceProfileName=profile_name)
            print(f"[~]   Deleted instance profile '{profile_name}'.")
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
                print(f"[~]   Deleted inline IAM policy '{policy}'.")
            except ClientError as exc:
                if exc.response["Error"].get("Code") != "NoSuchEntity":
                    raise  # pragma: no cover

        attached = iam.list_attached_role_policies(RoleName=role_name)["AttachedPolicies"]
        for policy in attached:
            try:
                iam.detach_role_policy(RoleName=role_name, PolicyArn=policy["PolicyArn"])
                print(f"[~]   Detached managed policy '{policy['PolicyName']}'.")
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
            print(f"[~]   Deleted IAM role '{role_name}'.")
        except ClientError as exc:
            if exc.response["Error"].get("Code") != "NoSuchEntity":
                raise  # pragma: no cover
    else:
        print(f"[~]   No leftover IAM role named '{role_name}'.")

    # Key pairs are regional
    ec2 = boto3.client("ec2", region_name=region)
    key_name = f"{org_id}_key"
    try:
        ec2.delete_key_pair(KeyName=key_name)
        print(f"[~]   Deleted existing EC2 key pair '{key_name}'.")
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
    cleanup_iam_artifacts(org_id, region)

    print(f"[~] Initializing Terraform for {org_id}...")
    subprocess.run(["terraform", "init"], cwd=terraform_dir, check=True)

    # ---------- PHASE 1: targeted plan/apply for builder + AMI ----------
    print("[~] Phase 1: building Windows workstation AMI (targeted apply)...")

    phase1_targets = [
        "-target=aws_s3_bucket.agent_bucket",
        "-target=aws_s3_bucket_object.agent_exe",
        "-target=aws_iam_role.builder_role",
        "-target=aws_iam_instance_profile.builder_profile",
        "-target=aws_instance.windows_builder",
        "-target=aws_ami_from_instance.cloudshield_windows"
    ]

    phase1_plan_cmd = [
        "terraform",
        "plan",
        "-out",
        "phase1.plan",
        "-var",
        f"org_id={org_id}",
        "-var",
        f"region={region}",
    ] + phase1_targets
    subprocess.run(phase1_plan_cmd, cwd=terraform_dir, check=True)

    print("[~] Applying phase1.plan (AMI creation can take several minutes)...")
    subprocess.run(["terraform", "apply", "phase1.plan"], cwd=terraform_dir, check=True)

    # ---------- retrieve AMI id output ----------
    print("[~] Retrieving created AMI id from Terraform outputs...")
    # Give Terraform a moment to ensure outputs are available; this is usually instantaneous but safe to be robust
    out = subprocess.run(["terraform", "output", "-raw", "created_windows_ami_id"], cwd=terraform_dir, check=True, capture_output=True, text=True)
    ami_id = out.stdout.strip()
    if not ami_id:
        raise RuntimeError("Failed to obtain created_windows_ami_id from terraform output.")

    print(f"[✓] Phase 1 finished. Created AMI: {ami_id}")

    print("[~] Waiting for AMI to become available...")
    wait_for_ami(ami_id, region)
    print("[✓] AMI is available for launch.")

    # ---------- PHASE 2: full apply for the rest of the infra, using the new AMI ----------
    print("[~] Phase 2: provisioning remaining infrastructure with the new AMI...")
    phase2_plan_cmd = [
        "terraform", "plan", "-out", "phase2.plan",
        "-var", f"org_id={org_id}",
        "-var", f"region={region}",
        "-var", f"workstation_ami={ami_id}"
    ]
    subprocess.run(phase2_plan_cmd, cwd=terraform_dir, check=True)

    print("[~] Applying phase2.plan ...")
    subprocess.run(["terraform", "apply", "phase2.plan"], cwd=terraform_dir, check=True)

    print("[✓] Terraform apply complete for all resources.")

# FETCH EC2 METADATA
def get_ec2_ips(region: str, org_id: str):
    """
    Fetch detailed EC2 instance metadata for a given org.
    Returns a list of instance dicts including name, IPs, specs, and status.
    """
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
        print(f"[!] No EC2 instances found for org: {org_id}")
        return []

    print(f"\n[+] EC2 Instances for {org_id}:")
    for i in instances:
        print(f"  - {i['name']} ({i['instance_id']}) → {i['status']}")
        print(f"      Private IP: {i['private_ip']}")
        print(f"      Public IP:  {i['public_ip']}\n")

    return instances


# MAIN
def main(argv: list[str] | None = None):
    parser = argparse.ArgumentParser(description="Provision AWS infrastructure for a specific organization.")
    parser.add_argument("--org-id", required=True, help="Organization ID (used to replace placeholders and tag resources)")
    parser.add_argument("--region", default="ca-central-1", help="AWS region to deploy resources (default: ca-central-1)")
    parser.add_argument("--templates-dir", default=DEFAULT_TEMPLATES_DIR, help="Path to templates (for testing)")
    parser.add_argument("--generated-dir", default=None, help="Directory to write generated terraform files (for testing)")
    args = parser.parse_args(argv)

    org_id = args.org_id
    region = args.region
    templates_dir = os.path.abspath(args.templates_dir)
    generated_dir = args.generated_dir

    print(f"[*] Provisioning for org: {org_id} in region: {region}")
    target_dir = copy_and_replace_templates(org_id, templates_dir=templates_dir, generated_dir=generated_dir)
    run_terraform_two_phase_apply(org_id, region=region, terraform_dir=target_dir)
    metadata = get_ec2_ips(region, org_id)
    print(f"[✓] Finished provisioning for {org_id}.")
    return metadata


if __name__ == "__main__":  # pragma: no cover
    main()