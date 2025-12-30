/**
 * ProvisioningPage.jsx
 *
 * Calls your Flask API:
 *   POST  /task/provision           -> { job_id }  (HTTP 202)
 *   GET   /status/<job_id>          -> { ... }     (progress / message)
 *
 * Org ID is read primarily from localStorage (set after signup),
 * falling back to authenticated user context.
 * Provisioning auto-starts on page load.
 */

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Divider,
  TextField,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ProvisioningControls from "../components/provisioning/ProvisioningControls.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useAsyncTask } from "../hooks/useAsyncTask.js";

export default function ProvisioningPage({ onProvisioned }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { jobId, status, message, progress, result, executeTask, reset } =
    useAsyncTask();

  const [orgId, setOrgId] = useState(() => {
    try {
      const stored = localStorage.getItem("org_id");
      if (stored) return stored;
    } catch {
      // ignore
    }
    return currentUser?.org_id || "default-org";
  });

  // If currentUser changes or localStorage org_id changes while mounted,
  // make sure orgId stays in sync.
  useEffect(() => {
    try {
      const stored = localStorage.getItem("org_id");
      if (stored && stored !== orgId) {
        setOrgId(stored);
        return;
      }
    } catch {
      // ignore
    }

    if (!orgId && currentUser?.org_id) {
      setOrgId(currentUser.org_id);
    }
  }, [currentUser, orgId]);

  // When job succeeds, mark provisioned and go to dashboard
  useEffect(() => {
    if (status === "succeeded") {
      try {
        localStorage.setItem("isProvisioned", "true");
      } catch {}
      onProvisioned?.();
      navigate("/dashboard", { replace: true });
    }
  }, [status, onProvisioned, navigate]);

  async function apiStartProvision() {
    if (!orgId) {
      throw new Error("Missing organization ID for provisioning.");
    }

    const res = await fetch("http://172.18.0.3:5050/task/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: orgId }),
    });
    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to start provisioning (${res.status})`);
    }
    const json = await res.json().catch(() => ({}));
    if (!json?.job_id) throw new Error("Malformed response: missing job_id");
    return json.job_id;
  }

  const handleStart = () => executeTask(apiStartProvision);

  // Auto-start provisioning as soon as we land on this page
  useEffect(() => {
    if (!orgId) return;
    if (status === "idle") {
      handleStart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, status]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        maxWidth: 820,
        mx: "auto",
      }}
    >
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        Provisioning
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
        Org ID: <strong>{orgId || "Unknown"}</strong>
      </Typography>

      <TextField
        label="Organization ID"
        variant="outlined"
        size="small"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        sx={{ maxWidth: 300 }}
      />

      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

      <Typography
        variant="body2"
        sx={{ color: "rgba(255,255,255,0.7)", mb: 1 }}
      >
        We’re automatically provisioning your environment. This may take a few
        moments.
      </Typography>

      {/* No manual "Start" button; only a Reset for retries */}
      {status !== "idle" && (
        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button
            variant="outlined"
            onClick={reset}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.3)",
            }}
          >
            Reset
          </Button>

          {status === "failed" && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Chip label="Failed" color="error" size="small" />
              {message && (
                <Typography
                  variant="body2"
                  sx={{ color: "rgba(255,255,255,0.85)" }}
                >
                  {message}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      )}

      <ProvisioningControls
        status={status}
        jobId={jobId}
        message={message}
        progress={progress}
      />

      {(status === "running" || status === "starting") && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant={
              typeof progress === "number" ? "determinate" : "indeterminate"
            }
            value={typeof progress === "number" ? progress : undefined}
          />
          <Typography
            variant="caption"
            sx={{ display: "block", mt: 1, color: "rgba(255,255,255,0.65)" }}
          >
            {typeof progress === "number"
              ? `Provisioning… ${progress}%`
              : typeof progress === "string"
              ? progress
              : "Provisioning…"}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
