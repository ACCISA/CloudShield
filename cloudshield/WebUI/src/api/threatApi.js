/**
 * Threat detection API functions and hooks.
 *
 * Fetches unified alerts from GET /api/threat/unified and normalises the
 * backend schema into the shape expected by the security dashboard components.
 *
 * Backend alert fields  → UI alert fields
 * ─────────────────────────────────────────
 * alert_id              → id
 * source                → type  (mapped via SOURCE_TO_TYPE)
 * severity              → risk  (mapped via SEVERITY_TO_RISK)
 * timestamp (epoch s)   → date  (ISO string), displayDate (formatted)
 * title / description   → activity
 * (no backend field)    → status  (defaults to "unresolved")
 */

import { useEffect, useState, useCallback } from "react";
import { apiGet, apiPatch } from "./client";

// ── Mapping tables ────────────────────────────────────────────────────────────

const SOURCE_TO_TYPE = {
  snort:         "Network intrusion",
  anomaly:       "Suspicious activity",
  threat_intel:  "Security breach",
  traffic_spike: "Suspicious activity",
  beacon:        "C2 communication",
  proc_net:      "Malicious process",
  correlation:   "Multi-source threat",
};

const SOURCE_TO_CATEGORY = {
  snort:         "Network intrusion",
  anomaly:       "Anomaly detection",
  threat_intel:  "Threat intelligence",
  traffic_spike: "Traffic analysis",
  fail2ban:      "Access control",
  beacon:        "C2 detection",
  proc_net:      "Process correlation",
  correlation:   "Threat correlation",
};

const SEVERITY_TO_RISK = {
  CRITICAL: "high",
  HIGH:     "high",
  MEDIUM:   "moderate",
  LOW:      "low",
  // beacon and proc_net come in as HIGH; correlation always CRITICAL
};

// ── Normalisation ─────────────────────────────────────────────────────────────

function _formatDisplayDate(isoString) {
  const d     = new Date(isoString);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day   = String(d.getDate()).padStart(2, "0");
  const year  = d.getFullYear();
  let   hour  = d.getHours();
  const min   = String(d.getMinutes()).padStart(2, "0");
  const ampm  = hour >= 12 ? "pm" : "am";
  hour = hour % 12 || 12;
  return `${month}/${day}/${year} ${hour}:${min} ${ampm}`;
}

const _DESCRIPTION_BUILDERS = {
  anomaly(alert) {
    const agent = alert.agent_id ? `Agent ${alert.agent_id}` : null;
    const score = alert.details?.score != null
      ? Math.abs(alert.details.score).toFixed(2)
      : null;
    const parts = ["Anomalous network behaviour detected"];
    if (agent) parts.push(`on ${agent}`);
    if (score) parts.push(`with a statistical deviation score of ${score}`);
    parts.push("— this connection pattern is significantly outside the baseline.");
    return parts.join(" ");
  },
  snort(alert) {
    const src = alert.src_ip ? `${alert.src_ip}:${alert.src_port}` : null;
    const dst = alert.dst_ip ? `${alert.dst_ip}:${alert.dst_port}` : null;
    const parts = ["Snort IDS triggered rule"];
    if (alert.rule_id) parts.push(`"${alert.rule_id}"`);
    if (src && dst) parts.push(`for traffic from ${src} to ${dst}`);
    else if (src) parts.push(`from ${src}`);
    if (alert.proto) parts.push(`(${alert.proto.toUpperCase()})`);
    return parts.join(" ") + ".";
  },
  threat_intel(alert) {
    const ip = alert.src_ip || alert.dst_ip;
    const feed = alert.details?.source || "threat intelligence";
    return ip
      ? `IP address ${ip} matched a known malicious indicator in the ${feed} feed.`
      : `A connection matched a known-bad indicator in the ${feed} feed.`;
  },
  traffic_spike(alert) {
    const agent = alert.agent_id ? `Agent ${alert.agent_id}` : null;
    const parts = ["Abnormal traffic volume detected"];
    if (agent) parts.push(`from ${agent}`);
    if (alert.description) parts.push(`— ${alert.description}`);
    return parts.join(" ") + ".";
  },
  fail2ban(alert) {
    return `Fail2ban banned IP ${alert.src_ip || "unknown"} after repeated failed attempts.`;
  },
  beacon(alert) {
    const d = alert.details || {};
    const interval = d.interval_mean ? `~${Math.round(d.interval_mean)}s` : "a fixed interval";
    const proc = d.process_name ? ` by ${d.process_name}` : "";
    const dst = alert.dst_ip || "an external host";
    return (
      `Highly-regular connections to ${dst} detected${proc} every ${interval} ` +
      `(regularity CV=${d.interval_cv ?? "?"}, ${d.sample_count ?? "?"} samples). ` +
      `This pattern is consistent with C2 implant heartbeat traffic.`
    );
  },
  proc_net(alert) {
    const d = alert.details || {};
    const proc = d.process_name || d.processName || "A system utility";
    const dst = alert.dst_ip || "an external host";
    return (
      `${proc} (PID ${d.pid || "?"}) established an outbound connection to ${dst}. ` +
      `Living-off-the-land binaries should not initiate external connections.`
    );
  },
  correlation(alert) {
    const sources = alert.details?.sources?.join(", ") || "multiple detectors";
    return (
      `Multiple independent detectors fired simultaneously: ${sources}. ` +
      `This combination strongly indicates active compromise or an ongoing attack.`
    );
  },
};

