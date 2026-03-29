import proto.agent_pb2 as agent_pb2
import proto.agent_pb2_grpc as agent_pb2_grpc

import hashlib
from collections import defaultdict

from google.protobuf.json_format import MessageToDict
from state import state_manager

from logger import servicer_logger
from utils import es_log, get_ip, ingest_processes

# ── Anomaly detection & threat intel (graceful import) ──────────────────────
try:
    from anomaly.detector import AnomalyDetector
    from anomaly.beacon import BeaconDetector
    from monitoring.threat_intel import ThreatIntelChecker
    from anomaly.rate_monitor import TrafficRateMonitor
    from alerts import (
        AlertDeduplicator, alert_from_anomaly, alert_from_threat_intel,
        alert_from_traffic_spike, alert_from_beacon,
    )
    _anomaly_detector = AnomalyDetector(contamination=0.05)
    _beacon_detector = BeaconDetector()
    _threat_intel = ThreatIntelChecker()
    _rate_monitor = TrafficRateMonitor()
    _alert_dedup = AlertDeduplicator()
    _HAS_DETECTORS = True
except Exception:
    _anomaly_detector = None
    _beacon_detector = None
    _threat_intel = None
    _rate_monitor = None
    _alert_dedup = None
    _HAS_DETECTORS = False

# ── Suspicious processes that should not make external network connections ───
_SUSPICIOUS_PROCS = frozenset({
    "cmd.exe", "powershell.exe", "pwsh.exe", "wscript.exe", "cscript.exe",
    "mshta.exe", "regsvr32.exe", "rundll32.exe", "certutil.exe", "bitsadmin.exe",
    "msiexec.exe", "wmic.exe", "msbuild.exe", "installutil.exe",
})

