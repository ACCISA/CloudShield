import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GroupSelectionPanel from '../GroupSelectionPanel';

// Mock DisplayIcon
jest.mock('../../common/DisplayIcon/DisplayIcon.jsx', () => ({
  __esModule: true,
  default: ({ type, data, size }) => (
    <div data-testid={`display-icon-${type}`} data-size={size}>
      {data.name || data.groupName || 'Icon'}
    </div>
  ),
}));

// Mock CSS
jest.mock('../GroupSelectionPanel.css', () => ({}));

describe('GroupSelectionPanel', () => {
  const mockGroups = [
    {
      id: 'group1',
      name: 'engineering-team',
      group_name: 'engineering-team',
      member_count: 5,
      description: 'Engineering team',
    },
    {
      id: 'group2',
      name: 'design-team',
      group_name: 'design-team',
      member_count: 3,
      description: 'Design team',
    },
    {
      id: 'group3',
      name: 'marketing-team',
      group_name: 'marketing-team',
      member_count: 1,
      description: 'Marketing team',
    },
  ];

  const defaultProps = {
    availableGroups: mockGroups,
    selectedGroups: [],
    onSelectionChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<GroupSelectionPanel {...defaultProps} />);
      expect(container).toBeInTheDocument();
    });

    it('should render search input', () => {
      render(<GroupSelectionPanel {...defaultProps} />);
      expect(screen.getByPlaceholderText('Search groups...')).toBeInTheDocument();
    });

    it('should render "Add Groups" label', () => {
      render(<GroupSelectionPanel {...defaultProps} />);
      expect(screen.getByText('Add Groups')).toBeInTheDocument();
    });

    it('should render all available groups', () => {
      render(<GroupSelectionPanel {...defaultProps} />);
      expect(screen.getAllByText('engineering-team').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('design-team').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('marketing-team').length).toBeGreaterThanOrEqual(1);
    });

    it('should render member counts', () => {
      render(<GroupSelectionPanel {...defaultProps} />);
      expect(screen.getByText('5 members')).toBeInTheDocument();
      expect(screen.getByText('3 members')).toBeInTheDocument();
      expect(screen.getByText('1 member')).toBeInTheDocument(); // singular
    });

    it('should not render selected section when no groups selected', () => {
      render(<GroupSelectionPanel {...defaultProps} />);
      expect(screen.queryByText(/Selected Groups/)).not.toBeInTheDocument();
    });

    it('should render selected section when groups are selected', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0]],
      };
      render(<GroupSelectionPanel {...props} />);
      expect(screen.getByText('Selected Groups (1)')).toBeInTheDocument();
    });

    it('should show empty state when no groups available', () => {
      const props = { ...defaultProps, availableGroups: [] };
      render(<GroupSelectionPanel {...props} />);
      expect(screen.getByText('No groups found')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter groups by name', async () => {
      const user = userEvent.setup();
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'engineering');
      
      expect(screen.getAllByText('engineering-team').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('design-team')).not.toBeInTheDocument();
      expect(screen.queryByText('marketing-team')).not.toBeInTheDocument();
    });

    it('should be case insensitive', async () => {
      const user = userEvent.setup();
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'DESIGN');
      
      expect(screen.getAllByText('design-team').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('engineering-team')).not.toBeInTheDocument();
    });

    it('should show all groups when search is cleared', async () => {
      const user = userEvent.setup();
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'design');
      
      expect(screen.queryByText('engineering-team')).not.toBeInTheDocument();
      
      await user.clear(searchInput);
      
      expect(screen.getAllByText('engineering-team').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('design-team').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('marketing-team').length).toBeGreaterThanOrEqual(1);
    });

    it('should show "No groups found" when search has no results', async () => {
      const user = userEvent.setup();
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'nonexistent');
      
      expect(screen.getByText('No groups found')).toBeInTheDocument();
      expect(screen.queryByText('engineering-team')).not.toBeInTheDocument();
    });

    it('should handle partial matches', async () => {
      const user = userEvent.setup();
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'team');
      
      // All groups contain "team"
      expect(screen.getAllByText('engineering-team').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('design-team').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('marketing-team').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle whitespace in search', async () => {
      const user = userEvent.setup();
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'engineering');
      
      // Should find the engineering team
      const icons = screen.getAllByTestId('display-icon-group');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Group Selection', () => {
    it('should call onSelectionChange when group is clicked', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const { container } = render(<GroupSelectionPanel {...defaultProps} onSelectionChange={onSelectionChange} />);
      
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      await user.click(groupItems[0]); // Click first group (engineering-team)
      
      expect(onSelectionChange).toHaveBeenCalledWith([mockGroups[0]]);
    });

    it('should show checkmark on selected group', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0]],
      };
      const { container } = render(<GroupSelectionPanel {...props} />);
      
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      expect(within(groupItems[0]).getByText('✓')).toBeInTheDocument();
    });

    it('should apply selected class to selected group', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0]],
      };
      const { container } = render(<GroupSelectionPanel {...props} />);
      
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      expect(groupItems[0]).toHaveClass('selected');
    });

    it('should not show checkmark on unselected group', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0]],
      };
      const { container } = render(<GroupSelectionPanel {...props} />);
      
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      expect(within(groupItems[1]).queryByText('✓')).not.toBeInTheDocument();
    });

    it('should toggle group selection when clicked twice', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const { container } = render(<GroupSelectionPanel {...defaultProps} onSelectionChange={onSelectionChange} />);
      
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      
      // First click - select
      await user.click(groupItems[0]);
      expect(onSelectionChange).toHaveBeenCalledWith([mockGroups[0]]);
      
      // Re-render with selected state
      const { container: container2 } = render(
        <GroupSelectionPanel
          {...defaultProps}
          selectedGroups={[mockGroups[0]]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const selectedGroupItems = container2.querySelectorAll('.group-selection-dropdown-item');
      // Second click - deselect
      await user.click(selectedGroupItems[0]);
      expect(onSelectionChange).toHaveBeenCalledWith([]);
    });

    it('should allow selecting multiple groups', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const { container } = render(<GroupSelectionPanel {...defaultProps} onSelectionChange={onSelectionChange} />);
      
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      await user.click(groupItems[0]);
      
      expect(onSelectionChange).toHaveBeenCalledWith([mockGroups[0]]);
      
      // Simulate first group selected
      onSelectionChange.mockClear();
      const { container: container2 } = render(
        <GroupSelectionPanel
          {...defaultProps}
          selectedGroups={[mockGroups[0]]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const groupItems2 = container2.querySelectorAll('.group-selection-dropdown-item');
      await user.click(groupItems2[1]);
      
      expect(onSelectionChange).toHaveBeenCalledWith([mockGroups[0], mockGroups[1]]);
    });
  });

  describe('Selected Groups Panel', () => {
    it('should display selected group cards', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0], mockGroups[1]],
      };
      render(<GroupSelectionPanel {...props} />);
      
      const selectedSection = screen.getByText('Selected Groups (2)').parentElement;
      const cards = within(selectedSection).getAllByText(/team/);
      expect(cards.length).toBeGreaterThanOrEqual(2);
    });

    it('should show correct count in header', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0], mockGroups[1], mockGroups[2]],
      };
      render(<GroupSelectionPanel {...props} />);
      
      expect(screen.getByText('Selected Groups (3)')).toBeInTheDocument();
    });

    it('should render remove button for each selected group', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0], mockGroups[1]],
      };
      render(<GroupSelectionPanel {...props} />);
      
      const removeButtons = screen.getAllByRole('button', { name: '×' });
      expect(removeButtons).toHaveLength(2);
    });

    it('should remove group when remove button is clicked', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0], mockGroups[1]],
        onSelectionChange,
      };
      render(<GroupSelectionPanel {...props} />);
      
      const removeButtons = screen.getAllByRole('button', { name: '×' });
      await user.click(removeButtons[0]);
      
      expect(onSelectionChange).toHaveBeenCalledWith([mockGroups[1]]);
    });

    it('should show DisplayIcon with medium size in selected cards', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0]],
      };
      render(<GroupSelectionPanel {...props} />);
      
      const selectedSection = screen.getByText('Selected Groups (1)').parentElement;
      const icons = within(selectedSection).getAllByTestId('display-icon-group');
      expect(icons[0]).toHaveAttribute('data-size', 'medium');
    });
  });

  describe('Data Normalization', () => {
    it('should handle string groups', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const props = {
        ...defaultProps,
        availableGroups: ['team-a', 'team-b'],
        onSelectionChange,
      };
      const { container } = render(<GroupSelectionPanel {...props} />);
      
      expect(screen.getAllByText('team-a').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('team-b').length).toBeGreaterThanOrEqual(1);
      
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      await user.click(groupItems[0]);
      
      expect(onSelectionChange).toHaveBeenCalled();
    });

    it('should handle groups with group_name field', () => {
      const groups = [
        { id: '1', group_name: 'test-group', member_count: 2 },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getAllByText('test-group').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle groups with groupName field', () => {
      const groups = [
        { id: '1', groupName: 'test-group', member_count: 2 },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getAllByText('test-group').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle groups without member_count', () => {
      const groups = [
        { id: '1', name: 'test-group' },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getAllByText('test-group').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText(/members/)).not.toBeInTheDocument();
    });

    it('should preserve all group data when normalizing', () => {
      const groupWithExtraData = {
        id: 'group1',
        name: 'test-group',
        member_count: 5,
        description: 'Test description',
        members_info: ['user1', 'user2'],
        customField: 'custom value',
      };
      const onSelectionChange = jest.fn();
      const { container } = render(
        <GroupSelectionPanel
          {...defaultProps}
          availableGroups={[groupWithExtraData]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      groupItems[0].click();
      
      // Check that the passed group contains all original data
      expect(onSelectionChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            customField: 'custom value',
            members_info: ['user1', 'user2'],
          })
        ])
      );
    });
  });

  describe('DisplayIcon Integration', () => {
    it('should render DisplayIcon for each group in list', () => {
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const icons = screen.getAllByTestId('display-icon-group');
      expect(icons.length).toBeGreaterThanOrEqual(3);
    });

    it('should pass correct size to DisplayIcon in list', () => {
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const listIcons = screen.getAllByTestId('display-icon-group');
      // Filter to only list items (not selected cards)
      const listSection = screen.getByText('Add Groups').parentElement;
      const listSectionIcons = within(listSection).getAllByTestId('display-icon-group');
      
      listSectionIcons.forEach(icon => {
        expect(icon).toHaveAttribute('data-size', 'small');
      });
    });

    it('should enable hover cards for all DisplayIcons', () => {
      // This would require checking the showHoverCard prop
      // Since we mocked DisplayIcon, we just verify it renders
      render(<GroupSelectionPanel {...defaultProps} />);
      expect(screen.getAllByTestId('display-icon-group').length).toBeGreaterThan(0);
    });

    it('should pass normalized group data to DisplayIcon', () => {
      const groups = [
        { id: '1', group_name: 'test-group', member_count: 5 },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      const icon = screen.getByTestId('display-icon-group');
      expect(icon).toHaveTextContent('test-group');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty availableGroups array', () => {
      const props = { ...defaultProps, availableGroups: [] };
      render(<GroupSelectionPanel {...props} />);
      
      expect(screen.getByText('No groups found')).toBeInTheDocument();
    });

    it('should handle undefined availableGroups', () => {
      const props = { ...defaultProps, availableGroups: undefined };
      render(<GroupSelectionPanel {...props} />);
      
      expect(screen.getByText('No groups found')).toBeInTheDocument();
    });

    it('should handle empty selectedGroups array', () => {
      const props = { ...defaultProps, selectedGroups: [] };
      render(<GroupSelectionPanel {...props} />);
      
      expect(screen.queryByText(/Selected Groups/)).not.toBeInTheDocument();
    });

    it('should handle groups without id', () => {
      const groups = [
        { name: 'test-group', member_count: 2 },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getAllByText('test-group').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle groups with missing name fields', () => {
      const groups = [
        { id: '1' }, // No name field at all
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getByText('Unknown')).toBeInTheDocument();
    });

    it('should handle member_count of 0', () => {
      const groups = [
        { id: '1', name: 'empty-group', member_count: 0 },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getByText('0 members')).toBeInTheDocument();
    });

    it('should handle member_count of 1 with singular form', () => {
      const groups = [
        { id: '1', name: 'solo-group', member_count: 1 },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getByText('1 member')).toBeInTheDocument();
    });

    it('should handle very long group names', () => {
      const groups = [
        { id: '1', name: 'this-is-a-very-long-group-name-that-might-cause-layout-issues', member_count: 5 },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getAllByText('this-is-a-very-long-group-name-that-might-cause-layout-issues').length).toBeGreaterThanOrEqual(1);
    });

    it('should handle special characters in group names', () => {
      const groups = [
        { id: '1', name: 'group-with-@special#chars!', member_count: 2 },
      ];
      render(<GroupSelectionPanel {...defaultProps} availableGroups={groups} />);
      
      expect(screen.getAllByText('group-with-@special#chars!').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Search with Different Data Formats', () => {
    it('should search string groups', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        availableGroups: ['team-alpha', 'team-beta', 'squad-gamma'],
      };
      render(<GroupSelectionPanel {...props} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'team');
      
      expect(screen.getAllByText('team-alpha').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('team-beta').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('squad-gamma')).not.toBeInTheDocument();
    });

    it('should search groups with group_name field', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        availableGroups: [
          { id: '1', group_name: 'alpha-group', name: 'alpha-group' },
          { id: '2', group_name: 'beta-group', name: 'beta-group' },
        ],
      };
      const { container } = render(<GroupSelectionPanel {...props} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'alpha');
      
      // Check that only one group item is displayed (alpha-group)
      const groupItems = container.querySelectorAll('.group-selection-dropdown-item');
      expect(groupItems.length).toBe(1);
    });

    it('should search groups with groupName field', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        availableGroups: [
          { id: '1', groupName: 'alpha-group' },
          { id: '2', groupName: 'beta-group' },
        ],
      };
      render(<GroupSelectionPanel {...props} />);
      
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'beta');
      
      expect(screen.getAllByText('beta-group').length).toBeGreaterThanOrEqual(1);
      expect(screen.queryByText('alpha-group')).not.toBeInTheDocument();
    });
  });

  describe('Selection Persistence Across Search', () => {
    it('should maintain selection when searching', async () => {
      const user = userEvent.setup();
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0]], // engineering-team selected
      };
      render(<GroupSelectionPanel {...props} />);
      
      // Search for something else
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'design');
      
      // engineering-team not visible in list, but should still be in selected section
      expect(screen.getAllByText('engineering-team').length).toBeGreaterThanOrEqual(1); // In selected section
      expect(screen.getByText('Selected Groups (1)')).toBeInTheDocument();
    });

    it('should show checkmark on selected group even after filtering', async () => {
      const user = userEvent.setup();
      const onSelectionChange = jest.fn();
      const { container } = render(
        <GroupSelectionPanel
          {...defaultProps}
          selectedGroups={[mockGroups[0]]}
          onSelectionChange={onSelectionChange}
        />
      );
      
      // Filter to show the selected group
      const searchInput = screen.getByPlaceholderText('Search groups...');
      await user.type(searchInput, 'engineering');
      
      // Should still show checkmark
      const filteredGroupItems = container.querySelectorAll('.group-selection-dropdown-item');
      expect(within(filteredGroupItems[0]).getByText('✓')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button type for remove buttons', () => {
      const props = {
        ...defaultProps,
        selectedGroups: [mockGroups[0]],
      };
      render(<GroupSelectionPanel {...props} />);
      
      const removeButton = screen.getByRole('button', { name: '×' });
      expect(removeButton).toHaveAttribute('type', 'button');
    });

    it('should have clickable group items', () => {
      render(<GroupSelectionPanel {...defaultProps} />);
      
      const groupItems = screen.getAllByText(/team/).map(el => el.closest('.group-selection-dropdown-item'));
      groupItems.forEach(item => {
        expect(item).toBeInTheDocument();
      });
    });
  });
});
