# python cloudshield/Cloud/terraform/main.py --org-id=<THE ORG ID>

import os
import shutil
import subprocess
import re
import argparse
import boto3


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

    print(f"[+] Templates processed and written to: {GENERATED_DIR}")


# RUN TERRAFORM
def run_terraform_two_phase_apply():
    """
    Phase 1: targeted apply to create S3 bucket, upload agent, create IAM role, create builder instance and AMI.
    Phase 2: full apply for the rest of the infra, passing the created Windows AMI id as workstation_ami.
    """
    print(f"[+] Initializing Terraform for {ORG_ID}...")
    subprocess.run(["terraform", "init"], cwd=TERRAFORM_DIR, check=True)

    # ---------- PHASE 1: targeted plan/apply for builder + AMI ----------
    print(f"[+] Phase 1: creating S3, IAM, builder instance and AMI for {ORG_ID}...")

    phase1_targets = [
        "-target=aws_s3_bucket.agent_bucket",
        "-target=aws_s3_bucket_object.agent_exe",
        "-target=aws_iam_role.builder_role",
        "-target=aws_iam_instance_profile.builder_profile",
        "-target=aws_instance.windows_builder",
        "-target=aws_ami_from_instance.cloudshield_windows"
    ]

    phase1_plan_cmd = ["terraform", "plan", "-out", "phase1.plan", "-var", f"org_id={ORG_ID}", "-var", f"region={AWS_REGION}"] + phase1_targets
    print("[+] Running:", " ".join(phase1_plan_cmd))
    subprocess.run(phase1_plan_cmd, cwd=TERRAFORM_DIR, check=True)

    print("[+] Applying phase1.plan ... (this may take several minutes while the AMI is created)")
    subprocess.run(["terraform", "apply", "phase1.plan"], cwd=TERRAFORM_DIR, check=True)

    # ---------- retrieve AMI id output ----------
    print("[+] Retrieving created AMI id from Terraform outputs...")
    # Give Terraform a moment to ensure outputs are available; this is usually instantaneous but safe to be robust
    out = subprocess.run(["terraform", "output", "-raw", "created_windows_ami_id"], cwd=TERRAFORM_DIR, check=True, capture_output=True, text=True)
    ami_id = out.stdout.strip()
    if not ami_id:
        raise RuntimeError("Failed to obtain created_windows_ami_id from terraform output.")

    print(f"[+] Phase 1 finished. Created AMI: {ami_id}")

    # ---------- PHASE 2: full apply for the rest of the infra, using the new AMI ----------
    print(f"[+] Phase 2: applying full Terraform stack with workstation_ami={ami_id} ...")
    phase2_plan_cmd = [
        "terraform", "plan", "-out", "phase2.plan",
        "-var", f"org_id={ORG_ID}",
        "-var", f"region={AWS_REGION}",
        "-var", f"workstation_ami={ami_id}"
    ]
    print("[+] Running:", " ".join(phase2_plan_cmd))
    subprocess.run(phase2_plan_cmd, cwd=TERRAFORM_DIR, check=True)

    print("[+] Applying phase2.plan ...")
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
