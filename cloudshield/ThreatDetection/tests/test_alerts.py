"""Tests for the unified alert model, severity helpers, and AlertDeduplicator."""

import time
import pytest

from cloudshield.ThreatDetection.alerts import (
    Severity,
    Alert,
    AlertDeduplicator,
    alert_from_snort,
    alert_from_anomaly,
    alert_from_threat_intel,
    alert_from_traffic_spike,
    severity_from_snort_classtype,
    severity_from_anomaly_score,
)


# ── Severity enum ───────────────────────────────────────────────────────────

class TestSeverity:
    def test_values(self):
        assert Severity.CRITICAL.value == "CRITICAL"
        assert Severity.LOW.value == "LOW"

    def test_from_string_upper(self):
        assert Severity.from_string("HIGH") == Severity.HIGH

    def test_from_string_mixed_case(self):
        assert Severity.from_string("low") == Severity.LOW

    def test_from_string_invalid_returns_medium(self):
        assert Severity.from_string("banana") == Severity.MEDIUM

    def test_from_string_none_returns_medium(self):
        assert Severity.from_string(None) == Severity.MEDIUM


# ── Severity mapping helpers ────────────────────────────────────────────────

class TestSeverityMappings:
    def test_snort_trojan(self):
        assert severity_from_snort_classtype("trojan-activity") == Severity.CRITICAL

    def test_snort_recon(self):
        assert severity_from_snort_classtype("attempted-recon") == Severity.MEDIUM

    def test_snort_unknown_classtype(self):
        assert severity_from_snort_classtype("custom-thing") == Severity.MEDIUM

    def test_anomaly_score_critical(self):
        assert severity_from_anomaly_score(-0.50) == Severity.CRITICAL

    def test_anomaly_score_high(self):
        assert severity_from_anomaly_score(-0.25) == Severity.HIGH

    def test_anomaly_score_medium(self):
        assert severity_from_anomaly_score(-0.10) == Severity.MEDIUM


# ── Alert dataclass ─────────────────────────────────────────────────────────

class TestAlert:
    def test_defaults(self):
        a = Alert()
        assert a.severity == "MEDIUM"
        assert a.count == 1
        assert a.details == {}

    def test_compute_id_deterministic(self):
        a = Alert(source="snort", rule_id="9000001", agent_id="a1",
                  src_ip="1.2.3.4", dst_ip="5.6.7.8")
        id1 = a.compute_id()
        id2 = a.compute_id()
        assert id1 == id2
        assert len(id1) == 16

    def test_compute_id_different_inputs(self):
        a = Alert(source="snort", rule_id="9000001", src_ip="1.1.1.1")
        b = Alert(source="snort", rule_id="9000002", src_ip="1.1.1.1")
        assert a.compute_id() != b.compute_id()

    def test_to_dict(self):
        a = Alert(source="anomaly", agent_id="a1")
        d = a.to_dict()
        assert isinstance(d, dict)
        assert d["source"] == "anomaly"
        assert d["agent_id"] == "a1"


# ── Factory functions ───────────────────────────────────────────────────────

class TestAlertFromSnort:
    def test_basic(self):
        snort = {
            "sid": 9000001, "msg": "Port scan detected",
            "classtype": "attempted-recon", "proto": "TCP",
            "src_ip": "10.0.0.1", "dst_ip": "10.8.0.1",
            "src_port": 54321, "dst_port": 1194,
        }
        a = alert_from_snort(snort)
        assert a.source == "snort"
        assert a.severity == "MEDIUM"
        assert a.rule_id == "9000001"
        assert a.alert_id  # non-empty

    def test_trojan_classtype_is_critical(self):
        snort = {"sid": 9000005, "classtype": "trojan-activity", "msg": "Reverse shell"}
        a = alert_from_snort(snort)
        assert a.severity == "CRITICAL"