# Per-agent process cache: agent_id → set of process names (lower-cased)
_agent_processes: dict[str, set[str]] = defaultdict(set)


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
                "hash": hashlib.sha256(process.cmdline.encode()).hexdigest(),
                "data": process,
            })
            # Update per-agent process name cache for correlation in SendNetworkConnections
            if process.name:
                _agent_processes[request.agent_id].add(process.name.lower())

        ingest_processes(process_data)
        if request.is_pending is True:
            servicer_logger.info("Received cached message")

        return agent_pb2.ProcessListAck(action=False, pids=[])

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
    
    # ── Detection helpers ────────────────────────────────────────────────

    def _run_anomaly(self, conn_dicts: list, agent_id: str, timestamp: int) -> int:
        """Returns count of anomalies detected."""
        if not (_HAS_DETECTORS and _anomaly_detector):
            return 0
        try:
            results = _anomaly_detector.score_connections(conn_dicts, agent_id=agent_id, timestamp=timestamp)
            anomalies = [r for r in results if r.is_anomaly]
            for a in anomalies:
                es_log("anomaly_alerts", a.to_dict())
                if _alert_dedup:
                    _alert_dedup.ingest(alert_from_anomaly(a.to_dict()))
            if anomalies:
                servicer_logger.warning(f"Detected {len(anomalies)} anomalous connections from {agent_id}")
            return len(anomalies)
        except Exception as exc:
            servicer_logger.error(f"Anomaly detection error: {exc}")
            return 0

    def _run_threat_intel(self, conn_dicts: list, agent_id: str) -> int:
        """Returns count of threat-intel hits."""
        if not (_HAS_DETECTORS and _threat_intel):
            return 0
        try:
            hits = _threat_intel.check_connections(conn_dicts, agent_id=agent_id)
            for h in hits:
                es_log("threat_intel_hits", h.to_dict())
                if _alert_dedup:
                    _alert_dedup.ingest(alert_from_threat_intel(h.to_dict()))
            if hits:
                servicer_logger.warning(f"Threat-intel: {len(hits)} known-bad IP matches from {agent_id}")
            return len(hits)
        except Exception as exc:
            servicer_logger.error(f"Threat-intel check error: {exc}")
            return 0

    def _run_traffic_spike(self, conn_dicts: list, agent_id: str, timestamp: int) -> bool:
        """Returns True if a spike was detected."""
        if not (_HAS_DETECTORS and _rate_monitor):
            return False
        try:
            spike = _rate_monitor.record(agent_id, len(conn_dicts), timestamp)
            if spike.is_spike:
                servicer_logger.warning(
                    f"Traffic spike from {agent_id}: "
                    f"{spike.current_rate:.0f} conns (×{spike.spike_ratio:.1f} baseline)"
                )
                es_log("traffic_spikes", spike.to_dict())
                if _alert_dedup:
                    _alert_dedup.ingest(alert_from_traffic_spike(spike.to_dict()))
            return spike.is_spike
        except Exception as exc:
            servicer_logger.error(f"Traffic-rate monitor error: {exc}")
            return False

    def _run_beacon(self, conn_dicts: list, agent_id: str) -> int:
        """Returns count of beacon patterns detected."""
        if not (_HAS_DETECTORS and _beacon_detector):
            return 0
        try:
            beacons = _beacon_detector.record(conn_dicts, agent_id=agent_id)
            for b in beacons:
                es_log("beacon_alerts", b.to_dict())
                if _alert_dedup:
                    _alert_dedup.ingest(alert_from_beacon(b.to_dict()))
            if beacons:
                servicer_logger.warning(f"Beacon patterns detected from {agent_id}: {[b.dst_ip for b in beacons]}")
            return len(beacons)
        except Exception as exc:
            servicer_logger.error(f"Beacon detection error: {exc}")
            return 0

    def _run_proc_net_correlation(self, conn_dicts: list, agent_id: str) -> None:
        """Flag connections made by living-off-the-land / LOLBin processes."""
        if not (_HAS_DETECTORS and _alert_dedup):
            return
        known_procs = _agent_processes.get(agent_id, set())
        if not known_procs:
            return
        try:
            for c in conn_dicts:
                proc = (c.get("process_name") or c.get("processName") or "").lower()
                r_ip = c.get("raddr_ip") or c.get("raddrIp") or ""
                if not proc or not r_ip:
                    continue
                # Check if this is a suspicious process making an external connection
                is_lolbin = proc in _SUSPICIOUS_PROCS or any(proc.endswith(p) for p in _SUSPICIOUS_PROCS)
                is_external = r_ip and not r_ip.startswith(("10.", "172.", "192.168.", "127."))
                if is_lolbin and is_external:
                    from alerts import Alert, Severity
                    import time as _time
                    a = Alert(
                        source="proc_net",
                        severity=Severity.HIGH.value,
                        timestamp=int(c.get("timestamp") or _time.time()),
                        first_seen=int(_time.time()),
                        last_seen=int(_time.time()),
                        agent_id=agent_id,
                        src_ip=c.get("laddr_ip") or "",
                        dst_ip=r_ip,
                        dst_port=int(c.get("raddr_port") or c.get("raddrPort") or 0),
                        rule_id="lolbin_external_conn",
                        title=f"LOLBin making external connection: {proc}",
                        description=(
                            f"{proc} (PID {c.get('pid', '?')}) on agent {agent_id} "
                            f"established an outbound connection to {r_ip}. "
                            f"Living-off-the-land binaries should not initiate external connections."
                        ),
                        details=c,
                    )
                    a.compute_id()
                    es_log("proc_net_alerts", a.to_dict())
                    _alert_dedup.ingest(a)
                    servicer_logger.warning(f"LOLBin external connection: {proc} → {r_ip} on {agent_id}")
        except Exception as exc:
            servicer_logger.error(f"Process-network correlation error: {exc}")

    def _run_cross_source_correlation(
        self, agent_id: str, anomaly_count: int, intel_count: int, spike: bool, beacon_count: int
    ) -> None:
        """Escalate to CRITICAL when multiple detectors fire on the same agent in one batch."""
        if not (_HAS_DETECTORS and _alert_dedup):
            return
        sources_fired = sum([
            anomaly_count > 0,
            intel_count > 0,
            spike,
            beacon_count > 0,
        ])
        if sources_fired < 2:
            return
        try:
            import time as _time
            from alerts import Alert, Severity
            fired = []
            if anomaly_count > 0:
                fired.append(f"anomaly ({anomaly_count})")
            if intel_count > 0:
                fired.append(f"threat-intel ({intel_count})")
            if spike:
                fired.append("traffic-spike")
            if beacon_count > 0:
                fired.append(f"beacon ({beacon_count})")
            a = Alert(
                source="correlation",
                severity=Severity.CRITICAL.value,
                timestamp=int(_time.time()),
                first_seen=int(_time.time()),
                last_seen=int(_time.time()),
                agent_id=agent_id,
                rule_id="multi_source_correlation",
                title=f"Multi-source threat: {', '.join(fired)}",
                description=(
                    f"Agent {agent_id} triggered {sources_fired} independent detection "
                    f"sources in the same connection batch: {', '.join(fired)}. "
                    f"This combination strongly indicates active compromise."
                ),
                details={"sources": fired, "agent_id": agent_id},
            )
            a.compute_id()
            es_log("correlation_alerts", a.to_dict())
            _alert_dedup.ingest(a)
            servicer_logger.warning(f"CRITICAL multi-source alert for {agent_id}: {fired}")
        except Exception as exc:
            servicer_logger.error(f"Cross-source correlation error: {exc}")

    # ── Main RPC handler ─────────────────────────────────────────────────

    def SendNetworkConnections(self, request, context):
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

        agent_id = request.agent_id
        ts = request.timestamp

        anomaly_count = self._run_anomaly(conn_dicts, agent_id, ts)
        intel_count   = self._run_threat_intel(conn_dicts, agent_id)
        spike         = self._run_traffic_spike(conn_dicts, agent_id, ts)
        beacon_count  = self._run_beacon(conn_dicts, agent_id)
        self._run_proc_net_correlation(conn_dicts, agent_id)
        self._run_cross_source_correlation(agent_id, anomaly_count, intel_count, spike, beacon_count)

        return agent_pb2.Ack(success=True, message="network connections ingested")
