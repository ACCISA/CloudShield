/**
 * AddUserPage.jsx
 *
 * Calls your Flask API:
 *   POST  /task/dc/add_user         -> { job_id }  (HTTP 202)
 *   GET   /status/<job_id>          -> { ... }     (progress / message / result)
 */

import React, { useState } from "react";
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
import { useAsyncTask } from "../hooks/useAsyncTask.js";

export default function AddUserPage() {
  const [orgId, setOrgId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const { jobId, status, message, progress, result, executeTask, reset } =
    useAsyncTask();

  async function apiStartAddUser() {
    const res = await fetch("http://localhost:5050/task/dc/add_user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ org_id: orgId, username, password, email }),
    });
    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to start add_user (${res.status})`);
    }
    const json = await res.json().catch(() => ({}));
    if (!json?.job_id) throw new Error("Malformed response: missing job_id");
    return json.job_id;
  }

  const handleStart = () => executeTask(apiStartAddUser);

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
        Add User
      </Typography>
      <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.75)" }}>
        Enter organization details below to add a user.
      </Typography>

      <TextField
        label="Organization ID"
        variant="outlined"
        size="small"
        value={orgId}
        onChange={(e) => setOrgId(e.target.value)}
        sx={{ maxWidth: 300 }}
      />

      <TextField
        label="Username"
        variant="outlined"
        size="small"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        sx={{ maxWidth: 300 }}
      />

      <TextField
        label="Email"
        variant="outlined"
        size="small"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ maxWidth: 300 }}
      />

      <TextField
        label="Password"
        type="password"
        variant="outlined"
        size="small"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        sx={{ maxWidth: 300 }}
      />

      <Divider sx={{ borderColor: "rgba(255,255,255,0.12)" }} />

      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <Button
          variant="contained"
          onClick={handleStart}
          disabled={
            !orgId ||
            !username ||
            !password ||
            status === "starting" ||
            status === "running"
          }
          sx={{ textTransform: "none", fontWeight: 600, borderRadius: "10px" }}
        >
          {status === "starting" ? "Starting…" : "Add User"}
        </Button>

        {status !== "idle" && (
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
        )}
      </Box>

      <ProvisioningControls
        status={status}
        jobId={jobId}
        message={message}
        progress={progress}
      />

      {status === "running" && (
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
              ? `Adding user… ${progress}%`
              : typeof progress === "string"
                ? progress
                : "Adding user…"}
          </Typography>
        </Box>
      )}

      {status === "failed" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
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

      {status === "succeeded" && result && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: "1px solid rgba(255,255,255,0.2)",
            borderRadius: "10px",
          }}
        >
          <Typography variant="h6" sx={{ color: "#4caf50" }}>
            User Added Successfully
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "rgba(255,255,255,0.85)", mb: 1 }}
          >
            {result.message || "The user has been created successfully."}
          </Typography>

          {result.org_id && (
            <Typography variant="body2">Org ID: {result.org_id}</Typography>
          )}
          {result.username && (
            <Typography variant="body2">Username: {result.username}</Typography>
          )}
          {result.role && (
            <Typography variant="body2">Role: {result.role}</Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
