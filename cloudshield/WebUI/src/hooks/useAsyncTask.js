/**
 * useAsyncTask Hook
 *
 * Shared hook for managing async task execution with job polling.
 * Used by AddUser and Provisioning pages to eliminate code duplication.
 */

import { useState, useEffect, useRef } from "react";

/**
 * Custom hook for handling async tasks with job polling
 * @param {Object} options - Configuration options
 * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
 * @returns {Object} Task state and control methods
 */
export function useAsyncTask({ pollInterval = 5000 } = {}) {
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const pollTimerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  /**
   * Fetch job status from API
   * @param {string} jid - Job ID to poll
   * @returns {Promise<Object>} Status object
   */
  async function apiGetStatus(jid) {
    const res = await fetch(`/api/status/${encodeURIComponent(jid)}`);
    if (!res.ok) {
      // For 404, return a queued status (job may not be in Redis yet)
      if (res.status === 404) {
        return { status: "running", message: "Setting up task…", progress: "queued" };
      }
      const text = await res.text().catch(() => "");
      throw new Error(text || `Failed to fetch status (${res.status})`);
    }
    const json = await res.json().catch(() => ({}));

    let inferredStatus = json.status;
    if (inferredStatus === "finished") inferredStatus = "succeeded";
    if (["started", "queued", "deferred"].includes(inferredStatus))
      inferredStatus = "running";

    let inferredMessage = json.message;
    let inferredProgress = json.progress;

    const progressText = (
      typeof inferredProgress === "string"
        ? inferredProgress
        : typeof json?.progress === "string"
        ? json.progress
        : ""
    ).toLowerCase();

    if (!inferredStatus) {
      if (progressText.startsWith("failed")) inferredStatus = "failed";
      else if (progressText.includes("completed")) inferredStatus = "succeeded";
      else inferredStatus = "running";
    }

    if (!inferredMessage && typeof inferredProgress === "string") {
      inferredMessage = inferredProgress;
    }

    return {
      status: inferredStatus,
      message: inferredMessage,
      progress: inferredProgress,
      result: json.result,
    };
  }

  /**
   * Start polling for job status
   * @param {string} jid - Job ID to poll
   */
  const startPolling = (jid) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    // Immediate first poll for faster feedback
    const doPoll = async () => {
      try {
        const s = await apiGetStatus(jid);
        if (typeof s.progress === "number" || typeof s.progress === "string")
          setProgress(s.progress);
        if (s.message) setMessage(s.message);
        if (s.result) setResult(s.result);

        if (s.status === "succeeded" || s.status === "failed") {
          setStatus(s.status);
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          return true; // Stop polling
        } else {
          setStatus("running");
          return false; // Continue polling
        }
      } catch (err) {
        setMessage(err?.message || "Polling error…");
        return false; // Continue polling despite error
      }
    };

    // Start polling immediately, then at intervals
    doPoll().then((shouldStop) => {
      if (!shouldStop) {
        pollTimerRef.current = setInterval(async () => {
          const stop = await doPoll();
          if (stop && pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }, pollInterval);
      }
    });
  };

  /**
   * Execute an async task
   * @param {Function} taskFn - Async function that returns a job_id
   */
  const executeTask = async (taskFn) => {
    try {
      setStatus("starting");
      setMessage("");
      setProgress(null);
      setJobId(null);
      setResult(null);

      const jid = await taskFn();
      setJobId(jid);
      setStatus("running");
      startPolling(jid);
    } catch (e) {
      setStatus("failed");
      setMessage(e?.message || "Failed to start task.");
    }
  };

  /**
   * Reset all state to initial values
   */
  const reset = () => {
    setStatus("idle");
    setMessage("");
    setProgress(null);
    setJobId(null);
    setResult(null);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  return {
    jobId,
    status,
    message,
    progress,
    result,
    executeTask,
    reset,
  };
}
