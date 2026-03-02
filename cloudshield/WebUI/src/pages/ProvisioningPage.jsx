import React, { useEffect, useMemo, useRef, useState } from "react";
import cloudshieldLogo from "../assets/cloudshield_logo_white.png"; 
import ProvisioningProgressBar from "../components/provisioning/ProvisioningProgressBar.jsx";

// 1. Backend Poll (Checks for true success/failure) - Every 2 seconds
const POLL_INTERVAL_MS = 2000;

// 2. Visual Animation (The smooth 1% increment)
// 1300ms = 1.3 seconds per 1%. 
// Reaching 95% will take roughly 125 seconds (approx 2 mins).
const ANIMATION_INTERVAL_MS = 1300; 

const API_BASE = "/api"; 

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

/**
 * MOCK TEXT LOGIC: 
 * Returns the professional text string based purely on the current percentage.
 */
function getMockText(percent) {
  if (percent < 20) return "Initializing user environment...";
  if (percent < 40) return "Generating secure credentials...";
  if (percent < 60) return "Provisioning workstation infrastructure...";
  if (percent < 80) return "Configuring groups and permissions...";
  if (percent < 95) return "Finalizing network & file systems...";
  return "Finishing up...";
}

// --- Main Page Component ---

export default function ProvisioningPage() {
  const pollTimerRef = useRef(null);
  const animationTimerRef = useRef(null);
  const successHandled = useRef(false);

  const [jobId, setJobId] = useState(() => {
    return localStorage.getItem("provision_job_id") || readLocalUser()?.job_id || null;
  });

  const orgId = useMemo(() => {
    return localStorage.getItem("org_id") || readLocalUser()?.org_id || null;
  }, []);

  const [status, setStatus] = useState("running");
  const [progressText, setProgressText] = useState("Initializing user environment...");
  const [percent, setPercent] = useState(0);

  // --- Button Style Handlers ---
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
        const res = await fetch(`${API_BASE}/task/provision`, {
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

  // 2. Visual Animation Loop (The Mock)
  useEffect(() => {
    if (status !== "running") return;

    animationTimerRef.current = setInterval(() => {
      setPercent((prev) => {
        // Stop automatically at 95% so we don't show 100% prematurely
        if (prev >= 95) return 95;
        
        // Increment by exactly 1% per tick
        const next = prev + 1;
        
        // Update text based on our new mock position
        setProgressText(getMockText(next));
        
        return next;
      });
    }, ANIMATION_INTERVAL_MS);

    return () => {
      if (animationTimerRef.current) clearInterval(animationTimerRef.current);
    };
  }, [status]);

  // 3. Backend Polling Loop (The Truth)
  useEffect(() => {
    if (successHandled.current) return;
    if (!jobId || status === "failed") return;

    const fetchStatus = async () => {
      if (successHandled.current) return;

      try {
        const res = await fetch(`${API_BASE}/status/${encodeURIComponent(jobId)}`);
        
        if (res.status === 404 || res.status >= 500) return;

        const data = await res.json();
        if (successHandled.current) return;

        const nextStatus = normalizeJobStatus(data.status);
        const rawMsg = data.progress || data.message || data.error || "";

        // --- FAILURE ---
        if (nextStatus === "failed") {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (animationTimerRef.current) clearInterval(animationTimerRef.current);
          
          setStatus("failed");
          setProgressText(rawMsg || "Provisioning failed.");
        } 
        // --- SUCCESS ---
        else if (nextStatus === "succeeded") {
          successHandled.current = true; 
          
          // Stop all loops immediately
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (animationTimerRef.current) clearInterval(animationTimerRef.current);

          setStatus("succeeded");
          setPercent(100); 
          setProgressText("All good! Redirecting...");

          localStorage.setItem("isProvisioned", "true");
          localStorage.removeItem("provision_job_id");

          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 1500);
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
        fontFamily: "'lfit', sans-serif",
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