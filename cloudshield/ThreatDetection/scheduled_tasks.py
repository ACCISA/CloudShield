"""
Scheduled background tasks for CloudShield ThreatDetection server.

These are long-running periodic jobs started as daemon threads alongside
the gRPC server.  Each function runs in an infinite loop with ``time.sleep``
between iterations.

Tasks
─────
1. **Threat-intel feed refresh** – pull remote IP blocklists every N hours.
2. **Anomaly-model retrain** – re-fit the IsolationForest on the latest
   Elasticsearch data every N hours.
3. **Alert dedup flush** – periodically write accumulated unified alerts
   to Elasticsearch and clear the in-memory buffer.
4. **Fail2ban status poll** – query fail2ban jail statuses and log to ES.
5. **Old alert pruning** – delete ES documents older than a retention window.
"""

from __future__ import annotations

import time
import threading
from typing import Callable


def _safe_loop(name: str, interval: float, fn: Callable[[], None], logger=None):
    """Run *fn* every *interval* seconds, swallowing exceptions."""
    if logger:
        logger.info("Scheduled task '%s' started (interval=%ss)", name, interval)
    while True:
        try:
            fn()
        except Exception as exc:
            if logger:
                logger.error("Scheduled task '%s' error: %s", name, exc)
        time.sleep(interval)


# ── 1. Threat-intel refresh ─────────────────────────────────────────────────

def _refresh_threat_intel(threat_intel, logger=None):
    """Pull remote blocklist feeds."""
    added = threat_intel.refresh_feeds(timeout=60)
    if logger:
        logger.info(
            "Threat-intel refresh: %d new indicators (total %d)",
            added, threat_intel.total_indicators,
        )


# ── 2. Anomaly-model retrain ───────────────────────────────────────────────

def _retrain_anomaly_model(detector, es_client, logger=None):
    """
    Re-train the anomaly detector on the most recent ``net_conns`` data
    from Elasticsearch.
    """
    if es_client is None:
        return

    try:
        from cloudshield.ThreatDetection.anomaly.features import extract_conn_features
    except ImportError:
        from anomaly.features import extract_conn_features

    try:
        resp = es_client.search(
            index="net_conns",
            body={"query": {"match_all": {}}, "sort": [{"_id": {"order": "desc"}}]},
            size=2000,
        )
        docs = [hit["_source"] for hit in resp["hits"]["hits"]]
    except Exception as exc:
        if logger:
            logger.warning("Retrain: failed to fetch training data: %s", exc)
        return

    if len(docs) < 100:
        if logger:
            logger.info("Retrain: only %d docs — need ≥100, skipping", len(docs))
        return

    features = [extract_conn_features(d) for d in docs]
    detector.train(features)
    if logger:
        logger.info("Retrained anomaly model on %d samples", len(features))


# ── 3. Alert dedup flush ───────────────────────────────────────────────────

def _push_alerts_to_server(alerts: list, server_url: str, org_id: str, logger=None):
    """
    POST a batch of unified alert dicts to the CloudShield Server ingest
    endpoint so they are recorded in MongoDB (activity + audit logs).

    Failures are silently swallowed so a Server outage never blocks the
    ThreatDetection gRPC process.
    """
    try:
        import requests as _requests
    except ImportError as exc:
        if logger:
            logger.warning("Requests dependency missing; cannot push %d alerts for org_id=%s: %s", len(alerts), org_id, exc)
        return

    payload = {
        "org_id": org_id,
        "alerts": [a.to_dict() if hasattr(a, "to_dict") else a for a in alerts],
    }
    try:
        resp = _requests.post(
            f"{server_url.rstrip('/')}/api/threat/ingest",
            json=payload,
            timeout=10,
        )
        if logger:
            logger.info(
                "Pushed %d alerts to Server org_id=%s (status=%s)",
                len(alerts),
                org_id,
                resp.status_code,
            )
    except Exception as exc:
        if logger:
            logger.warning(
                "Failed to push alerts to Server server_url=%s org_id=%s count=%d: %s",
                server_url,
                org_id,
                len(alerts),
                exc,
            )


def _flush_alerts(deduplicator, es_log_fn, logger=None, server_url: str = "", org_id: str = "system", es_client=None):
    """Write buffered unified alerts to Elasticsearch and push to the Server.

    Uses ES upsert keyed on ``alert_id`` for the unified_alerts index so that
    a user-set status (resolved / false_positive) is never overwritten by a
    subsequent flush of the same alert.  Only ``count``, ``last_seen``, and
    ``timestamp`` are updated on an existing document; all other fields
    (including ``status``) are left untouched.
    """
    alerts = deduplicator.flush()
    if not alerts:
        return
    for alert in alerts:
        alert.org_id = org_id
        doc = alert.to_dict()
        alert_id = doc.get("alert_id")
        if es_client and alert_id:
            # Upsert: create on first occurrence; on subsequent flushes only
            # update the mutable counters — never touch status.
            try:
                es_client.update(
                    index="unified_alerts",
                    id=alert_id,
                    body={
                        "scripted_upsert": True,
                        "script": {
                            "source": (
                                "if (ctx.op == 'create') { ctx._source.putAll(params.doc); }"
                                " else {"
                                " ctx._source.count = params.doc.count;"
                                " ctx._source.last_seen = params.doc.last_seen;"
                                " ctx._source.timestamp = params.doc.timestamp;"
                                " }"
                            ),
                            "lang": "painless",
                            "params": {"doc": doc},
                        },
                        "upsert": {},
                    },
                )
            except Exception as exc:
                if logger:
                    logger.warning("ES upsert failed for alert %s: %s — falling back to index", alert_id, exc)
                es_log_fn("unified_alerts", doc)
        else:
            es_log_fn("unified_alerts", doc)
    if logger:
        logger.info("Flushed %d unified alerts to ES", len(alerts))
    if server_url:
        _push_alerts_to_server(alerts, server_url, org_id, logger=logger)


