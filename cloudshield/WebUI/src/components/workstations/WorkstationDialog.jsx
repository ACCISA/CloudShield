/**
 * WorkstationDialog.jsx
 *
 * Purpose:
 *   Reusable dialog wrapper with consistent dark theme styling for workstation dialogs.
 *
 * Props:
 *   - open: boolean to control dialog visibility
 *   - onClose: callback when dialog should close
 *   - breadcrumb: breadcrumb path items
 *   - children: dialog content
 *   - actions: dialog action buttons
 */
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
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

/**
 * Reusable dialog wrapper for workstation operations.
 * @param {Object} props
 * @param {boolean} props.open - Controls dialog visibility
 * @param {Function} props.onClose - Close handler
 * @param {string} props.title - Dialog title (optional, will use breadcrumb if not provided)
 * @param {Array<string>} props.breadcrumb - Breadcrumb navigation items
 * @param {React.ReactNode} props.children - Dialog content
 * @param {React.ReactNode} props.actions - Dialog action buttons
 * @returns {JSX.Element} Styled dialog component
 */
export default function WorkstationDialog({ open, onClose, breadcrumb = ['Workstations'], children, actions }) {
  return (
    <Dialog open={open} onClose={onClose} PaperProps={darkDialogPaper}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pr: 1 }}>
        <Box display="flex" alignItems="center" gap={1}>
          {breadcrumb.map((item, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <Typography>›</Typography>}
              <Typography sx={idx === breadcrumb.length - 1 ? { fontWeight: 600 } : { opacity: 0.8 }}>
                {item}
              </Typography>
            </React.Fragment>
          ))}
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }} aria-label="close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.12)' }}>
        {children}
      </DialogContent>

      {actions && <DialogActions sx={{ p: 2, gap: 1.5 }}>{actions}</DialogActions>}
    </Dialog>
  );
}
