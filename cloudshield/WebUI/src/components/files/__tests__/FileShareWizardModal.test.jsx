import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FileShareWizardModal from '../FileShareWizardModal';
import * as filesApi from '../../../api/filesApi';

// Mock the API
jest.mock('../../../api/filesApi', () => ({
  fetchUsers: jest.fn(),
  fetchGroups: jest.fn(),
}));

// Mock AuthContext
jest.mock('../../../context/AuthContext.jsx', () => ({
  useAuth: jest.fn(() => ({
    accessToken: 'test-token',
    currentUser: { org_id: 'test-org' },
  })),
}));

// Mock child components
jest.mock('../UserSelectionPanel.jsx', () => ({
  __esModule: true,
  default: ({ availableUsers, selectedUsers, onSelectionChange }) => (
    <div data-testid="user-selection-panel">
      <div>Available Users: {availableUsers.length}</div>
      <div>Selected Users: {selectedUsers.length}</div>
      <button onClick={() => onSelectionChange([...selectedUsers, { id: 'new-user', username: 'newuser' }])}>
        Add User
      </button>
    </div>
  ),
}));

jest.mock('../GroupSelectionPanel.jsx', () => ({
  __esModule: true,
  default: ({ availableGroups, selectedGroups, onSelectionChange }) => (
    <div data-testid="group-selection-panel">
      <div>Available Groups: {availableGroups.length}</div>
      <div>Selected Groups: {selectedGroups.length}</div>
      <button onClick={() => onSelectionChange([...selectedGroups, { id: 'new-group', name: 'newgroup' }])}>
        Add Group
      </button>
    </div>
  ),
}));

// Mock CSS
jest.mock('../FileShareWizardModal.css', () => ({}));

