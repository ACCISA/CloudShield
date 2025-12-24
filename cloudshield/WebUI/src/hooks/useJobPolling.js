import { useCallback, useEffect, useRef, useState } from "react";

// Shared polling hook for background jobs that expose start/status endpoints.
export function useJobPolling({ pollInterval = 5000 } = {}) {
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const [jobId, setJobId] = useState(null);
  const pollTimerRef = useRef(null);

  const clearTimer = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const startPolling = useCallback(
    (jid, statusFn) => {
      clearTimer();
      pollTimerRef.current = setInterval(async () => {
        try {
          const next = await statusFn(jid);

          if (typeof next?.progress === "number" || typeof next?.progress === "string") {
            setProgress(next.progress);
          }

          if (next?.message) {
            setMessage(next.message);
          }

          if (next?.result) {
            setResult(next.result);
          }

          if (next?.status === "succeeded" || next?.status === "failed") {
            setStatus(next.status);
            clearTimer();
          } else {
            setStatus("running");
          }
        } catch (err) {
          setMessage(err?.message || "Polling error…");
        }
      }, pollInterval);
    },
    [clearTimer, pollInterval]
  );

  const start = useCallback(
    async ({ startFn, statusFn }) => {
      try {
        setStatus("starting");
        setMessage("");
        setProgress(null);
        setResult(null);
        setJobId(null);

        const jid = await startFn();
        setJobId(jid);
        setStatus("running");
        startPolling(jid, statusFn);
      } catch (err) {
        setStatus("failed");
        setMessage(err?.message || "Failed to start job.");
      }
    },
    [startPolling]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setMessage("");
    setProgress(null);
    setResult(null);
    setJobId(null);
    clearTimer();
  }, [clearTimer]);

  return {
    status,
    message,
    progress,
    result,
    jobId,
    start,
    reset,
  };
}
