"""gRPC threat detection server with agent authentication and heartbeat monitoring."""
import os
import time
import threading
import grpc
from concurrent import futures

import proto.agent_pb2_grpc as agent_pb2_grpc

from utils import get_agents, is_valid_agent
from servicer import AgentServiceServicer
from state import state_manager
from logger import state_logger, server_logger, interceptor_logger

# ── Threat-detection subsystem imports (graceful) ───────────────────────────
try:
    from snort.alert_parser import SnortAlertWatcher
    from alerts import alert_from_snort
    from es_templates import ensure_index_templates
    from scheduled_tasks import start_scheduled_tasks
    from servicer import _anomaly_detector, _threat_intel, _alert_dedup
    from utils import es_log
    _HAS_THREAT = True
except Exception:
    _HAS_THREAT = False

heartbeats = {}


def log_heartbeat(agent_id, method):
    """Record agent heartbeat with method name."""
    global heartbeats
    logged_heartbeats = heartbeats.get(agent_id, None)

    if logged_heartbeats is None:
        heartbeats[agent_id] = [method]
        return

    heartbeats[agent_id].append(method)


class ClientIPInterceptor(grpc.ServerInterceptor):
    """gRPC interceptor for IP-based agent authentication and heartbeat tracking."""

    def intercept_service(self, continuation, handler_call_details):
        method_name = handler_call_details.method
        handler = continuation(handler_call_details)
        if handler is None:
            return None

        if handler.unary_unary:
            def new_unary_unary(request, context):
                peer = context.peer()
                agent_id = getattr(request, "agent_id", None)
                if peer.startswith("ipv4:"):
                    ip = peer.split(":")[1]
                elif peer.startswith("ipv6:"):
                    ip = peer.split("]:")[0][5:]
                else:
                    ip = "unknown"
                # Re-read agents.json on every call so newly provisioned
                # workstations are admitted without a server restart.
                current_agents = get_agents()
                if not is_valid_agent(current_agents, ip, agent_id):
                    interceptor_logger.warning("invalid agent tried to talk to grpc")
                    context.abort(grpc.StatusCode.PERMISSION_DENIED, "Invalid Agent")

                if agent_id is None:
                    interceptor_logger.warning("rpc message received with no agent_id")
                    context.abort(grpc.StatusCode.PERMISSION_DENIED, "Invalid RPC call")
                
                log_heartbeat(agent_id, method_name)
                return handler.unary_unary(request, context)

            return grpc.unary_unary_rpc_method_handler(
                new_unary_unary,
                request_deserializer=handler.request_deserializer,
                response_serializer=handler.response_serializer
            )

        return handler


def serve(bind_address="0.0.0.0:50051"):
    """Start gRPC server with agent authentication interceptor."""
    server = grpc.server(
        futures.ThreadPoolExecutor(max_workers=10),
        interceptors=[ClientIPInterceptor()]
    )

    agent_pb2_grpc.add_AgentServiceServicer_to_server(
        AgentServiceServicer(""), server
    )
    server.add_insecure_port(bind_address)

    server.start()
    server_logger.info(f"gRPC server listening on {bind_address}")
    server.wait_for_termination()
    server_logger.info("Server stopped.")

def print_heartbeats():
    while True:
        time.sleep(5)

def monitor_state():
    state_logger.info("monitoring thread has started")
    while True:
        state_manager.alert_missing_responses()
        time.sleep(5)


def _start_threat_subsystems():
    """
    Initialise threat-detection subsystems that run alongside gRPC:
      - Elasticsearch index templates
      - Snort alert file watcher
      - Scheduled background tasks (retrain, feed refresh, alert flush, prune)
    """
    if not _HAS_THREAT:
        server_logger.info("Threat-detection subsystem imports unavailable — skipping")
        return

    # 1. ES index templates
    try:
        from elasticsearch import Elasticsearch
        es = Elasticsearch(
            [os.environ.get("ES_URL", "http://localhost:9200")],
            basic_auth=("elastic", os.environ.get("ES_PASSWORD", "enKPRIhK")),
        )
        ensure_index_templates(es, server_logger)
    except Exception as exc:
        server_logger.warning("ES index template setup skipped: %s", exc)
        es = None

    # 2. Snort alert watcher
    snort_log = os.environ.get("SNORT_ALERT_FILE", "/var/log/snort/alert")
    _snort_dedup = _alert_dedup  # reuse the servicer's deduplicator

    def _on_snort_alert(alert):
        """Callback invoked by the watcher for each new Snort line."""
        es_log("snort_alerts", alert.to_dict())
        if _snort_dedup is not None:
            _snort_dedup.ingest(alert_from_snort(alert.to_dict()))

    watcher = SnortAlertWatcher(snort_log, _on_snort_alert)
    watcher.start()
    server_logger.info("Snort alert watcher started (file=%s)", snort_log)

    # 3. Scheduled tasks
    # CLOUDSHIELD_SERVER_URL  – base URL of the Flask API server
    #   e.g. "http://localhost:5000" or "http://api.internal"
    # CLOUDSHIELD_ORG_ID      – org that owns this ThreatDetection deployment
    _server_config: dict | None = None
    _server_url = os.environ.get("CLOUDSHIELD_SERVER_URL", "").strip()
    if _server_url:
        _server_config = {
            "url": _server_url,
            "org_id": os.environ.get("CLOUDSHIELD_ORG_ID", "system"),
        }
        server_logger.info(
            "Server push enabled: alerts will be forwarded to %s (org=%s)",
            _server_url, _server_config["org_id"],
        )
    else:
        server_logger.info(
            "CLOUDSHIELD_SERVER_URL not set — alert push to Server disabled"
        )

    start_scheduled_tasks(
        threat_intel=_threat_intel,
        anomaly_detector=_anomaly_detector,
        alert_deduplicator=_alert_dedup,
        es_client=es,
        es_log_fn=es_log,
        logger=server_logger,
        server_config=_server_config,
    )


if __name__ == "__main__":
    t = threading.Thread(target=print_heartbeats, daemon=True)
    t2= threading.Thread(target=monitor_state, daemon=True)
    t.start()
    t2.start()

    # Start threat-detection subsystems
    _start_threat_subsystems()

    serve()
