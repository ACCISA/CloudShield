import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc
from utils import get_ip, ingest_processes

import hashlib
from elasticsearch import Elasticsearch
from google.protobuf.json_format import MessageToDict

def loggable(func):

    def wrapper(*args, **kwargs):
        request = args[1]
        context = args[2]
        es = Elasticsearch(
                "http://localhost:9200",
                http_auth=("elastic","enKPRIhK")
        )
        es.index(index="rpc_logs", document=MessageToDict(request))
        print("hereeee")
        return func(*args, **kwargs)

    return wrapper
    

class AgentServiceServicer(agent_pb2_grpc.AgentServiceServicer):



    def SendWorkstationInit(self, request, context):
        print(f"[INIT] Agent {request.agent_id} from domain {request.domain}")
        return agent_pb2.Ack(success=True, message="Workstation registered")

    @loggable
    def SendProcessList(self, request, context):
        
        print(f"[PROCESS LIST] From {request.agent_id} ({get_ip(context.peer())}) at {request.timestamp}")
        print(f"  Received {len(request.processes)} processes")
        process_data = []
        for process in request.processes:
            print(process)
            print("------------------------------------")
            if process.cmdline.strip(" ") == "": 
                process.cmdline = ""
                continue
            process_data.append({
                "hash":hashlib.sha256(process.cmdline.encode()).hexdigest(),
                "data": process
            })
        print("adddd")   
        ingest_processes(process_data)

        return agent_pb2.Ack(success=True, message="Process list received")


