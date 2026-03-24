import { useAppTheme } from '../context/ThemeContext';

/**
 * Provides theme-aware color utilities for dynamic styling
 */
export const useThemeColors = () => {
  const { effectiveTheme } = useAppTheme();

  return {
    isDark: effectiveTheme === 'dark',
    isLight: effectiveTheme === 'light',
    
    // Light overlay colors (for hover, active states)
    lightOverlay: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    lightOverlaySubtle: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
    lightOverlayMedium: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    
    // Frequently used colors
    border: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.16)',
    borderStrong: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)',
    borderLight: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    
    // Text colors
    text: effectiveTheme === 'dark' ? '#FFFFFF' : '#000000',
    textPrimary: effectiveTheme === 'dark' ? '#FFFFFF' : '#000000',
    textSecondary: effectiveTheme === 'dark' ? '#9E9E9E' : '#666666',
    textTertiary: effectiveTheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    textDisabled: effectiveTheme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)',
    
    // Background colors
    surface: effectiveTheme === 'dark' ? '#111111' : '#FFFFFF',
    bgPrimary: effectiveTheme === 'dark' ? '#0A0A0A' : '#FFFFFF',
    bgSecondary: effectiveTheme === 'dark' ? '#111111' : '#F5F5F5',
    bgTertiary: effectiveTheme === 'dark' ? '#161616' : '#FAFAFA',
    bgHover: effectiveTheme === 'dark' ? '#242424' : '#F0F0F0',
    bgActive: effectiveTheme === 'dark' ? '#2A2A2A' : '#EBEBEB',
    
    // Input colors
    inputBg: effectiveTheme === 'dark' ? '#0A0A0A' : '#F5F5F5',
    inputBgHover: effectiveTheme === 'dark' ? '#161616' : '#F0F0F0',
    inputBgFocus: effectiveTheme === 'dark' ? '#1A1A1A' : '#FFFFFF',
    inputText: effectiveTheme === 'dark' ? '#FFFFFF' : '#000000',
    inputPlaceholder: effectiveTheme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
    
    // Primary button colors
    primary: effectiveTheme === 'dark' ? '#FFFFFF' : '#000000',
    primaryText: effectiveTheme === 'dark' ? '#000000' : '#FFFFFF',
    primaryHover: effectiveTheme === 'dark' ? '#E0E0E0' : '#333333',
    primaryActive: effectiveTheme === 'dark' ? '#BDBDBD' : '#1A1A1A',
    
    // Secondary button colors
    secondary: effectiveTheme === 'dark' ? '#1a1a1a' : '#F5F5F5',
    secondaryText: effectiveTheme === 'dark' ? '#FFFFFF' : '#000000',
    secondaryHover: effectiveTheme === 'dark' ? '#242424' : '#EBEBEB',
    secondaryBorder: effectiveTheme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
    
    // Success/Error colors (for status badges, alerts)
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    info: '#2196F3',
  };
};
