# destroy_infra.py
# Usage:
#   python destroy_infra.py --org-id ORG123
#   python destroy_infra.py --org-id ORG123 --force-empty-s3
# python cloudshield/Cloud/terraform/destroy_infra.py --org-id=<ORG ID>

import argparse
import os
import subprocess
import shutil
import time

# optional boto3 usage for emptying S3 buckets
try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except Exception:
    BOTO3_AVAILABLE = False

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
            cwd=org_dir
        )
        return True
    except subprocess.CalledProcessError:
        print("[!] terraform destroy failed (see error above).")
        return False


def get_terraform_output(org_dir, name):
    try:
        res = run_cmd(["terraform", "output", "-raw", name], cwd=org_dir, capture_output=True)
        return res.stdout.strip()
    except subprocess.CalledProcessError:
        return None


def empty_s3_bucket(bucket_name, region):
    if not BOTO3_AVAILABLE:
        print("[!] boto3 not available in this Python environment - cannot empty bucket programmatically.")
        return False

    print(f"[+] Attempting to empty S3 bucket: {bucket_name} (region={region})")
    s3 = boto3.resource("s3", region_name=region)
    bucket = s3.Bucket(bucket_name)

    try:
        # If versioning enabled, delete all versions + delete markers
        bucket.object_versions.delete()
        # Also delete any non-versioned objects (object_versions covers these, but this is safe)
        bucket.objects.delete()
        # Wait a moment for eventual consistency
        time.sleep(2)
        print("[+] Bucket emptied.")
        return True
    except ClientError as e:
        print(f"[!] Failed to empty bucket: {e}")
        return False


def destroy(org_id, region="ca-central-1", force_empty_s3=False):
    org_dir = os.path.join(GENERATED_DIR, org_id)

    if not os.path.exists(org_dir):
        print(f"[!] No Terraform directory found for org {org_id} at {org_dir}")
        return

    print(f"[*] Destroying infrastructure for org: {org_id} (dir: {org_dir})")

    try:
        terraform_init_if_needed(org_dir)
    except Exception:
        print("[!] Aborting due to terraform init failure.")
        return

    success = terraform_destroy(org_dir, org_id, region)
    if success:
        print("[+] Terraform resources destroyed successfully.")
    else:
        # if terraform destroy failed and user requested S3 empty attempt, try that then retry once
        if force_empty_s3:
            print("[*] destroy failed — attempting to locate and empty S3 bucket, then retrying destroy.")
            bucket = get_terraform_output(org_dir, "agent_s3_bucket")
            if not bucket:
                print("[!] Could not find 'agent_s3_bucket' terraform output. Cannot auto-empty bucket.")
            else:
                print(f"[+] Found bucket from terraform output: {bucket}")
                emptied = empty_s3_bucket(bucket, region)
                if emptied:
                    print("[+] Retrying terraform destroy once...")
                    success = terraform_destroy(org_dir, org_id, region)
                    if success:
                        print("[+] Terraform destroy succeeded on retry after emptying S3 bucket.")
        # final check
        if not success:
            print("[!] Terraform destroy still failed. Leaving generated directory in place for inspection.")
            return

    # Only remove local generated directory if destroy succeeded
    try:
        if os.path.exists(org_dir):
            print(f"[*] Removing local Terraform directory: {org_dir}")
            shutil.rmtree(org_dir)
            print("[+] Directory removed.")
    except Exception as e:
        print(f"[!] Failed to remove local directory: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Destroy Terraform infrastructure for an org")
    parser.add_argument("--org-id", required=True, help="Organization ID (e.g., TEST)")
    parser.add_argument("--region", default="ca-central-1", help="AWS region used for provisioning")
    parser.add_argument("--force-empty-s3", action="store_true", help="If destroy fails, attempt to empty agent S3 bucket (requires boto3 and AWS creds)")
    args = parser.parse_args()

    if args.force_empty_s3 and not BOTO3_AVAILABLE:
        print("[!] Warning: --force-empty-s3 requested but boto3 is not installed. Install boto3 to enable this feature.")
    destroy(args.org_id, args.region, args.force_empty_s3)
    args = parser.parse_args()

    destroy(args.org_id, args.region)
