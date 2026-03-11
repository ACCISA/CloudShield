"""Tests for the anomaly detection feature extraction and detector."""


from cloudshield.ThreatDetection.anomaly.features import (
    extract_conn_features,
    extract_traffic_window_features,
    _is_private,
)
from cloudshield.ThreatDetection.anomaly.detector import (
    AnomalyDetector,
    AnomalyResult,
)


# ── Helpers ─────────────────────────────────────────────────────────────────

def _make_conn(
    laddr_ip="10.8.0.5",
    laddr_port=12345,
    raddr_ip="93.184.216.34",
    raddr_port=443,
    status="ESTABLISHED",
    pid=100,
    process_name="curl",
):
    return {
        "laddr_ip": laddr_ip,
        "laddr_port": laddr_port,
        "raddr_ip": raddr_ip,
        "raddr_port": raddr_port,
        "status": status,
        "pid": pid,
        "process_name": process_name,
    }


# ── _is_private ────────────────────────────────────────────────────────────

class TestIsPrivate:
    def test_10_net(self):
        assert _is_private("10.0.0.1") is True

    def test_172_16_net(self):
        assert _is_private("172.16.0.1") is True
        assert _is_private("172.31.255.255") is True

    def test_192_168_net(self):
        assert _is_private("192.168.1.1") is True

    def test_loopback(self):
        assert _is_private("127.0.0.1") is True

    def test_public(self):
        assert _is_private("8.8.8.8") is False

    def test_empty(self):
        assert _is_private("") is True


# ── extract_conn_features ──────────────────────────────────────────────────

class TestExtractConnFeatures:
    def test_basic_vector(self):
        conn = _make_conn()
        feats = extract_conn_features(conn)
        assert len(feats) == 11
        assert feats[0] == 12345.0      # local port
        assert feats[1] == 443.0        # remote port
        assert feats[2] == 1.0          # is_established
        assert feats[3] == 0.0          # is_listen
        assert feats[4] == 0.0          # remote_is_private (93.x is public)
        assert feats[5] == 1.0          # remote_port < 1024
        assert feats[6] == 0.0          # not suspicious port
        assert feats[7] == 1.0          # 443 is a service port
        assert feats[8] == 1.0          # has remote addr
        assert feats[9] == 100.0        # pid
        assert feats[10] == 4.0         # len("curl")

    def test_suspicious_port(self):
        conn = _make_conn(raddr_port=4444)
        feats = extract_conn_features(conn)
        assert feats[6] == 1.0  # suspicious port flag

    def test_listen_status(self):
        conn = _make_conn(status="LISTEN", raddr_ip="", raddr_port=0)
        feats = extract_conn_features(conn)
        assert feats[2] == 0.0  # not established
        assert feats[3] == 1.0  # is listen
        assert feats[8] == 0.0  # no remote addr

    def test_camelcase_keys(self):
        """Handles protobuf-style camelCase keys (MessageToDict default)."""
        conn = {
            "laddrIp": "10.0.0.1",
            "laddrPort": 80,
            "raddrIp": "1.2.3.4",
            "raddrPort": 8080,
            "status": "ESTABLISHED",
            "pid": 42,
            "processName": "httpd",
        }
        feats = extract_conn_features(conn)
        assert len(feats) == 11
        assert feats[1] == 8080.0


# ── extract_traffic_window_features ────────────────────────────────────────

class TestExtractWindowFeatures:
    def test_empty_batch(self):
        feats = extract_traffic_window_features([])
        assert feats == [0.0] * 12

    def test_single_conn(self):
        conns = [_make_conn()]
        feats = extract_traffic_window_features(conns)
        assert len(feats) == 12
        assert feats[0] == 1.0         # total count
        assert feats[1] == 1.0         # unique remote IPs
        assert feats[3] == 1.0         # 100% established

    def test_multiple_conns(self):
        conns = [
            _make_conn(raddr_ip="1.2.3.4", raddr_port=443),
            _make_conn(raddr_ip="1.2.3.4", raddr_port=80),
            _make_conn(raddr_ip="5.6.7.8", raddr_port=443, status="LISTEN"),
        ]
        feats = extract_traffic_window_features(conns)
        assert feats[0] == 3.0        # count
        assert feats[1] == 2.0        # 2 unique remote IPs
        assert feats[2] == 2.0        # 2 unique remote ports (443, 80)
        assert feats[8] == 2.0        # max conns per IP: 1.2.3.4 has 2


# ── AnomalyDetector ───────────────────────────────────────────────────────

class TestAnomalyDetector:
    def test_init_untrained(self):
        det = AnomalyDetector()
        assert not det.is_trained

    def test_score_before_training_uses_fallback(self):
        det = AnomalyDetector()
        conns = [_make_conn()]
        results = det.score_connections(conns, agent_id="test")
        assert len(results) == 1
        assert isinstance(results[0], AnomalyResult)
        assert results[0].agent_id == "test"

    def test_train_with_data(self):
        det = AnomalyDetector()
        # Generate 200+ "normal" connections to trigger auto-train
        conns = [_make_conn(laddr_port=p, raddr_port=443) for p in range(200, 500)]
        feats = [extract_conn_features(c) for c in conns]
        det.train(feats)
        assert det.is_trained

    def test_score_after_training(self):
        det = AnomalyDetector()
        normal = [_make_conn(laddr_port=p, raddr_port=443) for p in range(200, 500)]
        feats = [extract_conn_features(c) for c in normal]
        det.train(feats)

        # Score a "normal" connection
        results = det.score_connections([_make_conn()], agent_id="a1")
        assert len(results) == 1

    def test_score_window(self):
        det = AnomalyDetector()
        conns = [_make_conn(laddr_port=p) for p in range(100, 200)]
        result = det.score_window(conns, agent_id="a1", timestamp=1000)
        assert isinstance(result, AnomalyResult)

    def test_result_to_dict(self):
        r = AnomalyResult(
            agent_id="a1",
            timestamp=100,
            score=-0.5,
            is_anomaly=True,
            features=[1.0, 2.0],
            reason="test",
        )
        d = r.to_dict()
        assert d["agent_id"] == "a1"
        assert d["is_anomaly"] is True

    def test_persistence(self, tmp_path):
        path = tmp_path / "model.json"
        det = AnomalyDetector(model_path=str(path))
        det._means = [1.0, 2.0]
        det._stds = [0.5, 1.0]
        det._is_trained = True
        det._save(str(path))

        det2 = AnomalyDetector(model_path=str(path))
        assert det2.is_trained
        assert det2._means == [1.0, 2.0]

    def test_auto_train_on_buffer_full(self):
        """Detector auto-trains when buffer reaches _buffer_limit."""
        det = AnomalyDetector()
        det._buffer_limit = 5  # low threshold for test
        conns = [_make_conn(laddr_port=p) for p in range(10)]
        for c in conns:
            det.score_connections([c], agent_id="x")
        # After 5+ calls the buffer should have triggered training
        # (either via sklearn or fallback)
        assert det.is_trained or len(det._buffer) < det._buffer_limit
