import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc
from utils import get_ip, ingest_processes

import hashlib
from google.protobuf.json_format import MessageToDict
from state import state_manager
from logger import servicer_logger
from utils import es_log

def loggable(func):

    def wrapper(*args, **kwargs):
        request = args[1]
        context = args[2]
       
        es_log("rpc_logs", MessageToDict(request))
        return func(*args, **kwargs)

    return wrapper
    

class AgentServiceServicer(agent_pb2_grpc.AgentServiceServicer):

    def __init__(self, agents):
        self.agents = []


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
        if request.is_pending is True:
            servicer_logger.info("Received cached message")
        if len(unknown_processes) != 0 and request.is_pending is False:
            state_manager.set_expected_response(request.agent_id, "SendProcessList", "SendProcessListInformation")
            return agent_pb2.ProcessListAck(action=True, pids=pids)
        
        return agent_pb2.ProcessListAck(action=False, pids=pids)

    def SendProcessListInformation(self, request, context):
        if not state_manager.is_expected(request.agent_id, "SendProcessListInformation"):
            servicer_logger.error("Unexpected 'SendProcessListInformation' message, make sure a response was expected")
            # what should we send back if we get an unexpected call?
            return
        servicer_logger.info(f"Received {len(request.processes)} processes from {request.agent_id} (ip={get_ip(context.peer())})")

        for proc in request.processes:
            proc = MessageToDict(proc)
            proc["agent_id"] = request.agent_id
            es_log("unknown_procs", proc)

        return agent_pb2.Ack(success=True, message="test") 
    
    def SendNetworkConnections(self, request, context):
        # Log basic info
        servicer_logger.info(
            f"Received {len(request.conns)} network connections from {request.agent_id} "
            f"(ip={get_ip(context.peer())})"
        )
    
        # Optional: ship to Elasticsearch (keeps your existing pattern)
        for c in request.conns:
            doc = MessageToDict(c, preserving_proto_field_name=True)
            doc["agent_id"] = request.agent_id
            doc["timestamp"] = request.timestamp
            es_log("net_conns", doc)
    
        return agent_pb2.Ack(success=True, message="network connections ingested")

