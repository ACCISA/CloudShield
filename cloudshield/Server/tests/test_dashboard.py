"""Tests for the dashboard summary endpoint and service function."""

import pytest
from unittest.mock import MagicMock, patch


class TestGetDashboardSummary:
    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_returns_skeleton_when_no_es(self, mock_es):
        mock_es.return_value = None
        from cloudshield.Server.services.threat_service import get_dashboard_summary

        result = get_dashboard_summary(hours=24)

        assert result["total_alerts"] == 0
        assert result["by_severity"]["CRITICAL"] == 0
        assert result["window_hours"] == 24
        assert isinstance(result["top_src_ips"], list)
        assert isinstance(result["recent_alerts"], list)

    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_parses_es_aggregations(self, mock_es):
        es = MagicMock()
        mock_es.return_value = es

        # Mock search response for unified_alerts
        es.search.return_value = {
            "hits": {"total": {"value": 42}, "hits": [
                {"_source": {"source": "snort", "severity": "HIGH"}}
            ]},
            "aggregations": {
                "severity": {"buckets": [
                    {"key": "HIGH", "doc_count": 30},
                    {"key": "MEDIUM", "doc_count": 12},
                ]},
                "source": {"buckets": [
                    {"key": "snort", "doc_count": 25},
                    {"key": "anomaly", "doc_count": 17},
                ]},
                "top_src": {"buckets": [
                    {"key": "10.0.0.1", "doc_count": 15},
                    {"key": "", "doc_count": 5},  # empty IP should be filtered
                ]},
                "top_dst": {"buckets": [
                    {"key": "10.8.0.5", "doc_count": 8},
                ]},
            },
        }
        es.count.return_value = {"count": 5}

        from cloudshield.Server.services.threat_service import get_dashboard_summary

        result = get_dashboard_summary(hours=12)

        assert result["total_alerts"] == 42
        assert result["by_severity"]["HIGH"] == 30
        assert result["by_source"]["snort"] == 25
        # Empty IPs should be filtered out
        assert len(result["top_src_ips"]) == 1
        assert result["top_src_ips"][0]["ip"] == "10.0.0.1"

    @patch("cloudshield.Server.services.threat_service._es_client")
    def test_handles_es_errors_gracefully(self, mock_es):
        es = MagicMock()
        mock_es.return_value = es
        es.search.side_effect = Exception("index not found")
        es.count.side_effect = Exception("index not found")

        from cloudshield.Server.services.threat_service import get_dashboard_summary

        # Should not raise
        result = get_dashboard_summary()
        assert result["total_alerts"] == 0


class TestDashboardRoute:
    @patch("cloudshield.Server.services.threat_service._es_client")
    @patch("cloudshield.Server.services.threat_service.get_dashboard_summary")
    def test_route_returns_json(self, mock_summary, mock_es):
        mock_es.return_value = None
        mock_summary.return_value = {
            "timestamp": 1700000000,
            "window_hours": 24,
            "total_alerts": 0,
            "by_severity": {},
            "by_source": {},
            "top_src_ips": [],
            "top_dst_ips": [],
            "recent_alerts": [],
        }

        # Import Flask app for testing
        try:
            from cloudshield.Server.server import app
        except Exception:
            pytest.skip("Flask app not importable in test env")

        with app.test_client() as client:
            resp = client.get("/api/threat/dashboard")
            assert resp.status_code == 200
            data = resp.get_json()
            assert "total_alerts" in data

    @patch("cloudshield.Server.services.threat_service._es_client")
    @patch("cloudshield.Server.services.threat_service.get_dashboard_summary")
    def test_route_accepts_hours_param(self, mock_summary, mock_es):
        mock_es.return_value = None
        mock_summary.return_value = {"window_hours": 48, "total_alerts": 0,
                                      "by_severity": {}, "by_source": {},
                                      "top_src_ips": [], "top_dst_ips": [],
                                      "recent_alerts": [], "timestamp": 0}

        try:
            from cloudshield.Server.server import app
        except Exception:
            pytest.skip("Flask app not importable in test env")

        with app.test_client() as client:
            resp = client.get("/api/threat/dashboard?hours=48")
            assert resp.status_code == 200
