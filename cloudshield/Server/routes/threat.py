"""
Threat detection & network monitoring API routes.

Blueprint: ``threat_bp``  (prefix ``/api/threat``)

Endpoints
---------
GET  /api/threat/alerts        – Recent Snort VPN alerts
GET  /api/threat/anomalies     – Recent ML anomaly detections
GET  /api/threat/intel         – Recent threat-intel IP hits
GET  /api/threat/status        – Monitoring subsystem health
POST /api/threat/scan          – Ad-hoc scan of connection data
POST /api/threat/geo-check     – GeoIP check for a list of IPs
"""

from __future__ import annotations

from flask import Blueprint, request, jsonify

from services.threat_service import (
    get_recent_alerts,
    get_recent_anomalies,
    get_recent_threat_intel_hits,
    get_monitoring_status,
    score_connections,
    check_threat_intel,
    check_geo,
    get_dashboard_summary,
)

threat_bp = Blueprint("threat", __name__)


# ── Read endpoints ──────────────────────────────────────────────────────────

@threat_bp.route("/alerts", methods=["GET"])
def list_alerts():
    """
    Return the most recent Snort VPN alerts.

    Query params:
        limit (int, default 50): max number of alerts to return
    """
    limit = request.args.get("limit", 50, type=int)
    alerts = get_recent_alerts(limit=limit)
    return jsonify({"alerts": alerts, "count": len(alerts)}), 200


@threat_bp.route("/anomalies", methods=["GET"])
def list_anomalies():
    """
    Return the most recent anomaly-detection results.

    Query params:
        limit (int, default 50): max number of results
    """
    limit = request.args.get("limit", 50, type=int)
    anomalies = get_recent_anomalies(limit=limit)
    return jsonify({"anomalies": anomalies, "count": len(anomalies)}), 200


@threat_bp.route("/intel", methods=["GET"])
def list_threat_intel():
    """
    Return recent threat-intelligence IP matches.

    Query params:
        limit (int, default 50)
    """
    limit = request.args.get("limit", 50, type=int)
    hits = get_recent_threat_intel_hits(limit=limit)
    return jsonify({"hits": hits, "count": len(hits)}), 200


@threat_bp.route("/status", methods=["GET"])
def monitoring_status():
    """
    Aggregate health snapshot of all monitoring subsystems
    (anomaly detector, Snort, fail2ban, threat intel, Elasticsearch).
    """
    status = get_monitoring_status()
    return jsonify(status), 200


# ── Write / ad-hoc endpoints ───────────────────────────────────────────────

@threat_bp.route("/scan", methods=["POST"])
def scan_connections():
    """
    Ad-hoc anomaly + threat-intel scan on a JSON payload of connections.

    Body (JSON):
        {
            "agent_id": "agent-01",
            "connections": [ { "laddr_ip": ..., "raddr_ip": ..., ... }, ... ]
        }

    Returns:
        {
            "anomalies": [...],
            "threat_intel_hits": [...]
        }
    """
    data = request.get_json(silent=True) or {}
    agent_id = data.get("agent_id", "")
    conns = data.get("connections", [])

    if not conns:
        return jsonify({"error": "connections list is required"}), 400

    anomalies = score_connections(conns, agent_id=agent_id)
    intel_hits = check_threat_intel(conns, agent_id=agent_id)

    return jsonify({
        "anomalies": anomalies,
        "threat_intel_hits": intel_hits,
    }), 200


@threat_bp.route("/geo-check", methods=["POST"])
def geo_check():
    """
    Check a list of IPs against the GeoIP country allow-list.

    Body (JSON):
        { "ips": ["1.2.3.4", "5.6.7.8"] }

    Returns only *suspicious* IPs.
    """
    data = request.get_json(silent=True) or {}
    ips = data.get("ips", [])

    if not ips:
        return jsonify({"error": "ips list is required"}), 400

    suspicious = check_geo(ips)
    return jsonify({"suspicious": suspicious, "count": len(suspicious)}), 200


@threat_bp.route("/dashboard", methods=["GET"])
def dashboard_summary():
    """
    Aggregated threat dashboard: alert counts by severity, top offending IPs,
    per-source breakdown, and the 10 most recent unified alerts.

    Query params:
        hours (int, default 24): lookback window in hours
    """
    hours = request.args.get("hours", 24, type=int)
    summary = get_dashboard_summary(hours=hours)
    return jsonify(summary), 200
