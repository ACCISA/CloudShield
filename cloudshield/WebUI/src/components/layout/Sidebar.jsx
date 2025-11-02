import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Tooltip,
} from '@mui/material';

import DashboardIcon from '@mui/icons-material/Dashboard';
import ComputerIcon from '@mui/icons-material/Computer';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import Groups2Icon from '@mui/icons-material/Groups2';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import HelpOutlineOutlinedIcon from '@mui/icons-material/HelpOutlineOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import CloseFullscreenIcon from '@mui/icons-material/CloseFullscreen';     // collapse icon style
import OpenInFullIcon from '@mui/icons-material/OpenInFull';               // expand icon style

// small helper: render a nav row
function NavItem({
  collapsed,
  icon,
  label,
  active = false,
  count,
  countColor,
  expandable, // down chevron on right
}) {
  return (
    <Box
      sx={{
        width: '100%',
        cursor: 'pointer',
        borderRadius: '10px',
        backgroundColor: active ? '#2a2a2a' : 'transparent',
        padding: collapsed ? '10px' : '10px 12px',
        display: 'flex',
        alignItems: 'center',
        color: '#fff',
        '&:hover': {
          backgroundColor: '#2a2a2a',
        },
      }}
      onClick={() => {
        console.log('Clicked nav:', label);
      }}
    >
      {/* left icon */}
      <Box
        sx={{
          width: 28,
          height: 28,
          flexShrink: 0,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mr: collapsed ? 0 : '10px',
        }}
      >
        {icon}
      </Box>

      {!collapsed && (
        <>
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              minWidth: 0,
            }}
          >
            <Typography
              sx={{
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 500,
                lineHeight: 1.3,
              }}
            >
              {label}
            </Typography>

            {typeof count === 'number' && (
              <Chip
                label={count}
                size="small"
                sx={{
                  height: '20px',
                  minWidth: '20px',
                  fontSize: '0.7rem',
                  fontWeight: 500,
                  borderRadius: '6px',
                  paddingX: '4px',
                  lineHeight: 1.2,
                  color: '#fff',
                  backgroundColor: countColor || '#444',
                }}
              />
            )}
          </Box>

          {expandable && (
            <Box
              sx={{
                color: '#fff',
                lineHeight: 0,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <KeyboardArrowDownIcon
                sx={{
                  color: '#fff',
                  opacity: 0.8,
                  fontSize: '1rem',
                }}
              />
            </Box>
          )}
        </>
      )}

      {collapsed && typeof count === 'number' && (
        <Chip
          label={count}
          size="small"
          sx={{
            marginLeft: 'auto',
            height: '20px',
            minWidth: '20px',
            fontSize: '0.7rem',
            fontWeight: 500,
            borderRadius: '6px',
            paddingX: '4px',
            lineHeight: 1.2,
            color: '#fff',
            backgroundColor: countColor || '#444',
          }}
        />
      )}
    </Box>
  );
}