# ── 4. Fail2ban status poll ─────────────────────────────────────────────────

def _poll_fail2ban(fail2ban_mgr, es_log_fn, logger=None):
    """Query fail2ban jail statuses and write to ES."""
    statuses = fail2ban_mgr.all_jail_statuses()
    for s in statuses:
        if s.currently_banned > 0 or s.total_banned > 0:
            doc = s.to_dict()
            doc["timestamp"] = int(time.time())
            es_log_fn("fail2ban_status", doc)
    if logger:
        total_banned = sum(s.currently_banned for s in statuses)
        if total_banned:
            logger.info("Fail2ban: %d IPs currently banned across all jails", total_banned)


# ── 5. Old alert pruning ───────────────────────────────────────────────────

def _prune_old_alerts(es_client, max_age_days: int = 30, logger=None):
    """Delete documents older than *max_age_days* from alert indices."""
    if es_client is None:
        return

    indices = ["unified_alerts", "snort_alerts", "anomaly_alerts",
               "threat_intel_hits", "traffic_spikes"]
    cutoff = int(time.time()) - (max_age_days * 86400)

    for index in indices:
        try:
            resp = es_client.delete_by_query(
                index=index,
                body={"query": {"range": {"timestamp": {"lt": cutoff}}}},
                conflicts="proceed",
            )
            deleted = resp.get("deleted", 0)
            if deleted and logger:
                logger.info("Pruned %d old docs from '%s'", deleted, index)
        except Exception as exc:
            if logger:
                logger.warning("Prune skipped for index='%s' cutoff=%s: %s", index, cutoff, exc)


# ── Thread launcher ─────────────────────────────────────────────────────────

def start_scheduled_tasks(
    *,
    threat_intel=None,
    anomaly_detector=None,
    alert_deduplicator=None,
    fail2ban_mgr=None,
    es_client=None,
    es_log_fn=None,
    logger=None,
    server_config: dict | None = None,
    threat_intel_interval: float = 3600 * 6,   # 6 hours
    retrain_interval: float = 3600 * 4,        # 4 hours
    flush_interval: float = 60,                # 1 minute
    fail2ban_interval: float = 300,            # 5 minutes
    prune_interval: float = 3600 * 24,         # daily
) -> list[threading.Thread]:
    """
    Start all scheduled background tasks as daemon threads.

    Returns the list of threads (callers don't usually need these since
    they're daemonic).
    """
    threads: list[threading.Thread] = []

    if threat_intel is not None:
        t = threading.Thread(
            target=_safe_loop,
            args=("threat_intel_refresh", threat_intel_interval,
                  lambda: _refresh_threat_intel(threat_intel, logger)),
            daemon=True,
        )
        t.start()
        threads.append(t)

    if anomaly_detector is not None:
        t = threading.Thread(
            target=_safe_loop,
            args=("anomaly_retrain", retrain_interval,
                  lambda: _retrain_anomaly_model(anomaly_detector, es_client, logger)),
            daemon=True,
        )
        t.start()
        threads.append(t)

    if alert_deduplicator is not None and es_log_fn is not None:
        _srv = server_config or {}
        t = threading.Thread(
            target=_safe_loop,
            args=("alert_flush", flush_interval,
                  lambda: _flush_alerts(
                      alert_deduplicator, es_log_fn, logger,
                      server_url=_srv.get("url", ""),
                      org_id=_srv.get("org_id", "system"),
                      es_client=es_client,
                  )),
            daemon=True,
        )
        t.start()
        threads.append(t)

    if fail2ban_mgr is not None and es_log_fn is not None:
        t = threading.Thread(
            target=_safe_loop,
            args=("fail2ban_poll", fail2ban_interval,
                  lambda: _poll_fail2ban(fail2ban_mgr, es_log_fn, logger)),
            daemon=True,
        )
        t.start()
        threads.append(t)

    if es_client is not None:
        t = threading.Thread(
            target=_safe_loop,
            args=("prune_old_alerts", prune_interval,
                  lambda: _prune_old_alerts(es_client, logger=logger)),
            daemon=True,
        )
        t.start()
        threads.append(t)

    if logger:
        logger.info("Started %d scheduled background tasks", len(threads))

    return threads
