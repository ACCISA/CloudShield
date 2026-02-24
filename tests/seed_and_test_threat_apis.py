"""
Seed Elasticsearch with realistic mock threat data, then exercise every
/api/threat/* endpoint and print the responses.

Usage:
    python tests/seed_and_test_threat_apis.py

Requires: elasticsearch, requests  (pip install elasticsearch requests)
"""

import json
import time
import sys

import requests

# ── Config ──────────────────────────────────────────────────────────────────

ES_URL = "http://localhost:9200"
API_BASE = "http://localhost:5050/api/threat"
NOW = int(time.time())

# Use requests-based approach for index creation to avoid ES client version issues
es_session = requests.Session()


def es_put(path, body=None):
    r = es_session.put(f"{ES_URL}/{path}", json=body, timeout=10)
    return r


def es_post(path, body=None):
    r = es_session.post(f"{ES_URL}/{path}", json=body, timeout=10)
    return r


def es_delete(path):
    r = es_session.delete(f"{ES_URL}/{path}", timeout=10)
    return r


def es_head(path):
    r = es_session.head(f"{ES_URL}/{path}", timeout=10)
    return r


def pp(label: str, obj):
    """Pretty-print a JSON response."""
    print(f"\n{'='*70}")
    print(f"  {label}")
    print(f"{'='*70}")
    print(json.dumps(obj, indent=2))


# ── 1. Create indices ──────────────────────────────────────────────────────

INDEX_TEMPLATES = {
    "unified_alerts": {
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
        "settings": {"number_of_shards": 1, "number_of_replicas": 0},
    },
    "snort_alerts": {
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
        "settings": {"number_of_shards": 1, "number_of_replicas": 0},
    },
    "anomaly_alerts": {
        "mappings": {
            "properties": {
                "agent_id":   {"type": "keyword"},
                "timestamp":  {"type": "date", "format": "epoch_second"},
                "score":      {"type": "float"},
                "is_anomaly": {"type": "boolean"},
                "reason":     {"type": "text"},
            }
        },
        "settings": {"number_of_shards": 1, "number_of_replicas": 0},
    },
    "threat_intel_hits": {
        "mappings": {
            "properties": {
                "ip":        {"type": "ip", "ignore_malformed": True},
                "source":    {"type": "keyword"},
                "direction": {"type": "keyword"},
                "reason":    {"type": "text"},
                "agent_id":  {"type": "keyword"},
                "timestamp": {"type": "date", "format": "epoch_second"},
            }
        },
        "settings": {"number_of_shards": 1, "number_of_replicas": 0},
    },
    "traffic_spikes": {
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
        "settings": {"number_of_shards": 1, "number_of_replicas": 0},
    },
}

print("[*] Creating ES indices...")
for name, body in INDEX_TEMPLATES.items():
    if es_head(name).status_code == 200:
        es_delete(name)
        print(f"    Deleted existing index: {name}")
    r = es_put(name, body)
    if r.status_code not in (200, 201):
        print(f"    !! Failed to create {name}: {r.text}")
        sys.exit(1)
    print(f"    Created index: {name}")


# ── 2. Seed mock data ──────────────────────────────────────────────────────

print("\n[*] Seeding mock data...")

