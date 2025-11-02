import React from 'react';
import { Box, Typography } from '@mui/material';
import SmsOutlinedIcon from '@mui/icons-material/SmsOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined';

export default function TwoFactorOptionItem({
  type = 'sms',            // 'sms' | 'email'
  title,                   // e.g. "SMS"
  subtitle,                // e.g. "+1 (123) 456 7890"
  onClick,
}) {
  const IconLeft =
    type === 'sms' ? SmsOutlinedIcon : MailOutlineOutlinedIcon;

  return (
    <Box
      onClick={onClick}
      sx={{
        width: '100%',
        backgroundColor: '#161616',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.18)',
        paddingY: '14px',
        paddingX: '16px',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        cursor: 'pointer',
        mb: 2,
        '&:hover': {
          backgroundColor: '#1a1a1a',
        },
      }}
    >
      <Box sx={{ display: 'flex', gap: '12px' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            color: '#fff',
            lineHeight: 0,
            pt: '2px',
          }}
        >
          <IconLeft fontSize="small" />
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography
            sx={{
              color: '#fff',
              fontWeight: 500,
              fontSize: '1rem',
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              sx={{
                color: 'rgba(255,255,255,0.7)',
                fontSize: '0.9rem',
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 0,
        }}
      >
        <ChevronRightOutlinedIcon />
      </Box>
    </Box>
  );
}