function _buildDescription(alert) {
  const builder = _DESCRIPTION_BUILDERS[alert.source];
  if (builder) return builder(alert);
  return alert.description || alert.title || "Security event detected.";
}

/**
 * Convert a raw backend unified-alert dict into the shape the UI components
 * expect.  The original backend fields are preserved under `_raw` so detail
 * modals can display additional context.
 */
export function normalizeAlert(alert) {
  const isoDate = alert.timestamp
    ? new Date(alert.timestamp * 1000).toISOString()
    : new Date().toISOString();

  const description = _buildDescription(alert);

  return {
    id:            alert.alert_id || `${alert.source}-${alert.timestamp}`,
    type:          SOURCE_TO_TYPE[alert.source] || "Suspicious activity",
    category:      SOURCE_TO_CATEGORY[alert.source] || alert.source || "Unknown",
    source:        alert.agent_id || alert.src_ip || "Unknown",
    date:          isoDate,
    displayDate:   _formatDisplayDate(isoDate),
    activity:      alert.title || "Security event detected",
    description,
    affectedGroup: alert.agent_id || null,
    risk:          SEVERITY_TO_RISK[alert.severity] || "moderate",
    status:        "unresolved",
    _raw:          alert,
  };
}

// ── API calls ─────────────────────────────────────────────────────────────────

/**
 * Fetch and normalise unified alerts from the backend.
 *
 * @param {number} limit  Max number of alerts to retrieve (default 200).
 * @returns {Promise<Array>} Normalised alert array.
 */
export async function fetchSecurityAlerts(limit = 200) {
  const res = await apiGet(`/threat/unified?limit=${limit}`);
  const data = await res.json();
  return (data.alerts ?? []).map(normalizeAlert);
}

/**
 * Persist a status change for a single alert to the backend.
 *
 * @param {string} alertId  The backend `alert_id` value.
 * @param {"resolved"|"false_positive"|"unresolved"} status
 */
export async function updateAlertStatus(alertId, status) {
  await apiPatch(`/threat/unified/${encodeURIComponent(alertId)}`, { status });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * React hook that loads security alerts from the backend and exposes them
 * along with loading / error state and a manual refresh callback.
 *
 * @param {number} limit  Max alerts to fetch.
 * @returns {{ alerts: Array, loading: boolean, error: Error|null, refresh: Function }}
 */
export function useSecurityAlerts(limit = 200) {
  const [alerts, setAlerts]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const normalised = await fetchSecurityAlerts(limit);
      setAlerts(normalised);
    } catch (e) {
      setError(e);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    load();
  }, [load]);

  return { alerts, loading, error, refresh: load };
}
