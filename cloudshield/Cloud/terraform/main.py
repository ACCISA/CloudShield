# python cloudshield/Cloud/terraform/main.py --org-id=<THE ORG ID>

import argparse
import os
import re
import shutil
import subprocess

import boto3
from botocore.exceptions import ClientError
from botocore.exceptions import WaiterError


# ARGUMENTS
parser = argparse.ArgumentParser(description="Provision AWS infrastructure for a specific organization.")
parser.add_argument("--org-id", required=True, help="Organization ID (used to replace placeholders and tag resources)")
parser.add_argument("--region", default="ca-central-1", help="AWS region to deploy resources (default: ca-central-1)")
args = parser.parse_args()

ORG_ID = args.org_id
AWS_REGION = args.region


# PATHS
BASE_DIR = os.path.dirname(__file__)
TEMPLATES_DIR = os.path.join(BASE_DIR, "../templates")
GENERATED_DIR = os.path.join(BASE_DIR, f"generated/{ORG_ID}")
TERRAFORM_DIR = GENERATED_DIR  # where terraform will run


# COPY & REPLACE TEMPLATES
def copy_and_replace_templates(org_id: str):
    """
    Copies Terraform templates into a dedicated org folder
    and replaces all placeholders — but keeps 'variable "org_id"' intact.
    """
    if os.path.exists(GENERATED_DIR):
        print(f"[!] Directory for {org_id} already exists. Removing it to start fresh...")
        shutil.rmtree(GENERATED_DIR)

    shutil.copytree(TEMPLATES_DIR, GENERATED_DIR)

    for root, _, files in os.walk(GENERATED_DIR):
        for fname in files:
            path = os.path.join(root, fname)
            if not fname.endswith((".tf", ".tfvars")):
                continue

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            # -----------------------
            # FIX: Do NOT replace variable name "org_id" inside variables.tf
            # -----------------------
            if fname == "variables.tf":
                # Only ensure the variable block exists — no replacements here.
                new_content = content
            else:
                # Replace all org_id occurrences *except* var.org_id
                # e.g., aws_vpc org_id_vpc → aws_vpc TEST_vpc
                new_content = re.sub(r'\borg_id\b(?!\s*\})', org_id, content)
                # Keep var.org_id untouched
                new_content = new_content.replace(f"var.{org_id}", "var.org_id")

            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)

    print(f"[✓] Prepared Terraform configuration at {GENERATED_DIR}")


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
            raise
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
                    raise
        try:
            iam.delete_instance_profile(InstanceProfileName=profile_name)
            print(f"[~]   Deleted instance profile '{profile_name}'.")
        except ClientError as exc:
            if exc.response["Error"].get("Code") != "NoSuchEntity":
                raise

    # Delete inline policies and detach managed policies prior to removing the role
    try:
        iam.get_role(RoleName=role_name)
    except ClientError as exc:
        if exc.response["Error"].get("Code") != "NoSuchEntity":
            raise
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
                    raise

        attached = iam.list_attached_role_policies(RoleName=role_name)["AttachedPolicies"]
        for policy in attached:
            try:
                iam.detach_role_policy(RoleName=role_name, PolicyArn=policy["PolicyArn"])
                print(f"[~]   Detached managed policy '{policy['PolicyName']}'.")
            except ClientError as exc:
                if exc.response["Error"].get("Code") != "NoSuchEntity":
                    raise

        # Remove specific inline policy name if we reached this point without listing it (e.g., throttled call above)
        if policy_name not in inline_policies:
            try:
                iam.delete_role_policy(RoleName=role_name, PolicyName=policy_name)
            except ClientError as exc:
                if exc.response["Error"].get("Code") not in {"NoSuchEntity", "NoSuchEntityException"}:
                    raise

        try:
            iam.delete_role(RoleName=role_name)
            print(f"[~]   Deleted IAM role '{role_name}'.")
        except ClientError as exc:
            if exc.response["Error"].get("Code") != "NoSuchEntity":
                raise
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
            raise


def wait_for_ami(ami_id: str, region: str) -> None:
    """Block until the new AMI is available to launch."""
    ec2 = boto3.client("ec2", region_name=region)
    waiter = ec2.get_waiter("image_available")
    try:
        waiter.wait(ImageIds=[ami_id])
    except WaiterError as exc:
        raise RuntimeError(f"AMI {ami_id} did not become available in time") from exc


