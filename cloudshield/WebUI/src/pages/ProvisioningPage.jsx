/**
 * ProvisioningPage.jsx
 *
 * Calls your Flask API:
 *   POST  /task/provision           -> { job_id }  (HTTP 202)
 *   GET   /status/<job_id>          -> { ... }     (progress / message)
 *
 * Org ID is hard-coded as TEST_Andrew.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Chip, LinearProgress, Divider } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import ProvisioningControls from '../components/provisioning/ProvisioningControls.jsx';

export default function ProvisioningPage({ onProvisioned }) {
  const [orgId] = useState('TEST_Andrew'); // Hard-coded org ID
  const [jobId, setJobId] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | starting | running | succeeded | failed
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(null);
  const pollTimerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (status === 'succeeded') {
      localStorage.setItem('isProvisioned', 'true');
      onProvisioned?.();
      navigate('/dashboard', { replace: true });
    }
  }, [status, onProvisioned, navigate]);

  async function apiStartProvision() {
    const res = await fetch('http://172.18.0.3:5050/task/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId }),
    });
    if (!res.ok && res.status !== 202) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Failed to start provisioning (${res.status})`);
    }
    const json = await res.json().catch(() => ({}));
    if (!json?.job_id) throw new Error('Malformed response: missing job_id');
    return json.job_id;
  }

  async function apiGetStatus(jid) {
    const res = await fetch(`/status/${encodeURIComponent(jid)}`);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || `Failed to fetch status (${res.status})`);
    }
    const json = await res.json().catch(() => ({}));

    let inferredStatus = json.status;
    let inferredMessage = json.message;
    let inferredProgress = json.progress;

    const progressText = (typeof inferredProgress === 'string'
      ? inferredProgress
      : typeof json?.progress === 'string'
      ? json.progress
      : '').toLowerCase();

    if (!inferredStatus) {
      if (progressText.startsWith('failed')) inferredStatus = 'failed';
      else if (progressText.includes('completed')) inferredStatus = 'succeeded';
      else inferredStatus = 'running';
    }

    if (!inferredMessage && typeof inferredProgress === 'string') {
      inferredMessage = inferredProgress;
    }

    return { status: inferredStatus, message: inferredMessage, progress: inferredProgress };
  }

  const handleStart = async () => {
    try {
      setStatus('starting');
      setMessage('');
      setProgress(null);
      setJobId(null);

      const jid = await apiStartProvision();
      setJobId(jid);
      setStatus('running');
      startPolling(jid);
    } catch (e) {
      setStatus('failed');
      setMessage(e?.message || 'Failed to start provisioning.');
    }
  };

  const startPolling = (jid) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    pollTimerRef.current = setInterval(async () => {
      try {
        const s = await apiGetStatus(jid);
        if (typeof s.progress === 'number' || typeof s.progress === 'string') setProgress(s.progress);
        if (s.message) setMessage(s.message);

        if (s.status === 'succeeded' || s.status === 'failed') {
          setStatus(s.status);
          clearInterval(pollTimerRef.current);
          pollTimerRef.current = null;
        } else {
          setStatus('running');
        }
      } catch (err) {
        setMessage(err?.message || 'Polling error…');
      }
    }, 2000);
  };

  const reset = () => {
    setStatus('idle');
    setMessage('');
    setProgress(null);
    setJobId(null);
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 820, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>Provisioning</Typography>
      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)' }}>
        Org ID: <strong>{orgId}</strong>
      </Typography>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          onClick={handleStart}
          disabled={status === 'starting' || status === 'running'}
          sx={{ textTransform: 'none', fontWeight: 600, borderRadius: '10px' }}
        >
          {status === 'starting' ? 'Starting…' : 'Start Provisioning'}
        </Button>

        {status !== 'idle' && (
          <Button
            variant="outlined"
            onClick={reset}
            sx={{ textTransform: 'none', borderRadius: '10px', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
          >
            Reset
          </Button>
        )}
      </Box>

      <ProvisioningControls status={status} jobId={jobId} message={message} progress={progress} />

      {status === 'running' && (
        <Box sx={{ mt: 1 }}>
          <LinearProgress
            variant={typeof progress === 'number' ? 'determinate' : 'indeterminate'}
            value={typeof progress === 'number' ? progress : undefined}
          />
          <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'rgba(255,255,255,0.65)' }}>
            {typeof progress === 'number'
              ? `Provisioning… ${progress}%`
              : typeof progress === 'string'
              ? progress
              : 'Provisioning…'}
          </Typography>
        </Box>
      )}

      {status === 'failed' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Chip label="Failed" color="error" size="small" />
          {message && (
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
              {message}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
