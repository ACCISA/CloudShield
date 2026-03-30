import React, { useState, useEffect } from "react";

import PageShell from "../components/layout/PageShell.jsx";
import SecurityChartsPanel from "../components/security/SecurityChartsPanel.jsx";
import SecurityAlertsPanel from "../components/security/SecurityAlertsPanel.jsx";
import { useSecurityAlerts, updateAlertStatus } from "../api/threatApi.js";

const contentStyles = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  minWidth: 1150,
  width: "100%",
  minHeight: 0,
};

const POLL_INTERVAL_MS = 30_000;

function SecurityDashboardPage() {
  const { alerts: fetchedAlerts, loading, error, refresh } = useSecurityAlerts();

  useEffect(() => {
    const id = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh]);
  const [overrides, setOverrides] = useState({});

  const alerts = fetchedAlerts.map((a) =>
    overrides[a.id] ? { ...a, ...overrides[a.id] } : a
  ).filter((a) => a.status !== "removed");

  const handleUpdateAlert = (id, patch) => {
    // Optimistic local update
    setOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), ...patch } }));
    // Persist to backend — map UI status values to backend enum
    if (patch.status) {
      const backendStatus = patch.status === "removed" ? "false_positive" : patch.status;
      updateAlertStatus(id, backendStatus).catch(() => {});
    }
  };

  return (
    <PageShell>
      <div
        data-testid="security-dashboard-content"
        style={contentStyles}
      >
        <SecurityChartsPanel alerts={alerts} />
        <SecurityAlertsPanel
          alerts={alerts}
          loading={loading}
          error={error}
          onRefresh={refresh}
          onUpdateAlert={handleUpdateAlert}
        />
      </div>
    </PageShell>
  );
}

export default SecurityDashboardPage;