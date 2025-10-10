import grpc
import os

from proto import bootstrap_pb2
from proto import bootstrap_pb2_grpc

SERVER_ADDR = '127.0.0.1:50051'
TEMP_AGENT_BINARY = "temp_agent.exe"
AGENT_BINARY = "agent.exe"
SERVICE_NAME = "CloudShieldAgent"

def get_agent_checksum():
    return "aasdasdasdasdasd"

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
    print("status", response.status)

    if response.status == bootstrap_pb2.VersionCheckAck.UPDATE_REQUIRED:
        subprocess.run(["net", "stop", SERVICE_NAME], check=True)
        print("update required")
        binary = response.binary
        write_agent_binary(binary)
        replace_agent_binary()
        subprocess.run(["net", "start", SERVICE_NAME], check=True)

    print("bootstrap script completed")

version_check()
