import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc

import hashlib

from google.protobuf.json_format import MessageToDict
from state import state_manager

from logger import servicer_logger
from utils import es_log, get_ip, ingest_processes

# ── Anomaly detection & threat intel (graceful import) ──────────────────────
try:
    from anomaly.detector import AnomalyDetector
    from monitoring.threat_intel import ThreatIntelChecker
    from anomaly.rate_monitor import TrafficRateMonitor
    from alerts import AlertDeduplicator, alert_from_anomaly, alert_from_threat_intel, alert_from_traffic_spike
    _anomaly_detector = AnomalyDetector(contamination=0.05)
    _threat_intel = ThreatIntelChecker()
    _rate_monitor = TrafficRateMonitor()
    _alert_dedup = AlertDeduplicator()
    _HAS_DETECTORS = True
except Exception:
    _anomaly_detector = None
    _threat_intel = None
    _rate_monitor = None
    _alert_dedup = None
    _HAS_DETECTORS = False


def loggable(func):

    def wrapper(*args, **kwargs):
        request = args[1]

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
    
        conn_dicts = []
        for c in request.conns:
            doc = MessageToDict(c, preserving_proto_field_name=True)
            doc["agent_id"] = request.agent_id
            doc["timestamp"] = request.timestamp
            es_log("net_conns", doc)
            conn_dicts.append(doc)

        # ── Run anomaly detection on the batch ──────────────────────────
        if _HAS_DETECTORS and _anomaly_detector is not None:
            try:
                results = _anomaly_detector.score_connections(
                    conn_dicts,
                    agent_id=request.agent_id,
                    timestamp=request.timestamp,
                )
                anomalies = [r for r in results if r.is_anomaly]
                if anomalies:
                    servicer_logger.warning(
                        f"Detected {len(anomalies)} anomalous connections from {request.agent_id}"
                    )
                    for a in anomalies:
                        es_log("anomaly_alerts", a.to_dict())
                        if _alert_dedup is not None:
                            _alert_dedup.ingest(alert_from_anomaly(a.to_dict()))
            except Exception as exc:
                servicer_logger.error(f"Anomaly detection error: {exc}")

        # ── Run threat-intel check ──────────────────────────────────────
        if _HAS_DETECTORS and _threat_intel is not None:
            try:
                hits = _threat_intel.check_connections(
                    conn_dicts, agent_id=request.agent_id,
                )
                if hits:
                    servicer_logger.warning(
                        f"Threat-intel: {len(hits)} known-bad IP matches from {request.agent_id}"
                    )
                    for h in hits:
                        es_log("threat_intel_hits", h.to_dict())
                        if _alert_dedup is not None:
                            _alert_dedup.ingest(alert_from_threat_intel(h.to_dict()))
            except Exception as exc:
                servicer_logger.error(f"Threat-intel check error: {exc}")

        # ── Traffic-rate spike detection ────────────────────────────────
        if _HAS_DETECTORS and _rate_monitor is not None:
            try:
                spike = _rate_monitor.record(
                    request.agent_id, len(conn_dicts), request.timestamp,
                )
                if spike.is_spike:
                    servicer_logger.warning(
                        f"Traffic spike from {request.agent_id}: "
                        f"{spike.current_rate:.0f} conns (×{spike.spike_ratio:.1f} baseline)"
                    )
                    es_log("traffic_spikes", spike.to_dict())
                    if _alert_dedup is not None:
                        _alert_dedup.ingest(alert_from_traffic_spike(spike.to_dict()))
            except Exception as exc:
                servicer_logger.error(f"Traffic-rate monitor error: {exc}")

        return agent_pb2.Ack(success=True, message="network connections ingested")
