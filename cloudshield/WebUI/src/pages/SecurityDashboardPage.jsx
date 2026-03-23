import React from "react";

import PageShell from "../components/layout/PageShell.jsx";
import SecurityChartsPanel from "../components/security/SecurityChartsPanel.jsx";
import SecurityAlertsPanel from "../components/security/SecurityAlertsPanel.jsx";
import { useSecurityAlerts } from "../api/threatApi.js";

const contentStyles = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  minWidth: 1150,
  width: "100%",
  minHeight: 0,
};

function SecurityDashboardPage() {
  const { alerts, loading, error, refresh } = useSecurityAlerts();

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
        />
      </div>
    </PageShell>
  );
}

export default SecurityDashboardPage;