import grpc
import hashlib
import logging
import os
import subprocess

from proto import bootstrap_pb2
from proto import bootstrap_pb2_grpc

logger = logging.getLogger("cloudshield.agent.bootstrap")

SERVER_ADDR = '127.0.0.1:50051'
TEMP_AGENT_BINARY = "temp_agent.exe"
AGENT_BINARY = "agent.exe"
SERVICE_NAME = "CloudShieldAgent"

def get_agent_checksum():
    file_path = AGENT_BINARY
    try:
        hash_md5 = hashlib.md5()  # create MD5 hash object
        with open(file_path, "rb") as f:  # open file in binary mode
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)  # feed each chunk to the hash
        return hash_md5.hexdigest()
    except OSError as e:
        logger.error("Failed to compute agent checksum: %s", e)
        return 0

def write_agent_binary(binary):
    f = open(TEMP_AGENT_BINARY, "wb")
    f.write(binary)
    f.close()

def replace_agent_binary():
    os.replace(TEMP_AGENT_BINARY, AGENT_BINARY)



def version_check():
    channel = grpc.insecure_channel(SERVER_ADDR)
    stub = bootstrap_pb2_grpc.BootstrapServiceStub(channel)

    request = bootstrap_pb2.VersionCheck(md5sum=get_agent_checksum(), agent_id='agent-1')

    response = stub.ValidateVersion(request)
    logger.info("Version check status: %s", response.status)

    if response.status == bootstrap_pb2.VersionCheckAck.UPDATE_REQUIRED:
        subprocess.run(["net", "stop", SERVICE_NAME], check=True)
        logger.info("Update required — replacing agent binary")
        binary = response.binary
        write_agent_binary(binary)
        replace_agent_binary()
        subprocess.run(["net", "start", SERVICE_NAME], check=True)

    logger.info("Bootstrap script completed")

version_check()