class TestAlertFromAnomaly:
    def test_basic(self):
        anom = {"agent_id": "a1", "score": -0.35, "is_anomaly": True,
                "reason": "unusual port", "timestamp": 1700000000}
        a = alert_from_anomaly(anom)
        assert a.source == "anomaly"
        assert a.severity == "CRITICAL"
        assert a.agent_id == "a1"

    def test_medium_score(self):
        anom = {"agent_id": "a1", "score": -0.10}
        a = alert_from_anomaly(anom)
        assert a.severity == "MEDIUM"


class TestAlertFromThreatIntel:
    def test_inbound(self):
        hit = {"ip": "1.2.3.4", "direction": "inbound", "reason": "feodo tracker"}
        a = alert_from_threat_intel(hit)
        assert a.source == "threat_intel"
        assert a.severity == "HIGH"
        assert a.src_ip == "1.2.3.4"
        assert a.dst_ip == ""

    def test_outbound(self):
        hit = {"ip": "5.6.7.8", "direction": "outbound", "reason": "blocklist"}
        a = alert_from_threat_intel(hit)
        assert a.dst_ip == "5.6.7.8"
        assert a.src_ip == ""


class TestAlertFromTrafficSpike:
    def test_critical_ratio(self):
        spike = {"agent_id": "a1", "current_rate": 500, "baseline_rate": 30,
                 "spike_ratio": 16.7, "timestamp": 1700000000}
        a = alert_from_traffic_spike(spike)
        assert a.severity == "CRITICAL"
        assert a.source == "traffic_spike"

    def test_high_ratio(self):
        spike = {"agent_id": "a1", "current_rate": 200, "baseline_rate": 30,
                 "spike_ratio": 6.7, "timestamp": 1700000000}
        a = alert_from_traffic_spike(spike)
        assert a.severity == "HIGH"

    def test_medium_ratio(self):
        spike = {"agent_id": "a1", "current_rate": 100, "baseline_rate": 30,
                 "spike_ratio": 3.3, "timestamp": 1700000000}
        a = alert_from_traffic_spike(spike)
        assert a.severity == "MEDIUM"


# ── Deduplicator ────────────────────────────────────────────────────────────

class TestAlertDeduplicator:
    def test_ingest_new(self):
        dd = AlertDeduplicator()
        a = Alert(source="snort", rule_id="1")
        a.compute_id()
        result = dd.ingest(a)
        assert result.count == 1
        assert dd.pending == 1

    def test_ingest_duplicate_increments_count(self):
        dd = AlertDeduplicator()
        a1 = Alert(source="snort", rule_id="1", src_ip="1.1.1.1")
        a1.compute_id()
        a2 = Alert(source="snort", rule_id="1", src_ip="1.1.1.1")
        a2.compute_id()
        dd.ingest(a1)
        dd.ingest(a2)
        assert dd.pending == 1
        alerts = dd.flush()
        assert len(alerts) == 1
        assert alerts[0].count == 2

    def test_severity_escalation(self):
        dd = AlertDeduplicator()
        a1 = Alert(source="snort", rule_id="1", severity="MEDIUM")
        a1.compute_id()
        a2 = Alert(source="snort", rule_id="1", severity="CRITICAL")
        a2.compute_id()
        dd.ingest(a1)
        dd.ingest(a2)
        alerts = dd.flush()
        assert alerts[0].severity == "CRITICAL"

    def test_flush_clears(self):
        dd = AlertDeduplicator()
        a = Alert(source="anomaly", rule_id="test")
        a.compute_id()
        dd.ingest(a)
        assert dd.pending == 1
        dd.flush()
        assert dd.pending == 0

    def test_auto_compute_id(self):
        """Ingest an alert without pre-computed id — dedup should compute it."""
        dd = AlertDeduplicator()
        a = Alert(source="test", rule_id="auto")
        assert a.alert_id == ""
        dd.ingest(a)
        assert a.alert_id != ""
