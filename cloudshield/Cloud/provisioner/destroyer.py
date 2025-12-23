# destroy_infra.py
# Usage:
#   python destroy_infra.py --org-id ORG123
#   python destroy_infra.py --org-id ORG123 --force-empty-s3

import os
import subprocess
import shutil
import time
import logging

# optional boto3 usage for emptying S3 buckets
try:
    import boto3
    from botocore.exceptions import ClientError
    BOTO3_AVAILABLE = True
except Exception:
    BOTO3_AVAILABLE = False

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GENERATED_DIR = os.path.join(BASE_DIR, "generated")

# Default logger for standalone usage
logger = logging.getLogger(__name__)


def run_cmd(cmd, cwd=None, capture_output=False):
    logger.info(f"Running: {' '.join(cmd)} (cwd={cwd})")
    return subprocess.run(cmd, cwd=cwd, check=True, capture_output=capture_output, text=True)


def terraform_init_if_needed(org_dir):
    # run terraform init to ensure providers/plugins are present
    run_cmd(["terraform", "init", "-input=false"], cwd=org_dir, capture_output=True)


def terraform_destroy(org_dir, org_id, region):
    try:
        run_cmd([
            "terraform", "destroy",
            "-auto-approve",
            "-var", f"org_id={org_id}",
            "-var", f"region={region}"
        ], cwd=org_dir, capture_output=True)
        return True
    except subprocess.CalledProcessError:
        return False


def get_terraform_output(org_dir, name):
    try:
        res = run_cmd(["terraform", "output", "-raw", name], cwd=org_dir, capture_output=True)
        return res.stdout.strip()
    except subprocess.CalledProcessError:
        return None


def empty_s3_bucket(bucket_name, region):
    if not BOTO3_AVAILABLE:
        logger.warning("boto3 not available in this Python environment - cannot empty bucket programmatically.")
        return False

    logger.info(f"Attempting to empty S3 bucket: {bucket_name} (region={region})")
    s3 = boto3.resource("s3", region_name=region)
    bucket = s3.Bucket(bucket_name)

    try:
        # If versioning enabled, delete all versions + delete markers
        bucket.object_versions.delete()
        # Also delete any non-versioned objects (object_versions covers these, but this is safe)
        bucket.objects.delete()
        # Wait a moment for eventual consistency
        time.sleep(2)
        logger.info("Bucket emptied.")
        return True
    except ClientError as e:
        logger.error(f"Failed to empty bucket: {e}")
        return False


def destroy_infra(org_id, org_dir, region="ca-central-1", force_empty_s3=False, server_logger=None):
    global logger
    # Use the passed logger if provided (for job-specific logging)
    if server_logger:
        logger = server_logger
    
    if not os.path.exists(org_dir):
        logger.warning(f"No Terraform directory found for org {org_id} at {org_dir}")
        return

    logger.info(f"Destroying infrastructure for org: {org_id} (dir: {org_dir})")

    try:
        terraform_init_if_needed(org_dir)
    except Exception:
        logger.error("Aborting due to terraform init failure.")
        return

    success = terraform_destroy(org_dir, org_id, region)
    if success:
        logger.info("Terraform resources destroyed successfully.")
    else:
        # if terraform destroy failed and user requested S3 empty attempt, try that then retry once
        if force_empty_s3:
            logger.info("destroy failed — attempting to locate and empty S3 bucket, then retrying destroy.")
            bucket = get_terraform_output(org_dir, "agent_s3_bucket")
            if not bucket:
                logger.warning("Could not find 'agent_s3_bucket' terraform output. Cannot auto-empty bucket.")
            else:
                logger.info(f"Found bucket from terraform output: {bucket}")
                emptied = empty_s3_bucket(bucket, region)
                if emptied:
                    logger.info("Retrying terraform destroy once...")
                    success = terraform_destroy(org_dir, org_id, region)
                    if success:
                        logger.info("Terraform destroy succeeded on retry after emptying S3 bucket.")
        # final check
        if not success:
            logger.error("Terraform destroy still failed. Leaving generated directory in place for inspection.")
            return

    # Only remove local generated directory if destroy succeeded
    try:
        if os.path.exists(org_dir):
            logger.info(f"Removing local Terraform directory: {org_dir}")
            shutil.rmtree(org_dir)
            logger.info("Directory removed.")
    except Exception as e:
        logger.error(f"Failed to remove local directory: {e}")
