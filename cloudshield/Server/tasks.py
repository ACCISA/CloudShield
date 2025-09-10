import boto3
from rq import get_current_job
import time

def create_ec2(instance_type="t2.micro", ami="ami-1234567890abcdef0"):
    job = get_current_job()
    job.meta["progress"] = "starting this task"
    print(job.meta)
    job.save_meta()
    """Create an EC2 instance"""
    time.sleep(10)
    return f"EC2 instance created."

def create_vpc(cidr="10.0.0.0/16"):
    """Create a VPC"""
    time.sleep(10)
    return f"VPC created."