# --- Snort alerts (VPN monitoring) ---
snort_alerts = [
    {
        "timestamp": "02/22-10:15:33.123456",
        "sid": 9000001, "gid": 1, "rev": 1,
        "msg": "CS-VPN Port scan detected on VPN port",
        "classtype": "attempted-recon", "priority": 2,
        "proto": "TCP",
        "src_ip": "185.220.101.45", "src_port": 54321,
        "dst_ip": "10.8.0.1", "dst_port": 1194,
        "raw": "01/22-10:15:33.123456  [**] [1:9000001:1] CS-VPN Port scan [**]",
    },
    {
        "timestamp": "02/22-10:22:11.654321",
        "sid": 9000003, "gid": 1, "rev": 1,
        "msg": "CS-VPN Unauthorized DNS tunnel over VPN",
        "classtype": "trojan-activity", "priority": 1,
        "proto": "UDP",
        "src_ip": "10.8.0.7", "src_port": 53,
        "dst_ip": "198.51.100.99", "dst_port": 53,
        "raw": "02/22-10:22:11.654321  [**] [1:9000003:1] DNS tunnel [**]",
    },
    {
        "timestamp": "02/22-11:05:44.111111",
        "sid": 9000005, "gid": 1, "rev": 1,
        "msg": "CS-VPN Possible reverse shell (/bin/sh) detected",
        "classtype": "trojan-activity", "priority": 1,
        "proto": "TCP",
        "src_ip": "10.8.0.3", "src_port": 4444,
        "dst_ip": "203.0.113.42", "dst_port": 8080,
        "raw": "02/22-11:05:44.111111  [**] [1:9000005:1] Reverse shell [**]",
    },
    {
        "timestamp": "02/22-12:30:00.000000",
        "sid": 9000002, "gid": 1, "rev": 1,
        "msg": "CS-VPN Excessive failed OpenVPN auth attempts",
        "classtype": "attempted-admin", "priority": 1,
        "proto": "UDP",
        "src_ip": "91.239.72.10", "src_port": 12345,
        "dst_ip": "10.8.0.1", "dst_port": 1194,
        "raw": "02/22-12:30:00.000000  [**] [1:9000002:1] Brute force [**]",
    },
]

for doc in snort_alerts:
    es_post("snort_alerts/_doc", doc)
print(f"    snort_alerts: {len(snort_alerts)} docs")

# --- Anomaly detections (ML model flags) ---
anomaly_alerts = [
    {
        "agent_id": "agent-1", "timestamp": NOW - 1800,
        "score": -0.42, "is_anomaly": True,
        "reason": "Unusual outbound connection burst: 147 connections in 30s window to 23 unique IPs",
    },
    {
        "agent_id": "agent-2", "timestamp": NOW - 3600,
        "score": -0.31, "is_anomaly": True,
        "reason": "Connection to suspicious port 4444 (common reverse shell) from process 'nc'",
    },
    {
        "agent_id": "agent-1", "timestamp": NOW - 7200,
        "score": -0.55, "is_anomaly": True,
        "reason": "Large data exfiltration pattern: sustained high-rate outbound to single IP 198.51.100.99",
    },
    {
        "agent_id": "agent-3", "timestamp": NOW - 900,
        "score": -0.18, "is_anomaly": True,
        "reason": "New process 'cryptominer' opened 50+ connections to mining pool IPs",
    },
    {
        "agent_id": "agent-2", "timestamp": NOW - 300,
        "score": -0.08, "is_anomaly": False,
        "reason": "Normal HTTPS traffic to CDN endpoints",
    },
]

for doc in anomaly_alerts:
    es_post("anomaly_alerts/_doc", doc)
print(f"    anomaly_alerts: {len(anomaly_alerts)} docs")

# --- Threat intel hits (known-bad IP matches) ---
threat_intel_hits = [
    {
        "ip": "185.220.101.45", "source": "abuse.ch",
        "direction": "inbound", "agent_id": "agent-1",
        "timestamp": NOW - 600,
        "reason": "Tor exit node - known for scanning/brute-force attacks",
    },
    {
        "ip": "91.239.72.10", "source": "emerging-threats",
        "direction": "inbound", "agent_id": "agent-1",
        "timestamp": NOW - 1200,
        "reason": "Botnet C2 server (Emotet infrastructure)",
    },
    {
        "ip": "203.0.113.42", "source": "abuse.ch",
        "direction": "outbound", "agent_id": "agent-3",
        "timestamp": NOW - 2400,
        "reason": "Known malware distribution host",
    },
    {
        "ip": "198.51.100.99", "source": "alienvault-otx",
        "direction": "outbound", "agent_id": "agent-1",
        "timestamp": NOW - 4800,
        "reason": "Data exfiltration endpoint flagged in APT-29 campaign",
    },
]

for doc in threat_intel_hits:
    es_post("threat_intel_hits/_doc", doc)
print(f"    threat_intel_hits: {len(threat_intel_hits)} docs")

