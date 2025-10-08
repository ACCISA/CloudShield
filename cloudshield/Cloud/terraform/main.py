import os
import shutil
import subprocess
import argparse
import boto3
from datetime import datetime

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

            if fname == "variables.tf":
                new_content = content
            else:
                new_content = content.replace("org_id", org_id)
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
    metadata = get_ec2_ips(region, org_id)
    print(f"[✓] Finished provisioning for {org_id}.")
    return metadata


if __name__ == "__main__":
    main()
