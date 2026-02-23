"""Unit tests for cloudshield.Server.services.threat_service.

These test the *service layer* directly (not through Flask routes) so that
every helper, lazy singleton, ES query path, and public function is covered.
"""

import os
import types
import importlib
from unittest.mock import patch, MagicMock, PropertyMock

import pytest

# ---------------------------------------------------------------------------
# Utility: reload the module under test so global singletons are reset
# ---------------------------------------------------------------------------
def _fresh_module():
    """Return a freshly-imported threat_service with singletons reset."""
    import cloudshield.Server.services.threat_service as mod
    mod._anomaly_detector = None
    mod._threat_intel = None
    mod._geo_checker = None
    mod._fail2ban = None
    return mod


# ═══════════════════════════════════════════════════════════════════════════
# Lazy-singleton getters
# ═══════════════════════════════════════════════════════════════════════════

class TestGetAnomalyDetector:
    def test_creates_singleton_on_first_call(self):
        ts = _fresh_module()
        with patch(
            "cloudshield.ThreatDetection.anomaly.detector.AnomalyDetector"
        ) as MockAD:
            instance = MagicMock()
            MockAD.return_value = instance
            result = ts._get_anomaly_detector()
            MockAD.assert_called_once_with(contamination=0.05)
            assert result is instance

    def test_returns_cached_on_second_call(self):
        ts = _fresh_module()
        with patch(
            "cloudshield.ThreatDetection.anomaly.detector.AnomalyDetector"
        ) as MockAD:
            MockAD.return_value = MagicMock()
            first = ts._get_anomaly_detector()
            second = ts._get_anomaly_detector()
            assert first is second
            MockAD.assert_called_once()


class TestGetThreatIntel:
    def test_creates_singleton(self):
        ts = _fresh_module()
        with patch(
            "cloudshield.ThreatDetection.monitoring.threat_intel.ThreatIntelChecker"
        ) as MockTI:
            instance = MagicMock()
            MockTI.return_value = instance
            result = ts._get_threat_intel()
            MockTI.assert_called_once()
            assert result is instance

    def test_returns_cached(self):
        ts = _fresh_module()
        with patch(
            "cloudshield.ThreatDetection.monitoring.threat_intel.ThreatIntelChecker"
        ) as MockTI:
            MockTI.return_value = MagicMock()
            first = ts._get_threat_intel()
            second = ts._get_threat_intel()
            assert first is second


class TestGetGeoChecker:
    def test_creates_singleton(self):
        ts = _fresh_module()
        with patch(
            "cloudshield.ThreatDetection.monitoring.geo_blocking.GeoIPChecker"
        ) as MockGeo:
            instance = MagicMock()
            MockGeo.return_value = instance
            result = ts._get_geo_checker()
            MockGeo.assert_called_once()
            assert result is instance

    def test_returns_cached(self):
        ts = _fresh_module()
        with patch(
            "cloudshield.ThreatDetection.monitoring.geo_blocking.GeoIPChecker"
        ) as MockGeo:
            MockGeo.return_value = MagicMock()
            first = ts._get_geo_checker()
            second = ts._get_geo_checker()
            assert first is second


class TestGetFail2Ban:
    def test_creates_singleton_with_dry_run(self):
        ts = _fresh_module()
        with patch(
            "cloudshield.ThreatDetection.monitoring.fail2ban.Fail2BanManager"
        ) as MockF2B:
            instance = MagicMock()
            MockF2B.return_value = instance
            result = ts._get_fail2ban()
            MockF2B.assert_called_once_with(dry_run=True)
            assert result is instance

    def test_returns_cached(self):
        ts = _fresh_module()
        with patch(
            "cloudshield.ThreatDetection.monitoring.fail2ban.Fail2BanManager"
        ) as MockF2B:
            MockF2B.return_value = MagicMock()
            first = ts._get_fail2ban()
            second = ts._get_fail2ban()
            assert first is second


# ═══════════════════════════════════════════════════════════════════════════
# Elasticsearch helpers
# ═══════════════════════════════════════════════════════════════════════════

