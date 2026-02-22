"""
Feature extraction utilities for network connection anomaly detection.

Transforms raw NetConn records (dicts coming from gRPC / Elasticsearch)
into fixed-length numeric feature vectors that the :class:`AnomalyDetector`
can consume.

Two levels of features are provided:

1. **Per-connection features** – one vector per ``NetConn`` record.
2. **Traffic-window features** – aggregate stats over a sliding window of
   connections (grouped by agent, per time bucket).
"""

from __future__ import annotations

import math
from collections import Counter
from typing import Sequence


# ── Well-known ports used for feature flags ─────────────────────────────────
_PRIVILEGED_THRESHOLD = 1024
_SUSPICIOUS_PORTS = frozenset({
    4444, 5555, 6666, 6667, 8888,  # common RAT / C2 ports
    9001, 9030,                     # Tor
    3128, 8080, 8443,              # proxies
    31337,                          # "elite" backdoor
})
_SERVICE_PORTS = frozenset({22, 53, 80, 443, 445, 3389, 5900})


def _is_private(ip: str) -> bool:
    """Quick check whether *ip* is RFC-1918 / loopback / link-local."""
    if not ip:
        return True
    parts = ip.split(".")
    if len(parts) != 4:
        return ip.startswith("::") or ip == "0.0.0.0"
    first = int(parts[0])
    if first == 10:
        return True
    if first == 172 and 16 <= int(parts[1]) <= 31:
        return True
    if first == 192 and int(parts[1]) == 168:
        return True
    if first == 127:
        return True
    return False


def extract_conn_features(conn: dict) -> list[float]:
    """
    Return a fixed-length feature vector for a single connection dict.

    Expected keys (as produced by :func:`MessageToDict` on a ``NetConn``):
        ``laddr_ip``, ``laddr_port``, ``raddr_ip``, ``raddr_port``,
        ``status``, ``pid``, ``process_name``

    Feature vector (11 floats):
        0  local_port
        1  remote_port
        2  is_established  (1.0 / 0.0)
        3  is_listen       (1.0 / 0.0)
        4  remote_is_private (1.0 / 0.0)
        5  remote_port_is_privileged (1.0 / 0.0)
        6  remote_port_is_suspicious (1.0 / 0.0)
        7  remote_port_is_service    (1.0 / 0.0)
        8  has_remote_addr (1.0 / 0.0)
        9  pid
       10  process_name_length (proxy for unusual binaries)
    """
    l_port = float(conn.get("laddr_port") or conn.get("laddrPort") or 0)
    r_port = float(conn.get("raddr_port") or conn.get("raddrPort") or 0)
    r_ip = conn.get("raddr_ip") or conn.get("raddrIp") or ""
    status = (conn.get("status") or "").upper()
    pid = float(conn.get("pid") or 0)
    pname = conn.get("process_name") or conn.get("processName") or ""

    return [
        l_port,
        r_port,
        1.0 if status == "ESTABLISHED" else 0.0,
        1.0 if status == "LISTEN" else 0.0,
        1.0 if _is_private(r_ip) else 0.0,
        1.0 if r_port < _PRIVILEGED_THRESHOLD else 0.0,
        1.0 if int(r_port) in _SUSPICIOUS_PORTS else 0.0,
        1.0 if int(r_port) in _SERVICE_PORTS else 0.0,
        1.0 if r_ip else 0.0,
        pid,
        float(len(pname)),
    ]


# ── Window / aggregate features ────────────────────────────────────────────

def extract_traffic_window_features(conns: Sequence[dict]) -> list[float]:
    """
    Compute aggregate statistics over a batch of connection dicts.

    Designed to be called once per agent per time window (e.g., 60 s).

    Feature vector (12 floats):
         0  total_connection_count
         1  unique_remote_ips
         2  unique_remote_ports
         3  pct_established
         4  pct_listen
         5  pct_to_external
         6  pct_suspicious_ports
         7  unique_processes
         8  max_conns_per_remote_ip
         9  entropy_remote_ports
        10  avg_remote_port
        11  std_remote_port
    """
    if not conns:
        return [0.0] * 12

    n = float(len(conns))
    remote_ips: list[str] = []
    remote_ports: list[float] = []
    statuses: list[str] = []
    procs: set[str] = set()
    ip_counter: Counter[str] = Counter()

    for c in conns:
        r_ip = c.get("raddr_ip") or c.get("raddrIp") or ""
        r_port = float(c.get("raddr_port") or c.get("raddrPort") or 0)
        status = (c.get("status") or "").upper()
        pname = c.get("process_name") or c.get("processName") or ""

        remote_ips.append(r_ip)
        remote_ports.append(r_port)
        statuses.append(status)
        procs.add(pname)
        if r_ip:
            ip_counter[r_ip] += 1

    unique_ips = len(set(remote_ips))
    unique_ports = len(set(remote_ports))
    pct_est = sum(1 for s in statuses if s == "ESTABLISHED") / n
    pct_listen = sum(1 for s in statuses if s == "LISTEN") / n
    pct_ext = sum(1 for ip in remote_ips if ip and not _is_private(ip)) / n
    pct_sus = sum(1 for p in remote_ports if int(p) in _SUSPICIOUS_PORTS) / n
    max_per_ip = max(ip_counter.values()) if ip_counter else 0

    # Shannon entropy of remote port distribution
    port_counts = Counter(remote_ports)
    entropy = 0.0
    for cnt in port_counts.values():
        p = cnt / n
        if p > 0:
            entropy -= p * math.log2(p)

    avg_port = sum(remote_ports) / n
    std_port = math.sqrt(sum((p - avg_port) ** 2 for p in remote_ports) / n) if n > 1 else 0.0

    return [
        n,
        float(unique_ips),
        float(unique_ports),
        pct_est,
        pct_listen,
        pct_ext,
        pct_sus,
        float(len(procs)),
        float(max_per_ip),
        entropy,
        avg_port,
        std_port,
    ]
