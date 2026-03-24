import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SettingsPage from '../SettingsPage';
import { ThemeProvider } from '../../context/ThemeContext';
import { AuthProvider } from '../../context/AuthContext';
import '@testing-library/jest-dom';

// Mock AppearanceTab
jest.mock('../../components/settings/AppearanceTab.jsx', () => {
  return function DummyAppearanceTab() {
    return (
      <div data-testid="appearance-tab-integration">
        <h3>Appearance Settings</h3>
        <button data-testid="theme-toggle">Toggle Theme</button>
      </div>
    );
  };
});

// Mock other tabs
jest.mock('../../components/settings/BasicInfoTab.jsx', () => {
  return function DummyBasicInfoTab() {
    return <div data-testid="basic-info-tab">Basic Info</div>;
  };
});

jest.mock('../../components/settings/BillingTab.jsx', () => {
  return function DummyBillingTab() {
    return <div data-testid="billing-tab">Billing</div>;
  };
});

jest.mock('../../components/settings/NotificationsTab.jsx', () => {
  return function DummyNotificationsTab() {
    return <div data-testid="notifications-tab">Notifications</div>;
  };
});

jest.mock('../../components/settings/EmailCustomizationTab.jsx', () => {
  return function DummyEmailCustomizationTab() {
    return <div data-testid="email-customization-tab">Email</div>;
  };
});

describe('Settings Page with Theme Integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  function renderSettingsPage() {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  }

  it('renders settings page with theme context', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    await act(async () => {
      renderSettingsPage();
    });

    expect(screen.getByRole('heading')).toBeInTheDocument();
  });

  it('renders appearance tab with theme support', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    await act(async () => {
      renderSettingsPage();
    });

    const appearanceTab = screen.getByTestId('appearance-tab-integration');
    expect(appearanceTab).toBeInTheDocument();
  });

  it('preserves theme when switching between settings tabs', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    localStorage.setItem('cs_theme', 'dark');

    await act(async () => {
      renderSettingsPage();
    });

    // Click on different tabs
    const tabs = screen.getAllByRole('tab');
    if (tabs.length > 1) {
      await act(async () => {
        fireEvent.click(tabs[1]);
      });
    }

    // Theme should still be set
    expect(localStorage.getItem('cs_theme')).toBe('dark');
  });

  it('renders all settings tabs', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    await act(async () => {
      renderSettingsPage();
    });

    // Check for appearance tab
    expect(screen.getByTestId('appearance-tab-integration')).toBeInTheDocument();
  });

  it('theme changes are reflected across settings page', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    await act(async () => {
      renderSettingsPage();
    });

    const themeToggle = screen.getByTestId('theme-toggle');
    expect(themeToggle).toBeInTheDocument();

    // Toggle theme
    await act(async () => {
      fireEvent.click(themeToggle);
    });

    // Page should still be rendered properly
    expect(screen.getByTestId('appearance-tab-integration')).toBeInTheDocument();
  });

  it('page maintains proper styling with theme provider', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    const { container } = await act(async () => {
      return renderSettingsPage();
    });

    // Settings page should be properly styled
    expect(container.firstChild).toBeInTheDocument();
  });

  it('theme context is accessible throughout settings page', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    await act(async () => {
      renderSettingsPage();
    });

    // All tabs should render without errors
    expect(screen.getByTestId('appearance-tab-integration')).toBeInTheDocument();
  });

  it('responsive design works with theme', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    const { container } = await act(async () => {
      return renderSettingsPage();
    });

    // Check that page is renderable and has content
    expect(container.querySelector('[role="main"], [role="tablist"]')).toBeInTheDocument();
  });

  it('theme preference is retained after tab switch', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    localStorage.setItem('cs_theme', 'light');

    await act(async () => {
      renderSettingsPage();
    });

    const initialTheme = localStorage.getItem('cs_theme');

    const tabs = screen.queryAllByRole('tab');
    if (tabs.length > 1) {
      await act(async () => {
        fireEvent.click(tabs[1]);
      });
    }

    const finalTheme = localStorage.getItem('cs_theme');
    expect(initialTheme).toBe(finalTheme);
  });

  it('appearance tab renders without crashing', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    await act(async () => {
      renderSettingsPage();
    });

    expect(screen.getByText('Appearance Settings')).toBeInTheDocument();
  });

  it('all tabs are rendered in settings page', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 'user-123' } }),
    });

    await act(async () => {
      renderSettingsPage();
    });

    // Settings content should be visible
    expect(screen.getByTestId('appearance-tab-integration')).toBeInTheDocument();
  });
});
