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
import { apiGet } from "./client";

// ── Mapping tables ────────────────────────────────────────────────────────────

const SOURCE_TO_TYPE = {
  snort:         "Network intrusion",
  anomaly:       "Suspicious activity",
  threat_intel:  "Security breach",
  traffic_spike: "Suspicious activity",
};

const SEVERITY_TO_RISK = {
  CRITICAL: "high",
  HIGH:     "high",
  MEDIUM:   "moderate",
  LOW:      "low",
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

/**
 * Convert a raw backend unified-alert dict into the shape the UI components
 * expect.  The original backend fields are preserved under `_raw` so detail
 * modals can display additional context.
 */
export function normalizeAlert(alert) {
  const isoDate = alert.timestamp
    ? new Date(alert.timestamp * 1000).toISOString()
    : new Date().toISOString();

  return {
    id:          alert.alert_id || `${alert.source}-${alert.timestamp}`,
    type:        SOURCE_TO_TYPE[alert.source] || "Suspicious activity",
    date:        isoDate,
    displayDate: _formatDisplayDate(isoDate),
    activity:    alert.title || alert.description || "Security event detected",
    risk:        SEVERITY_TO_RISK[alert.severity] || "moderate",
    status:      "unresolved",
    _raw:        alert,
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
  const data = await apiGet(`/threat/unified?limit=${limit}`).json();
  return (data.alerts ?? []).map(normalizeAlert);
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
