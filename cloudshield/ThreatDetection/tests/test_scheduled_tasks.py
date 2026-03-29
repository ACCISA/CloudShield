"""Tests for scheduled background tasks."""

from unittest.mock import MagicMock, patch

from cloudshield.ThreatDetection.scheduled_tasks import (
    _refresh_threat_intel,
    _retrain_anomaly_model,
    _flush_alerts,
    _poll_fail2ban,
    _prune_old_alerts,
    _push_alerts_to_server,
    _safe_loop,
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


def test_refresh_threat_intel_no_logger():
    """Test threat intel refresh with no logger."""
    ti = MagicMock()
    ti.refresh_feeds.return_value = 10
    ti.total_indicators = 500

    # Should not raise even without logger
    _refresh_threat_intel(ti, logger=None)
    ti.refresh_feeds.assert_called_once_with(timeout=60)


def test_retrain_model_no_es_gracefully():
    """Test anomaly retrain handles no ES client."""
    detector = MagicMock()

    _retrain_anomaly_model(detector, es_client=None, logger=None)

    # Should not call train when es_client is None
    detector.train.assert_not_called()


def test_flush_alerts_empty_dedup():
    """Test flush alerts when deduplicator is empty."""
    from cloudshield.ThreatDetection.alerts import AlertDeduplicator

    dd = AlertDeduplicator()
    es_log = MagicMock()

    _flush_alerts(dd, es_log)

    # Should not call es_log when no pending alerts
    es_log.assert_not_called()


# ── Additional scheduled_tasks coverage ──────────────────────────────────────


class TestSafeLoop:
    def test_runs_fn_and_sleeps(self, monkeypatch):
        """_safe_loop calls fn once before sleeping; we break via sleep raising SystemExit."""
        import cloudshield.ThreatDetection.scheduled_tasks as st_mod
        calls = []

        def _fn():
            calls.append(1)

        sleep_calls = []

        def _fake_sleep(s):
            sleep_calls.append(s)
            raise SystemExit(0)  # BaseException — not caught by except Exception

        monkeypatch.setattr(st_mod.time, "sleep", _fake_sleep)

        try:
            _safe_loop("test", 0.01, _fn, logger=None)
        except SystemExit:
            pass

        assert calls == [1]
        assert sleep_calls == [0.01]

    def test_swallows_exception_and_continues(self, monkeypatch):
        """Exceptions in fn are caught; loop continues until sleep raises SystemExit."""
        import cloudshield.ThreatDetection.scheduled_tasks as st_mod
        calls = []

        def _fn():
            calls.append(1)
            if len(calls) == 1:
                raise ValueError("oops")

        sleep_calls = []

        def _fake_sleep(s):
            sleep_calls.append(s)
            if len(sleep_calls) >= 2:
                raise SystemExit(0)

        monkeypatch.setattr(st_mod.time, "sleep", _fake_sleep)
        logger = MagicMock()

        try:
            _safe_loop("test", 0.01, _fn, logger=logger)
        except SystemExit:
            pass

        assert len(calls) == 2
        logger.error.assert_called_once()

    def test_logger_info_on_start(self, monkeypatch):
        import cloudshield.ThreatDetection.scheduled_tasks as st_mod

        def _fake_sleep(s):
            raise SystemExit(0)

        monkeypatch.setattr(st_mod.time, "sleep", _fake_sleep)
        logger = MagicMock()

        def _fn():
            pass

        try:
            _safe_loop("my_task", 30, _fn, logger=logger)
        except SystemExit:
            pass

        logger.info.assert_called_once()
        assert "my_task" in str(logger.info.call_args)


class TestPushAlertsToServer:
    def test_posts_alerts_successfully(self, monkeypatch):
        import sys
        import types

        posted = {}

        class FakeResp:
            status_code = 200

        fake_requests = types.ModuleType("requests")
        fake_requests.post = lambda url, json=None, timeout=None: (
            posted.update({"url": url, "json": json}) or FakeResp()
        )
        monkeypatch.setitem(sys.modules, "requests", fake_requests)

        alerts = [{"alert_id": "x1", "source": "snort"}]
        logger = MagicMock()
        _push_alerts_to_server(alerts, "http://server:5000", "org-1", logger)

        assert posted["url"] == "http://server:5000/api/threat/ingest"
        assert posted["json"]["org_id"] == "org-1"
        assert len(posted["json"]["alerts"]) == 1

    def test_handles_request_exception(self, monkeypatch):
        import sys
        import types

        fake_requests = types.ModuleType("requests")

        def _raise(*a, **k):
            raise ConnectionError("server down")

        fake_requests.post = _raise
        monkeypatch.setitem(sys.modules, "requests", fake_requests)

        logger = MagicMock()
        _push_alerts_to_server([{"id": "x"}], "http://server:5000", "org", logger)
        logger.warning.assert_called()

    def test_calls_to_dict_on_alert_objects(self, monkeypatch):
        import sys
        import types

        converted = []
        fake_requests = types.ModuleType("requests")
        fake_requests.post = lambda url, json=None, timeout=None: (
            converted.extend(json["alerts"]) or type("R", (), {"status_code": 200})()
        )
        monkeypatch.setitem(sys.modules, "requests", fake_requests)

        class FakeAlert:
            def to_dict(self):
                return {"converted": True}

        _push_alerts_to_server([FakeAlert()], "http://server", "org")
        assert converted == [{"converted": True}]


class TestFlushAlertsWithES:
    def test_es_upsert_called(self):
        from cloudshield.ThreatDetection.alerts import Alert, AlertDeduplicator

        dd = AlertDeduplicator()
        a = Alert(source="snort", rule_id="9999:1")
        a.compute_id()
        dd.ingest(a)

        es_log_fn = MagicMock()
        es_client = MagicMock()
        logger = MagicMock()

        from cloudshield.ThreatDetection.scheduled_tasks import _flush_alerts
        _flush_alerts(dd, es_log_fn, logger, es_client=es_client)

        es_client.update.assert_called_once()
        es_log_fn.assert_not_called()

    def test_es_upsert_fallback_on_exception(self):
        from cloudshield.ThreatDetection.alerts import Alert, AlertDeduplicator

        dd = AlertDeduplicator()
        a = Alert(source="anomaly", rule_id="r1")
        a.compute_id()
        dd.ingest(a)

        es_log_fn = MagicMock()
        es_client = MagicMock()
        es_client.update.side_effect = Exception("ES error")
        logger = MagicMock()

        from cloudshield.ThreatDetection.scheduled_tasks import _flush_alerts
        _flush_alerts(dd, es_log_fn, logger, es_client=es_client)

        # Falls back to es_log_fn when upsert fails
        es_log_fn.assert_called_once()
        assert es_log_fn.call_args[0][0] == "unified_alerts"

    def test_pushes_to_server_when_url_set(self, monkeypatch):
        import cloudshield.ThreatDetection.scheduled_tasks as st_mod
        from cloudshield.ThreatDetection.alerts import Alert, AlertDeduplicator

        pushed = []

        def fake_push(alerts, url, org_id, logger=None):
            pushed.extend(alerts)

        monkeypatch.setattr(st_mod, "_push_alerts_to_server", fake_push)

        dd = AlertDeduplicator()
        a = Alert(source="beacon", rule_id="b1")
        a.compute_id()
        dd.ingest(a)

        st_mod._flush_alerts(dd, MagicMock(), server_url="http://server", org_id="org-x")
        assert len(pushed) == 1


class TestPollFail2ban:
    def test_logs_banned_ips(self):
        from cloudshield.ThreatDetection.monitoring.fail2ban import JailStatus

        status = JailStatus(
            name="sshd",
            currently_failed=1,
            total_failed=5,
            currently_banned=2,
            total_banned=10,
            banned_ips=["1.2.3.4", "5.6.7.8"],
        )
        mgr = MagicMock()
        mgr.all_jail_statuses.return_value = [status]
        es_log_fn = MagicMock()
        logger = MagicMock()

        _poll_fail2ban(mgr, es_log_fn, logger)

        es_log_fn.assert_called_once()
        assert es_log_fn.call_args[0][0] == "fail2ban_status"
        logger.info.assert_called()

    def test_skips_jails_with_no_bans(self):
        from cloudshield.ThreatDetection.monitoring.fail2ban import JailStatus

        status = JailStatus(name="openvpn", currently_failed=0, total_failed=0,
                            currently_banned=0, total_banned=0, banned_ips=[])
        mgr = MagicMock()
        mgr.all_jail_statuses.return_value = [status]
        es_log_fn = MagicMock()

        _poll_fail2ban(mgr, es_log_fn, logger=None)

        es_log_fn.assert_not_called()

    def test_no_logger(self):
        mgr = MagicMock()
        mgr.all_jail_statuses.return_value = []
        # Should not raise
        _poll_fail2ban(mgr, MagicMock(), logger=None)
