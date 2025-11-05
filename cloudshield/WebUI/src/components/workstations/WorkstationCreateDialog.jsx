/**
 * WorkstationCreateDialog.jsx
 *
 * Purpose:
 *   Modal dialog used to create a new workstation. Collects name, group, plan and assigned users.
 *
 * Props:
 *   - open: boolean to control dialog visibility
 *   - onClose: callback when dialog should close
 *   - onCreate: callback with created workstation payload
 */
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  OutlinedInput,
  Button,
  FormControlLabel,
  Checkbox,
  IconButton,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const darkDialogPaper = {
  sx: {
    backgroundColor: '#0F0F0F',
    color: '#fff',
    borderRadius: '18px',
    border: '1px solid rgba(255,255,255,0.16)',
    width: 520,
    maxWidth: '95vw',
  },
};

const plans = [
  { id: 'BASIC', title: 'BASIC', features: ['8 CPU cores', '12 GPU cores', '8 GB RAM', '200 GB SSD'] },
  { id: 'PRO', title: 'PRO', features: ['8 CPU cores', '12 GPU cores', '8 GB RAM', '200 GB SSD'] },
  { id: 'ULTIMATE', title: 'ULTIMATE', features: ['8 CPU cores', '12 GPU cores', '8 GB RAM', '200 GB SSD'] },
];

/**
 * Modal dialog for creating a new workstation.
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onCreate - Called with new workstation data on submit
 * @returns {JSX.Element} Create workstation dialog
 */
export default function WorkstationCreateDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState('WS-001');
  const [group, setGroup] = useState('None');
  const [users, setUsers] = useState([]);
  const [allUsers, setAllUsers] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('BASIC');

  /**
   * Toggle a user in the selected users list.
   * @param {string} u - User name to toggle
   */
  const toggleUser = (u) =>
    setUsers((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));

  /**
   * Submit the new workstation data to parent.
   */
  const handleSubmit = () => {
    onCreate?.({
      name,
      code: name || 'WS-NEW',
      group,
      users,
      allUsers,
      plan: selectedPlan,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={darkDialogPaper}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography sx={{ opacity: 0.8 }}>Workstations</Typography>
          <Typography>›</Typography>
          <Typography fontWeight={600}>New Workstation</Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        {/* Name + Group */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
          <Box>
            <Typography sx={{ mb: 0.5, fontWeight: 500 }}>Name</Typography>
            <OutlinedInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{
                width: '100%',
                backgroundColor: '#161616',
                borderRadius: '12px',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              }}
            />
          </Box>

          <Box>
            <Typography sx={{ mb: 0.5, fontWeight: 500 }}>Group</Typography>
            <OutlinedInput
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              sx={{
                width: '100%',
                backgroundColor: '#161616',
                borderRadius: '12px',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
              }}
              placeholder="None"
            />
          </Box>
        </Box>

        {/* CLICKABLE PLANS */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1.5, mt: 2 }}>
          {plans.map((p) => {
            const selected = selectedPlan === p.id;
            return (
              <Box
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
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
                  {p.id === 'BASIC' && selected && (
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

        {/* Assign users */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          <Typography fontWeight={600}>Assign users</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={allUsers}
                onChange={(e) => setAllUsers(e.target.checked)}
                sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}
              />
            }
            label="All users"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
          {['Michael Scott', 'Jim Halpert', 'Pam Beasly', 'Dwight Schrute'].map((u) => (
            <Button
              key={u}
              onClick={() => toggleUser(u)}
              variant={users.includes(u) ? 'contained' : 'outlined'}
              size="small"
              sx={{
                textTransform: 'none',
                borderRadius: '10px',
                color: '#fff',
                backgroundColor: users.includes(u) ? 'rgba(255,255,255,0.12)' : 'transparent',
                borderColor: 'rgba(255,255,255,0.2)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.35)',
                  backgroundColor: 'rgba(255,255,255,0.08)',
                },
              }}
            >
              {u}
            </Button>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1.5 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: 'none',
            color: '#fff',
            backgroundColor: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '12px',
            px: 2,
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.14)' },
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          sx={{
            textTransform: 'none',
            color: '#000',
            backgroundColor: '#fff',
            borderRadius: '12px',
            px: 2.5,
            '&:hover': { backgroundColor: '#f2f2f2' },
          }}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
