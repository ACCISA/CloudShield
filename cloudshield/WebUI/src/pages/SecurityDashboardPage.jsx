import React from "react";

import PageShell from "../components/layout/PageShell.jsx";
import SecurityChartsPanel from "../components/security/SecurityChartsPanel.jsx";
import SecurityAlertsPanel from "../components/security/SecurityAlertsPanel.jsx";
import { MOCK_SECURITY_ALERTS } from "../data/mockData.js";

const contentStyles = {
  display: "flex",
  flexDirection: "column",
  gap: 0,
  minWidth: 1150,
  width: "100%",
  minHeight: 0,
};

function SecurityDashboardPage() {
  return (
    <PageShell>
      <div
        data-testid="security-dashboard-content"
        style={contentStyles}
      >
        <SecurityChartsPanel alerts={MOCK_SECURITY_ALERTS} />
        <SecurityAlertsPanel />
      </div>
    </PageShell>
  );
}

export default SecurityDashboardPage;