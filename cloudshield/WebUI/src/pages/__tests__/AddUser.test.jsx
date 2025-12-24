import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import AddUserPage from '../AddUser';

// Mock dependencies
jest.mock('../../components/provisioning/ProvisioningControls', () => {
  return function MockProvisioningControls({ status, jobId, message, progress }) {
    return (
      <div data-testid="provisioning-controls">
        <div data-testid="controls-status">{status}</div>
        <div data-testid="controls-job-id">{jobId || 'none'}</div>
        <div data-testid="controls-message">{message || 'none'}</div>
        <div data-testid="controls-progress">{progress !== null ? progress : 'none'}</div>
      </div>
    );
  };
});

describe('AddUserPage', () => {
  let mockFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetch = jest.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders the page title and description', () => {
      render(<AddUserPage />);
      expect(screen.getByText('Add User')).toBeInTheDocument();
      expect(screen.getByText(/Enter organization details below to add a user/)).toBeInTheDocument();
    });

    it('renders all input fields', () => {
      render(<AddUserPage />);
      expect(screen.getByLabelText('Organization ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('renders the Add User button', () => {
      render(<AddUserPage />);
      expect(screen.getByRole('button', { name: 'Add User' })).toBeInTheDocument();
    });

    it('does not render Reset button initially', () => {
      render(<AddUserPage />);
      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
    });

    it('renders ProvisioningControls component', () => {
      render(<AddUserPage />);
      expect(screen.getByTestId('provisioning-controls')).toBeInTheDocument();
    });
  });

  describe('Input Field Behavior', () => {
    it('updates orgId when Organization ID field changes', () => {
      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      
      expect(orgIdInput.value).toBe('org-123');
    });

    it('updates username when Username field changes', () => {
      render(<AddUserPage />);
      const usernameInput = screen.getByLabelText('Username');
      
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      
      expect(usernameInput.value).toBe('john_doe');
    });

    it('updates password when Password field changes', () => {
      render(<AddUserPage />);
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(passwordInput, { target: { value: 'SecurePass123' } });
      
      expect(passwordInput.value).toBe('SecurePass123');
    });

    it('password field has type="password"', () => {
      render(<AddUserPage />);
      const passwordInput = screen.getByLabelText('Password');
      
      expect(passwordInput.type).toBe('password');
    });
  });

  describe('Button Disable State', () => {
    it('disables Add User button when orgId is empty', () => {
      render(<AddUserPage />);
      const button = screen.getByRole('button', { name: 'Add User' });
      
      expect(button).toBeDisabled();
    });

    it('disables Add User button when username is empty', () => {
      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      expect(button).toBeDisabled();
    });

    it('disables Add User button when password is empty', () => {
      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      expect(button).toBeDisabled();
    });

    it('enables Add User button when all fields are filled', () => {
      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      expect(button).not.toBeDisabled();
    });

    it('disables button during starting state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it('disables button during running state', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'running',
            progress: 50,
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      expect(button).toBeDisabled();
    });
  });

  describe('Starting Add User', () => {
    it('calls API with correct parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-456' } });
      fireEvent.change(usernameInput, { target: { value: 'alice' } });
      fireEvent.change(passwordInput, { target: { value: 'SecurePass456' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:5050/task/dc/add_user',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: 'org-456',
              username: 'alice',
              password: 'SecurePass456',
            }),
          }
        );
      });
    });

    it('shows "Starting..." text on button during start', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      expect(screen.getByRole('button', { name: 'Starting…' })).toBeInTheDocument();
    });

    it('sets job ID after successful start', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-789' }),
      });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-789');
      });
    });

    it('handles API error when starting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Server error occurred',
      });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Server error occurred/)).toBeInTheDocument();
      });
    });

    it('handles missing job_id in response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({}),
      });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Malformed response: missing job_id/)).toBeInTheDocument();
      });
    });

    it('handles network error when starting', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Polling Status', () => {
    it('starts polling after successful start', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'running',
            message: 'Adding user in progress',
            progress: 50,
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('http://localhost:5050/status/job-123');
      });
    });

    it('updates progress during polling', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'running',
            progress: 25,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'running',
            progress: 75,
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Adding user… 25%/)).toBeInTheDocument();
      });
    });

    it('maps "finished" status to "succeeded"', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'finished',
            result: { message: 'User added successfully' },
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('controls-status')).toHaveTextContent('succeeded');
      });
    });

    it('maps queue/deferred status to "running"', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            status: 'queued',
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('controls-status')).toHaveTextContent('running');
      });
    });

    it('infers failed status from progress text', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            progress: 'Failed: User already exists',
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('controls-status')).toHaveTextContent('failed');
      });
    });

    it('stops polling on success', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'finished',
            result: { message: 'Success' },
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('controls-status')).toHaveTextContent('succeeded');
      });

      const initialCallCount = mockFetch.mock.calls.length;
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not make additional calls after success
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });

    it('stops polling on failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'failed',
            message: 'Error adding user',
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('controls-status')).toHaveTextContent('failed');
      });

      const initialCallCount = mockFetch.mock.calls.length;
      
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not make additional calls after failure
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });

    it('handles polling error gracefully', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockRejectedValueOnce(new Error('Polling failed'));

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Polling failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Progress Display', () => {
    it('shows progress bar when status is running with number progress', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'running',
            progress: 50,
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText(/Adding user… 50%/)).toBeInTheDocument();
      });
    });

    it('shows indeterminate progress bar when progress is string', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'running',
            progress: 'Initializing user creation',
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText('Initializing user creation')).toBeInTheDocument();
      });
    });
  });

  describe('Success Display', () => {
    it('displays success message when status is succeeded', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'finished',
            result: {
              message: 'User created successfully',
              org_id: 'org-123',
              username: 'john_doe',
              role: 'employee',
            },
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText('User Added Successfully')).toBeInTheDocument();
      });
    });

    it('displays result details in success box', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'finished',
            result: {
              org_id: 'org-456',
              username: 'alice',
              role: 'admin',
            },
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-456' } });
      fireEvent.change(usernameInput, { target: { value: 'alice' } });
      fireEvent.change(passwordInput, { target: { value: 'pass456' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText('Org ID: org-456')).toBeInTheDocument();
        expect(screen.getByText('Username: alice')).toBeInTheDocument();
        expect(screen.getByText('Role: admin')).toBeInTheDocument();
      });
    });
  });

  describe('Failed State Display', () => {
    it('displays error chip and message on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'User already exists',
      });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Failed')).toBeInTheDocument();
        expect(screen.getByText(/User already exists/)).toBeInTheDocument();
      });
    });
  });

  describe('Reset Functionality', () => {
    it('shows Reset button after operation starts', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'job-123' }),
      });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const addButton = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
      });
    });

    it('resets all state when Reset button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'finished',
            result: { message: 'Success' },
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const addButton = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByText('User Added Successfully')).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: 'Reset' });
      fireEvent.click(resetButton);

      // After reset, should be back to idle state
      expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();
      expect(screen.getByTestId('controls-status')).toHaveTextContent('idle');
    });

    it('clears polling on reset', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'running',
            progress: 50,
          }),
        });

      render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const addButton = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      const initialCallCount = mockFetch.mock.calls.length;

      const resetButton = screen.getByRole('button', { name: 'Reset' });
      fireEvent.click(resetButton);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not make additional polling calls after reset
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('Cleanup', () => {
    it('cleans up polling interval on unmount', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 202,
          json: async () => ({ job_id: 'job-123' }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({
            status: 'running',
            progress: 50,
          }),
        });

      const { unmount } = render(<AddUserPage />);
      const orgIdInput = screen.getByLabelText('Organization ID');
      const usernameInput = screen.getByLabelText('Username');
      const passwordInput = screen.getByLabelText('Password');
      
      fireEvent.change(orgIdInput, { target: { value: 'org-123' } });
      fireEvent.change(usernameInput, { target: { value: 'john_doe' } });
      fireEvent.change(passwordInput, { target: { value: 'pass123' } });
      
      const button = screen.getByRole('button', { name: 'Add User' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('controls-job-id')).toHaveTextContent('job-123');
      });

      const initialCallCount = mockFetch.mock.calls.length;

      unmount();

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not make additional calls after unmount
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });
  });
});
