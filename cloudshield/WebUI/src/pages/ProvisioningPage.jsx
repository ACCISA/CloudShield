import React, { useEffect, useMemo, useRef, useState } from "react";
// No useNavigate needed for the hard refresh approach
// import { useNavigate } from "react-router-dom"; 
import cloudshieldLogo from "../assets/cloudshield_logo_white.png"; 
import ProvisioningProgressBar from "../components/provisioning/ProvisioningProgressBar.jsx";

const POLL_INTERVAL_MS = 2000;
const API_BASE = "http://localhost:5050"; 

// --- Helpers ---

function readLocalUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeJobStatus(apiStatus) {
  if (!apiStatus) return "running";
  const s = apiStatus.toLowerCase();
  if (s === "finished" || s === "succeeded") return "succeeded";
  if (s === "failed" || s === "error") return "failed";
  return "running";
}

function inferProgress({ status, progressText, currentPercent }) {
  const text = (progressText || "").toLowerCase();
  let newPercent = currentPercent || 5;
  let displayMessage = progressText || "Initializing...";

  if (status === "failed") {
    return { percent: currentPercent || 0, message: displayMessage };
  }
  if (status === "succeeded") {
    return { percent: 100, message: "All good! Redirecting..." };
  }

  // Specific keyword-based inference - check more specific patterns first
  if (text.includes("generating ssh keys")) {
    newPercent = 20;
    displayMessage = "Generating SSH keys...";
  }
  else if (text.includes("ssh key generation complete")) {
    newPercent = 30;
    displayMessage = "SSH keys ready...";
  }
  else if (text.includes("docker provisioning") || text.includes("terraform")) {
    newPercent = 40;
    displayMessage = "Provisioning workstation infrastructure...";
  }
  else if (text.includes("samba-test") || text.includes("domain")) {
    newPercent = 60;
    displayMessage = "Configuring groups and permissions...";
  }
  else if (text.includes("openvpn") || text.includes("network")) {
    newPercent = 75;
    displayMessage = "Finalizing network & file systems...";
  }
  else if (text.includes("finalizing") || text.includes("cleanup")) {
    newPercent = 90;
    displayMessage = "Almost there...";
  }
  else if (text.includes("enqueued") || text.includes("started")) {
    newPercent = 10;
    displayMessage = "Starting provisioning...";
  }
  else {
    // If no keyword matches, keep previous message but creep bar forward
    newPercent = Math.min(95, (currentPercent || 5) + 0.5);
    
    // Heuristic: If we are just waiting, cycle messages based on % range
    if (newPercent > 15 && newPercent < 40) displayMessage = "Initializing user...";
    else if (newPercent >= 40 && newPercent < 60) displayMessage = "Preparing workstation...";
    else if (newPercent >= 60 && newPercent < 80) displayMessage = "Setting up groups...";
    else if (newPercent >= 80) displayMessage = "Configuring files...";
  }

  return { percent: newPercent, message: displayMessage };
}

// --- Main Page Component ---

