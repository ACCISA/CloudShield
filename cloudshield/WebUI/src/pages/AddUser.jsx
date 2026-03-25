/**
 * AddUserPage.jsx
 *
 * Calls your Flask API:
 *   POST  /task/dc/add_user         -> { job_id }  (HTTP 202)
 *   GET   /status/<job_id>          -> { ... }     (progress / message / result)
 */

import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Divider,
  TextField,
} from "@mui/material";

import ProvisioningControls from "../components/provisioning/ProvisioningControls.jsx";
import PageShell from "../components/layout/PageShell.jsx";
import { useThemeColors } from "../hooks/useThemeColors.js";
import { useAsyncTask } from "../hooks/useAsyncTask.js";
import { trackButton } from "../lib/analytics";
import { getUserErrorMessage } from "../lib/errors.js";

export default function AddUserPage() {
  const themeColors = useThemeColors();
  const [orgId, setOrgId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const { jobId, status, message, progress, result, executeTask, reset } =
    useAsyncTask();

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ||
    "http://localhost:5050";

  const isBusy = status === "starting" || status === "running";

  const isValid = useMemo(() => {
    // Minimal validation; add your own if needed
    return Boolean(orgId && username && password && email);
  }, [orgId, username, password, email]);

  async function apiStartAddUser() {
    let res;
    try {
      res = await fetch(`${apiBaseUrl}/task/dc/add_user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: orgId, username, password, email }),
      });
    } catch (err) {
      // Network error
      throw new Error(getUserErrorMessage(err));
    }

    // Flask endpoint returns 202 with JSON { job_id }
    if (!res.ok && res.status !== 202) {
      // Try to extract a meaningful error message
      const contentType = res.headers.get("content-type") || "";
      let details = "";
      try {
        if (contentType.includes("application/json")) {
          const data = await res.json();
          details = data?.message || data?.error || JSON.stringify(data);
        } else {
          details = await res.text();
        }
      } catch {
        // ignore parsing failure
      }
      const fallback = `Couldn’t start user creation (HTTP ${res.status}).`;
      throw new Error(details?.trim() ? details.trim() : fallback);
    }

    const json = await res.json().catch(() => ({}));
    if (!json?.job_id) {
      throw new Error("The server response was missing a job ID. Please try again.");
    }
    return json.job_id;
  }

  const handleStart = () => {
    trackButton("adduser/start", { page: "add_user" });
    executeTask(async () => {
      try {
        return await apiStartAddUser();
      } catch (err) {
        // Ensure user-friendly error surface
        throw new Error(getUserErrorMessage(err));
      }
    });
  };

  const handleReset = () => {
    trackButton("adduser/reset", { page: "add_user" });
    reset();
  };

  return (
    <PageShell
      title="Add User"
      subtitle="Provision a new user to an organization."
      actions={
        status !== "idle" ? (
          <Button
            variant="outlined"
            onClick={handleReset}
            sx={{
              textTransform: "none",
              borderRadius: "10px",
              color: "text.primary",
              borderColor: "var(--border)",
            }}
          >
            Reset
          </Button>
        ) : null
      }
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          maxWidth: 820,
          mx: "auto",
          height: "100%",
        }}
      >
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
          <TextField
            label="Organization ID"
            variant="outlined"
            size="small"
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            sx={{ width: 300 }}
            inputProps={{ className: "truncate" }}
            helperText="Required"
          />

          <TextField
            label="Username"
            variant="outlined"
            size="small"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            sx={{ width: 300 }}
            inputProps={{ className: "truncate" }}
            helperText="Required"
          />

          <TextField
            label="Email"
            variant="outlined"
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ width: 300 }}
            inputProps={{ className: "truncate" }}
            helperText="Required"
          />

          <TextField
            label="Password"
            type="password"
            variant="outlined"
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ width: 300 }}
            helperText="Required"
          />
        </Box>

        <Divider sx={{ borderColor: "var(--border)" }} />

        <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
          <Button
            variant="contained"
            onClick={handleStart}
            disabled={!isValid || isBusy}
            sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
          >
            {status === "starting" ? "Starting…" : isBusy ? "Working…" : "Add User"}
          </Button>

          {status !== "idle" && (
            <Chip
              size="small"
              label={
                status === "starting"
                  ? "Starting"
                  : status === "running"
                  ? "Running"
                  : status === "failed"
                  ? "Failed"
                  : status === "succeeded"
                  ? "Succeeded"
                  : status
              }
              color={
                status === "failed"
                  ? "error"
                  : status === "succeeded"
                  ? "success"
                  : "default"
              }
              sx={{ borderRadius: "10px" }}
            />
          )}
        </Box>

        {/* Existing control panel (keep it consistent platform-wide) */}
        <ProvisioningControls
          status={status}
          jobId={jobId}
          message={message}
          progress={progress}
        />

        {/* Progress */}
        {status === "running" && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress
              variant={typeof progress === "number" ? "determinate" : "indeterminate"}
              value={typeof progress === "number" ? progress : undefined}
            />
            <Typography
              variant="caption"
              sx={{ display: "block", mt: 1, color: themeColors.textSecondary }}
              className="truncate"
              title={
                typeof progress === "number"
                  ? `Adding user… ${progress}%`
                  : typeof progress === "string"
                  ? progress
                  : "Adding user…"
              }
            >
              {typeof progress === "number"
                ? `Adding user… ${progress}%`
                : typeof progress === "string"
                ? progress
                : "Adding user…"}
            </Typography>
          </Box>
        )}

        {/* Failure */}
        {status === "failed" && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 1 }}>
            <Chip label="Failed" color="error" size="small" />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="body2" sx={{ color: themeColors.text }}>
                We couldn't add the user.
              </Typography>
              {message && (
                <Typography
                  variant="body2"
                  sx={{ color: themeColors.textSecondary }}
                >
                  {message}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: themeColors.textTertiary }}>
                Try verifying the organization ID and email, then run the task again.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Success */}
        {status === "succeeded" && result && (
          <Box
            sx={{
              mt: 2,
              p: 2,
              border: "1px solid var(--border)",
              borderRadius: "10px",
              background: "var(--action-hover)",
            }}
          >
            <Typography variant="h6" sx={{ color: "#4caf50" }}>
              User added successfully
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: themeColors.text, mb: 1 }}
              className="clamp-2"
              title={result.message || "The user has been created successfully."}
            >
              {result.message || "The user has been created successfully."}
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gap: 0.5 }}>
              {result.org_id && (
                <Typography variant="body2" className="truncate" title={String(result.org_id)}>
                  Org ID: {result.org_id}
                </Typography>
              )}
              {result.username && (
                <Typography variant="body2" className="truncate" title={String(result.username)}>
                  Username: {result.username}
                </Typography>
              )}
              {result.role && (
                <Typography variant="body2" className="truncate" title={String(result.role)}>
                  Role: {result.role}
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Box>
    </PageShell>
  );
}