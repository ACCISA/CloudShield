"""
Threat-detection service layer for CloudShield Flask API.

This service bridges the Flask API server and the ThreatDetection subsystem,
providing convenience functions that the ``/api/threat/*`` routes can call
without importing ML models or Elasticsearch directly.

Data flow:
    Flask route → threat_service → Elasticsearch / anomaly detector / monitoring helpers

The module is designed so that missing optional dependencies (sklearn,
geoip2, requests, elasticsearch) cause graceful degradation rather than
import errors.
"""

from __future__ import annotations

import os
import time
from datetime import datetime, timezone
from typing import Any

# ── Lazy-loaded singletons ──────────────────────────────────────────────────
# We keep these at module level so they're shared across requests but only
# instantiated once.

_anomaly_detector = None
_threat_intel = None
_geo_checker = None
_fail2ban = None


def _get_anomaly_detector():
    global _anomaly_detector
    if _anomaly_detector is None:
        from cloudshield.ThreatDetection.anomaly.detector import AnomalyDetector
        _anomaly_detector = AnomalyDetector(contamination=0.05)
    return _anomaly_detector


def _get_threat_intel():
    global _threat_intel
    if _threat_intel is None:
        from cloudshield.ThreatDetection.monitoring.threat_intel import ThreatIntelChecker
        _threat_intel = ThreatIntelChecker()
    return _threat_intel


def _get_geo_checker():
    global _geo_checker
    if _geo_checker is None:
        from cloudshield.ThreatDetection.monitoring.geo_blocking import GeoIPChecker
        _geo_checker = GeoIPChecker()
    return _geo_checker


def _get_fail2ban():
    global _fail2ban
    if _fail2ban is None:
        from cloudshield.ThreatDetection.monitoring.fail2ban import Fail2BanManager
        _fail2ban = Fail2BanManager(dry_run=True)
    return _fail2ban


# ── Elasticsearch helpers ───────────────────────────────────────────────────

def _es_client():
    """Return an Elasticsearch client or None when unavailable."""
    try:
        from elasticsearch import Elasticsearch
        es_url = os.environ.get("ES_URL", "http://localhost:9200")
        es = Elasticsearch(es_url)
        es.ping()
        return es
    except Exception:
        return None


def _es_recent(index: str, size: int = 50) -> list[dict]:
    """Fetch the most recent *size* docs from *index*, newest first."""
    es = _es_client()
    if not es:
        return []
    try:
        resp = es.search(
            index=index,
            body={
                "query": {"match_all": {}},
                "sort": [{"timestamp": {"order": "desc", "unmapped_type": "date"}}],
                "size": size,
            },
        )
        return [hit["_source"] for hit in resp["hits"]["hits"]]
    except Exception:
        return []


# ── Public service functions (called by routes) ────────────────────────────

def get_recent_alerts(limit: int = 50) -> list[dict]:
    """
    Return the latest Snort alerts from Elasticsearch.

    Index: ``snort_alerts``
    """
    return _es_recent("snort_alerts", size=limit)


def get_recent_anomalies(limit: int = 50) -> list[dict]:
    """
    Return the latest anomaly-detection results from Elasticsearch.

    Index: ``anomaly_alerts``
    """
    return _es_recent("anomaly_alerts", size=limit)


def get_recent_threat_intel_hits(limit: int = 50) -> list[dict]:
    """
    Return the latest threat-intel matches from Elasticsearch.

    Index: ``threat_intel_hits``
    """
    return _es_recent("threat_intel_hits", size=limit)


def get_monitoring_status() -> dict:
    """
    Aggregate health / status info from all monitoring subsystems.
    """
    detector = _get_anomaly_detector()
    threat_intel = _get_threat_intel()
    fail2ban = _get_fail2ban()

    status: dict[str, Any] = {
        "timestamp": int(time.time()),
        "anomaly_detector": {
            "trained": detector.is_trained,
            "engine": "IsolationForest" if detector._is_trained else "z-score-fallback",
        },
        "threat_intel": {
            "total_indicators": threat_intel.total_indicators,
            "last_refresh": threat_intel.last_refresh,
        },
        "fail2ban": {
            "available": fail2ban.is_available(),
            "jails": [s.to_dict() for s in fail2ban.all_jail_statuses()],
        },
        "snort": {
            "rules_file": "cloudshield/ThreatDetection/snort/local.rules",
            "config_file": "cloudshield/ThreatDetection/snort/snort.conf",
        },
    }

    # Elasticsearch connectivity
    es = _es_client()
    status["elasticsearch"] = {"connected": es is not None}

    return status


