import React, { useState } from "react";
declare global {
  interface Window {
    electronAPI?: {
      runXfreerdp: (
        username: string,
        password: string,
        ip: string
      ) => Promise<{
        success: boolean;
        pid?: number;
        message: string;
      }>;
      runOpenVPN: () => Promise<{
        success: boolean;
        pid?: number;
        message: string;
      }>;
    };
  }
}

export default function RDPOpenVPNCard() {
  const [rdpStatus, setRdpStatus] = useState<string | null>(null);
  const [rdpUsername, setRdpUsername] = useState("");
  const [rdpPassword, setRdpPassword] = useState("");
  const [rdpIp, setRdpIp] = useState("");

  async function openvpn() {
    const result = await window.electronAPI?.runOpenVPN();
    console.log("OpenVPN launched:", result);
  }
  async function handleRdpConnect() {
    if (!window.electronAPI) {
      setRdpStatus("Error: Electron API not available");
      return;
    }

    if (!rdpUsername || !rdpPassword || !rdpIp) {
      setRdpStatus("Error: Please fill in username, password, and IP");
      return;
    }

    try {
      setRdpStatus("Launching xfreerdp3...");
      const result = await window.electronAPI.runXfreerdp(
        rdpUsername,
        rdpPassword,
        rdpIp
      );
      setRdpStatus(`Connected! (PID: ${result.pid})`);
      console.log("RDP launched:", result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      setRdpStatus(`Error: ${errorMessage}`);
      console.error("RDP error:", error);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start w-full px-4 mt-4 gap-3">
        <input
          type="text"
          placeholder="Username"
          value={rdpUsername}
          onChange={(e) => setRdpUsername(e.target.value)}
          className="p-2 w-full rounded border bg-card-background text-white placeholder:text-faint-grey border-faint-grey"
        />
        <input
          type="password"
          placeholder="Password"
          value={rdpPassword}
          onChange={(e) => setRdpPassword(e.target.value)}
          className="p-2 w-full rounded border bg-card-background text-white placeholder:text-faint-grey border-faint-grey"
        />
        <input
          type="text"
          placeholder="IP Address (e.g., 192.168.1.100)"
          value={rdpIp}
          onChange={(e) => setRdpIp(e.target.value)}
          className="p-2 w-full rounded border bg-card-background text-white placeholder:text-faint-grey border-faint-grey"
        />
      </div>
      <button
        onClick={handleRdpConnect}
        className="bg-blue-600 text-white py-2 mt-4 w-full px-4 rounded-2xl hover:bg-blue-700"
      >
        Connect RDP
      </button>
      <button
        onClick={openvpn}
        className="bg-blue-600 text-white py-2 mt-4 w-full px-4 rounded-2xl hover:bg-blue-700"
      >
        Connect OpenVPN
      </button>
      {rdpStatus && (
        <p
          className={`text-sm mt-2 ${
            rdpStatus.includes("Error") ? "text-red-500" : "text-green-500"
          }`}
        >
          {rdpStatus}
        </p>
      )}
    </>
  );
}
