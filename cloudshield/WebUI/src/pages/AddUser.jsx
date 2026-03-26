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
import { buildApiUrl } from "../lib/apiBase.js";
import { getUserErrorMessage } from "../lib/errors.js";

const TASK_STATUS_LABELS = {
  starting: "Starting",
  running: "Running",
  failed: "Failed",
  succeeded: "Succeeded",
};

async function extractAddUserError(response) {
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const data = await response.json();
      return data?.message || data?.error || JSON.stringify(data);
    }

    return await response.text();
  } catch {
    return "";
  }
}

async function startAddUserRequest(payload) {
  let response;

  try {
    response = await fetch(buildApiUrl("/task/dc/add_user"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(getUserErrorMessage(err));
  }

  if (!response.ok && response.status !== 202) {
    const details = await extractAddUserError(response);
    const fallback = `Couldn’t start user creation (HTTP ${response.status}).`;
    throw new Error(details?.trim() ? details.trim() : fallback);
  }

  const json = await response.json().catch(() => ({}));
  if (!json?.job_id) {
    throw new Error("The server response was missing a job ID. Please try again.");
  }

  return json.job_id;
}

function getStartButtonLabel(status, isBusy) {
  if (status === "starting") {
    return "Starting…";
  }

  if (isBusy) {
    return "Working…";
  }

  return "Add User";
}

function getStatusChipProps(status) {
  let color = "default";

  if (status === "failed") {
    color = "error";
  } else if (status === "succeeded") {
    color = "success";
  }

  return {
    label: TASK_STATUS_LABELS[status] || status,
    color,
  };
}

function getProgressMessage(progress) {
  if (typeof progress === "number") {
    return `Adding user… ${progress}%`;
  }

  if (typeof progress === "string") {
    return progress;
  }

  return "Adding user…";
}

function renderPageActions(status, handleReset) {
  if (status === "idle") {
    return null;
  }

  return (
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
  );
}

function renderStatusChip(status) {
  if (status === "idle") {
    return null;
  }

  const { label, color } = getStatusChipProps(status);

  return <Chip size="small" label={label} color={color} sx={{ borderRadius: "10px" }} />;
}

function renderProgress(status, progress, themeColors) {
  if (status !== "running") {
    return null;
  }

  const progressMessage = getProgressMessage(progress);
  const isDeterminate = typeof progress === "number";

  return (
    <Box sx={{ mt: 1 }}>
      <LinearProgress
        variant={isDeterminate ? "determinate" : "indeterminate"}
        value={isDeterminate ? progress : undefined}
      />
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1, color: themeColors.textSecondary }}
        className="truncate"
        title={progressMessage}
      >
        {progressMessage}
      </Typography>
    </Box>
  );
}

function renderFailure(status, message, themeColors) {
  if (status !== "failed") {
    return null;
  }

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mt: 1 }}>
      <Chip label="Failed" color="error" size="small" />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        <Typography variant="body2" sx={{ color: themeColors.text }}>
          We couldn't add the user.
        </Typography>
        {message && (
          <Typography variant="body2" sx={{ color: themeColors.textSecondary }}>
            {message}
          </Typography>
        )}
        <Typography variant="caption" sx={{ color: themeColors.textTertiary }}>
          Try verifying the organization ID and email, then run the task again.
        </Typography>
      </Box>
    </Box>
  );
}

function renderSuccess(status, result, themeColors) {
  if (status !== "succeeded" || !result) {
    return null;
  }

  return (
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
  );
}

export default function AddUserPage() {
  const themeColors = useThemeColors();
  const [orgId, setOrgId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");

  const { jobId, status, message, progress, result, executeTask, reset } =
    useAsyncTask();

  const isBusy = status === "starting" || status === "running";

  const isValid = useMemo(() => {
    // Minimal validation; add your own if needed
    return Boolean(orgId && username && password && email);
  }, [orgId, username, password, email]);

  async function apiStartAddUser() {
    return startAddUserRequest({
      org_id: orgId,
      username,
      password,
      email,
    });
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
      actions={renderPageActions(status, handleReset)}
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
            {getStartButtonLabel(status, isBusy)}
          </Button>

          {renderStatusChip(status)}
        </Box>

        {/* Existing control panel (keep it consistent platform-wide) */}
        <ProvisioningControls
          status={status}
          jobId={jobId}
          message={message}
          progress={progress}
        />

        {/* Progress */}
        {renderProgress(status, progress, themeColors)}

        {/* Failure */}
        {renderFailure(status, message, themeColors)}

        {/* Success */}
        {renderSuccess(status, result, themeColors)}
      </Box>
    </PageShell>
  );
}
