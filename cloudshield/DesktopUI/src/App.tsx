import { useEffect, useRef, useState } from "react";
import LoginPage from "./pages/Login/LoginPage";
import WorkstationsPage from "./pages/Workstations/WorkstationsPage";
import "./App.css";
import VPNService from "./services/VPNService";
import type { VPNState } from "./models/VPN";
import VPNLoadingScreen from "./pages/VPN/VPNLoadingScreen";

const DEFAULT_VPN_STATE: VPNState = { status: "disconnected" };

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
  const [vpnState, setVpnState] = useState<VPNState>(DEFAULT_VPN_STATE);
  const vpnConnectInFlight = useRef(false);

  useEffect(() => {
    const tryConnectVPN = async () => {
      if (vpnConnectInFlight.current) return;
      vpnConnectInFlight.current = true;

      try {
        const status = await window.vpnAPI?.getState();
        if (status) {
          setVpnState(status);
          if (status.status === "connected" || status.status === "connecting") {
            return;
          }
        }

        const ovpn = await VPNService.getVPNConfig();
        if (!ovpn) {
          throw new Error("No VPN configuration available.");
        }

        await window.vpnAPI?.connect({ ovpnData: ovpn });
      } catch (error) {
        const message =
          "Failed to connect VPN: " +
          (error instanceof Error ? error.message : String(error));
        setVpnState({ status: "error", error: message });
        window.vpnAPI?.receiveError(message);
      } finally {
        vpnConnectInFlight.current = false;
      }
    };

    const disconnectVPN = async () => {
      try {
        await window.vpnAPI?.disconnect();
      } catch (error) {
        console.error("Failed to disconnect VPN:", error);
      }
    };

    const handleAuthChanged = async () => {
      const snapshot = window.authStore?.loadAuth();
      if (snapshot?.accessToken) {
        setIsAuthenticated(true);
        await tryConnectVPN();
        return;
      }
      const raw = localStorage.getItem("cloudshield.auth");
      if (!raw) {
        await disconnectVPN();
        setIsAuthenticated(false);
        setVpnState(DEFAULT_VPN_STATE);
        return;
      }
      try {
        const parsed = JSON.parse(raw) as { accessToken?: string };
        const isLoggedIn = Boolean(parsed.accessToken);
        if (!isLoggedIn) {
          await disconnectVPN();
          setVpnState(DEFAULT_VPN_STATE);
        } else {
          await tryConnectVPN();
        }
        setIsAuthenticated(isLoggedIn);
      } catch {
        await disconnectVPN();
        setIsAuthenticated(false);
        setVpnState(DEFAULT_VPN_STATE);
      }
    };

    const unsubscribeVPNState = window.vpnAPI?.onStateChanged((state) => {
      setVpnState(state);
    });

    void window.vpnAPI?.getState().then((state) => {
      if (state) setVpnState(state);
    });
    void handleAuthChanged();
    window.addEventListener("auth-changed", handleAuthChanged);
    return () => {
      window.removeEventListener("auth-changed", handleAuthChanged);
      unsubscribeVPNState?.();
    };
  }, []);

  const canAccessWorkstations = isAuthenticated && vpnState.status === "connected";

  return (
    <div className="desktop-app">
      {!isAuthenticated ? (
        <LoginPage />
      ) : canAccessWorkstations ? (
        <WorkstationsPage />
      ) : (
        <VPNLoadingScreen
          vpnState={vpnState}
          onRetry={async () => {
            const ev = new Event("auth-changed");
            window.dispatchEvent(ev);
          }}
        />
      )}
    </div>
  );
}

export default App;