export default function Sidebar({ collapsed, onToggleCollapse }) {
  // colors for the little count pills to match screenshot vibe
  const workstationPill = '#3a3a2a'; // dark olive/gray w/ yellow text
  const workstationText = '#d2d26a';
  const usersPill = '#2f3822'; // dark greenish
  const usersText = '#9fff6a';
  const groupsPill = '#1e2438'; // dark navy
  const groupsText = '#7ba0ff';

  return (
    <Box
      sx={{
        width: collapsed ? 72 : 280,
        minWidth: collapsed ? 72 : 280,
        bgcolor: '#0F0F0F',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '0 0 20px 20px',
        padding: collapsed ? '12px 8px' : '16px',
        position: 'relative',
      }}
    >
      {/* collapse button (top right corner of sidebar) */}
      <Box
        sx={{
          position: 'absolute',
          right: collapsed ? '8px' : '16px',
          top: collapsed ? '8px' : '16px',
        }}
      >
        <IconButton
          size="small"
          onClick={onToggleCollapse}
          sx={{
            backgroundColor: '#1f1f1f',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.12)',
            color: '#fff',
            width: 28,
            height: 28,
            '&:hover': { backgroundColor: '#2a2a2a' },
          }}
        >
          {collapsed ? (
            <OpenInFullIcon sx={{ fontSize: '1rem' }} />
          ) : (
            <CloseFullscreenIcon sx={{ fontSize: '1rem' }} />
          )}
        </IconButton>
      </Box>

      {/* Company block (clickable org switcher) */}
      <Box
        onClick={() => {
          console.log('Open company switcher');
        }}
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: collapsed ? '0px' : '12px',
          paddingRight: collapsed ? '32px' : '48px', // leave space for collapse btn
          paddingTop: collapsed ? '40px' : '40px',
          paddingBottom: '16px',
          cursor: 'pointer',
        }}
      >
        {/* avatar */}
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '999px',
            flexShrink: 0,
            background:
              'radial-gradient(circle at 30% 30%, #b9ff9f 0%, #4b5b3a 70%)',
            border: '2px solid #fff',
            position: 'relative',
            mr: collapsed ? 0 : 0,
          }}
        >
          {/* little green status dot bottom-right? In screenshot there's a tiny green dot */}
          <Box
            sx={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 8,
              height: 8,
              borderRadius: '999px',
              backgroundColor: '#5aff3d',
              border: '2px solid #0F0F0F',
            }}
          />
        </Box>

        {!collapsed && (
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                width: '100%',
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  sx={{
                    color: '#fff',
                    fontSize: '1rem',
                    fontWeight: 600,
                    lineHeight: 1.3,
                  }}
                >
                  Company Inc.
                </Typography>
                <Typography
                  sx={{
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '0.8rem',
                    lineHeight: 1.3,
                    wordBreak: 'break-all',
                  }}
                >
                  admin@company.com
                </Typography>
              </Box>

              {/* stacked arrows as an indicator of "switch org" */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  lineHeight: 1,
                  color: '#fff',
                  ml: 1,
                  mt: '2px',
                }}
              >
                <KeyboardArrowUpIcon
                  sx={{
                    color: '#fff',
                    fontSize: '1rem',
                    lineHeight: 1,
                  }}
                />
                <KeyboardArrowDownIcon
                  sx={{
                    color: '#fff',
                    fontSize: '1rem',
                    lineHeight: 1,
                    mt: '-6px', // tuck them close
                  }}
                />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

      <Divider
        sx={{
          borderColor: 'rgba(255,255,255,0.18)',
          mb: collapsed ? 2 : 2,
        }}
      />

      {/* Navigation list */}
      <Box
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          color: '#fff',
        }}
      >
        <NavItem
          collapsed={collapsed}
          icon={<DashboardIcon fontSize="small" />}
          label="Dashboard"
          active={false}
          expandable={false}
        />

        {/* Workstations row is active (dark bg) in your screenshot */}
        <NavItem
          collapsed={collapsed}
          icon={<ComputerIcon fontSize="small" />}
          label="Workstations"
          active={true}
          count={6}
          countColor={workstationPill}
          expandable={true}
        />

        <NavItem
          collapsed={collapsed}
          icon={<PeopleAltIcon fontSize="small" />}
          label="Users"
          active={false}
          count={6}
          countColor={usersPill}
          expandable={true}
        />

        <NavItem
          collapsed={collapsed}
          icon={<Groups2Icon fontSize="small" />}
          label="Groups"
          active={false}
          count={6}
          countColor={groupsPill}
          expandable={true}
        />

        <NavItem
          collapsed={collapsed}
          icon={<FolderIcon fontSize="small" />}
          label="Files"
          active={false}
          expandable={true}
        />
      </Box>

      {/* Spacer before footer divider */}
      <Box sx={{ flexShrink: 0, mt: 'auto' }} />

      <Divider
        sx={{
          borderColor: 'rgba(255,255,255,0.18)',
          mt: 2,
          mb: 2,
        }}
      />

      {/* Bottom actions */}
      <Box
        sx={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          pb: '16px',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 500,
            lineHeight: 1.3,
            cursor: 'pointer',
            borderRadius: '8px',
            padding: collapsed ? '8px' : '8px 12px',
            '&:hover': { backgroundColor: '#2a2a2a' },
          }}
          onClick={() => console.log('Settings clicked')}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              flexShrink: 0,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: collapsed ? 0 : '10px',
            }}
          >
            <SettingsOutlinedIcon sx={{ fontSize: '1.1rem' }} />
          </Box>
          {!collapsed && (
            <Typography
              sx={{
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              Settings
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 500,
            lineHeight: 1.3,
            cursor: 'pointer',
            borderRadius: '8px',
            padding: collapsed ? '8px' : '8px 12px',
            '&:hover': { backgroundColor: '#2a2a2a' },
          }}
          onClick={() => console.log('Support clicked')}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              flexShrink: 0,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mr: collapsed ? 0 : '10px',
            }}
          >
            <HelpOutlineOutlinedIcon sx={{ fontSize: '1.1rem' }} />
          </Box>
          {!collapsed && (
            <Typography
              sx={{
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 500,
              }}
            >
              Get support
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
