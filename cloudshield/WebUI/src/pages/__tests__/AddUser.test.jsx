import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddUserPage from '../AddUser';

// Mock the ProvisioningControls component
jest.mock('../../components/provisioning/ProvisioningControls.jsx', () => {
  return function DummyProvisioningControls() {
    return <div data-testid="provisioning-controls">Provisioning Controls</div>;
  };
});

describe('AddUserPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<AddUserPage />);
      expect(container).toBeTruthy();
    });

    it('should display the page title', () => {
      render(<AddUserPage />);
      expect(screen.getByText('Add User')).toBeInTheDocument();
    });

    it('should display the page description', () => {
      render(<AddUserPage />);
      expect(
        screen.getByText('Enter organization details below to add a user.')
      ).toBeInTheDocument();
    });

    it('should render all three input fields', () => {
      render(<AddUserPage />);
      expect(screen.getByLabelText('Organization ID')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should render the Add User button', () => {
      render(<AddUserPage />);
      expect(screen.getByRole('button', { name: /Add User/i })).toBeInTheDocument();
    });

    it('should render ProvisioningControls component', () => {
      render(<AddUserPage />);
      expect(screen.getByTestId('provisioning-controls')).toBeInTheDocument();
    });
  });

  describe('Input Fields', () => {
    it('should update organization ID on input', async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText('Organization ID');
      await userEvent.type(input, 'org-123');
      expect(input).toHaveValue('org-123');
    });

    it('should update username on input', async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText('Username');
      await userEvent.type(input, 'john.doe');
      expect(input).toHaveValue('john.doe');
    });

    it('should update password on input', async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText('Password');
      await userEvent.type(input, 'SecurePassword123');
      expect(input).toHaveValue('SecurePassword123');
    });

    it('should have type="password" for password field', () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText('Password');
      expect(input).toHaveAttribute('type', 'password');
    });
  });

  describe('Button States', () => {
    it('should disable Add User button when org ID is empty', () => {
      render(<AddUserPage />);
      const button = screen.getByRole('button', { name: /Add User/i });
      expect(button).toBeDisabled();
    });

    it('should disable Add User button when username is empty', async () => {
      render(<AddUserPage />);
      const orgInput = screen.getByLabelText('Organization ID');
      const passInput = screen.getByLabelText('Password');
      
      await userEvent.type(orgInput, 'org-123');
      await userEvent.type(passInput, 'pass123');

      const button = screen.getByRole('button', { name: /Add User/i });
      expect(button).toBeDisabled();
    });

    it('should disable Add User button when password is empty', async () => {
      render(<AddUserPage />);
      const orgInput = screen.getByLabelText('Organization ID');
      const userInput = screen.getByLabelText('Username');
      
      await userEvent.type(orgInput, 'org-123');
      await userEvent.type(userInput, 'john');

      const button = screen.getByRole('button', { name: /Add User/i });
      expect(button).toBeDisabled();
    });

    it('should enable Add User button when all fields are filled', async () => {
      render(<AddUserPage />);
      const orgInput = screen.getByLabelText('Organization ID');
      const userInput = screen.getByLabelText('Username');
      const passInput = screen.getByLabelText('Password');
      
      await userEvent.type(orgInput, 'org-123');
      await userEvent.type(userInput, 'john');
      await userEvent.type(passInput, 'pass123');

      const button = screen.getByRole('button', { name: /Add User/i });
      expect(button).not.toBeDisabled();
    });

    it('should not show Reset button when status is idle', () => {
      render(<AddUserPage />);
      expect(screen.queryByRole('button', { name: /Reset/i })).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should call API on form submission', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 202,
          json: () => Promise.resolve({ job_id: 'job-123' }),
          text: () => Promise.resolve(''),
        })
      );

      render(<AddUserPage />);
      const orgInput = screen.getByLabelText('Organization ID');
      const userInput = screen.getByLabelText('Username');
      const passInput = screen.getByLabelText('Password');
      
      await userEvent.type(orgInput, 'org-123');
      await userEvent.type(userInput, 'john');
      await userEvent.type(passInput, 'pass123');

      const button = screen.getByRole('button', { name: /Add User/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          'http://localhost:5050/task/dc/add_user',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              org_id: 'org-123',
              username: 'john',
              password: 'pass123',
            }),
          })
        );
      });
    });

    it('should show starting state when submitting', async () => {
      global.fetch = jest.fn(() =>
        new Promise((resolve) =>
          setTimeout(() =>
            resolve({
              ok: true,
              status: 202,
              json: () => Promise.resolve({ job_id: 'job-123' }),
              text: () => Promise.resolve(''),
            }), 100)
        )
      );

      render(<AddUserPage />);
      const orgInput = screen.getByLabelText('Organization ID');
      const userInput = screen.getByLabelText('Username');
      const passInput = screen.getByLabelText('Password');
      
      await userEvent.type(orgInput, 'org-123');
      await userEvent.type(userInput, 'john');
      await userEvent.type(passInput, 'pass123');

      const button = screen.getByRole('button', { name: /Add User/i });
      fireEvent.click(button);

      expect(screen.getByRole('button', { name: /Starting…/i })).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('should clear all fields when reset is clicked', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 202,
          json: () => Promise.resolve({ job_id: 'job-123' }),
          text: () => Promise.resolve(''),
        })
      );

      render(<AddUserPage />);
      const orgInput = screen.getByLabelText('Organization ID');
      const userInput = screen.getByLabelText('Username');
      const passInput = screen.getByLabelText('Password');
      
      await userEvent.type(orgInput, 'org-123');
      await userEvent.type(userInput, 'john');
      await userEvent.type(passInput, 'pass123');

      const button = screen.getByRole('button', { name: /Add User/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /Reset/i })).toBeInTheDocument();
      });

      const resetButton = screen.getByRole('button', { name: /Reset/i });
      fireEvent.click(resetButton);

      expect(screen.queryByRole('button', { name: /Reset/i })).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve('Bad request'),
        })
      );

      render(<AddUserPage />);
      const orgInput = screen.getByLabelText('Organization ID');
      const userInput = screen.getByLabelText('Username');
      const passInput = screen.getByLabelText('Password');
      
      await userEvent.type(orgInput, 'org-123');
      await userEvent.type(userInput, 'john');
      await userEvent.type(passInput, 'pass123');

      const button = screen.getByRole('button', { name: /Add User/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/Bad request/i)).toBeInTheDocument();
      });
    });

    it('should handle missing job_id in response', async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 202,
          json: () => Promise.resolve({}),
          text: () => Promise.resolve(''),
        })
      );

      render(<AddUserPage />);
      const orgInput = screen.getByLabelText('Organization ID');
      const userInput = screen.getByLabelText('Username');
      const passInput = screen.getByLabelText('Password');
      
      await userEvent.type(orgInput, 'org-123');
      await userEvent.type(userInput, 'john');
      await userEvent.type(passInput, 'pass123');

      const button = screen.getByRole('button', { name: /Add User/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/missing job_id/i)).toBeInTheDocument();
      });
    });
  });

  describe('Cleanup', () => {
    it('should clear polling interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const { unmount } = render(<AddUserPage />);
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});