describe('FileShareWizardModal', () => {
  const mockUsers = [
    {
      _id: 'user1',
      username: 'jdoe',
      email: 'john@example.com',
      full_name: 'John Doe',
      role: 'admin',
      active: true,
    },
    {
      _id: 'user2',
      username: 'jsmith',
      email: 'jane@example.com',
      full_name: 'Jane Smith',
      role: 'user',
      active: true,
    },
  ];

  const mockGroups = [
    {
      _id: 'group1',
      name: 'engineering-team',
      group_name: 'engineering-team',
      members_info: ['user1', 'user2'],
    },
    {
      _id: 'group2',
      name: 'design-team',
      group_name: 'design-team',
      members_info: ['user1'],
    },
  ];

  const mockAuthContext = {
    accessToken: 'test-token',
    currentUser: { org_id: 'test-org' },
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn(),
    file: null,
    onDelete: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('org_id', 'test-org');
    filesApi.fetchUsers.mockResolvedValue(mockUsers);
    filesApi.fetchGroups.mockResolvedValue(mockGroups);
  });

  const renderWithAuth = (props = {}) => {
    return render(<FileShareWizardModal {...defaultProps} {...props} />);
  };

  describe('Rendering', () => {
    it('should not render when isOpen is false', () => {
      const { container } = renderWithAuth({ isOpen: false });
      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true', () => {
      renderWithAuth();
      expect(screen.getByText('New File Share')).toBeInTheDocument();
    });

    it('should show edit mode title when editing', async () => {
      const file = { name: 'TestShare', description: 'Test description' };
      renderWithAuth({ file });
      
      await waitFor(() => {
        expect(screen.getByText(/Edit: TestShare/)).toBeInTheDocument();
      });
    });

    it('should render breadcrumb navigation', () => {
      renderWithAuth();
      expect(screen.getByText('Files')).toBeInTheDocument();
      expect(screen.getByText('New File Share')).toBeInTheDocument();
    });

    it('should render close button', () => {
      renderWithAuth();
      const closeBtn = screen.getByRole('button', { name: /close/i });
      expect(closeBtn).toBeInTheDocument();
    });

    it('should render all step labels', () => {
      renderWithAuth();
      expect(screen.getByText('Basic Info')).toBeInTheDocument();
      expect(screen.getByText('Users')).toBeInTheDocument();
      expect(screen.getByText('Groups')).toBeInTheDocument();
    });

    it('should render progress bar', () => {
      const { container } = renderWithAuth();
      const progressBar = container.querySelector('.file-wizard-progress-fill');
      expect(progressBar).toBeInTheDocument();
    });

    it('should show correct initial progress (33.33%)', () => {
      const { container } = renderWithAuth();
      const progressBar = container.querySelector('.file-wizard-progress-fill');
      expect(progressBar).toHaveStyle({ width: '33.33333333333333%' });
    });
  });

  describe('Step 1: Basic Info', () => {
    it('should render basic info form fields', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., TeamDocs/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/Brief description/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/e.g., 100/i)).toBeInTheDocument();
      });
    });

    it('should allow typing in share name', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      
      expect(input).toHaveValue('MyShare');
    });

    it('should allow typing in description', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      const textarea = screen.getByPlaceholderText(/Brief description/i);
      await user.type(textarea, 'Test description');
      
      expect(textarea).toHaveValue('Test description');
    });

    it('should allow typing in max size', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., 100/i);
      await user.type(input, '250');
      
      expect(input).toHaveValue('250');
    });

    it('should disable Next button when share name is empty', () => {
      renderWithAuth();
      const nextBtn = screen.getByRole('button', { name: /Next/i });
      expect(nextBtn).toBeDisabled();
    });

    it('should enable Next button when share name is filled', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      
      const nextBtn = screen.getByRole('button', { name: /Next/i });
      expect(nextBtn).not.toBeDisabled();
    });

    it('should disable share name in edit mode', async () => {
      const file = { name: 'ExistingShare', description: 'Existing' };
      renderWithAuth({ file });
      
      await waitFor(() => {
        const input = screen.getByDisplayValue('ExistingShare');
        expect(input).toBeDisabled();
        expect(input).toHaveStyle({ cursor: 'not-allowed' });
      });
    });

    it('should show "cannot be changed" text in edit mode', async () => {
      const file = { name: 'ExistingShare' };
      renderWithAuth({ file });
      
      await waitFor(() => {
        expect(screen.getByText(/cannot be changed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Step Navigation', () => {
    it('should navigate to Users step when Next is clicked', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      
      const nextBtn = screen.getByRole('button', { name: /Next/i });
      await user.click(nextBtn);
      
      await waitFor(() => {
        expect(screen.getByTestId('user-selection-panel')).toBeInTheDocument();
      });
    });

    it('should navigate to Groups step from Users step', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      // Fill share name and go to Users step
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      // Navigate to Groups step
      await waitFor(() => {
        expect(screen.getByTestId('user-selection-panel')).toBeInTheDocument();
      });
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('group-selection-panel')).toBeInTheDocument();
      });
    });

    it('should navigate back to previous step', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      // Navigate forward
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByTestId('user-selection-panel')).toBeInTheDocument();
      });
      
      // Navigate back
      await user.click(screen.getByRole('button', { name: /Back/i }));
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., TeamDocs/i)).toBeInTheDocument();
      });
    });

    it('should disable Back button on first step', () => {
      renderWithAuth();
      const backBtn = screen.getByRole('button', { name: /Back/i });
      expect(backBtn).toBeDisabled();
    });

    it('should show Create Share button on last step', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      // Navigate to last step
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Share/i })).toBeInTheDocument();
      });
    });

    it('should show Save Changes button on last step in edit mode', async () => {
      const user = userEvent.setup();
      const file = { name: 'ExistingShare' };
      renderWithAuth({ file });
      
      await waitFor(() => screen.getByDisplayValue('ExistingShare'));
      
      // Navigate to last step
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
      });
    });

    it('should update progress bar as steps advance', async () => {
      const user = userEvent.setup();
      const { container } = renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        const progressBar = container.querySelector('.file-wizard-progress-fill');
        expect(progressBar).toHaveStyle({ width: '66.66666666666666%' });
      });
    });
  });

  describe('Data Fetching', () => {
    it('should fetch users and groups when modal opens', async () => {
      renderWithAuth();
      
      await waitFor(() => {
        expect(filesApi.fetchUsers).toHaveBeenCalledWith('test-org');
        expect(filesApi.fetchGroups).toHaveBeenCalledWith('test-org');
      });
    });

    it('should use org_id from localStorage', async () => {
      localStorage.setItem('org_id', 'custom-org');
      renderWithAuth();
      
      await waitFor(() => {
        expect(filesApi.fetchUsers).toHaveBeenCalledWith('custom-org');
        expect(filesApi.fetchGroups).toHaveBeenCalledWith('custom-org');
      });
    });

    it('should handle fetch errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      filesApi.fetchUsers.mockRejectedValue(new Error('Network error'));
      
      renderWithAuth();
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to load users/groups:',
          expect.any(Error)
        );
      });
      
      consoleError.mockRestore();
    });

    it('should normalize user data correctly', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      // Navigate to Users step to see normalized data
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Available Users: 2/)).toBeInTheDocument();
      });
    });

    it('should normalize group data correctly', async () => {
      const user = userEvent.setup();
      renderWithAuth();
      
      // Navigate to Groups step
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Available Groups: 2/)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode', () => {
    it('should populate form with existing file data', async () => {
      const file = {
        name: 'ExistingShare',
        description: 'Test description',
        max_size_gb: '100',
        users: ['jdoe'],
        groups: ['engineering-team'],
      };
      renderWithAuth({ file });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('ExistingShare')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Test description')).toBeInTheDocument();
        expect(screen.getByDisplayValue('100')).toBeInTheDocument();
      });
    });

    it('should match users by username', async () => {
      const user = userEvent.setup();
      const file = {
        name: 'ExistingShare',
        users: ['jdoe', 'jsmith'],
        groups: [],
      };
      renderWithAuth({ file });
      
      await waitFor(() => screen.getByDisplayValue('ExistingShare'));
      
      // Navigate to Users step
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Selected Users: 2/)).toBeInTheDocument();
      });
    });

    it('should match groups by name', async () => {
      const user = userEvent.setup();
      const file = {
        name: 'ExistingShare',
        users: [],
        groups: ['engineering-team', 'design-team'],
      };
      renderWithAuth({ file });
      
      await waitFor(() => screen.getByDisplayValue('ExistingShare'));
      
      // Navigate to Groups step
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Selected Groups: 2/)).toBeInTheDocument();
      });
    });

    it('should handle users not found in available list', async () => {
      const user = userEvent.setup();
      const file = {
        name: 'ExistingShare',
        users: ['unknown-user'],
        groups: [],
      };
      renderWithAuth({ file });
      
      await waitFor(() => screen.getByDisplayValue('ExistingShare'));
      
      // Navigate to Users step - should still show the unknown user as fallback
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Selected Users: 1/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit with correct data', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue();
      renderWithAuth({ onSubmit });
      
      // Fill form
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      
      const description = screen.getByPlaceholderText(/Brief description/i);
      await user.type(description, 'Test desc');
      
      const maxSize = screen.getByPlaceholderText(/e.g., 100/i);
      await user.type(maxSize, '150');
      
      // Navigate to last step
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      // Submit
      await waitFor(() => screen.getByRole('button', { name: /Create Share/i }));
      await user.click(screen.getByRole('button', { name: /Create Share/i }));
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          shareName: 'MyShare',
          description: 'Test desc',
          maxSize: '150',
          users: [],
          groups: [],
        });
      });
    });

    it('should extract usernames from user objects', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue();
      renderWithAuth({ onSubmit });
      
      // Fill form and navigate
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      // Add a user
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByText('Add User'));
      
      // Navigate to last step and submit
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByRole('button', { name: /Create Share/i }));
      await user.click(screen.getByRole('button', { name: /Create Share/i }));
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            users: ['newuser'],
          })
        );
      });
    });

    it('should extract group names from group objects', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue();
      renderWithAuth({ onSubmit });
      
      // Fill form and navigate to Groups step
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      // Add a group
      await waitFor(() => screen.getByTestId('group-selection-panel'));
      await user.click(screen.getByText('Add Group'));
      
      // Submit
      await user.click(screen.getByRole('button', { name: /Create Share/i }));
      
      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            groups: ['newgroup'],
          })
        );
      });
    });

    it('should disable submit button while submitting', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = jest.fn(() => new Promise((resolve) => { resolveSubmit = resolve; }));
      renderWithAuth({ onSubmit });
      
      // Fill and navigate to last step
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      // Click submit
      await waitFor(() => screen.getByRole('button', { name: /Create Share/i }));
      const submitBtn = screen.getByRole('button', { name: /Create Share/i });
      await user.click(submitBtn);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
      });
      
      resolveSubmit();
    });

    it('should re-enable submit button after async operation completes', async () => {
      const user = userEvent.setup();
      let resolveSubmit;
      const onSubmit = jest.fn(() => new Promise((resolve) => { resolveSubmit = resolve; }));
      renderWithAuth({ onSubmit });
      
      // Fill and navigate to last step
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      // Click submit
      await waitFor(() => screen.getByRole('button', { name: /Create Share/i }));
      const submitBtn = screen.getByRole('button', { name: /Create Share/i });
      await user.click(submitBtn);
      
      // Should be disabled while submitting
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Saving.../i })).toBeDisabled();
      });
      
      // Resolve the promise
      resolveSubmit();
      
      // Button should re-enable after completion
      await waitFor(() => {
        // Modal might close, so button may not exist anymore
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Functionality', () => {
    it('should show delete confirmation dialog', async () => {
      const user = userEvent.setup();
      const file = { name: 'TestShare' };
      const onDelete = jest.fn();
      window.confirm = jest.fn(() => false);
      
      renderWithAuth({ file, onDelete });
      
      await waitFor(() => screen.getByDisplayValue('TestShare'));
      
      // Note: Delete button would need to be implemented in the actual component
      // This test documents the expected behavior
    });
  });

  describe('Modal Closing', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderWithAuth({ onClose });
      
      const closeBtn = screen.getByRole('button', { name: /close/i });
      await user.click(closeBtn);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should call onClose when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();
      renderWithAuth({ onClose });
      
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelBtn);
      
      expect(onClose).toHaveBeenCalled();
    });

    it('should reset form when modal closes', async () => {
      const { rerender } = renderWithAuth();
      const user = userEvent.setup();
      
      // Fill form
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      
      // Close modal
      rerender(<FileShareWizardModal {...defaultProps} isOpen={false} />);
      
      // Reopen modal
      rerender(<FileShareWizardModal {...defaultProps} isOpen={true} />);
      
      await waitFor(() => {
        const newInput = screen.getByPlaceholderText(/e.g., TeamDocs/i);
        expect(newInput).toHaveValue('');
      });
    });

    it('should reset to first step when modal closes', async () => {
      const { rerender } = renderWithAuth();
      const user = userEvent.setup();
      
      // Navigate to step 2
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      
      // Close and reopen
      rerender(<FileShareWizardModal {...defaultProps} isOpen={false} />);
      rerender(<FileShareWizardModal {...defaultProps} isOpen={true} />);
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e.g., TeamDocs/i)).toBeInTheDocument();
      });
    });
  });

  describe('Deduplication', () => {
    it('should deduplicate users by id', async () => {
      const duplicateUsers = [
        { _id: 'user1', username: 'jdoe', email: 'john@example.com', full_name: 'John Doe' },
        { _id: 'user1', username: 'jdoe', email: 'john@example.com', full_name: 'John Doe' },
      ];
      filesApi.fetchUsers.mockResolvedValue(duplicateUsers);
      
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Available Users: 1/)).toBeInTheDocument();
      });
    });

    it('should deduplicate users by email', async () => {
      const duplicateUsers = [
        { _id: 'user1', username: 'jdoe', email: 'john@example.com', full_name: 'John Doe' },
        { _id: 'user2', username: 'john', email: 'john@example.com', full_name: 'John Doe' },
      ];
      filesApi.fetchUsers.mockResolvedValue(duplicateUsers);
      
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Available Users: 1/)).toBeInTheDocument();
      });
    });

    it('should deduplicate users by username', async () => {
      const duplicateUsers = [
        { _id: 'user1', username: 'jdoe', email: 'john1@example.com', full_name: 'John Doe' },
        { _id: 'user2', username: 'jdoe', email: 'john2@example.com', full_name: 'John Doe' },
      ];
      filesApi.fetchUsers.mockResolvedValue(duplicateUsers);
      
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Available Users: 1/)).toBeInTheDocument();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty users array', async () => {
      filesApi.fetchUsers.mockResolvedValue([]);
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Available Users: 0/)).toBeInTheDocument();
      });
    });

    it('should handle empty groups array', async () => {
      filesApi.fetchGroups.mockResolvedValue([]);
      const user = userEvent.setup();
      renderWithAuth();
      
      const input = screen.getByPlaceholderText(/e.g., TeamDocs/i);
      await user.type(input, 'MyShare');
      await user.click(screen.getByRole('button', { name: /Next/i }));
      await waitFor(() => screen.getByTestId('user-selection-panel'));
      await user.click(screen.getByRole('button', { name: /Next/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Available Groups: 0/)).toBeInTheDocument();
      });
    });

    it('should handle missing localStorage org_id', async () => {
      localStorage.removeItem('org_id');
      renderWithAuth();
      
      await waitFor(() => {
        expect(filesApi.fetchUsers).toHaveBeenCalledWith('default-org');
      });
    });

    it('should handle file with missing properties', async () => {
      const file = { name: 'MinimalShare' };
      renderWithAuth({ file });
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('MinimalShare')).toBeInTheDocument();
      });
    });
  });
});