export default function ProvisioningPage() {
  const pollTimerRef = useRef(null);
  const successHandled = useRef(false);

  const [jobId, setJobId] = useState(() => {
    return localStorage.getItem("provision_job_id") || readLocalUser()?.job_id || null;
  });

  const orgId = useMemo(() => {
    return localStorage.getItem("org_id") || readLocalUser()?.org_id || null;
  }, []);

  const [status, setStatus] = useState("running");
  const [progressText, setProgressText] = useState("Initializing...");
  const [percent, setPercent] = useState(5);

  // --- Button Style Handlers (Accessibility Fix) ---
  const handleHighlight = (e) => {
    e.currentTarget.style.backgroundColor = "#fff";
    e.currentTarget.style.color = "#0A0A0A";
    e.currentTarget.style.borderColor = "#fff";
  };

  const handleReset = (e) => {
    e.currentTarget.style.backgroundColor = "transparent";
    e.currentTarget.style.color = "#fff";
    e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
  };

  // 1. Start Job
  useEffect(() => {
    let mounted = true;

    const startJobIfNeeded = async () => {
      if (jobId) return; 
      if (!orgId) {
        setStatus("failed");
        setProgressText("Error: Organization ID missing. Please log in again.");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/task/provision`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ org_id: orgId }),
        });

        if (!res.ok) throw new Error("Failed to start provisioning task.");

        const json = await res.json();
        if (mounted && json.job_id) {
          localStorage.setItem("provision_job_id", json.job_id);
          setJobId(json.job_id);
        }
      } catch (err) {
        if (mounted) {
          setStatus("failed");
          setProgressText(err.message || "Could not start provisioning.");
        }
      }
    };

    startJobIfNeeded();
    return () => { mounted = false; };
  }, [jobId, orgId]);

  // 2. Poll Status
  useEffect(() => {
    if (successHandled.current) return;
    if (!jobId || status === "failed") return;

    const fetchStatus = async () => {
      if (successHandled.current) return;

      try {
        const res = await fetch(`${API_BASE}/api/status/${encodeURIComponent(jobId)}`);
        
        if (res.status === 404 || res.status >= 500) return;

        const data = await res.json();
        
        if (successHandled.current) return;

        const nextStatus = normalizeJobStatus(data.status);
        const rawMsg = data.progress || data.message || data.error || "";

        if (nextStatus === "failed") {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus("failed");
          setProgressText(rawMsg || "Provisioning failed.");
        } 
        else if (nextStatus === "succeeded") {
          successHandled.current = true; 
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);

          setStatus("succeeded");
          setPercent(100);
          setProgressText("All good! Redirecting...");

          localStorage.setItem("isProvisioned", "true");
          localStorage.removeItem("provision_job_id");

          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        } 
        else {
          setStatus(nextStatus);
          const result = inferProgress({ 
            status: nextStatus, 
            progressText: rawMsg, 
            currentPercent: percent 
          });
          setPercent(result.percent);
          setProgressText(result.message);
        }

      } catch (err) {
        console.error("Polling network error:", err);
      }
    };

    fetchStatus();
    pollTimerRef.current = setInterval(fetchStatus, POLL_INTERVAL_MS);

    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [jobId, status, percent]);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0A0A0A", 
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: "sans-serif",
        padding: "20px",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {cloudshieldLogo ? (
          <img src={cloudshieldLogo} alt="Logo" style={{ height: "40px" }} />
        ) : (
          <h3 style={{ margin: 0 }}>CloudShield</h3>
        )}
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "700px", 
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontWeight: 500,
            marginBottom: "48px",
            fontSize: "2.5rem",
            lineHeight: 1.3,
            marginTop: 0,
          }}
        >
          Hang tight, we’re setting
          <br />
          everything up for you
        </h1>

        <div style={{ width: "100%" }}>
          <ProvisioningProgressBar percent={percent} />

          <p
            style={{
              marginTop: "24px",
              color: status === "failed" ? "#ef4444" : "rgba(255, 255, 255, 0.6)",
              fontSize: "1rem",
              fontFamily: "monospace",
              minHeight: "1.5em",
              whiteSpace: "pre-wrap",
              overflowWrap: "break-word",
              textAlign: "center"
            }}
          >
            {status === "failed" 
              ? `Provisioning failed: ${progressText}` 
              : progressText}
          </p>

          {status === "failed" && (
            <div style={{ marginTop: "32px" }}>
               <button 
                 onClick={() => window.location.reload()}
                 style={{
                   padding: "12px 24px",
                   backgroundColor: "transparent",
                   color: "#fff",
                   border: "2px solid rgba(255, 255, 255, 0.3)",
                   borderRadius: "6px",
                   cursor: "pointer",
                   fontWeight: "600",
                   fontSize: "14px",
                   transition: "all 0.2s ease"
                 }}
                 // FIX: Paired events for accessibility
                 onMouseOver={handleHighlight}
                 onFocus={handleHighlight}
                 onMouseOut={handleReset}
                 onBlur={handleReset}
               >
                 Retry Provisioning
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}