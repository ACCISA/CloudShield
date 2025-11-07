/**
 * UserAssignment.jsx
 *
 * Purpose:
 *   Reusable user assignment component for workstation dialogs.
 *
 * Props:
 *   - users: array of selected user names
 *   - onToggleUser: callback when a user is toggled
 *   - allUsers: boolean for "All users" checkbox
 *   - onAllUsersChange: callback when "All users" changes
 *   - showAllUsersCheckbox: whether to show the "All users" checkbox
 */
import React from 'react';
import { Box, Typography, Button, Checkbox, FormControlLabel } from '@mui/material';

const availableUsers = ['Michael Scott', 'Jim Halpert', 'Pam Beasly', 'Dwight Schrute'];

/**
 * User assignment component with toggle buttons.
 * @param {Object} props
 * @param {Array<string>} props.users - Selected user names
 * @param {Function} props.onToggleUser - Called when a user is toggled
 * @param {boolean} props.allUsers - Whether all users are selected
 * @param {Function} props.onAllUsersChange - Called when "All users" checkbox changes
 * @param {boolean} props.showAllUsersCheckbox - Show the "All users" checkbox
 * @returns {JSX.Element} User assignment section
 */
export default function UserAssignment({ 
  users, 
  onToggleUser, 
  allUsers = false, 
  onAllUsersChange, 
  showAllUsersCheckbox = true 
}) {
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography fontWeight={600}>Assign users</Typography>
        {showAllUsersCheckbox && (
          <FormControlLabel
            control={
              <Checkbox
                checked={allUsers}
                onChange={(e) => onAllUsersChange?.(e.target.checked)}
                sx={{ color: '#fff', '&.Mui-checked': { color: '#fff' } }}
              />
            }
            label="All users"
          />
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mt: 1 }}>
        {availableUsers.map((u) => (
          <Button
            key={u}
            onClick={() => onToggleUser(u)}
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
    </Box>
  );
}
