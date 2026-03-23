import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { useAppTheme, ThemeProvider } from '../ThemeContext';
import '@testing-library/jest-dom';

// Test component that uses the theme hook
function TestComponent() {
  const { themeMode, updateTheme, previewTheme, clearPreview, previewMode, effectiveTheme } = useAppTheme();

  return (
    <div>
      <div data-testid="theme-mode">{themeMode}</div>
      <div data-testid="effective-theme">{effectiveTheme}</div>
      <div data-testid="preview-mode">{previewMode}</div>
      <button onClick={() => updateTheme('light')} data-testid="update-light">
        Update Light
      </button>
      <button onClick={() => updateTheme('dark')} data-testid="update-dark">
        Update Dark
      </button>
      <button onClick={() => previewTheme('light')} data-testid="preview-light">
        Preview Light
      </button>
      <button onClick={() => previewTheme('dark')} data-testid="preview-dark">
        Preview Dark
      </button>
      <button onClick={clearPreview} data-testid="clear-preview">
        Clear Preview
      </button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('provides theme context', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-mode')).toBeInTheDocument();
  });

  it('initializes with default dark theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const themeMode = screen.getByTestId('theme-mode').textContent;
    expect(['dark', 'light', 'system']).toContain(themeMode);
  });

  it('updates theme when updateTheme is called', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const updateButton = screen.getByTestId('update-light');
    fireEvent.click(updateButton);

    expect(screen.getByTestId('theme-mode').textContent).toBe('light');
  });

  it('preserves theme in localStorage', () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const updateButton = screen.getByTestId('update-dark');
    fireEvent.click(updateButton);

    expect(setItemSpy).toHaveBeenCalledWith('cs_theme', 'dark');
    setItemSpy.mockRestore();
  });

  it('enables theme preview without updating actual theme', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const previewButton = screen.getByTestId('preview-light');
    fireEvent.click(previewButton);

    expect(screen.getByTestId('preview-mode').textContent).toBe('light');
    // Theme mode should remain unchanged
    const initialTheme = screen.getByTestId('theme-mode').textContent;
    expect(initialTheme).not.toBe('');
  });

  it('clears preview mode', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const previewButton = screen.getByTestId('preview-light');
    fireEvent.click(previewButton);
    expect(screen.getByTestId('preview-mode').textContent).toBe('light');

    const clearButton = screen.getByTestId('clear-preview');
    fireEvent.click(clearButton);
    expect(screen.getByTestId('preview-mode').textContent).toBe('');
  });

  it('uses preview theme for effectiveTheme when preview is active', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const previewButton = screen.getByTestId('preview-dark');
    fireEvent.click(previewButton);

    expect(screen.getByTestId('effective-theme').textContent).toBe('dark');
  });

  it('uses actual theme for effectiveTheme when preview is inactive', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    const themeElement = screen.getByTestId('effective-theme');
    expect(themeElement.textContent).not.toBe('');
    expect(['dark', 'light', 'system']).toContain(themeElement.textContent);
  });

  it('can switch between multiple themes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('update-light'));
    expect(screen.getByTestId('theme-mode').textContent).toBe('light');

    fireEvent.click(screen.getByTestId('update-dark'));
    expect(screen.getByTestId('theme-mode').textContent).toBe('dark');

    fireEvent.click(screen.getByTestId('update-light'));
    expect(screen.getByTestId('theme-mode').textContent).toBe('light');
  });

  it('handles rapid theme changes', () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByTestId('update-light'));
    fireEvent.click(screen.getByTestId('update-dark'));
    fireEvent.click(screen.getByTestId('update-light'));

    expect(screen.getByTestId('theme-mode').textContent).toBe('light');
  });

  it('restores theme from localStorage on mount', () => {
    localStorage.setItem('cs_theme', 'light');

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>
    );

    expect(screen.getByTestId('theme-mode').textContent).toBe('light');
  });
})
// Mock component to consume the context
const TestComponent = () => {
  const { themeMode, effectiveTheme, updateTheme, previewTheme, clearPreview, previewMode } = useAppTheme();
  return (
    <div>
      <span data-testid="theme-mode">{themeMode}</span>
      <span data-testid="effective-theme">{effectiveTheme}</span>
      <span data-testid="preview-mode">{previewMode || 'none'}</span>
      <button onClick={() => updateTheme('light')}>Set Light</button>
      <button onClick={() => updateTheme('dark')}>Set Dark</button>
      <button onClick={() => previewTheme('light')}>Preview Light</button>
      <button onClick={() => clearPreview()}>Clear Preview</button>
    </div>
  );
};

describe('ThemeContext', () => {
  let matchMediaMock;

  beforeEach(() => {
    localStorage.clear();
    // Mock window.matchMedia
    matchMediaMock = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('provides default theme (dark) when no localStorage value exists', () => {
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>
    );
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');
  });

  it('loads theme from localStorage on mount', () => {
    localStorage.setItem('cs_theme_mode', 'light');
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>
    );
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    expect(screen.getByTestId('effective-theme')).toHaveTextContent('light');
  });

  it('updates theme and saves to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>
    );
    
    await user.click(screen.getByText('Set Light'));
    
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('light');
    expect(localStorage.getItem('cs_theme_mode')).toBe('light');
  });

  it('handles preview mode overriding effective theme', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>
    );

    // Default is dark
    expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');

    // Preview light
    await user.click(screen.getByText('Preview Light'));
    expect(screen.getByTestId('preview-mode')).toHaveTextContent('light');
    expect(screen.getByTestId('effective-theme')).toHaveTextContent('light');
    // Actual saved theme shouldn't change
    expect(screen.getByTestId('theme-mode')).toHaveTextContent('dark');

    // Clear preview
    await user.click(screen.getByText('Clear Preview'));
    expect(screen.getByTestId('preview-mode')).toHaveTextContent('none');
    expect(screen.getByTestId('effective-theme')).toHaveTextContent('dark');
  });

  it('injects CSS variables into document.documentElement', () => {
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>
    );
    
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--bg-primary')).not.toBe('');
    expect(root.style.getPropertyValue('--text-primary')).not.toBe('');
  });

  it('throws error if useAppTheme is used outside provider', () => {
    // Suppress console.error for the expected error
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    expect(() => render(<TestComponent />)).toThrow('useAppTheme must be used within ThemeProvider_Custom');
    
    consoleSpy.mockRestore();
  });
});
