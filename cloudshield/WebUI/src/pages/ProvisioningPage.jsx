import React, { useEffect, useMemo, useRef, useState } from "react";
import cloudshieldLogo from "../assets/cloudshield_logo_white.png";
import ProvisioningProgressBar from "../components/provisioning/ProvisioningProgressBar.jsx";
import { useAppTheme } from "../context/ThemeContext.jsx";

import {apiGet, apiPost} from "../api/client"
// UI standardization
import PageShell from "../components/layout/PageShell.jsx";
import { Box, Button, Typography } from "@mui/material";
import { safeAsync } from "../lib/safeAsync.js";

// 1. Backend Poll (Checks for true success/failure) - Every 2 seconds
const POLL_INTERVAL_MS = 2000;

// 2. Visual Animation (The smooth 1% increment)
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

// Helper that gives fetch errors an axios-like shape so they work with getUserErrorMessage/safeAsync.
async function fetchJson(url, options) {
  const res = await fetch(url, options);

  // Some test mocks omit `status`; treat it as 200 for success paths.
  const status = typeof res?.status === "number" ? res.status : 200;

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${status})`;
    const err = new Error(msg);
    // axios-like shape for errors.js
    err.response = { status, data };
    throw err;
  }

  return data;
}

// --- Main Page Component ---
export default function ProvisioningPage() {
  const { effectiveTheme } = useAppTheme();
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
        const json = await apiPost(`/task/provision`, {
        org_id: orgId }).json();


        if (mounted && json?.job_id) {
          localStorage.setItem("provision_job_id", json.job_id);
          setJobId(json.job_id);
        }
      } catch (err) {
        if (mounted) {
          setStatus("failed");
          setProgressText(err?.message || "Could not start provisioning.");
        }
      }
    };

    startJobIfNeeded();
    return () => {
      mounted = false;
    };
  }, [jobId, orgId]);

  // 2. Visual Animation Loop (The Mock)
  useEffect(() => {
    if (status !== "running") return;

    animationTimerRef.current = setInterval(() => {
      setPercent((prev) => {
        if (prev >= 95) return 95;
        const next = prev + 1;
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
        const res = await apiGet(`/status/${encodeURIComponent(jobId)}`);
        
        if (res.status === 404 || res.status >= 500) return;

        const data = await res.json();
        if (successHandled.current) return;

        const nextStatus = normalizeJobStatus(data.status);
        const rawMsg = data.progress || data.message || data.error || "";

        if (nextStatus === "failed") {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          if (animationTimerRef.current) clearInterval(animationTimerRef.current);

          setStatus("failed");
          setProgressText(rawMsg || "Provisioning failed.");
        } else if (nextStatus === "succeeded") {
          successHandled.current = true;

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
        // Keep behavior: do not fail UI for transient polling issues
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
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "background.default",
        color: "text.primary",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        fontFamily: "'lfit', sans-serif",
        p: 2,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 24,
          left: 24,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {cloudshieldLogo ? (
          <img src={cloudshieldLogo} alt="Logo" style={{ height: "40px" }} />
        ) : (
          <Typography variant="h6" sx={{ m: 0 }}>
            CloudShield
          </Typography>
        )}
      </Box>

      <Box sx={{ width: "100%", maxWidth: 700 }}>
        <PageShell
          headerCentered
          title={
            <Box sx={{ width: "100%" }}>
              Hang tight, we’re setting
              <br />
              everything up for you
            </Box>
          }
        >
          <Box sx={{ width: "100%", textAlign: "center" }}>
            <ProvisioningProgressBar percent={percent} />

            <Typography
              component="p"
              sx={{
                mt: 3,
                color: status === "failed" ? "#ef4444" : "text.secondary",
                fontSize: "1rem",
                fontFamily: "monospace",
                minHeight: "1.5em",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
            >
              {status === "failed" ? `Provisioning failed: ${progressText}` : progressText}
            </Typography>

            {status === "failed" && (
              <Box sx={{ mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={() => window.location.reload()}
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderColor: "divider",
                    color: "text.primary",
                    fontWeight: 600,
                    textTransform: "none",
                    "&:hover": {
                      borderColor: "text.primary",
                      backgroundColor: "text.primary",
                      color: "background.default",
                    },
                  }}
                >
                  Retry Provisioning
                </Button>
              </Box>
            )}
          </Box>
        </PageShell>
      </Box>
    </Box>
  );
}