def run_terraform_two_phase_apply():
    """
    Phase 1: targeted apply to create S3 bucket, upload agent, create IAM role, create builder instance and AMI.
    Phase 2: full apply for the rest of the infra, passing the created Windows AMI id as workstation_ami.
    """
    cleanup_iam_artifacts(ORG_ID, AWS_REGION)

    print(f"[~] Initializing Terraform for {ORG_ID}...")
    subprocess.run(["terraform", "init"], cwd=TERRAFORM_DIR, check=True)

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
        f"org_id={ORG_ID}",
        "-var",
        f"region={AWS_REGION}",
    ] + phase1_targets
    subprocess.run(phase1_plan_cmd, cwd=TERRAFORM_DIR, check=True)

    print("[~] Applying phase1.plan (AMI creation can take several minutes)...")
    subprocess.run(["terraform", "apply", "phase1.plan"], cwd=TERRAFORM_DIR, check=True)

    # ---------- retrieve AMI id output ----------
    print("[~] Retrieving created AMI id from Terraform outputs...")
    # Give Terraform a moment to ensure outputs are available; this is usually instantaneous but safe to be robust
    out = subprocess.run(["terraform", "output", "-raw", "created_windows_ami_id"], cwd=TERRAFORM_DIR, check=True, capture_output=True, text=True)
    ami_id = out.stdout.strip()
    if not ami_id:
        raise RuntimeError("Failed to obtain created_windows_ami_id from terraform output.")

    print(f"[✓] Phase 1 finished. Created AMI: {ami_id}")

    print("[~] Waiting for AMI to become available...")
    wait_for_ami(ami_id, AWS_REGION)
    print("[✓] AMI is available for launch.")

    # ---------- PHASE 2: full apply for the rest of the infra, using the new AMI ----------
    print("[~] Phase 2: provisioning remaining infrastructure with the new AMI...")
    phase2_plan_cmd = [
        "terraform", "plan", "-out", "phase2.plan",
        "-var", f"org_id={ORG_ID}",
        "-var", f"region={AWS_REGION}",
        "-var", f"workstation_ami={ami_id}"
    ]
    subprocess.run(phase2_plan_cmd, cwd=TERRAFORM_DIR, check=True)

    print("[~] Applying phase2.plan ...")
    subprocess.run(["terraform", "apply", "phase2.plan"], cwd=TERRAFORM_DIR, check=True)

    print("[✓] Terraform apply complete for all resources.")

# FETCH EC2 IPS
def get_ec2_ips(region: str, org_id: str):
    """Fetches and prints EC2 instance IP addresses for this org."""
    ec2 = boto3.client("ec2", region_name=region)
    reservations = ec2.describe_instances()["Reservations"]

    instances = []
    for res in reservations:
        for inst in res["Instances"]:
            name = None
            for tag in inst.get("Tags", []):
                if tag["Key"] == "Name":
                    name = tag["Value"]
            if name and org_id in name:
                instances.append({
                    "Name": name,
                    "InstanceId": inst["InstanceId"],
                    "State": inst["State"]["Name"],
                    "PrivateIP": inst.get("PrivateIpAddress"),
                    "PublicIP": inst.get("PublicIpAddress")
                })

    if not instances:
        print(f"[!] No EC2 instances found for org: {org_id}")
        return []

    print(f"\n[+] EC2 Instances for {org_id}:")
    for i in instances:
        print(f"  - {i['Name']} ({i['InstanceId']}): {i['State']}")
        print(f"      Private IP: {i['PrivateIP']}")
        print(f"      Public IP:  {i['PublicIP']}\n")

    return instances


def main():
    print(f"[*] Provisioning for org: {ORG_ID} in region: {AWS_REGION}")
    copy_and_replace_templates(ORG_ID)
    # Use the new two-phase apply
    run_terraform_two_phase_apply()
    get_ec2_ips(AWS_REGION, ORG_ID)
    print(f"[✓] Finished provisioning for {ORG_ID}.\nTerraform files are in: {GENERATED_DIR}")

if __name__ == "__main__":
    main()
