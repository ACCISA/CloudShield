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
def run_terraform_apply():
    """Initializes and applies Terraform for the org-specific folder."""
    print(f"[+] Initializing Terraform for {ORG_ID}...")
    subprocess.run(["terraform", "init"], cwd=TERRAFORM_DIR, check=True)

    print(f"[+] Applying Terraform templates for {ORG_ID}...")
    subprocess.run(
        [
            "terraform", "apply",
            "-auto-approve",
            "-var", f"org_id={ORG_ID}",
            "-var", f"region={AWS_REGION}"
        ],
        cwd=TERRAFORM_DIR,
        check=True
    )

    print(f"[✓] Terraform apply complete for {ORG_ID}.")


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
    run_terraform_apply()
    get_ec2_ips(AWS_REGION, ORG_ID)
    print(f"[✓] Finished provisioning for {ORG_ID}.\nTerraform files are in: {GENERATED_DIR}")

if __name__ == "__main__":
    main()
