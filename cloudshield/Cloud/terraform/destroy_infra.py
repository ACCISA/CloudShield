"""Utilities for tearing down Terraform-managed CloudShield infrastructure."""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import time
from typing import Sequence

try:  # boto3 is optional during unit tests and local development
    import boto3
    from botocore.exceptions import ClientError

    BOTO3_AVAILABLE = True
except Exception:  # pragma: no cover - triggered in tests that simulate missing boto3
    boto3 = None  # type: ignore[assignment]
    ClientError = Exception  # type: ignore[assignment]
    BOTO3_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GENERATED_DIR = os.path.join(BASE_DIR, "generated")


def run_cmd(cmd: Sequence[str], *, cwd: str | None = None, capture_output: bool = False):
    """Execute a subprocess command with Terraform-friendly defaults."""
    return subprocess.run(
        list(cmd),
        cwd=cwd,
        check=True,
        capture_output=capture_output,
        text=True,
    )


def terraform_init_if_needed(org_dir: str) -> None:
    """Ensure the Terraform working directory is initialised."""
    run_cmd(["terraform", "init", "-input=false"], cwd=org_dir)


def terraform_destroy(org_dir: str, org_id: str, region: str) -> bool:
    """Destroy Terraform resources for the given organisation."""
    try:
        run_cmd(
            [
                "terraform",
                "destroy",
                "-auto-approve",
                "-var",
                f"org_id={org_id}",
                "-var",
                f"region={region}",
            ],
            cwd=org_dir,
        )
        return True
    except subprocess.CalledProcessError:
        return False


def get_terraform_output(org_dir: str, name: str) -> str | None:
    """Return a Terraform output value, or None if the command fails."""
    try:
        result = run_cmd(["terraform", "output", "-raw", name], cwd=org_dir, capture_output=True)
        return result.stdout.strip()
    except subprocess.CalledProcessError:
        return None


def empty_s3_bucket(bucket_name: str, region: str) -> bool:
    """Attempt to empty an S3 bucket if boto3 support is available."""
    if not BOTO3_AVAILABLE:
        print("[!] boto3 not available in this Python environment - cannot empty bucket programmatically.")
        return False

    print(f"[+] Attempting to empty S3 bucket: {bucket_name} (region={region})")
    s3 = boto3.resource("s3", region_name=region)
    bucket = s3.Bucket(bucket_name)

    try:
        bucket.object_versions.delete()
        bucket.objects.delete()
        time.sleep(2)  # allow eventual consistency to settle
        print("[+] Bucket emptied.")
        return True
    except ClientError as exc:  # pragma: no cover - exercised via error-handling test
        print(f"[!] Failed to empty bucket: {exc}")
        return False


def destroy(org_id: str, region: str = "ca-central-1", force_empty_s3: bool = False) -> None:
    """High-level orchestration for destroying Terraform infrastructure."""
    org_dir = os.path.join(GENERATED_DIR, org_id)

    if not os.path.exists(org_dir):
        print(f"[!] No Terraform directory found for org {org_id} at {org_dir}")
        return

    print(f"[*] Destroying infrastructure for org: {org_id} (dir: {org_dir})")

    try:
        terraform_init_if_needed(org_dir)
    except subprocess.CalledProcessError:
        print("[!] Aborting due to terraform init failure.")
        return

    success = terraform_destroy(org_dir, org_id, region)
    if not success:
        if force_empty_s3:
            print("[*] destroy failed — attempting to locate and empty S3 bucket, then retrying destroy.")
            bucket = get_terraform_output(org_dir, "agent_s3_bucket")
            if not bucket:
                print("[!] Could not find 'agent_s3_bucket' terraform output. Cannot auto-empty bucket.")
            else:
                print(f"[+] Found bucket from terraform output: {bucket}")
                if empty_s3_bucket(bucket, region):
                    print("[+] Retrying terraform destroy once...")
                    success = terraform_destroy(org_dir, org_id, region)
                    if success:
                        print("[+] Terraform destroy succeeded on retry after emptying S3 bucket.")
        if not success:
            print("[!] Terraform destroy still failed. Leaving generated directory in place for inspection.")
            return
    else:
        print("[+] Terraform resources destroyed successfully.")

    try:
        if os.path.exists(org_dir):
            print(f"[*] Removing local Terraform directory: {org_dir}")
            shutil.rmtree(org_dir)
            print("[+] Directory removed.")
    except Exception as exc:
        print(f"[!] Failed to remove local directory: {exc}")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Destroy Terraform infrastructure for an org")
    parser.add_argument("--org-id", required=True, help="Organization ID (e.g., TEST)")
    parser.add_argument("--region", default="ca-central-1", help="AWS region used for provisioning")
    parser.add_argument(
        "--force-empty-s3",
        action="store_true",
        help="If destroy fails, attempt to empty agent S3 bucket (requires boto3 and AWS creds)",
    )
    return parser


def main(argv: list[str] | None = None) -> None:
    parser = _build_parser()
    args = parser.parse_args(argv)

    if args.force_empty_s3 and not BOTO3_AVAILABLE:
        print("[!] Warning: --force-empty-s3 requested but boto3 is not installed. Install boto3 to enable this feature.")

    destroy(args.org_id, args.region, args.force_empty_s3)


if __name__ == "__main__":  # pragma: no cover - invoked via CLI entry
    main()
