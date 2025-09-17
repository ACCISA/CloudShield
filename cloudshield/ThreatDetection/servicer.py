import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc
from utils import get_ip, ingest_processes

import hashlib
from elasticsearch import Elasticsearch
from google.protobuf.json_format import MessageToDict
from state import state_manager
from logger import servicer_logger


def loggable(func):

    def wrapper(*args, **kwargs):
        request = args[1]
        context = args[2]
        es = Elasticsearch(
                "http://localhost:9200",
                http_auth=("elastic","enKPRIhK")
        )
        es.index(index="rpc_logs", document=MessageToDict(request))
        return func(*args, **kwargs)

    return wrapper
    

class AgentServiceServicer(agent_pb2_grpc.AgentServiceServicer):

    def SendWorkstationInit(self, request, context):
        print(f"[INIT] Agent {request.agent_id} from domain {request.domain}")
        return agent_pb2.Ack(success=True, message="Workstation registered")

    def SendProcessList(self, request, context):
        
        servicer_logger.info(f"Received {len(request.processes)} processes from {request.agent_id} (ip={get_ip(context.peer())})")
        process_data = []
        for process in request.processes:
            if process.cmdline.strip(" ") == "": 
                process.cmdline = ""
                continue
            process_data.append({
                "hash":hashlib.sha256(process.cmdline.encode()).hexdigest(),
                "data": process
            })
        unknown_processes = ingest_processes(process_data)
        pids = [proc["data"].pid for proc in unknown_processes]

        if len(unknown_processes) != 0:
            state_manager.set_expected_response(request.agent_id, "SendProcessList", "SendProcessListInformation")
            return agent_pb2.ProcessListAck(action=True, pids=pids)
        
        return agent_pb2.ProcessListAck(action=True, pids=pids)

    def SendProcessListInformation(self, request, context):
        if not state_manager.is_expected(request.agent_id, "SendProcessListInformation"):
            # what should we send back if we get an unexpected call?
            return

        return agent_pb2.Ack(success=True, message="test") 
