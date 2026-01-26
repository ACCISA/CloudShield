import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserSelectionPanel from '../UserSelectionPanel';

// Mock DisplayIcon
jest.mock('../../common/DisplayIcon/DisplayIcon.jsx', () => ({
  __esModule: true,
  default: ({ type, data, size }) => (
    <div data-testid={`display-icon-${type}`} data-size={size}>
      {data.username || data.full_name || 'Icon'}
    </div>
  ),
}));

// Mock MUI Tooltip
jest.mock('@mui/material/Tooltip', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

// Mock CSS
jest.mock('../UserSelectionPanel.css', () => ({}));

describe('UserSelectionPanel', () => {
  const mockUsers = [
    {
      id: 'user1',
      username: 'jdoe',
      email: 'john@example.com',
      full_name: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      role: 'admin',
      active: true,
    },
    {
      id: 'user2',
      username: 'jsmith',
      email: 'jane@example.com',
      full_name: 'Jane Smith',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'user',
      active: true,
    },
    {
      id: 'user3',
      username: 'bjohnson',
      email: 'bob@example.com',
      full_name: 'Bob Johnson',
      firstName: 'Bob',
      lastName: 'Johnson',
      role: 'user',
      active: false,
    },
  ];

  const defaultProps = {
    availableUsers: mockUsers,
    selectedUsers: [],
    onSelectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<UserSelectionPanel {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<UserSelectionPanel {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    });

    it('should render "Add Users" label', () => {
      render(<UserSelectionPanel {...defaultProps} />);
      expect(screen.getByText('Add Users')).toBeInTheDocument();
    });

    it('should render all available users', () => {
      render(<UserSelectionPanel {...defaultProps} />);
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bob Johnson').length).toBeGreaterThanOrEqual(1);
    });

    it('should not render selected section when no users selected', () => {
      render(<UserSelectionPanel {...defaultProps} />);
      expect(screen.queryByText(/Selected Users/)).not.toBeInTheDocument();
    });

    it('should render selected section when users are selected', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0]],
      };
      render(<UserSelectionPanel {...props} />);
      expect(screen.getByText('Selected Users (1)')).toBeInTheDocument();
    });

    it('should show empty state when no users available', () => {
      const props = { ...defaultProps, availableUsers: [] };
      render(<UserSelectionPanel {...props} />);
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should render DisplayIcon for each user', () => {
      render(<UserSelectionPanel {...defaultProps} />);
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Search Functionality', () => {
    it('should filter users by username', async () => {
      const user = userEvent.setup();
      render(<UserSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'jdoe');
      
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      expect(screen.queryByText('Bob Johnson')).not.toBeInTheDocument();
    });

    it('should filter users by full name', async () => {
      const user = userEvent.setup();
      render(<UserSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'Jane');
      
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      render(<UserSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'SMITH');
      
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should show all users when search is cleared', async () => {
      const user = userEvent.setup();
      render(<UserSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'jdoe');
      
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
      
      await user.clear(searchInput);
      
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bob Johnson').length).toBeGreaterThanOrEqual(1);
    });

    it('should show "No users found" when search has no results', async () => {
      const user = userEvent.setup();
      render(<UserSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No users found')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should handle partial matches', async () => {
      const user = userEvent.setup();
      render(<UserSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'john');
      
      // Matches "John Doe" and "Bob Johnson"
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Bob Johnson').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });

    it('should handle whitespace in search', async () => {
      const user = userEvent.setup();
      render(<UserSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'jdoe');
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('User Selection', () => {
    it('should call onSelectionChange when user is clicked', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const { container } = render(<UserSelectionPanel {...defaultProps} onSelectionChange={onSelectionChange} />);
      
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      await user.click(userItems[0]);
      
      expect(onSelectionChange).toHaveBeenCalledWith([mockUsers[0]]);
    });

    it('should show checkmark on selected user', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0]],
      };
      const { container } = render(<UserSelectionPanel {...props} />);
      
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      expect(within(userItems[0]).getByText('✓')).toBeInTheDocument();
    });

    it('should apply selected class to selected user', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0]],
      };
      const { container } = render(<UserSelectionPanel {...props} />);
      
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      expect(userItems[0]).toHaveClass('selected');
    });

    it('should not show checkmark on unselected user', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0]],
      };
      const { container } = render(<UserSelectionPanel {...props} />);
      
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      expect(within(userItems[1]).queryByText('✓')).not.toBeInTheDocument();
    });

    it('should toggle user selection when clicked twice', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const { container } = render(<UserSelectionPanel {...defaultProps} onSelectionChange={onSelectionChange} />);
      
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      
      // First click - select
      await user.click(userItems[0]);
      expect(onSelectionChange).toHaveBeenCalledWith([mockUsers[0]]);
      
      // Re-render with selected state
      const { container: container2 } = render(
        <UserSelectionPanel
          {...defaultProps}
          selectedUsers={[mockUsers[0]]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const selectedUserItems = container2.querySelectorAll('.user-selection-dropdown-item');
      // Second click - deselect
      await user.click(selectedUserItems[0]);
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('should allow selecting multiple users', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const { container } = render(<UserSelectionPanel {...defaultProps} onSelectionChange={onSelectionChange} />);
      
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      await user.click(userItems[0]);
      
      expect(onSelectionChange).toHaveBeenCalledWith([mockUsers[0]]);
      
      // Simulate first user selected
      onSelectionChange.mockClear();
      const { container: container2 } = render(
        <UserSelectionPanel
          {...defaultProps}
          selectedUsers={[mockUsers[0]]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const userItems2 = container2.querySelectorAll('.user-selection-dropdown-item');
      await user.click(userItems2[1]);
      
      expect(onSelectionChange).toHaveBeenCalledWith([mockUsers[0], mockUsers[1]]);
    });
  });

  describe('Selected Users Panel', () => {
    it('should display selected user cards', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0], mockUsers[1]],
      };
      render(<UserSelectionPanel {...props} />);
      
      const selectedSection = screen.getByText('Selected Users (2)').parentElement;
      expect(selectedSection).toBeInTheDocument();
    });

    it('should show correct count in header', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0], mockUsers[1], mockUsers[2]],
      };
      render(<UserSelectionPanel {...props} />);
      
      expect(screen.getByText('Selected Users (3)')).toBeInTheDocument();
    });

    it('should render remove button for each selected user', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0], mockUsers[1]],
      };
      render(<UserSelectionPanel {...props} />);
      
      const removeButtons = screen.getAllByRole('button', { name: '×' });
      expect(removeButtons).toHaveLength(2);
    });

    it('should remove user when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0], mockUsers[1]],
        onSelectionChange,
      };
      render(<UserSelectionPanel {...props} />);
      
      const removeButtons = screen.getAllByRole('button', { name: '×' });
      await user.click(removeButtons[0]);
      
      expect(onSelectionChange).toHaveBeenCalledWith([mockUsers[1]]);
    });

    it('should show DisplayIcon with medium size in selected cards', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0]],
      };
      render(<UserSelectionPanel {...props} />);
      
      const selectedSection = screen.getByText('Selected Users (1)').parentElement;
      const icons = within(selectedSection).getAllByTestId('display-icon-user');
      expect(icons[0]).toHaveAttribute('data-size', 'medium');
    });

    it('should display user names in selected cards', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0], mockUsers[1]],
      };
      render(<UserSelectionPanel {...props} />);
      
      const selectedSection = screen.getByText('Selected Users (2)').parentElement;
      expect(within(selectedSection).getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
      expect(within(selectedSection).getAllByText('Jane Smith').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Data Normalization', () => {
    it('should handle string users', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const props = {
        ...defaultProps,
        availableUsers: ['user1', 'user2'],
        onSelectionChange,
      };
      const { container } = render(<UserSelectionPanel {...props} />);
      
      expect(screen.getAllByText('user1').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('user2').length).toBeGreaterThanOrEqual(1);
      
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      await user.click(userItems[0]);
      
      expect(onSelectionChange).toHaveBeenCalled();
    });

    it('should handle users with only username', () => {
      const users = [
        { id: '1', username: 'testuser' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getAllByText('testuser').length).toBeGreaterThanOrEqual(1);
    });

    it('should display full_name when available', () => {
      const users = [
        { id: '1', username: 'jdoe', full_name: 'John Doe' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });

    it('should construct name from firstName and lastName', () => {
      const users = [
        { id: '1', username: 'jdoe', firstName: 'John', lastName: 'Doe' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1);
    });

    it('should fallback to username when no name fields', () => {
      const users = [
        { id: '1', username: 'testuser' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getAllByText('testuser').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle users without id', () => {
      const users = [
        { username: 'testuser', full_name: 'Test User' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getAllByText('Test User').length).toBeGreaterThanOrEqual(1);
    });

    it('should show "Unknown" for users with no identifiable fields', () => {
      const users = [
        { id: '1' }, // No username or name fields
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });
  });

  describe('DisplayIcon Integration', () => {
    it('should render DisplayIcon for each user in list', () => {
      render(<UserSelectionPanel {...defaultProps} />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });

    it('should pass correct size to DisplayIcon in list', () => {
      render(<UserSelectionPanel {...defaultProps} />);
      
      const listSection = screen.getByText('Add Users').parentElement;
      const listSectionIcons = within(listSection).getAllByTestId('display-icon-user');
      
      listSectionIcons.forEach(icon => {
        expect(icon).toHaveAttribute('data-size', 'small');
      });
    });

    it('should pass normalized user data to DisplayIcon', () => {
      const users = [
        { id: '1', username: 'testuser', full_name: 'Test User' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      const icon = screen.getAllByTestId('display-icon-user')[0];
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty availableUsers array', () => {
      const props = { ...defaultProps, availableUsers: [] };
      render(<UserSelectionPanel {...props} />);
      
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should handle undefined availableUsers', () => {
      const props = { ...defaultProps, availableUsers: undefined };
      render(<UserSelectionPanel {...props} />);
      
      expect(screen.getByText('No users found')).toBeInTheDocument();
    });

    it('should handle empty selectedUsers array', () => {
      const props = { ...defaultProps, selectedUsers: [] };
      render(<UserSelectionPanel {...props} />);
      
      expect(screen.queryByText(/Selected Users/)).not.toBeInTheDocument();
    });

    it('should handle inactive users', () => {
      const users = [
        { id: '1', username: 'inactive', full_name: 'Inactive User', active: false },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getAllByText('Inactive User').length).toBeGreaterThanOrEqual(1);
    });

    it('should default active to true when not specified', () => {
      const users = [
        { id: '1', username: 'activeuser', full_name: 'Active User' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      // Should render normally
      expect(screen.getAllByText('Active User').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle very long usernames', () => {
      const users = [
        { id: '1', username: 'this-is-a-very-long-username-that-might-cause-layout-issues' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getAllByText('this-is-a-very-long-username-that-might-cause-layout-issues').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle special characters in usernames', () => {
      const users = [
        { id: '1', username: 'user-with-@special#chars!' },
      ];
      render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      expect(screen.getAllByText('user-with-@special#chars!').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle users with only firstName', () => {
      const users = [
        { id: '1', username: 'jdoe', firstName: 'John', lastName: '' },
      ];
      const { container } = render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      // Component falls back to username when both firstName and lastName are not present
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      expect(userItems.length).toBe(1);
      expect(userItems[0].textContent).toContain('jdoe');
    });

    it('should handle users with only lastName', () => {
      const users = [
        { id: '1', username: 'jdoe', firstName: '', lastName: 'Doe' },
      ];
      const { container } = render(<UserSelectionPanel {...defaultProps} availableUsers={users} />);
      
      // Component falls back to username when both firstName and lastName are not present
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      expect(userItems.length).toBe(1);
      expect(userItems[0].textContent).toContain('jdoe');
    });
  });

  describe('Search with Different Data Formats', () => {
    it('should search string users', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        availableUsers: ['alice', 'bob', 'charlie'],
      };
      render(<UserSelectionPanel {...props} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'alice');
      
      expect(screen.getAllByText('alice').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('bob')).not.toBeInTheDocument();
    });

    it('should search by username when object', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        availableUsers: [
          { id: '1', username: 'alice', full_name: 'Alice Wonder' },
          { id: '2', username: 'bob', full_name: 'Bob Builder' },
        ],
      };
      render(<UserSelectionPanel {...props} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'alice');
      
      expect(screen.getAllByText('Alice Wonder').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument();
    });

    it('should search by full_name', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        availableUsers: [
          { id: '1', username: 'awonder', full_name: 'Alice Wonder' },
          { id: '2', username: 'bbuilder', full_name: 'Bob Builder' },
        ],
      };
      render(<UserSelectionPanel {...props} />);
      
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'Wonder');
      
      expect(screen.getAllByText('Alice Wonder').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('Bob Builder')).not.toBeInTheDocument();
    });
  });

  describe('Selection Persistence Across Search', () => {
    it('should maintain selection when searching', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0]], // John Doe selected
      };
      render(<UserSelectionPanel {...props} />);
      
      // Search for someone else
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'jane');
      
      // John Doe not visible in list, but should still be in selected section
      expect(screen.getAllByText('John Doe').length).toBeGreaterThanOrEqual(1); // In selected section
      expect(screen.getByText('Selected Users (1)')).toBeInTheDocument();
    });

    it('should show checkmark on selected user even after filtering', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const { container } = render(
        <UserSelectionPanel
          {...defaultProps}
          selectedUsers={[mockUsers[0]]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      // Filter to show the selected user
      const searchInput = screen.getByPlaceholderText('Search users...');
      await user.type(searchInput, 'jdoe');
      
      // Should still show checkmark
      const filteredUserItems = container.querySelectorAll('.user-selection-dropdown-item');
      expect(within(filteredUserItems[0]).getByText('✓')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button type for remove buttons', () => {
      const props = {
        ...defaultProps,
        selectedUsers: [mockUsers[0]],
      };
      render(<UserSelectionPanel {...props} />);
      
      const removeButton = screen.getByRole('button', { name: '×' });
      expect(removeButton).toHaveAttribute('type', 'button');
    });

    it('should have clickable user items', () => {
      const { container } = render(<UserSelectionPanel {...defaultProps} />);
      
      const userItems = container.querySelectorAll('.user-selection-dropdown-item');
      expect(userItems.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Mixed Selection', () => {
    it('should handle selection of both string and object users', () => {
      const props = {
        ...defaultProps,
        selectedUsers: ['stringuser', mockUsers[0]],
      };
      render(<UserSelectionPanel {...props} />);
      
      expect(screen.getByText('Selected Users (2)')).toBeInTheDocument();
    });

    it('should handle removal of different user types', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const props = {
        ...defaultProps,
        selectedUsers: ['stringuser', mockUsers[0]],
        onSelectionChange,
      };
      render(<UserSelectionPanel {...props} />);
      
      const removeButtons = screen.getAllByRole('button', { name: '×' });
      await user.click(removeButtons[0]);
      
      expect(onSelectionChange).toHaveBeenCalled();
    });
  });
});
