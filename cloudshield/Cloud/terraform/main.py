import os
import shutil
import subprocess
import argparse
import boto3

# PATHS
BASE_DIR = os.path.dirname(__file__)
DEFAULT_TEMPLATES_DIR = os.path.join(BASE_DIR, "../templates")



# COPY & REPLACE TEMPLATES
def copy_and_replace_templates(org_id: str, templates_dir: str = DEFAULT_TEMPLATES_DIR, generated_dir: str = None):
    """
    Copies Terraform templates into a dedicated org folder
    and replaces placeholders with the organization ID.
    """
    if generated_dir is None:
        generated_dir = os.path.join(os.path.dirname(__file__), f"generated/{org_id}")

    if os.path.exists(generated_dir):
        print(f"[!] Directory for {org_id} already exists. Removing it to start fresh...")
        shutil.rmtree(generated_dir)

    shutil.copytree(templates_dir, generated_dir)

    for root, _, files in os.walk(generated_dir):
        for fname in files:
            path = os.path.join(root, fname)
            if not fname.endswith((".tf", ".tfvars")):
                continue

            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            # Don't modify variables.tf (we want variable name to stay org_id)
            if fname == "variables.tf":
                new_content = content
            else:
                # Replace all occurrences of org_id with actual org_id
                new_content = content.replace("org_id", org_id)
                # Revert accidental var.<org_id> back to var.org_id for Terraform variable references
                new_content = new_content.replace(f"var.{org_id}", "var.org_id")

            with open(path, "w", encoding="utf-8") as f:
                f.write(new_content)

    print(f"[+] Templates processed and written to: {generated_dir}")



# RUN TERRAFORM
def run_terraform_apply(org_id: str, region: str = "ca-central-1", terraform_dir: str = None):
    """Initializes and applies Terraform for the org-specific folder."""
    if terraform_dir is None:
        terraform_dir = os.path.join(os.path.dirname(__file__), f"generated/{org_id}")

    print(f"[+] Initializing Terraform for {org_id}...")
    subprocess.run(["terraform", "init"], cwd=terraform_dir, check=True)

    print(f"[+] Applying Terraform templates for {org_id}...")
    subprocess.run(
        [
            "terraform", "apply",
            "-auto-approve",
            "-var", f"org_id={org_id}",
            "-var", f"region={region}"
        ],
        cwd=terraform_dir,
        check=True
    )

    print(f"[✓] Terraform apply complete for {org_id}.")


# FETCH EC2 IPS
def get_ec2_ips(region: str, org_id: str):
    """Fetch and print EC2 instance IP addresses for this org."""
    ec2 = boto3.client("ec2", region_name=region)
    reservations = ec2.describe_instances()["Reservations"]

    def extract_name(tags):
        for tag in tags or []:
            if tag["Key"] == "Name":
                return tag["Value"]
        return None

    def is_org_instance(name):
        return name and org_id in name

    def format_instance(inst, name):
        return {
            "Name": name,
            "InstanceId": inst["InstanceId"],
            "State": inst["State"]["Name"],
            "PrivateIP": inst.get("PrivateIpAddress"),
            "PublicIP": inst.get("PublicIpAddress")
        }

    instances = []
    for res in reservations:
        for inst in res["Instances"]:
            name = extract_name(inst.get("Tags"))
            if not is_org_instance(name):
                continue
            instances.append(format_instance(inst, name))

    if not instances:
        print(f"[!] No EC2 instances found for org: {org_id}")
        return []

    print(f"\n[+] EC2 Instances for {org_id}:")
    for i in instances:
        print(f"  - {i['Name']} ({i['InstanceId']}): {i['State']}")
        print(f"      Private IP: {i['PrivateIP']}")
        print(f"      Public IP:  {i['PublicIP']}\n")

    return instances


# MAIN
def main(argv: list = None):
    parser = argparse.ArgumentParser(description="Provision AWS infrastructure for a specific organization.")
    parser.add_argument("--org-id", required=True, help="Organization ID (used to replace placeholders and tag resources)")
    parser.add_argument("--region", default="ca-central-1", help="AWS region to deploy resources (default: ca-central-1)")
    parser.add_argument("--templates-dir", default=DEFAULT_TEMPLATES_DIR, help="Path to templates (for testing)")
    parser.add_argument("--generated-dir", default=None, help="Directory to write generated terraform files (for testing)")
    args = parser.parse_args(argv)

    org_id = args.org_id
    region = args.region
    templates_dir = args.templates_dir
    generated_dir = args.generated_dir

    print(f"[*] Provisioning for org: {org_id} in region: {region}")
    copy_and_replace_templates(org_id, templates_dir=templates_dir, generated_dir=generated_dir)
    run_terraform_apply(org_id, region=region, terraform_dir=generated_dir)
    get_ec2_ips(region, org_id)
    print(f"[✓] Finished provisioning for {org_id}.")


if __name__ == "__main__":
    main()