class TestEsClient:
    @patch.dict(os.environ, {"ES_URL": "http://test-es:9200"})
    def test_returns_client_when_ping_succeeds(self):
        ts = _fresh_module()
        with patch("cloudshield.Server.services.threat_service.Elasticsearch", create=True) as MockES:
            # We need to patch the import inside the function
            mock_es_cls = MagicMock()
            mock_instance = MagicMock()
            mock_es_cls.return_value = mock_instance
            mock_instance.ping.return_value = True

            with patch.dict("sys.modules", {"elasticsearch": MagicMock(Elasticsearch=mock_es_cls)}):
                result = ts._es_client()
                assert result is mock_instance

    def test_returns_none_when_ping_fails(self):
        ts = _fresh_module()
        mock_es_mod = MagicMock()
        mock_instance = MagicMock()
        mock_es_mod.Elasticsearch.return_value = mock_instance
        mock_instance.ping.side_effect = Exception("connection refused")

        with patch.dict("sys.modules", {"elasticsearch": mock_es_mod}):
            result = ts._es_client()
            assert result is None

    def test_returns_none_when_import_fails(self):
        ts = _fresh_module()
        # Remove elasticsearch from sys.modules to force import error
        import sys
        saved = sys.modules.get("elasticsearch")
        sys.modules["elasticsearch"] = None  # will cause ImportError
        try:
            result = ts._es_client()
            assert result is None
        finally:
            if saved is not None:
                sys.modules["elasticsearch"] = saved
            else:
                sys.modules.pop("elasticsearch", None)

    @patch.dict(os.environ, {}, clear=False)
    def test_uses_default_url_when_env_not_set(self):
        ts = _fresh_module()
        os.environ.pop("ES_URL", None)
        mock_es_mod = MagicMock()
        mock_instance = MagicMock()
        mock_es_mod.Elasticsearch.return_value = mock_instance
        mock_instance.ping.return_value = True

        with patch.dict("sys.modules", {"elasticsearch": mock_es_mod}):
            ts._es_client()
            mock_es_mod.Elasticsearch.assert_called_once_with("http://localhost:9200")


class TestEsRecent:
    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_returns_empty_when_no_es(self, mock_client):
        ts = _fresh_module()
        mock_client.return_value = None
        result = ts._es_recent("snort_alerts", size=10)
        assert result == []

    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_returns_source_docs_sorted(self, mock_client):
        ts = _fresh_module()
        es = MagicMock()
        mock_client.return_value = es
        es.search.return_value = {
            "hits": {
                "hits": [
                    {"_source": {"sid": 1, "timestamp": 200}},
                    {"_source": {"sid": 2, "timestamp": 100}},
                ]
            }
        }
        result = ts._es_recent("snort_alerts", size=5)
        assert len(result) == 2
        assert result[0]["sid"] == 1
        es.search.assert_called_once()
        call_kwargs = es.search.call_args
        assert call_kwargs.kwargs.get("index") or call_kwargs[1].get("index") == "snort_alerts"

    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_returns_empty_on_search_error(self, mock_client):
        ts = _fresh_module()
        es = MagicMock()
        mock_client.return_value = es
        es.search.side_effect = Exception("index_not_found")
        result = ts._es_recent("missing_index")
        assert result == []


# ═══════════════════════════════════════════════════════════════════════════
# Public service functions
# ═══════════════════════════════════════════════════════════════════════════

class TestGetRecentAlerts:
    @patch("cloudshield.Server.services.threat_service._es_recent")
    def test_delegates_to_es_recent(self, mock_recent):
        ts = _fresh_module()
        mock_recent.return_value = [{"sid": 1}]
        result = ts.get_recent_alerts(limit=25)
        mock_recent.assert_called_once_with("snort_alerts", size=25)
        assert result == [{"sid": 1}]

    @patch("cloudshield.Server.services.threat_service._es_recent")
    def test_default_limit(self, mock_recent):
        ts = _fresh_module()
        mock_recent.return_value = []
        ts.get_recent_alerts()
        mock_recent.assert_called_once_with("snort_alerts", size=50)


class TestGetRecentAnomalies:
    @patch("cloudshield.Server.services.threat_service._es_recent")
    def test_delegates_to_es_recent(self, mock_recent):
        ts = _fresh_module()
        mock_recent.return_value = [{"is_anomaly": True}]
        result = ts.get_recent_anomalies(limit=10)
        mock_recent.assert_called_once_with("anomaly_alerts", size=10)
        assert result == [{"is_anomaly": True}]


