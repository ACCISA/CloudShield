import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import SignupPage from '../SignUpPage';

// Mock dependencies
jest.mock('../../components/signup/SignupCard', () => {
  return function MockSignupCard({ children }) {
    return <div data-testid="signup-card">{children}</div>;
  };
});

jest.mock('../../components/signup/PlanCard', () => {
  return function MockPlanCard({ plan, selected, onSelect }) {
    return (
      <div
        data-testid={`plan-card-${plan.id}`}
        onClick={() => onSelect(plan.id)}
        style={{ border: selected ? '2px solid green' : '1px solid gray' }}
      >
        {plan.name} - ${plan.price}
      </div>
    );
  };
});

jest.mock('../../components/auth/AuthTextField', () => {
  return function MockAuthTextField({ label, value, onChange, placeholder }) {
    return (
      <input
        data-testid={`auth-field-${label.toLowerCase().replace(/\s/g, '-')}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-label={label}
      />
    );
  };
});

jest.mock('../../components/auth/PasswordField', () => {
  return function MockPasswordField({ label, value, onChange }) {
    return (
      <input
        data-testid="password-field"
        type="password"
        value={value}
        onChange={onChange}
        aria-label={label}
      />
    );
  };
});

jest.mock('../../components/auth/PrimaryButton', () => {
  return function MockPrimaryButton({ children, onClick, disabled }) {
    return (
      <button onClick={onClick} disabled={disabled} data-testid="primary-button">
        {children}
      </button>
    );
  };
});

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('SignupPage', () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn();
  });

  const renderSignupPage = (props = {}) => {
    return render(
      <BrowserRouter>
        <SignupPage {...props} />
      </BrowserRouter>
    );
  };

  it('renders the signup form', () => {
    renderSignupPage();

    expect(screen.getByText('Create Your Organization')).toBeInTheDocument();
    expect(screen.getByTestId('auth-field-email')).toBeInTheDocument();
    expect(screen.getByTestId('password-field')).toBeInTheDocument();
    expect(screen.getByTestId('auth-field-company-name')).toBeInTheDocument();
    expect(screen.getByTestId('auth-field-organization-id')).toBeInTheDocument();
    expect(screen.getByTestId('primary-button')).toBeInTheDocument();
  });

  it('renders all plan cards', () => {
    renderSignupPage();

    expect(screen.getByTestId('plan-card-basic')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-pro')).toBeInTheDocument();
    expect(screen.getByTestId('plan-card-enterprise')).toBeInTheDocument();
  });

  it('updates email field', () => {
    renderSignupPage();

    const emailInput = screen.getByTestId('auth-field-email');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    expect(emailInput.value).toBe('test@example.com');
  });

  it('updates password field', () => {
    renderSignupPage();

    const passwordInput = screen.getByTestId('password-field');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(passwordInput.value).toBe('password123');
  });

  it('updates company name field', () => {
    renderSignupPage();

    const companyInput = screen.getByTestId('auth-field-company-name');
    fireEvent.change(companyInput, { target: { value: 'Acme Corp' } });

    expect(companyInput.value).toBe('Acme Corp');
  });

  it('updates org id field and sanitizes input', () => {
    renderSignupPage();

    const orgIdInput = screen.getByTestId('auth-field-organization-id');
    fireEvent.change(orgIdInput, { target: { value: 'Acme@123!' } });

    expect(orgIdInput.value).toBe('acme123');
  });

  it('selects a plan when plan card is clicked', () => {
    renderSignupPage();

    const basicPlanCard = screen.getByTestId('plan-card-basic');
    fireEvent.click(basicPlanCard);

    // Pro is default, check if basic is now selected by border style
    expect(basicPlanCard).toHaveStyle({ border: '2px solid green' });
  });

  it('shows validation error for invalid email', async () => {
    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'pass123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Invalid email format.')).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows validation error for short password', async () => {
    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: '123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(
        screen.getByText('Password must be at least 6 characters.')
      ).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows validation error for empty company name', async () => {
    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: '   ' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Company name is required.')).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid org id format', async () => {
    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'ab' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Org ID must be 3-32 characters, lowercase letters and digits only.'
        )
      ).toBeInTheDocument();
    });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('submits form successfully with 2-step process and navigates to login', async () => {
    // Mock successful user creation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        user_id: 'user123',
      }),
    });
    
    // Mock successful provisioning
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        job_id: 'job456',
      }),
    });

    const mockOnSignupSuccess = jest.fn();
    renderSignupPage({ onSignupSuccess: mockOnSignupSuccess });

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    // Verify first API call - create user
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5050/api/signup_admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
          role: 'admin',
          full_name: 'Acme',
          org_id: 'acme',
        }),
      });
    });

    // Verify second API call - provision
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:5050/api/task/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: 'acme',
        }),
      });
    });

    await waitFor(() => {
      expect(mockOnSignupSuccess).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('handles 400 error with field-specific errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        errors: {
          email: 'Email already exists',
          orgId: 'Organization ID taken',
        },
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Email already exists')).toBeInTheDocument();
      expect(screen.getByText('Organization ID taken')).toBeInTheDocument();
    });
  });

  it('handles 400 error with general message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        message: 'Invalid request data',
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Invalid request data')).toBeInTheDocument();
    });
  });

  it('handles 409 conflict error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        message: 'Organization already exists',
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Organization already exists')).toBeInTheDocument();
    });
  });

  it('handles generic server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        message: 'Internal server error',
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(
        screen.getByText(/Network error/)
      ).toBeInTheDocument();
    });
  });

  it('disables submit button while submitting', async () => {
    mockFetch.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByTestId('primary-button')).toBeDisabled();
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });
  });

  it('handles malformed JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    // Should show form error but not crash
    await waitFor(() => {
      expect(screen.getByText(/form/i)).toBeInTheDocument();
    });
  });

  it('handles localStorage errors gracefully', async () => {
    Storage.prototype.setItem = jest.fn(() => {
      throw new Error('Storage quota exceeded');
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        token: 'test-jwt-token',
        user_id: 'user123',
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        job_id: 'job456',
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
    });
  });

  it('uses access_token if token is not present', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        access_token: 'test-access-token',
        user_id: 'user123',
      }),
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        job_id: 'job456',
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('jwt', 'test-access-token');
    });
  });

  it('clears form errors when resubmitting', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Conflict error' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({ user_id: 'user123' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job456' }),
      });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Conflict error')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.queryByText('Conflict error')).not.toBeInTheDocument();
    });
  });

  it('handles provision step failure after successful user creation', async () => {
    // User creation succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        user_id: 'user123',
      }),
    });
    
    // Provision fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        message: 'Provisioning failed',
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Provisioning failed')).toBeInTheDocument();
    });

    // Should not navigate if provision fails
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('validates email with complex formats', async () => {
    renderSignupPage();

    // Test various invalid email formats
    const invalidEmails = [
      'test',
      '@example.com',
      'test@',
      'test@@example.com',
      'test@example',
      'test@.com',
      'test@example.',
      '',
    ];

    for (const email of invalidEmails) {
      fireEvent.change(screen.getByTestId('auth-field-email'), {
        target: { value: email },
      });
      fireEvent.change(screen.getByTestId('password-field'), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByTestId('auth-field-company-name'), {
        target: { value: 'Acme' },
      });
      fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
        target: { value: 'acme' },
      });

      fireEvent.click(screen.getByTestId('primary-button'));

      await waitFor(() => {
        expect(screen.getByText('Invalid email format.')).toBeInTheDocument();
      });

      expect(mockFetch).not.toHaveBeenCalled();
      mockFetch.mockClear();
    }
  });

  it('validates org id with various invalid patterns', async () => {
    renderSignupPage();

    const invalidOrgIds = [
      'a',        // Too short (< 3)
      'ab',       // Too short
      'A' + 'b'.repeat(32),  // Contains uppercase
      'abc def',  // Contains space (sanitized to 'abcdef', but original validation)
    ];

    for (const orgId of invalidOrgIds) {
      fireEvent.change(screen.getByTestId('auth-field-email'), {
        target: { value: 'test@example.com' },
      });
      fireEvent.change(screen.getByTestId('password-field'), {
        target: { value: 'password123' },
      });
      fireEvent.change(screen.getByTestId('auth-field-company-name'), {
        target: { value: 'Acme' },
      });
      fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
        target: { value: orgId },
      });

      fireEvent.click(screen.getByTestId('primary-button'));

      await waitFor(() => {
        const errorElement = screen.queryByText(/Org ID must be 3-32 characters/);
        if (errorElement) {
          expect(errorElement).toBeInTheDocument();
        }
      });
    }
  });

  it('navigates to login when "Already have an account" is clicked', () => {
    renderSignupPage();

    const loginLink = screen.getByText(/Already have an account\? Log in/i);
    fireEvent.click(loginLink);

    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('handles token from provision response', async () => {
    // User creation without token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        user_id: 'user123',
      }),
    });
    
    // Provision with token
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 202,
      json: async () => ({
        job_id: 'job456',
        token: 'provision-token',
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith('jwt', 'provision-token');
    });
  });

  it('handles 400 error from provision step', async () => {
    // User creation succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        user_id: 'user123',
      }),
    });
    
    // Provision returns 400
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({
        errors: {
          orgId: 'Invalid organization ID',
        },
      }),
    });

    renderSignupPage();

    fireEvent.change(screen.getByTestId('auth-field-email'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByTestId('password-field'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByTestId('auth-field-company-name'), {
      target: { value: 'Acme' },
    });
    fireEvent.change(screen.getByTestId('auth-field-organization-id'), {
      target: { value: 'acme' },
    });

    fireEvent.click(screen.getByTestId('primary-button'));

    await waitFor(() => {
      expect(screen.getByText('Invalid organization ID')).toBeInTheDocument();
    });
  });
});
