import { useEffect, useState } from "react";
import LoginPage from "./pages/Login/LoginPage";
import WorkstationsPage from "./pages/Workstations/WorkstationsPage";
import "./App.css";
import VPNService from "./services/VPNService";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const snapshot = window.authStore?.loadAuth();
    if (snapshot?.accessToken) {
      return true;
    }
    const raw = localStorage.getItem("cloudshield.auth");
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw) as { accessToken?: string };
      return Boolean(parsed.accessToken);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleAuthChanged = async() => {
      const snapshot = window.authStore?.loadAuth();
      if (snapshot?.accessToken) {
        setIsAuthenticated(true);
        const status =await window.vpnAPI?.getState();
        if (status?.status !== "connected") {
          const ovpn =await VPNService.getVPNConfig();
          if (ovpn) {
            await window.vpnAPI?.connect({ ovpnData: ovpn });
          }
        }
        return;
      }
      const raw = localStorage.getItem("cloudshield.auth");
      if (!raw) {
        setIsAuthenticated(false);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as { accessToken?: string };
        setIsAuthenticated(Boolean(parsed.accessToken));
      } catch {
        setIsAuthenticated(false);
      }
    };

    window.addEventListener("auth-changed", handleAuthChanged);
    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
    };
  }, []);

  return (
    <>
      {isAuthenticated ? <WorkstationsPage /> : <LoginPage />}
    </>
  );
}

export default App;
