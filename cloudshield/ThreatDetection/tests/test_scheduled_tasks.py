"""Tests for scheduled background tasks."""

from unittest.mock import MagicMock, patch

from cloudshield.ThreatDetection.scheduled_tasks import (
    _refresh_threat_intel,
    _retrain_anomaly_model,
    _flush_alerts,
    _prune_old_alerts,
    start_scheduled_tasks,
)


class TestRefreshThreatIntel:
    def test_calls_refresh_feeds(self):
        ti = MagicMock()
        ti.refresh_feeds.return_value = 42
        ti.total_indicators = 1000
        logger = MagicMock()

        _refresh_threat_intel(ti, logger)

        ti.refresh_feeds.assert_called_once_with(timeout=60)
        logger.info.assert_called()

    def test_no_logger(self):
        ti = MagicMock()
        ti.refresh_feeds.return_value = 0
        # Should not raise
        _refresh_threat_intel(ti, logger=None)


class TestRetrainAnomalyModel:
    def test_skips_when_no_es(self):
        detector = MagicMock()
        _retrain_anomaly_model(detector, es_client=None)
        detector.train.assert_not_called()

    def test_skips_when_few_docs(self):
        detector = MagicMock()
        es = MagicMock()
        es.search.return_value = {"hits": {"hits": [{"_source": {}} for _ in range(50)]}}
        logger = MagicMock()

        _retrain_anomaly_model(detector, es, logger)

        detector.train.assert_not_called()

    @patch("cloudshield.ThreatDetection.scheduled_tasks.extract_conn_features",
           create=True)
    def test_trains_on_sufficient_data(self, mock_extract):
        mock_extract.return_value = [0.0] * 11
        detector = MagicMock()
        es = MagicMock()
        docs = [{"_source": {"laddr_ip": "1.1.1.1"}} for _ in range(150)]
        es.search.return_value = {"hits": {"hits": docs}}
        logger = MagicMock()

        _retrain_anomaly_model(detector, es, logger)

        detector.train.assert_called_once()

    def test_handles_es_error(self):
        detector = MagicMock()
        es = MagicMock()
        es.search.side_effect = Exception("connection refused")
        logger = MagicMock()

        # Should not raise
        _retrain_anomaly_model(detector, es, logger)
        detector.train.assert_not_called()


class TestFlushAlerts:
    def test_writes_to_es(self):
        from cloudshield.ThreatDetection.alerts import Alert, AlertDeduplicator

        dd = AlertDeduplicator()
        a = Alert(source="test", rule_id="1")
        a.compute_id()
        dd.ingest(a)

        es_log = MagicMock()
        logger = MagicMock()
        _flush_alerts(dd, es_log, logger)

        es_log.assert_called_once()
        assert es_log.call_args[0][0] == "unified_alerts"
        assert dd.pending == 0

    def test_noop_when_empty(self):
        from cloudshield.ThreatDetection.alerts import AlertDeduplicator

        dd = AlertDeduplicator()
        es_log = MagicMock()
        _flush_alerts(dd, es_log)
        es_log.assert_not_called()


class TestPruneOldAlerts:
    def test_skips_when_no_es(self):
        # Should not raise
        _prune_old_alerts(es_client=None)

    def test_calls_delete_by_query(self):
        es = MagicMock()
        es.delete_by_query.return_value = {"deleted": 5}
        logger = MagicMock()

        _prune_old_alerts(es, max_age_days=30, logger=logger)

        # Called for each index
        assert es.delete_by_query.call_count == 5

    def test_handles_missing_index(self):
        es = MagicMock()
        es.delete_by_query.side_effect = Exception("index_not_found")
        # Should not raise
        _prune_old_alerts(es, logger=MagicMock())


class TestStartScheduledTasks:
    def test_starts_threads(self):
        ti = MagicMock()
        detector = MagicMock()
        dd = MagicMock()
        dd.flush.return_value = []
        es = MagicMock()
        es_log = MagicMock()
        logger = MagicMock()

        threads = start_scheduled_tasks(
            threat_intel=ti,
            anomaly_detector=detector,
            alert_deduplicator=dd,
            es_client=es,
            es_log_fn=es_log,
            logger=logger,
            # Very long intervals so threads just start and sleep
            threat_intel_interval=9999,
            retrain_interval=9999,
            flush_interval=9999,
            fail2ban_interval=9999,
            prune_interval=9999,
        )

        # Should have 4 threads (no fail2ban passed in → 4 not 5)
        assert len(threads) == 4
        for t in threads:
            assert t.daemon is True
            assert t.is_alive()

    def test_no_threads_when_nothing_provided(self):
        threads = start_scheduled_tasks()
        assert len(threads) == 0

    def test_only_threat_intel_thread(self):
        ti = MagicMock()
        threads = start_scheduled_tasks(
            threat_intel=ti,
            threat_intel_interval=9999,
        )
        assert len(threads) == 1
