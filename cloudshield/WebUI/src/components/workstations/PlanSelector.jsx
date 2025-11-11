/**
 * PlanSelector.jsx
 *
 * Purpose:
 *   Reusable plan selection component for workstation dialogs.
 *
 * Props:
 *   - selectedPlan: currently selected plan ID
 *   - onPlanSelect: callback when a plan is selected
 *   - showCurrent: boolean to show "CURRENT" badge on BASIC plan when selected
 */
import React from 'react';
import { Box, Typography } from '@mui/material';

const plans = [
  { id: 'BASIC', title: 'BASIC', features: ['8 CPU cores', '12 GPU cores', '8 GB RAM', '200 GB SSD'] },
  { id: 'PRO', title: 'PRO', features: ['8 CPU cores', '12 GPU cores', '8 GB RAM', '200 GB SSD'] },
  { id: 'ULTIMATE', title: 'ULTIMATE', features: ['8 CPU cores', '12 GPU cores', '8 GB RAM', '200 GB SSD'] },
];

/**
 * Plan selection component with visual cards.
 * @param {Object} props
 * @param {string} props.selectedPlan - Currently selected plan ID
 * @param {Function} props.onPlanSelect - Called when a plan is selected
 * @param {boolean} props.showCurrent - Show "CURRENT" badge on selected plan
 * @returns {JSX.Element} Plan selection grid
 */
export default function PlanSelector({ selectedPlan, onPlanSelect, showCurrent = false }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mt: 2 }}>
      {plans.map((p) => {
        const selected = selectedPlan === p.id;
        return (
          <Box
            key={p.id}
            onClick={() => onPlanSelect(p.id)}
            sx={{
              p: 2,
              borderRadius: '12px',
              border: selected ? '2px solid #2de36b' : '1px solid rgba(255,255,255,0.18)',
              backgroundColor: '#121212',
              cursor: 'pointer',
              '&:hover': { borderColor: selected ? '#2de36b' : 'rgba(255,255,255,0.35)' },
            }}
          >
            <Typography fontWeight={700} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
              {p.title}
              {showCurrent && p.id === 'BASIC' && selected && (
                <Box
                  component="span"
                  sx={{
                    fontSize: '0.7rem',
                    opacity: 0.7,
                    border: '1px solid rgba(255,255,255,0.25)',
                    px: 0.8,
                    py: 0.2,
                    borderRadius: '999px',
                  }}
                >
                  CURRENT
                </Box>
              )}
            </Typography>
            {p.features.map((f) => (
              <Typography key={f} sx={{ fontSize: '0.9rem', opacity: 0.9 }}>
                ✓ {f}
              </Typography>
            ))}
          </Box>
        );
      })}
    </Box>
  );
}
