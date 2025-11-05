/**
 * ProvisioningControls.jsx
 *
 * Purpose:
 *   Lightweight status/info header for the provisioning job.
 *   Shows jobId, status badge, and message snapshot.
 */

import React from 'react';
import { Box, Chip, Typography } from '@mui/material';

export default function ProvisioningControls({ status, jobId, message, progress }) {
  const color =
    status === 'succeeded' ? 'success' :
    status === 'failed' ? 'error' :
    status === 'running' || status === 'starting' ? 'info' : 'default';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        p: 2,
        maxWidth: 640,
        background: 'rgba(255,255,255,0.03)',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip size="small" label={`Status: ${status}`} color={color} />
        {typeof progress === 'number' && (
          <Chip size="small" label={`Progress: ${progress}%`} />
        )}
      </Box>

      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
        {jobId ? `Job ID: ${jobId}` : 'No job started yet.'}
      </Typography>

      {message && (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
          {message}
        </Typography>
      )}
    </Box>
  );
}