class TestGetRecentThreatIntelHits:
    @patch("cloudshield.Server.services.threat_service._es_recent")
    def test_delegates_to_es_recent(self, mock_recent):
        ts = _fresh_module()
        mock_recent.return_value = []
        result = ts.get_recent_threat_intel_hits(limit=5)
        mock_recent.assert_called_once_with("threat_intel_hits", size=5)


class TestGetMonitoringStatus:
    def test_returns_full_status_dict(self):
        ts = _fresh_module()

        # Mock all subsystems
        mock_detector = MagicMock()
        mock_detector.is_trained = False
        mock_detector._is_trained = False

        mock_intel = MagicMock()
        mock_intel.total_indicators = 42
        mock_intel.last_refresh = 1700000000

        mock_f2b = MagicMock()
        mock_f2b.is_available.return_value = False
        mock_f2b.all_jail_statuses.return_value = []

        with patch.object(ts, "_get_anomaly_detector", return_value=mock_detector), \
             patch.object(ts, "_get_threat_intel", return_value=mock_intel), \
             patch.object(ts, "_get_fail2ban", return_value=mock_f2b), \
             patch.object(ts, "_es_client", return_value=None):
            result = ts.get_monitoring_status()

        assert "timestamp" in result
        assert result["anomaly_detector"]["trained"] is False
        assert result["anomaly_detector"]["engine"] == "z-score-fallback"
        assert result["threat_intel"]["total_indicators"] == 42
        assert result["fail2ban"]["available"] is False
        assert result["elasticsearch"]["connected"] is False
        assert "snort" in result

    def test_anomaly_engine_shows_isolation_forest_when_trained(self):
        ts = _fresh_module()

        mock_detector = MagicMock()
        mock_detector.is_trained = True
        mock_detector._is_trained = True

        mock_intel = MagicMock()
        mock_intel.total_indicators = 0
        mock_intel.last_refresh = None

        mock_f2b = MagicMock()
        mock_f2b.is_available.return_value = True
        jail_status = MagicMock()
        jail_status.to_dict.return_value = {"jail": "sshd", "currently_banned": 3}
        mock_f2b.all_jail_statuses.return_value = [jail_status]

        with patch.object(ts, "_get_anomaly_detector", return_value=mock_detector), \
             patch.object(ts, "_get_threat_intel", return_value=mock_intel), \
             patch.object(ts, "_get_fail2ban", return_value=mock_f2b), \
             patch.object(ts, "_es_client", return_value=MagicMock()):
            result = ts.get_monitoring_status()

        assert result["anomaly_detector"]["engine"] == "IsolationForest"
        assert result["fail2ban"]["available"] is True
        assert len(result["fail2ban"]["jails"]) == 1
        assert result["elasticsearch"]["connected"] is True


class TestScoreConnections:
    def test_returns_only_anomalies_as_dicts(self):
        ts = _fresh_module()

        anomaly_result = MagicMock()
        anomaly_result.is_anomaly = True
        anomaly_result.to_dict.return_value = {"ip": "1.2.3.4", "score": -0.8}

        normal_result = MagicMock()
        normal_result.is_anomaly = False

        mock_detector = MagicMock()
        mock_detector.score_connections.return_value = [anomaly_result, normal_result]

        with patch.object(ts, "_get_anomaly_detector", return_value=mock_detector):
            result = ts.score_connections(
                [{"laddr_ip": "10.0.0.1", "raddr_ip": "1.2.3.4"}],
                agent_id="agent-1",
            )

        assert len(result) == 1
        assert result[0]["ip"] == "1.2.3.4"
        mock_detector.score_connections.assert_called_once()

    def test_returns_empty_when_no_anomalies(self):
        ts = _fresh_module()

        normal = MagicMock()
        normal.is_anomaly = False

        mock_detector = MagicMock()
        mock_detector.score_connections.return_value = [normal]

        with patch.object(ts, "_get_anomaly_detector", return_value=mock_detector):
            result = ts.score_connections([], agent_id="a1")

        assert result == []


class TestCheckThreatIntel:
    def test_returns_hits_as_dicts(self):
        ts = _fresh_module()

        hit = MagicMock()
        hit.to_dict.return_value = {"ip": "6.6.6.6", "list": "abuse_ch"}

        mock_checker = MagicMock()
        mock_checker.check_connections.return_value = [hit]

        with patch.object(ts, "_get_threat_intel", return_value=mock_checker):
            result = ts.check_threat_intel(
                [{"raddr_ip": "6.6.6.6"}], agent_id="agent-2"
            )

        assert len(result) == 1
        assert result[0]["ip"] == "6.6.6.6"

    def test_returns_empty_when_clean(self):
        ts = _fresh_module()
        mock_checker = MagicMock()
        mock_checker.check_connections.return_value = []

        with patch.object(ts, "_get_threat_intel", return_value=mock_checker):
            result = ts.check_threat_intel([], agent_id="a1")

        assert result == []


