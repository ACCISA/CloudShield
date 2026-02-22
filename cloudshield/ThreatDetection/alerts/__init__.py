"""
Unified alert model for CloudShield.

Every detection subsystem (Snort, anomaly detector, threat-intel, traffic
spike monitor, fail2ban) produces alerts in different shapes.  This module
normalises them into a single :class:`Alert` dataclass with consistent
severity levels and deduplication so the dashboard can query one ES index.

Severity Levels
───────────────
  CRITICAL  – confirmed compromise / active exploitation
  HIGH      – strong indicator of malicious activity
  MEDIUM    – suspicious behaviour worth investigating
  LOW       – informational / policy violation
"""

from __future__ import annotations

import hashlib
import time
from dataclasses import dataclass, field, asdict
from enum import Enum


class Severity(str, Enum):
    """Alert severity levels, ordered from most to least severe."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

    @classmethod
    def from_string(cls, value: str) -> "Severity":
        """Lenient parser: accept upper/lower/mixed case."""
        try:
            return cls(value.upper())
        except (ValueError, AttributeError):
            return cls.MEDIUM


# ── Mapping tables ──────────────────────────────────────────────────────────

# Snort classtype → severity
_SNORT_SEVERITY: dict[str, Severity] = {
    "trojan-activity": Severity.CRITICAL,
    "attempted-admin": Severity.HIGH,
    "attempted-recon": Severity.MEDIUM,
    "policy-violation": Severity.LOW,
}

# Anomaly score thresholds (sklearn decision_function; more negative = worse)
_ANOMALY_SCORE_CRITICAL = -0.30
_ANOMALY_SCORE_HIGH = -0.20


def severity_from_snort_classtype(classtype: str) -> Severity:
    return _SNORT_SEVERITY.get(classtype.lower().strip(), Severity.MEDIUM)


def severity_from_anomaly_score(score: float) -> Severity:
    if score <= _ANOMALY_SCORE_CRITICAL:
        return Severity.CRITICAL
    if score <= _ANOMALY_SCORE_HIGH:
        return Severity.HIGH
    return Severity.MEDIUM


# ── Alert dataclass ─────────────────────────────────────────────────────────

@dataclass
class Alert:
    """Unified alert emitted by any detection subsystem."""

    # Identity
    alert_id: str = ""           # deterministic hash for dedup
    source: str = ""             # e.g. "snort", "anomaly", "threat_intel", "traffic_spike"
    severity: str = "MEDIUM"

    # Timing
    timestamp: int = 0           # epoch seconds
    first_seen: int = 0
    last_seen: int = 0
    count: int = 1               # times this alert was seen (dedup counter)

    # Context
    agent_id: str = ""
    src_ip: str = ""
    dst_ip: str = ""
    src_port: int = 0
    dst_port: int = 0
    proto: str = ""
    rule_id: str = ""            # Snort SID, or internal rule name
    title: str = ""
    description: str = ""

    # Enrichment (optional payload)
    details: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)

    def compute_id(self) -> str:
        """
        Deterministic alert ID based on key fields so duplicates collapse.

        The hash is built from ``(source, rule_id, agent_id, src_ip, dst_ip)``.
        """
        raw = f"{self.source}|{self.rule_id}|{self.agent_id}|{self.src_ip}|{self.dst_ip}"
        self.alert_id = hashlib.sha256(raw.encode()).hexdigest()[:16]
        return self.alert_id


# ── Factory helpers ─────────────────────────────────────────────────────────

def alert_from_snort(snort_dict: dict) -> Alert:
    """
    Create an :class:`Alert` from a parsed Snort alert dict.

    Expected keys: ``sid``, ``msg``, ``classtype``, ``src_ip``, ``dst_ip``,
    ``src_port``, ``dst_port``, ``proto``, ``timestamp``.
    """
    classtype = snort_dict.get("classtype", "")
    sev = severity_from_snort_classtype(classtype)
    now = int(time.time())

    a = Alert(
        source="snort",
        severity=sev.value,
        timestamp=now,
        first_seen=now,
        last_seen=now,
        src_ip=snort_dict.get("src_ip", ""),
        dst_ip=snort_dict.get("dst_ip", ""),
        src_port=int(snort_dict.get("src_port", 0)),
        dst_port=int(snort_dict.get("dst_port", 0)),
        proto=snort_dict.get("proto", ""),
        rule_id=str(snort_dict.get("sid", "")),
        title=snort_dict.get("msg", ""),
        description=f"Snort rule {snort_dict.get('sid', '')} — {classtype}",
        details=snort_dict,
    )
    a.compute_id()
    return a


def alert_from_anomaly(anomaly_dict: dict) -> Alert:
    """
    Create an :class:`Alert` from an anomaly-detector result dict.

    Expected keys: ``agent_id``, ``score``, ``is_anomaly``, ``reason``,
    ``timestamp``, ``features``.
    """
    score = anomaly_dict.get("score", 0.0)
    sev = severity_from_anomaly_score(score)
    now = int(time.time())

    a = Alert(
        source="anomaly",
        severity=sev.value,
        timestamp=anomaly_dict.get("timestamp", now),
        first_seen=now,
        last_seen=now,
        agent_id=anomaly_dict.get("agent_id", ""),
        rule_id="anomaly_detection",
        title="Anomalous network behaviour detected",
        description=anomaly_dict.get("reason", ""),
        details=anomaly_dict,
    )
    a.compute_id()
    return a


def alert_from_threat_intel(hit_dict: dict) -> Alert:
    """
    Create an :class:`Alert` from a threat-intel hit dict.

    Expected keys: ``ip``, ``source``, ``direction``, ``reason``.
    """
    now = int(time.time())
    direction = hit_dict.get("direction", "")
    ip = hit_dict.get("ip", "")

    a = Alert(
        source="threat_intel",
        severity=Severity.HIGH.value,
        timestamp=now,
        first_seen=now,
        last_seen=now,
        src_ip=ip if direction == "inbound" else "",
        dst_ip=ip if direction == "outbound" else "",
        rule_id="threat_intel_match",
        title=f"Known-bad IP: {ip}",
        description=hit_dict.get("reason", ""),
        details=hit_dict,
    )
    a.compute_id()
    return a


def alert_from_traffic_spike(spike_dict: dict) -> Alert:
    """
    Create an :class:`Alert` from a traffic-spike detection result.

    Expected keys: ``agent_id``, ``current_rate``, ``baseline_rate``,
    ``spike_ratio``, ``timestamp``.
    """
    ratio = spike_dict.get("spike_ratio", 1.0)
    if ratio >= 10:
        sev = Severity.CRITICAL
    elif ratio >= 5:
        sev = Severity.HIGH
    else:
        sev = Severity.MEDIUM

    now = int(time.time())
    a = Alert(
        source="traffic_spike",
        severity=sev.value,
        timestamp=spike_dict.get("timestamp", now),
        first_seen=now,
        last_seen=now,
        agent_id=spike_dict.get("agent_id", ""),
        rule_id="traffic_spike",
        title="Traffic spike detected",
        description=(
            f"Rate {spike_dict.get('current_rate', 0):.0f} conn/min "
            f"vs baseline {spike_dict.get('baseline_rate', 0):.0f} "
            f"(×{ratio:.1f})"
        ),
        details=spike_dict,
    )
    a.compute_id()
    return a


# ── Deduplication store ─────────────────────────────────────────────────────

class AlertDeduplicator:
    """
    In-memory dedup buffer that collapses duplicate alerts.

    Two alerts are considered duplicates when their ``alert_id`` matches.
    On collision the ``count`` is incremented and ``last_seen`` is updated.

    Call :meth:`flush` periodically to retrieve and clear accumulated alerts.
    """

    def __init__(self) -> None:
        self._store: dict[str, Alert] = {}

    def ingest(self, alert: Alert) -> Alert:
        """
        Add an alert.  Returns the (possibly merged) alert for the given ID.
        """
        if not alert.alert_id:
            alert.compute_id()

        existing = self._store.get(alert.alert_id)
        if existing:
            existing.count += 1
            existing.last_seen = max(existing.last_seen, alert.last_seen or int(time.time()))
            # Escalate severity if the new instance is worse
            if _sev_rank(alert.severity) < _sev_rank(existing.severity):
                existing.severity = alert.severity
            return existing
        else:
            self._store[alert.alert_id] = alert
            return alert

    def flush(self) -> list[Alert]:
        """Return all accumulated alerts and clear the buffer."""
        alerts = list(self._store.values())
        self._store.clear()
        return alerts

    @property
    def pending(self) -> int:
        return len(self._store)


def _sev_rank(sev: str) -> int:
    """Lower rank = higher severity (for comparison)."""
    return {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}.get(sev, 2)
