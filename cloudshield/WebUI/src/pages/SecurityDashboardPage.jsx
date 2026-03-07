import React from "react";

import SecurityChartsPanel from "../components/security/SecurityChartsPanel.jsx";
import SecurityAlertsPanel from "../components/security/SecurityAlertsPanel.jsx";
import { MOCK_SECURITY_ALERTS } from "../data/mockData.js";

function SecurityDashboardPage() {
  const styles = {
    container: {
      display: "flex",
      flexDirection: "column",
      gap: "0px",
      minWidth: "1150px",
      width: "100%",
    },
  };

  return (
    <div style={styles.container}>
      <SecurityChartsPanel alerts={MOCK_SECURITY_ALERTS} />
      <SecurityAlertsPanel />
    </div>
  );
}

export default SecurityDashboardPage;
