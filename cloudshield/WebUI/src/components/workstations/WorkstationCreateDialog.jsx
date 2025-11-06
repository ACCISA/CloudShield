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
import { Box, Button } from '@mui/material';
import WorkstationDialog from './WorkstationDialog';
import StyledInput from './StyledInput';
import PlanSelector from './PlanSelector';
import UserAssignment from './UserAssignment';

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

  const actions = (
    <>
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
    </>
  );

  return (
    <WorkstationDialog
      open={open}
      onClose={onClose}
      title="New Workstation"
      breadcrumb={['Workstations', 'New Workstation']}
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
        showCurrent={false}
      />

      <UserAssignment
        users={users}
        onToggleUser={toggleUser}
        allUsers={allUsers}
        onAllUsersChange={setAllUsers}
        showAllUsersCheckbox={true}
      />
    </WorkstationDialog>
  );
}