def score_connections(conns: list[dict], agent_id: str = "") -> list[dict]:
    """
    Run the anomaly detector on a list of connection dicts.

    Returns a list of anomaly results (only flagged anomalies).
    """
    detector = _get_anomaly_detector()
    results = detector.score_connections(conns, agent_id=agent_id, timestamp=int(time.time()))
    return [r.to_dict() for r in results if r.is_anomaly]


def check_threat_intel(conns: list[dict], agent_id: str = "") -> list[dict]:
    """
    Screen connection dicts against known-bad IP blocklists.
    """
    checker = _get_threat_intel()
    hits = checker.check_connections(conns, agent_id=agent_id)
    return [h.to_dict() for h in hits]


def check_geo(ips: list[str]) -> list[dict]:
    """
    Check a list of IPs against the GeoIP allow-list.

    Returns only suspicious results.
    """
    checker = _get_geo_checker()
    results = checker.check_many(ips)
    return [r.to_dict() for r in results]


def update_alert_status(alert_id: str, status: str, org_id: str = "") -> bool:
    """
    Update the ``status`` field of a unified alert document in Elasticsearch.

    Uses ``update_by_query`` to find the document by its ``alert_id`` field
    (which is stored in the document body, not the ES ``_id``).  When *org_id*
    is provided an extra term filter is added so users can only modify their
    own org's alerts.

    Returns ``True`` when at least one document was updated, ``False`` otherwise.
    """
    es = _es_client()
    if not es:
        return False

    query: dict = {"term": {"alert_id": alert_id}}
    if org_id:
        query = {"bool": {"must": [query, {"term": {"org_id": org_id}}]}}

    try:
        resp = es.update_by_query(
            index="unified_alerts",
            body={
                "query": query,
                "script": {
                    "source": "ctx._source.status = params.status",
                    "lang": "painless",
                    "params": {"status": status},
                },
            },
            conflicts="proceed",
        )
        return (resp.get("updated", 0) or 0) > 0
    except Exception:
        return False


def get_unified_alerts(limit: int = 50, org_id: str = "") -> list[dict]:
    """
    Return the most recent deduplicated alerts from the unified_alerts index.

    These are the cross-source, normalised alerts produced by the
    ThreatDetection AlertDeduplicator.

    If *org_id* is provided, only alerts belonging to that organisation are
    returned.  When absent (or empty) all alerts are returned — useful for
    admin / dev scenarios.

    Index: ``unified_alerts``
    """
    if not org_id:
        return _es_recent("unified_alerts", size=limit)

    es = _es_client()
    if not es:
        return []
    try:
        resp = es.search(
            index="unified_alerts",
            body={
                "query": {"term": {"org_id": org_id}},
                "sort": [{"timestamp": {"order": "desc", "unmapped_type": "date"}}],
                "size": limit,
                "collapse": {"field": "alert_id"},
            },
        )
        return [hit["_source"] for hit in resp["hits"]["hits"]]
    except Exception:
        return []


# ── Alert ingestion (records alerts into MongoDB activity + audit logs) ────

