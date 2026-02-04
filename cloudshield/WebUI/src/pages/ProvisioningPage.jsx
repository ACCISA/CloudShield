import React, { useEffect, useMemo, useRef, useState } from "react";
// We don't even need useNavigate anymore for the success path
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

function inferPercent({ status, progressText, currentPercent }) {
  const text = (progressText || "").toLowerCase();

  if (status === "failed") return currentPercent || 0;
  if (status === "succeeded") return 100;

  if (text.includes("enqueued") || text.includes("started")) return 10;
  if (text.includes("generating ssh keys")) return 20;
  if (text.includes("ssh key generation complete")) return 30;
  if (text.includes("docker provisioning")) return 40;
  if (text.includes("samba-test container id")) return 60;
  if (text.includes("openvpn-test container id")) return 80;
  if (text.includes("finalizing") || text.includes("cleanup")) return 90;

  const next = (currentPercent || 5) + 0.5;
  return Math.min(95, next);
}

// --- Main Page Component ---

export default function ProvisioningPage() {
  // const navigate = useNavigate(); // Removed to prevent soft-nav loops
  const pollTimerRef = useRef(null);
  
  // CRITICAL FIX: This ref prevents the loop. Once true, we stop everything.
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

  // 1. Start Job (Fail-safe)
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

  // 2. Poll Status Loop
  useEffect(() => {
    // SECURITY CHECK: If we already finished, DO NOT RUN anything.
    if (successHandled.current) return;
    if (!jobId || status === "failed") return;

    const fetchStatus = async () => {
      // Double check inside the async function in case it changed while waiting
      if (successHandled.current) return;

      try {
        const res = await fetch(`${API_BASE}/api/status/${encodeURIComponent(jobId)}`);
        
        if (res.status === 404 || res.status >= 500) return;

        const data = await res.json();
        
        // Triple check before state updates
        if (successHandled.current) return;

        const nextStatus = normalizeJobStatus(data.status);
        const msg = data.progress || data.message || data.error || "";

        // --- FAILURE PATH ---
        if (nextStatus === "failed") {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setStatus("failed");
          setProgressText(msg || "Provisioning failed.");
        } 
        // --- SUCCESS PATH (THE FIX) ---
        else if (nextStatus === "succeeded") {
          // 1. LOCK THE LOGIC. This block can never run again.
          successHandled.current = true;
          
          // 2. Kill the poller immediately
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);

          // 3. Update UI one last time
          setStatus("succeeded");
          setPercent(100);
          setProgressText("Provisioning complete! Redirecting...");

          // 4. Update Storage
          localStorage.setItem("isProvisioned", "true");
          localStorage.removeItem("provision_job_id");

          // 5. FORCE HARD RELOAD after 1.5s
          // We use window.location.href instead of navigate() to force App.jsx to re-mount.
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
        } 
        // --- RUNNING PATH ---
        else {
          setStatus(nextStatus);
          if (msg) setProgressText(msg);
          setPercent((prev) => inferPercent({ 
            status: nextStatus, 
            progressText: msg, 
            currentPercent: prev 
          }));
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
  }, [jobId, status]);

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
                 onMouseOver={(e) => {
                   e.currentTarget.style.backgroundColor = "#fff";
                   e.currentTarget.style.color = "#0A0A0A";
                   e.currentTarget.style.borderColor = "#fff";
                 }}
                 onMouseOut={(e) => {
                   e.currentTarget.style.backgroundColor = "transparent";
                   e.currentTarget.style.color = "#fff";
                   e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
                 }}
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