# --- Traffic spikes ---
traffic_spikes = [
    {
        "agent_id": "agent-1", "timestamp": NOW - 1800,
        "current_rate": 347.0, "baseline_rate": 42.5,
        "baseline_std": 8.3, "spike_ratio": 8.16, "is_spike": True,
    },
    {
        "agent_id": "agent-3", "timestamp": NOW - 900,
        "current_rate": 512.0, "baseline_rate": 38.0,
        "baseline_std": 6.1, "spike_ratio": 13.47, "is_spike": True,
    },
]

for doc in traffic_spikes:
    es_post("traffic_spikes/_doc", doc)
print(f"    traffic_spikes: {len(traffic_spikes)} docs")

# --- Unified alerts (aggregated from all sources) ---
unified_alerts = [
    {
        "alert_id": "a1b2c3d4e5f60001",
        "source": "snort", "severity": "MEDIUM",
        "timestamp": NOW - 3600, "first_seen": NOW - 3600, "last_seen": NOW - 3600, "count": 1,
        "agent_id": "agent-1",
        "src_ip": "185.220.101.45", "dst_ip": "10.8.0.1",
        "src_port": 54321, "dst_port": 1194, "proto": "TCP",
        "rule_id": "9000001",
        "title": "Port scan detected on VPN port",
        "description": "TCP SYN scan from Tor exit node targeting OpenVPN port 1194",
    },
    {
        "alert_id": "a1b2c3d4e5f60002",
        "source": "snort", "severity": "CRITICAL",
        "timestamp": NOW - 3000, "first_seen": NOW - 3000, "last_seen": NOW - 3000, "count": 1,
        "agent_id": "agent-1",
        "src_ip": "10.8.0.7", "dst_ip": "198.51.100.99",
        "src_port": 53, "dst_port": 53, "proto": "UDP",
        "rule_id": "9000003",
        "title": "DNS tunnel over VPN detected",
        "description": "Encoded DNS queries to external server consistent with data exfiltration via DNS tunneling",
    },
    {
        "alert_id": "a1b2c3d4e5f60003",
        "source": "snort", "severity": "CRITICAL",
        "timestamp": NOW - 2400, "first_seen": NOW - 2400, "last_seen": NOW - 2400, "count": 1,
        "agent_id": "agent-3",
        "src_ip": "10.8.0.3", "dst_ip": "203.0.113.42",
        "src_port": 4444, "dst_port": 8080, "proto": "TCP",
        "rule_id": "9000005",
        "title": "Reverse shell detected",
        "description": "Outbound connection on port 4444 with /bin/sh payload detected",
    },
    {
        "alert_id": "a1b2c3d4e5f60004",
        "source": "anomaly", "severity": "CRITICAL",
        "timestamp": NOW - 1800, "first_seen": NOW - 1800, "last_seen": NOW - 1800, "count": 1,
        "agent_id": "agent-1",
        "src_ip": "10.8.0.5", "dst_ip": "",
        "src_port": 0, "dst_port": 0, "proto": "",
        "rule_id": "anomaly-burst",
        "title": "Anomalous connection burst",
        "description": "147 connections in 30s to 23 unique IPs (score: -0.42)",
    },
    {
        "alert_id": "a1b2c3d4e5f60005",
        "source": "anomaly", "severity": "HIGH",
        "timestamp": NOW - 7200, "first_seen": NOW - 7200, "last_seen": NOW - 7200, "count": 1,
        "agent_id": "agent-1",
        "src_ip": "10.8.0.5", "dst_ip": "198.51.100.99",
        "src_port": 0, "dst_port": 0, "proto": "",
        "rule_id": "anomaly-exfil",
        "title": "Data exfiltration pattern",
        "description": "Sustained high-rate outbound traffic to single external IP",
    },
    {
        "alert_id": "a1b2c3d4e5f60006",
        "source": "threat_intel", "severity": "HIGH",
        "timestamp": NOW - 600, "first_seen": NOW - 600, "last_seen": NOW - 600, "count": 1,
        "agent_id": "agent-1",
        "src_ip": "185.220.101.45", "dst_ip": "10.8.0.1",
        "src_port": 0, "dst_port": 1194, "proto": "",
        "rule_id": "ti-tor-exit",
        "title": "Inbound from Tor exit node",
        "description": "Connection from known Tor exit node (abuse.ch blocklist)",
    },
    {
        "alert_id": "a1b2c3d4e5f60007",
        "source": "threat_intel", "severity": "CRITICAL",
        "timestamp": NOW - 1200, "first_seen": NOW - 1200, "last_seen": NOW - 1200, "count": 3,
        "agent_id": "agent-1",
        "src_ip": "91.239.72.10", "dst_ip": "10.8.0.1",
        "src_port": 0, "dst_port": 1194, "proto": "UDP",
        "rule_id": "ti-emotet-c2",
        "title": "Emotet C2 communication",
        "description": "Inbound connection from known Emotet botnet C2 server",
    },
    {
        "alert_id": "a1b2c3d4e5f60008",
        "source": "traffic_spike", "severity": "HIGH",
        "timestamp": NOW - 1800, "first_seen": NOW - 1800, "last_seen": NOW - 1800, "count": 1,
        "agent_id": "agent-1",
        "src_ip": "", "dst_ip": "",
        "src_port": 0, "dst_port": 0, "proto": "",
        "rule_id": "spike-agent1",
        "title": "Traffic spike on agent-1",
        "description": "347 conn/window vs 42.5 baseline (8.16x spike ratio)",
    },
    {
        "alert_id": "a1b2c3d4e5f60009",
        "source": "traffic_spike", "severity": "CRITICAL",
        "timestamp": NOW - 900, "first_seen": NOW - 900, "last_seen": NOW - 900, "count": 1,
        "agent_id": "agent-3",
        "src_ip": "", "dst_ip": "",
        "src_port": 0, "dst_port": 0, "proto": "",
        "rule_id": "spike-agent3",
        "title": "Traffic spike on agent-3",
        "description": "512 conn/window vs 38.0 baseline (13.47x spike ratio)",
    },
    {
        "alert_id": "a1b2c3d4e5f6000a",
        "source": "snort", "severity": "HIGH",
        "timestamp": NOW - 600, "first_seen": NOW - 600, "last_seen": NOW - 600, "count": 5,
        "agent_id": "agent-1",
        "src_ip": "91.239.72.10", "dst_ip": "10.8.0.1",
        "src_port": 12345, "dst_port": 1194, "proto": "UDP",
        "rule_id": "9000002",
        "title": "Brute-force OpenVPN auth attempts",
        "description": "5 failed authentication attempts in 60 seconds from same source IP",
    },
]

