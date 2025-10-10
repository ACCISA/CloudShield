# python cloudshield/Cloud/terraform/destroy_infra.py --org-id=<ORG ID>

import argparse
import os
import subprocess
import shutil


# PATHS
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GENERATED_DIR = os.path.join(BASE_DIR, "generated")


# DESTROY INFRASTRUCTURE
def destroy(org_id, region="ca-central-1"):
    org_dir = os.path.join(GENERATED_DIR, org_id)

    if not os.path.exists(org_dir):
        print(f"[!] No Terraform directory found for org {org_id} at {org_dir}")
        return

    print(f"[*] Destroying infrastructure for org: {org_id}...")

    try:
        # Pass org_id and region so Terraform doesn't prompt
        subprocess.run(
            [
                "terraform", "destroy",
                "-auto-approve",
                "-var", f"org_id={org_id}",
                "-var", f"region={region}"
            ],
            cwd=org_dir,
            check=True
        )
        print("[+] Terraform resources destroyed successfully.")
    except subprocess.CalledProcessError as e:
        print("[!] Terraform destroy failed. Some resources may remain.")
        print(e)

    # Optionally delete the generated directory to start completely fresh
    if os.path.exists(org_dir):
        print(f"[*] Removing local Terraform directory: {org_dir}")
        shutil.rmtree(org_dir)
        print("[+] Directory removed.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Destroy Terraform infrastructure for an org")
    parser.add_argument("--org-id", required=True, help="Organization ID (e.g., TEST)")
    parser.add_argument("--region", default="ca-central-1", help="AWS region used for provisioning")
    args = parser.parse_args()

    destroy(args.org_id, args.region)
