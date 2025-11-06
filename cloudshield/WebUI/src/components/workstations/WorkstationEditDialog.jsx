/**
 * WorkstationEditDialog.jsx
 *
 * Purpose:
 *   Modal dialog for editing an existing workstation's properties (name, users, plan, etc.).
 *
 * Props:
 *   - open: boolean controlling visibility
 *   - onClose: close handler
 *   - row: the workstation row being edited
 *   - onSave: save callback
 *   - onDelete: delete callback
 */
import React, { useState } from 'react';
import { Box, Typography, Button, Checkbox, FormControlLabel } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import WorkstationDialog from './WorkstationDialog';
import StyledInput from './StyledInput';
import PlanSelector from './PlanSelector';
import UserAssignment from './UserAssignment';

/**
 * Modal dialog for editing an existing workstation.
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {Object} props.row - Workstation data being edited
 * @param {Function} props.onSave - Called with updated workstation data
 * @param {Function} props.onDelete - Called to delete the workstation
 * @returns {JSX.Element} Edit workstation dialog
 */
export default function WorkstationEditDialog({ open, onClose, row, onSave, onDelete }) {
  const [name, setName] = useState(row?.name || '');
  const [group, setGroup] = useState('None');
  const [users, setUsers] = useState([row?.currentUser].filter(Boolean));
  const [allSoftware, setAllSoftware] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('BASIC');

  /**
   * Toggle a user in the selected users list.
   * @param {string} u - User name to toggle
   */
  const toggleUser = (u) =>
    setUsers((prev) => (prev.includes(u) ? prev.filter((x) => x !== u) : [...prev, u]));

  /**
   * Submit updated workstation data to parent.
   */
  const handleSave = () => {
    onSave?.({
      name,
      code: row.code,
      currentUser: users[0] || '—',
      usersCount: users.length,
      plan: selectedPlan,
    });
  };

  const actions = (
    <>
      <Button
        onClick={onDelete}
        startIcon={<DeleteOutlineIcon />}
        sx={{
          textTransform: 'none',
          color: '#fff',
          backgroundColor: '#7c1d1d',
          borderRadius: '12px',
          px: 2,
          '&:hover': { backgroundColor: '#8a2323' },
        }}
      >
        Delete
      </Button>

      <Box sx={{ display: 'flex', gap: 1.2, ml: 'auto' }}>
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
          onClick={handleSave}
          startIcon={<EditOutlinedIcon />}
          sx={{
            textTransform: 'none',
            color: '#000',
            backgroundColor: '#fff',
            borderRadius: '12px',
            px: 2.5,
            '&:hover': { backgroundColor: '#f2f2f2' },
          }}
        >
          Edit
        </Button>
      </Box>
    </>
  );

  return (
    <WorkstationDialog
      open={open}
      onClose={onClose}
      title="Edit Workstation"
      breadcrumb={['Workstations', 'Edit Workstation']}
      actions={actions}
    >
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        <StyledInput
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <StyledInput
          label="Group"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          placeholder="None"
        />
      </Box>

      <PlanSelector
        selectedPlan={selectedPlan}
        onPlanSelect={setSelectedPlan}
        showCurrent={true}
      />

      <UserAssignment
        users={users}
        onToggleUser={toggleUser}
        showAllUsersCheckbox={false}
      />

      {/* Software */}
      <Box sx={{ mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography fontWeight={600}>Pre-Installed software</Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={allSoftware}
                onChange={(e) => setAllSoftware(e.target.checked)}
                sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}
              />
            }
            label="All software"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {['Microsoft Word', 'Microsoft Excel', 'Slack', 'Microsoft Teams', 'Zoom'].map((s) => (
            <Button
              key={s}
              size="small"
              variant="outlined"
              sx={{
                textTransform: 'none',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.2)',
                borderRadius: '10px',
                '&:hover': { borderColor: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.08)' },
              }}
            >
              {s}
            </Button>
          ))}
        </Box>
      </Box>

      {/* Wallpaper picker placeholder */}
      <Box sx={{ mt: 2 }}>
        <Typography fontWeight={600}>Desktop wallpaper</Typography>
        <Box
          sx={{
            mt: 1,
            width: 120,
            height: 90,
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.6)',
            fontSize: '2rem',
          }}
        >
          +
        </Box>
      </Box>
    </WorkstationDialog>
  );
}
