"""
Elasticsearch index templates for CloudShield ThreatDetection.

Ensures each alert/telemetry index has explicit field mappings so data is
correctly typed, searchable, and aggregatable by Kibana / the dashboard API.

Usage (called once on server startup)::

    from es_templates import ensure_index_templates
    ensure_index_templates(es_client)
"""

from __future__ import annotations

from typing import Any

# ── Index definitions ───────────────────────────────────────────────────────

# Unified alerts (snort + anomaly + threat-intel + traffic-spike)
UNIFIED_ALERTS_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "alert_id":    {"type": "keyword"},
            "source":      {"type": "keyword"},
            "severity":    {"type": "keyword"},
            "timestamp":   {"type": "date", "format": "epoch_second"},
            "first_seen":  {"type": "date", "format": "epoch_second"},
            "last_seen":   {"type": "date", "format": "epoch_second"},
            "count":       {"type": "integer"},
            "agent_id":    {"type": "keyword"},
            "src_ip":      {"type": "ip", "ignore_malformed": True},
            "dst_ip":      {"type": "ip", "ignore_malformed": True},
            "src_port":    {"type": "integer"},
            "dst_port":    {"type": "integer"},
            "proto":       {"type": "keyword"},
            "rule_id":     {"type": "keyword"},
            "title":       {"type": "text", "fields": {"raw": {"type": "keyword"}}},
            "description": {"type": "text"},
            "details":     {"type": "object", "enabled": False},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
}

# Snort fast-alert raw docs
SNORT_ALERTS_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "timestamp":  {"type": "keyword"},
            "sid":        {"type": "integer"},
            "gid":        {"type": "integer"},
            "rev":        {"type": "integer"},
            "msg":        {"type": "text", "fields": {"raw": {"type": "keyword"}}},
            "classtype":  {"type": "keyword"},
            "priority":   {"type": "integer"},
            "proto":      {"type": "keyword"},
            "src_ip":     {"type": "ip", "ignore_malformed": True},
            "src_port":   {"type": "integer"},
            "dst_ip":     {"type": "ip", "ignore_malformed": True},
            "dst_port":   {"type": "integer"},
            "raw":        {"type": "text"},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
}

# Anomaly-detector results
ANOMALY_ALERTS_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "agent_id":   {"type": "keyword"},
            "timestamp":  {"type": "date", "format": "epoch_second"},
            "score":      {"type": "float"},
            "is_anomaly": {"type": "boolean"},
            "features":   {"type": "float"},
            "reason":     {"type": "text"},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
}

# Threat-intel IP hits
THREAT_INTEL_HITS_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "ip":        {"type": "ip", "ignore_malformed": True},
            "source":    {"type": "keyword"},
            "direction": {"type": "keyword"},
            "reason":    {"type": "text"},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
}

# Raw network connections from agents
NET_CONNS_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "agent_id":      {"type": "keyword"},
            "timestamp":     {"type": "date", "format": "epoch_second"},
            "laddr_ip":      {"type": "ip", "ignore_malformed": True},
            "laddr_port":    {"type": "integer"},
            "raddr_ip":      {"type": "ip", "ignore_malformed": True},
            "raddr_port":    {"type": "integer"},
            "status":        {"type": "keyword"},
            "pid":           {"type": "integer"},
            "process_name":  {"type": "keyword"},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
}

# Traffic-spike events
TRAFFIC_SPIKES_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "agent_id":       {"type": "keyword"},
            "timestamp":      {"type": "date", "format": "epoch_second"},
            "current_rate":   {"type": "float"},
            "baseline_rate":  {"type": "float"},
            "baseline_std":   {"type": "float"},
            "spike_ratio":    {"type": "float"},
            "is_spike":       {"type": "boolean"},
        }
    },
    "settings": {
        "number_of_shards": 1,
        "number_of_replicas": 0,
    },
}


# Beacon / C2 heartbeat detections
BEACON_ALERTS_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "agent_id":       {"type": "keyword"},
            "dst_ip":         {"type": "ip", "ignore_malformed": True},
            "dst_port":       {"type": "integer"},
            "timestamp":      {"type": "date", "format": "epoch_second"},
            "interval_mean":  {"type": "float"},
            "interval_cv":    {"type": "float"},
            "sample_count":   {"type": "integer"},
            "is_beacon":      {"type": "boolean"},
            "process_name":   {"type": "keyword"},
        }
    },
    "settings": {"number_of_shards": 1, "number_of_replicas": 0},
}

# LOLBin / process-network correlation alerts
PROC_NET_ALERTS_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "alert_id":    {"type": "keyword"},
            "agent_id":    {"type": "keyword"},
            "source":      {"type": "keyword"},
            "severity":    {"type": "keyword"},
            "timestamp":   {"type": "date", "format": "epoch_second"},
            "title":       {"type": "text", "fields": {"raw": {"type": "keyword"}}},
            "description": {"type": "text"},
            "dst_ip":      {"type": "ip", "ignore_malformed": True},
            "dst_port":    {"type": "integer"},
            "rule_id":     {"type": "keyword"},
            "details":     {"type": "object", "enabled": False},
        }
    },
    "settings": {"number_of_shards": 1, "number_of_replicas": 0},
}

# Cross-source correlation escalation alerts
CORRELATION_ALERTS_MAPPING: dict[str, Any] = {
    "mappings": {
        "properties": {
            "alert_id":    {"type": "keyword"},
            "agent_id":    {"type": "keyword"},
            "source":      {"type": "keyword"},
            "severity":    {"type": "keyword"},
            "timestamp":   {"type": "date", "format": "epoch_second"},
            "title":       {"type": "text", "fields": {"raw": {"type": "keyword"}}},
            "description": {"type": "text"},
            "rule_id":     {"type": "keyword"},
            "details":     {"type": "object", "enabled": False},
        }
    },
    "settings": {"number_of_shards": 1, "number_of_replicas": 0},
}

# Master registry: index name → mapping body
INDEX_TEMPLATES: dict[str, dict] = {
    "unified_alerts":     UNIFIED_ALERTS_MAPPING,
    "snort_alerts":       SNORT_ALERTS_MAPPING,
    "anomaly_alerts":     ANOMALY_ALERTS_MAPPING,
    "threat_intel_hits":  THREAT_INTEL_HITS_MAPPING,
    "net_conns":          NET_CONNS_MAPPING,
    "traffic_spikes":     TRAFFIC_SPIKES_MAPPING,
    "beacon_alerts":      BEACON_ALERTS_MAPPING,
    "proc_net_alerts":    PROC_NET_ALERTS_MAPPING,
    "correlation_alerts": CORRELATION_ALERTS_MAPPING,
}


# ── Bootstrap function ─────────────────────────────────────────────────────

def ensure_index_templates(es_client, logger=None) -> list[str]:
    """
    Create each index in :data:`INDEX_TEMPLATES` if it doesn't already exist.

    Parameters
    ----------
    es_client
        An ``elasticsearch.Elasticsearch`` instance.
    logger
        Optional logger; if provided, logs created / skipped / failed indices.

    Returns
    -------
    list[str]
        Names of indices that were newly created.
    """
    created: list[str] = []

    for index_name, body in INDEX_TEMPLATES.items():
        try:
            if es_client.indices.exists(index=index_name):
                if logger:
                    logger.debug("ES index '%s' already exists — skipping", index_name)
                continue

            es_client.indices.create(index=index_name, body=body)
            created.append(index_name)
            if logger:
                logger.info("Created ES index '%s'", index_name)
        except Exception as exc:
            if logger:
                logger.warning("Failed to create ES index '%s': %s", index_name, exc)

    return created