for doc in unified_alerts:
    es_post("unified_alerts/_doc", doc)
print(f"    unified_alerts: {len(unified_alerts)} docs")

# Force refresh so data is immediately searchable
for idx in INDEX_TEMPLATES:
    es_post(f"{idx}/_refresh")

print(f"\n[*] Total documents seeded: {len(snort_alerts) + len(anomaly_alerts) + len(threat_intel_hits) + len(traffic_spikes) + len(unified_alerts)}")


# ── 3. Test every API endpoint ─────────────────────────────────────────────

print("\n" + "#" * 70)
print("#  TESTING ALL /api/threat/* ENDPOINTS")
print("#" * 70)

failed = 0
passed = 0


def test_endpoint(method, path, label, json_body=None, expect_key=None, expect_min=0, expect_status=200):
    """Hit an endpoint, print response, and verify basic expectations."""
    global failed, passed
    url = f"{API_BASE}{path}"
    try:
        if method == "GET":
            r = requests.get(url, timeout=10)
        else:
            r = requests.post(url, json=json_body, timeout=10)

        data = r.json()
        pp(f"{label}  [{r.status_code}]", data)

        ok = True
        if r.status_code != expect_status:
            print(f"  !! UNEXPECTED STATUS: {r.status_code} (expected {expect_status})")
            ok = False
        if expect_key and expect_key in data:
            count = data[expect_key] if isinstance(data[expect_key], int) else len(data[expect_key])
            if count < expect_min:
                print(f"  !! Expected at least {expect_min} items in '{expect_key}', got {count}")
                ok = False
            else:
                print(f"  >> {expect_key}: {count} items")
        if ok:
            print("  [PASS]")
            passed += 1
        else:
            print("  [FAIL]")
            failed += 1
    except Exception as exc:
        print(f"\n  !! ERROR calling {url}: {exc}")
        failed += 1


