"""Tests for BeaconDetector (anomaly/beacon.py)."""

from cloudshield.ThreatDetection.anomaly.beacon import (
    BeaconDetector,
    BeaconResult,
    MIN_SAMPLES,
)


# ── BeaconResult ─────────────────────────────────────────────────────────────

class TestBeaconResultToDict:
    def test_to_dict_returns_all_fields(self):
        r = BeaconResult(
            agent_id="agent-1",
            dst_ip="8.8.8.8",
            dst_port=443,
            timestamp=1700000000,
            interval_mean=60.0,
            interval_cv=0.05,
            sample_count=5,
            is_beacon=True,
            process_name="malware.exe",
        )
        d = r.to_dict()
        assert d["agent_id"] == "agent-1"
        assert d["dst_ip"] == "8.8.8.8"
        assert d["dst_port"] == 443
        assert d["is_beacon"] is True
        assert d["process_name"] == "malware.exe"
        assert d["interval_cv"] == 0.05

    def test_to_dict_default_process_name(self):
        r = BeaconResult(
            agent_id="a", dst_ip="1.2.3.4", dst_port=80,
            timestamp=0, interval_mean=30.0, interval_cv=0.1,
            sample_count=4, is_beacon=False,
        )
        d = r.to_dict()
        assert d["process_name"] == ""


# ── BeaconDetector.record ────────────────────────────────────────────────────

def _make_regular_conns(ip: str, port: int, count: int, interval: int = 60) -> list[dict]:
    """Build `count` connection dicts with exact `interval` second spacing."""
    base = 1_700_000_000
    return [
        {"raddr_ip": ip, "raddr_port": port, "timestamp": base + i * interval}
        for i in range(count)
    ]


def _feed_detector(det: BeaconDetector, conns: list[dict], agent_id: str) -> list:
    """Feed connections one at a time so history accumulates across record() calls."""
    results = []
    for c in conns:
        results.extend(det.record([c], agent_id))
    return results


class TestBeaconDetectorRecord:
    def test_skips_loopback(self):
        det = BeaconDetector()
        result = det.record([{"raddr_ip": "127.0.0.1", "raddr_port": 80}], "agent-1")
        assert result == []

    def test_skips_zero_ip(self):
        det = BeaconDetector()
        result = det.record([{"raddr_ip": "0.0.0.0", "raddr_port": 80}], "agent-1")
        assert result == []

    def test_skips_empty_ip(self):
        det = BeaconDetector()
        result = det.record([{"raddr_ip": "", "raddr_port": 80}], "agent-1")
        assert result == []

    def test_not_enough_samples_returns_empty(self):
        det = BeaconDetector()
        # Feed fewer connections than MIN_SAMPLES
        conns = _make_regular_conns("8.8.8.8", 443, MIN_SAMPLES - 1, interval=60)
        result = det.record(conns, "agent-1")
        assert result == []

    def test_regular_beacon_detected(self):
        det = BeaconDetector()
        # Feed MIN_SAMPLES+1 connections one at a time so history accumulates
        conns = _make_regular_conns("8.8.8.8", 443, MIN_SAMPLES + 1, interval=60)
        result = _feed_detector(det, conns, "agent-1")
        assert len(result) >= 1
        r = result[-1]
        assert r.is_beacon is True
        assert r.dst_ip == "8.8.8.8"
        assert r.agent_id == "agent-1"
        assert r.interval_cv < 0.20

    def test_irregular_traffic_not_flagged(self):
        det = BeaconDetector()
        # Intervals: 60, 600, 15, 3000 — highly irregular
        base = 1_700_000_000
        timestamps = [base, base + 60, base + 660, base + 675, base + 3675]
        conns = [
            {"raddr_ip": "5.5.5.5", "raddr_port": 80, "timestamp": t}
            for t in timestamps
        ]
        result = _feed_detector(det, conns, "agent-2")
        # Either not flagged at all, or flagged with is_beacon=False
        for r in result:
            assert r.is_beacon is False

    def test_duplicate_key_scored_once_per_batch(self):
        """Two connections to same (agent, ip, port) in one batch → key scored once."""
        det = BeaconDetector()
        base = 1_700_000_000
        # Pre-fill enough history
        pre_conns = _make_regular_conns("9.9.9.9", 53, MIN_SAMPLES, interval=60)
        det.record(pre_conns, "agent-3")
        # Now send two dups in one batch
        dup_conns = [
            {"raddr_ip": "9.9.9.9", "raddr_port": 53, "timestamp": base + MIN_SAMPLES * 60},
            {"raddr_ip": "9.9.9.9", "raddr_port": 53, "timestamp": base + MIN_SAMPLES * 60 + 1},
        ]
        result = det.record(dup_conns, "agent-3")
        # Key appears at most once in results
        matching = [r for r in result if r.dst_ip == "9.9.9.9"]
        assert len(matching) <= 1

    def test_accepts_camel_case_field_names(self):
        det = BeaconDetector()
        base = 1_700_000_000
        conns = [
            {"raddrIp": "7.7.7.7", "raddrPort": 443, "timestamp": base + i * 60}
            for i in range(MIN_SAMPLES + 1)
        ]
        result = _feed_detector(det, conns, "agent-4")
        assert len(result) >= 1
        assert result[-1].dst_ip == "7.7.7.7"

    def test_process_name_captured(self):
        det = BeaconDetector()
        conns = [
            {"raddr_ip": "2.2.2.2", "raddr_port": 80,
             "timestamp": 1_700_000_000 + i * 60,
             "process_name": "beacon.exe"}
            for i in range(MIN_SAMPLES + 1)
        ]
        result = _feed_detector(det, conns, "agent-5")
        assert len(result) >= 1
        assert result[-1].process_name == "beacon.exe"


# ── BeaconDetector._score edge cases ─────────────────────────────────────────

class TestBeaconDetectorScore:
    def test_intervals_all_filtered_out(self):
        """If all intervals fall outside [MIN_INTERVAL, MAX_INTERVAL], _score returns None."""
        det = BeaconDetector()
        agent_id = "agent-x"
        ip = "6.6.6.6"
        port = 8080
        key = (agent_id, ip, port)
        # Use intervals of 1s (< MIN_INTERVAL_SECS=10)
        base = 1_700_000_000
        for i in range(MIN_SAMPLES + 2):
            det._history[key].append((base + i, ""))  # 1s apart

        result = det._score(key, base + MIN_SAMPLES + 2)
        assert result is None

    def test_mean_zero_returns_none(self):
        """If all timestamps are identical, mean=0 → returns None."""
        det = BeaconDetector(min_interval=0.0)  # allow zero intervals
        agent_id = "agent-z"
        ip = "3.3.3.3"
        port = 22
        key = (agent_id, ip, port)
        base = 1_700_000_000
        # All same timestamp → intervals = [0, 0, 0]
        for _ in range(MIN_SAMPLES + 1):
            det._history[key].append((base, ""))

        result = det._score(key, base)
        assert result is None

    def test_non_beacon_result_returned(self):
        """CV >= threshold → is_beacon False but result is still returned."""
        det = BeaconDetector()
        agent_id = "agent-nb"
        ip = "4.4.4.4"
        port = 9000
        key = (agent_id, ip, port)
        # Very irregular intervals within valid range: 10, 3600, 10, 3600
        base = 1_700_000_000
        timestamps = [base, base + 10, base + 3610, base + 3620, base + 7220]
        for t in timestamps:
            det._history[key].append((t, ""))

        result = det._score(key, timestamps[-1])
        assert result is not None
        assert result.is_beacon is False
