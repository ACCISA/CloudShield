"""
Simple mock gRPC server for local testing of the CloudShield Agent.
Run this on the same machine the Agent uses (default main.py server_addr is 127.0.0.1:50051).

Usage:
    python tools/mock_grpc_server.py --port 50051

This server implements the AgentService RPCs with simple, deterministic responses.
"""
from concurrent.futures import ThreadPoolExecutor
import argparse
import logging
import time
import os
import sys
import threading
import json

import grpc

# Ensure the Agent package root is on sys.path so local imports like
# `from proto import agent_pb2` work when the script is run from tools/
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
AGENT_ROOT = os.path.dirname(SCRIPT_DIR)
if AGENT_ROOT not in sys.path:
    sys.path.insert(0, AGENT_ROOT)

from proto import agent_pb2, agent_pb2_grpc  # noqa: E402

# Some unit-test environments stub proto modules without the helper that normally
# comes with generated gRPC code. Patch in a minimal version so `serve` keeps working.
if not hasattr(agent_pb2_grpc, "add_AgentServiceServicer_to_server"):
    def _fallback_add_servicer(servicer, server):
        if hasattr(server, "register_servicer"):
            server.register_servicer(servicer)
        else:
            setattr(server, "attached_servicer", servicer)

    agent_pb2_grpc.add_AgentServiceServicer_to_server = _fallback_add_servicer
from google.protobuf.json_format import MessageToDict  # noqa: E402

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('mock_grpc_server')

class AgentServicer(agent_pb2_grpc.AgentServiceServicer):
    def __init__(self, recorder):
        self.recorder = recorder

    def _record(self, rpc_name, request):
        try:
            payload = MessageToDict(request, preserving_proto_field_name=True)
        except Exception:
            # Fallback: naive conversion
            payload = str(request)
        entry = {
            "rpc": rpc_name,
            "agent_id": getattr(request, 'agent_id', None),
            "timestamp": time.time(),
            "payload": payload
        }
        self.recorder.record(entry)

    def SendProcessList(self, request, context):
        logger.info(f"Received ProcessList from {request.agent_id} with {len(request.processes)} processes")
        self._record('SendProcessList', request)
        # For testing, ask the agent to not request extra info
        return agent_pb2.ProcessListAck(action=False)

    def SendProcessListInformation(self, request, context):
        logger.info(f"Received ProcessListInformation from {request.agent_id} with {len(request.processes)} info entries")
        self._record('SendProcessListInformation', request)
        return agent_pb2.Ack(success=True, message="OK")

    def SendWorkstationInit(self, request, context):
        logger.info(f"Received WorkstationInit from {request.agent_id} domain={request.domain}")
        self._record('SendWorkstationInit', request)
        return agent_pb2.Ack(success=True, message="Initialized")


class RequestRecorder:
    def __init__(self, out_file):
        self.out_file = out_file
        self.lock = threading.Lock()
        # ensure directory exists
        try:
            os.makedirs(os.path.dirname(self.out_file) or '.', exist_ok=True)
        except Exception:
            pass
        # Ensure the out file exists (touch) so it's visible for debugging
        try:
            with open(self.out_file, 'a', encoding='utf-8'):
                pass
        except Exception:
            logger.debug(f"Could not touch out_file {self.out_file}")

    def record(self, entry):
        with self.lock:
            try:
                with open(self.out_file, 'a', encoding='utf-8') as fh:
                    fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
            except Exception as e:
                logger.exception(f"Failed to write request entry: {e}")


def serve(host='127.0.0.1', port=50051, out_file=None, max_calls=None, timeout=None):
    recorder = RequestRecorder(out_file or os.path.join(os.path.dirname(__file__), 'received_requests.jsonl'))
    server = grpc.server(ThreadPoolExecutor(max_workers=10))
    agent_pb2_grpc.add_AgentServiceServicer_to_server(AgentServicer(recorder), server)
    listen_addr = f"{host}:{port}"
    server.add_insecure_port(listen_addr)
    server.start()
    logger.info(f"Mock gRPC server started on {listen_addr}")
    logger.debug(f"Recorder out_file={recorder.out_file}, max_calls={max_calls}, timeout={timeout}")

    start_time = time.time()
    end_time = start_time + timeout if timeout else None

    # We track number of recorded lines by checking the file size/count on disk.
    def recorded_count():
        try:
            if os.path.exists(recorder.out_file):
                with open(recorder.out_file, 'r', encoding='utf-8') as fh:
                    return sum(1 for _ in fh)
        except Exception:
            return 0
        return 0

    try:
        while True:
            logger.debug("Mock server loop tick")
            time.sleep(0.5)
            if max_calls is not None:
                if recorded_count() >= int(max_calls):
                    logger.info(f"Reached max_calls={max_calls}; shutting down")
                    break
            if end_time is not None and time.time() >= end_time:
                logger.info(f"Reached timeout={timeout}s; shutting down")
                break
    except KeyboardInterrupt:
        logger.info("Shutting down mock server")
    finally:
        server.stop(0)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--host', default='127.0.0.1')
    parser.add_argument('--port', type=int, default=50051)
    parser.add_argument('--max-calls', type=int, default=None, help='Exit after N recorded requests')
    parser.add_argument('--timeout', type=int, default=None, help='Exit after T seconds')
    parser.add_argument('--out-file', type=str, default=None, help='Path to JSONL file to write received requests')
    args = parser.parse_args()
    serve(args.host, args.port, out_file=args.out_file, max_calls=args.max_calls, timeout=args.timeout)