def ingest_threat_alerts(alerts: list[dict], org_id: str = "system") -> dict:
    """
    Persist a batch of unified alert dicts into MongoDB.

    For every alert:
      - An activity log entry is written to the ``activity`` collection so the
        event surfaces in ``GET /api/activity/<org_id>``.
      - CRITICAL and HIGH severity alerts are also written to the audit log so
        they appear in ``GET /api/audit``.

    Args:
        alerts: List of unified alert dicts (as produced by
            ``Alert.to_dict()`` in ThreatDetection).
        org_id: The organisation that owns the monitored infrastructure.
            Defaults to ``"system"`` when unknown.

    Returns:
        Summary dict with ``ingested``, ``audit_written``, and ``errors`` counts.
    """
    try:
        from cloudshield.Server.utils.database import activity as activity_col
        from cloudshield.Server.utils.audit import log_audit
    except ImportError:
        try:
            from utils.database import activity as activity_col  # type: ignore[no-redef]
            from utils.audit import log_audit  # type: ignore[no-redef]
        except ImportError:
            return {"ingested": 0, "audit_written": 0, "errors": len(alerts)}

    from cloudshield.Server.models.activity import RPC_METHOD_MAPPING

    ingested = 0
    audit_written = 0
    errors = 0

    for alert in alerts:
        source = alert.get("source", "unknown")
        severity = alert.get("severity", "MEDIUM")
        event_type = f"threat.{source}"
        description = RPC_METHOD_MAPPING.get(event_type, f"Threat event: {source}")
        agent_id = alert.get("agent_id", "unknown")

        # ── Activity log ────────────────────────────────────────────────
        activity_doc = {
            "org_id": org_id,
            "event_type": event_type,
            "description": alert.get("title") or description,
            "actor": f"ThreatDetection/{agent_id}",
            "metadata": {
                "alert_id": alert.get("alert_id"),
                "severity": severity,
                "src_ip": alert.get("src_ip"),
                "dst_ip": alert.get("dst_ip"),
                "rule_id": alert.get("rule_id"),
                "agent_id": agent_id,
            },
            "created_at": datetime.now(timezone.utc),
        }
        try:
            activity_col.insert_one(activity_doc)
            ingested += 1
        except Exception:
            errors += 1
            continue

        # ── Audit log for CRITICAL / HIGH ───────────────────────────────
        if severity in ("CRITICAL", "HIGH"):
            audit_severity = "critical" if severity == "CRITICAL" else "warning"
            try:
                log_audit(
                    action="detect",
                    resource="threat",
                    actor={"id": "threat-detection", "role": "system"},
                    target={"type": "alert", "id": alert.get("alert_id", "")},
                    reason=alert.get("description", ""),
                    severity=audit_severity,
                    meta={
                        "source": source,
                        "agent_id": agent_id,
                        "src_ip": alert.get("src_ip"),
                        "dst_ip": alert.get("dst_ip"),
                        "rule_id": alert.get("rule_id"),
                        "org_id": org_id,
                    },
                )
                audit_written += 1
            except Exception:
                pass

    return {"ingested": ingested, "audit_written": audit_written, "errors": errors}


# ── Dashboard summary ──────────────────────────────────────────────────────

def get_dashboard_summary(hours: int = 24) -> dict:
    """
    Aggregate alert counts, severity breakdown, top offending IPs, and recent
    Snort / anomaly / threat-intel / spike counts for the dashboard.

    Tries to query the ``unified_alerts`` index first.  If ES is unavailable
    it falls back to per-index doc counts.
    """
    es = _es_client()
    now = int(time.time())
    cutoff = now - hours * 3600

    result: dict[str, Any] = {
        "timestamp": now,
        "window_hours": hours,
        "total_alerts": 0,
        "by_severity": {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0},
        "by_source": {},
        "top_src_ips": [],
        "top_dst_ips": [],
        "recent_alerts": [],
    }

    if es is None:
        return result

    # — Unified alert counts & aggregations  (best-effort) ──────────────
    try:
        body = {
            "size": 0,
            "query": {"range": {"timestamp": {"gte": cutoff}}},
            "aggs": {
                "severity": {"terms": {"field": "severity", "size": 10}},
                "source": {"terms": {"field": "source", "size": 10}},
                "top_src": {"terms": {"field": "src_ip", "size": 10}},
                "top_dst": {"terms": {"field": "dst_ip", "size": 10}},
            },
        }
        resp = es.search(index="unified_alerts", body=body)

        result["total_alerts"] = resp["hits"]["total"]["value"]

        for bucket in resp["aggregations"]["severity"]["buckets"]:
            result["by_severity"][bucket["key"]] = bucket["doc_count"]

        for bucket in resp["aggregations"]["source"]["buckets"]:
            result["by_source"][bucket["key"]] = bucket["doc_count"]

        result["top_src_ips"] = [
            {"ip": b["key"], "count": b["doc_count"]}
            for b in resp["aggregations"]["top_src"]["buckets"]
            if b["key"]
        ]
        result["top_dst_ips"] = [
            {"ip": b["key"], "count": b["doc_count"]}
            for b in resp["aggregations"]["top_dst"]["buckets"]
            if b["key"]
        ]
    except Exception:
        pass

    # — Recent 10 alerts  ───────────────────────────────────────────────
    try:
        recent = es.search(
            index="unified_alerts",
            body={
                "query": {"range": {"timestamp": {"gte": cutoff}}},
                "sort": [{"timestamp": {"order": "desc"}}],
            },
            size=10,
        )
        result["recent_alerts"] = [h["_source"] for h in recent["hits"]["hits"]]
    except Exception:
        pass

    # — Per-index fallback counts  ──────────────────────────────────────
    for idx in ("snort_alerts", "anomaly_alerts", "threat_intel_hits", "traffic_spikes"):
        try:
            c = es.count(
                index=idx,
                body={"query": {"range": {"timestamp": {"gte": cutoff}}}},
            )
            result["by_source"].setdefault(idx, c["count"])
        except Exception:
            pass

    return result