# GET /api/threat/status
test_endpoint("GET", "/status", "Subsystem Health Status",
              expect_key="elasticsearch")

# GET /api/threat/alerts  (Snort alerts from ES)
test_endpoint("GET", "/alerts", "Recent Snort Alerts",
              expect_key="alerts", expect_min=1)

# GET /api/threat/alerts?limit=2
test_endpoint("GET", "/alerts?limit=2", "Snort Alerts (limit=2)",
              expect_key="count", expect_min=1)

# GET /api/threat/anomalies
test_endpoint("GET", "/anomalies", "Anomaly Detections",
              expect_key="anomalies", expect_min=1)

# GET /api/threat/intel
test_endpoint("GET", "/intel", "Threat Intel Hits",
              expect_key="hits", expect_min=1)

# GET /api/threat/dashboard
test_endpoint("GET", "/dashboard", "Dashboard Summary (24h)",
              expect_key="total_alerts", expect_min=1)

# GET /api/threat/dashboard?hours=1
test_endpoint("GET", "/dashboard?hours=1", "Dashboard Summary (1h)",
              expect_key="total_alerts")

# POST /api/threat/scan — normal traffic
test_endpoint("POST", "/scan", "Ad-hoc Scan: Normal Traffic",
              json_body={
                  "agent_id": "agent-1",
                  "connections": [
                      {"laddr_ip": "10.8.0.5", "laddr_port": 443,
                       "raddr_ip": "8.8.8.8", "raddr_port": 443,
                       "status": "ESTABLISHED", "pid": 100,
                       "process_name": "curl"},
                  ],
              },
              expect_key="anomalies")

# POST /api/threat/scan — suspicious traffic
test_endpoint("POST", "/scan", "Ad-hoc Scan: Suspicious Traffic",
              json_body={
                  "agent_id": "agent-2",
                  "connections": [
                      {"laddr_ip": "10.8.0.3", "laddr_port": 54321,
                       "raddr_ip": "203.0.113.42", "raddr_port": 4444,
                       "status": "ESTABLISHED", "pid": 666,
                       "process_name": "nc"},
                      {"laddr_ip": "10.8.0.3", "laddr_port": 22,
                       "raddr_ip": "185.220.101.45", "raddr_port": 8080,
                       "status": "ESTABLISHED", "pid": 667,
                       "process_name": "unknown"},
                      {"laddr_ip": "10.8.0.3", "laddr_port": 12345,
                       "raddr_ip": "91.239.72.10", "raddr_port": 6667,
                       "status": "ESTABLISHED", "pid": 668,
                       "process_name": "irc_bot"},
                  ],
              })

# POST /api/threat/scan — missing body (error case)
test_endpoint("POST", "/scan", "Ad-hoc Scan: Missing Body (expect 400)",
              json_body={}, expect_status=400)

# POST /api/threat/geo-check — mixed IPs
test_endpoint("POST", "/geo-check", "Geo-Check: Mixed IPs",
              json_body={
                  "ips": [
                      "8.8.8.8",         # Google DNS (US, allowed)
                      "185.220.101.45",  # Tor exit (DE? allowed but suspicious)
                      "10.0.0.1",        # Bogon (should be flagged)
                      "127.0.0.1",       # Loopback (bogon)
                      "93.184.216.34",   # example.com (US, allowed)
                      "224.0.0.1",       # Multicast (bogon)
                  ]
              },
              expect_key="suspicious", expect_min=1)

# POST /api/threat/geo-check — missing body (error case)
test_endpoint("POST", "/geo-check", "Geo-Check: Missing IPs (expect 400)",
              json_body={}, expect_status=400)


# ── Summary ─────────────────────────────────────────────────────────────────

print("\n" + "=" * 70)
print(f"  RESULTS: {passed} passed, {failed} failed")
print("=" * 70)

sys.exit(1 if failed else 0)