class TestCheckGeo:
    def test_returns_results_as_dicts(self):
        ts = _fresh_module()

        geo_result = MagicMock()
        geo_result.to_dict.return_value = {"ip": "10.0.0.1", "is_bogon": True}

        mock_geo = MagicMock()
        mock_geo.check_many.return_value = [geo_result]

        with patch.object(ts, "_get_geo_checker", return_value=mock_geo):
            result = ts.check_geo(["10.0.0.1"])

        assert len(result) == 1
        assert result[0]["is_bogon"] is True

    def test_returns_empty_for_empty_input(self):
        ts = _fresh_module()
        mock_geo = MagicMock()
        mock_geo.check_many.return_value = []

        with patch.object(ts, "_get_geo_checker", return_value=mock_geo):
            result = ts.check_geo([])

        assert result == []


# ═══════════════════════════════════════════════════════════════════════════
# Dashboard summary (additional edge cases beyond test_dashboard.py)
# ═══════════════════════════════════════════════════════════════════════════

class TestGetDashboardSummaryExtended:
    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_per_index_fallback_counts(self, mock_client):
        """When unified_alerts search fails, per-index counts still populate."""
        ts = _fresh_module()
        es = MagicMock()
        mock_client.return_value = es

        # unified_alerts search fails
        es.search.side_effect = Exception("index not found")
        # per-index counts succeed
        es.count.return_value = {"count": 7}

        result = ts.get_dashboard_summary(hours=1)

        # Should have called count for each of the 4 indices
        assert es.count.call_count == 4
        assert result["by_source"].get("snort_alerts") == 7
        assert result["by_source"].get("anomaly_alerts") == 7

    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_recent_alerts_populated(self, mock_client):
        """Recent alerts are populated from the second ES search call."""
        ts = _fresh_module()
        es = MagicMock()
        mock_client.return_value = es

        # First search (aggregations) - succeeds
        agg_response = {
            "hits": {"total": {"value": 5}, "hits": []},
            "aggregations": {
                "severity": {"buckets": []},
                "source": {"buckets": []},
                "top_src": {"buckets": []},
                "top_dst": {"buckets": []},
            },
        }
        recent_response = {
            "hits": {"hits": [
                {"_source": {"msg": "alert1", "severity": "HIGH"}},
                {"_source": {"msg": "alert2", "severity": "LOW"}},
            ]}
        }
        es.search.side_effect = [agg_response, recent_response]
        es.count.return_value = {"count": 0}

        result = ts.get_dashboard_summary(hours=24)

        assert len(result["recent_alerts"]) == 2
        assert result["recent_alerts"][0]["msg"] == "alert1"

    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_per_index_count_errors_swallowed(self, mock_client):
        """If individual index counts fail, they're silently skipped."""
        ts = _fresh_module()
        es = MagicMock()
        mock_client.return_value = es
        es.search.side_effect = Exception("boom")
        es.count.side_effect = Exception("index missing")

        result = ts.get_dashboard_summary()
        # Should not raise, by_source stays empty
        assert result["by_source"] == {}

    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_setdefault_does_not_overwrite_existing(self, mock_client):
        """Per-index fallback uses setdefault so it won't overwrite agg data."""
        ts = _fresh_module()
        es = MagicMock()
        mock_client.return_value = es

        agg_response = {
            "hits": {"total": {"value": 10}, "hits": []},
            "aggregations": {
                "severity": {"buckets": []},
                "source": {"buckets": [
                    {"key": "snort_alerts", "doc_count": 99},
                ]},
                "top_src": {"buckets": []},
                "top_dst": {"buckets": []},
            },
        }
        es.search.side_effect = [agg_response, {"hits": {"hits": []}}]
        es.count.return_value = {"count": 3}

        result = ts.get_dashboard_summary()
        # The aggregation value (99) should NOT be overwritten by count (3)
        assert result["by_source"]["snort_alerts"] == 99
