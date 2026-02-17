import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthPage from '../AuthPage';

jest.mock('../../lib/analytics', () => ({
  trackButton: jest.fn(),
}));

// Mock fetch globally
global.fetch = jest.fn();

const buildResponse = ({ ok = true, status = 200, text = "" } = {}) => ({
  ok,
  status,
  text: async () => text,
});

describe('AuthPage', () => {
  const mockOnLoginSuccess = jest.fn();

  beforeEach(() => {
    mockOnLoginSuccess.mockClear();
    fetch.mockReset();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const getPasswordInput = (container) => {
    return container.querySelector('input[type="password"]');
  };

  it('renders login form with all elements', () => {
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    expect(screen.getByPlaceholderText('johndoe@example.com')).toBeInTheDocument();
    expect(getPasswordInput(container)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
  });

  it('updates email input when typing', () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    expect(emailInput).toHaveValue('test@example.com');
  });

  it('updates password input when typing', () => {
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const passwordInput = getPasswordInput(container);
    fireEvent.change(passwordInput, { target: { value: 'mypassword123' } });
    expect(passwordInput).toHaveValue('mypassword123');
  });

  it('shows error when submitting empty form', async () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter both email and password/i)).toBeInTheDocument();
    });
    
    expect(fetch).not.toHaveBeenCalled();
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('shows error when submitting with only email', async () => {
    render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter both email and password/i)).toBeInTheDocument();
    });
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('shows error when submitting with only password', async () => {
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/please enter both email and password/i)).toBeInTheDocument();
    });
    
    expect(fetch).not.toHaveBeenCalled();
  });

  it('successfully logs in with valid credentials', async () => {
    const mockResponse = {
      access_token: 'test-token-123',
      user: { id: '1', email: 'test@example.com', role: 'admin' }
    };
    
    fetch.mockResolvedValueOnce(
      buildResponse({ ok: true, text: JSON.stringify(mockResponse) })
    );
    const user = userEvent.setup();
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
    });
    
    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith(mockResponse);
    });
  });

  it('shows error message on failed login (401)', async () => {
    fetch.mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 401,
        text: JSON.stringify({ error: 'Invalid credentials' }),
      })
    );
    
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'wrong@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
    
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('shows generic error on server error (500)', async () => {
    fetch.mockResolvedValueOnce(
      buildResponse({
        ok: false,
        status: 500,
        text: JSON.stringify({ error: 'Internal server error' }),
      })
    );
    
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });
  });

  it('shows default error message when response has no error field', async () => {
    fetch.mockResolvedValueOnce(
      buildResponse({ ok: false, status: 400, text: JSON.stringify({}) })
    );
    
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText(/login failed. please check your credentials/i)).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
    
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('shows loading state while submitting', async () => {
    fetch.mockImplementation(() =>
      new Promise((resolve) =>
        setTimeout(
          () => resolve(buildResponse({ ok: true, text: JSON.stringify({}) })),
          100
        )
      )
    );
    
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    // Check for loading indicator (CircularProgress)
    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
    
    // Button should be disabled during loading
    expect(loginButton).toBeDisabled();
  });

  it('allows login via Enter key in email field', async () => {
    const mockResponse = {
      access_token: 'test-token-123',
      user: { id: '1', email: 'test@example.com' }
    };
    
    fetch.mockResolvedValueOnce(
      buildResponse({ ok: true, text: JSON.stringify(mockResponse) })
    );
    const user = userEvent.setup();
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(emailInput, '{enter}');
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('allows login via Enter key in password field', async () => {
    const mockResponse = {
      access_token: 'test-token-123',
      user: { id: '1', email: 'test@example.com' }
    };
    
    fetch.mockResolvedValueOnce(
      buildResponse({ ok: true, text: JSON.stringify(mockResponse) })
    );
    const user = userEvent.setup();
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    
    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.type(passwordInput, '{enter}');
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    }, { timeout: 2000 });
  });

  it('works without onLoginSuccess callback', async () => {
    const mockResponse = {
      access_token: 'test-token-123',
      user: { id: '1', email: 'test@example.com' }
    };
    
    fetch.mockResolvedValueOnce(
      buildResponse({ ok: true, text: JSON.stringify(mockResponse) })
    );
    
    const { container } = render(<AuthPage />);
    
    const emailInput = screen.getByPlaceholderText('johndoe@example.com');
    const passwordInput = getPasswordInput(container);
    const loginButton = screen.getByRole('button', { name: /login/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(loginButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });
    
    // Should not throw error even without callback
    expect(mockOnLoginSuccess).not.toHaveBeenCalled();
  });

  it('applies correct page layout styles', () => {
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);
    const mainBox = container.firstChild;
    expect(mainBox).toHaveStyle({ 
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
  });

  it('handles empty response body on success', async () => {
    fetch.mockResolvedValueOnce(buildResponse({ ok: true, text: '' }));

    const user = userEvent.setup();
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    await user.type(screen.getByPlaceholderText('johndoe@example.com'), 'test@example.com');
    await user.type(getPasswordInput(container), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith({});
    });
  });

  it('handles invalid JSON response body', async () => {
    fetch.mockResolvedValueOnce(buildResponse({ ok: true, text: '{bad json' }));

    const user = userEvent.setup();
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    await user.type(screen.getByPlaceholderText('johndoe@example.com'), 'test@example.com');
    await user.type(getPasswordInput(container), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(mockOnLoginSuccess).toHaveBeenCalledWith({});
    });
  });

  it('uses fallback error message when catch receives no error message', async () => {
    fetch.mockRejectedValueOnce(null);

    const user = userEvent.setup();
    const { container } = render(<AuthPage onLoginSuccess={mockOnLoginSuccess} />);

    await user.type(screen.getByPlaceholderText('johndoe@example.com'), 'test@example.com');
    await user.type(getPasswordInput(container), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /login/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Login failed. Please check your credentials.')
      ).toBeInTheDocument();
    });
  });
});
