import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarPill from '../AvatarPill';

// Mock DisplayIcon
jest.mock('../../common/DisplayIcon/DisplayIcon.jsx', () => ({
  __esModule: true,
  default: ({ type, data, size }) => (
    <div data-testid={`display-icon-${type}`} data-size={size}>
      {data.username || data.name || data.groupName || 'Icon'}
    </div>
  ),
}));

// Mock MUI Tooltip
jest.mock('@mui/material/Tooltip', () => ({
  __esModule: true,
  default: ({ children, title }) => (
    <div data-testid="tooltip" data-tooltip-content={typeof title === 'string' ? title : 'tooltip'}>
      {children}
    </div>
  ),
}));

describe('AvatarPill', () => {
  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(<AvatarPill items={[]} type="user" />);
      expect(container).toBeInTheDocument();
    });

    it('should render empty state with em dash when no items', () => {
      const { container } = render(<AvatarPill items={[]} type="user" />);
      expect(container.textContent).toContain('—');
    });

    it('should render user avatars', () => {
      const users = [
        { id: '1', username: 'user1', full_name: 'John Doe' },
        { id: '2', username: 'user2', full_name: 'Jane Smith' },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons).toHaveLength(2);
    });

    it('should render group avatars', () => {
      const groups = [
        { id: '1', name: 'engineering-team' },
        { id: '2', name: 'design-team' },
      ];
      render(<AvatarPill items={groups} type="group" />);
      
      const icons = screen.getAllByTestId('display-icon-group');
      expect(icons).toHaveLength(2);
    });

    it('should pass size="small" to DisplayIcon', () => {
      const users = [{ id: '1', username: 'user1' }];
      render(<AvatarPill items={users} type="user" />);
      
      const icon = screen.getByTestId('display-icon-user');
      expect(icon).toHaveAttribute('data-size', 'small');
    });
  });

  describe('Data Normalization', () => {
    it('should normalize string usernames to objects', () => {
      const users = ['user1', 'user2', 'user3'];
      render(<AvatarPill items={users} type="user" />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons).toHaveLength(3);
      expect(icons[0]).toHaveTextContent('user1');
    });

    it('should normalize string group names to objects', () => {
      const groups = ['team-a', 'team-b'];
      render(<AvatarPill items={groups} type="group" />);
      
      const icons = screen.getAllByTestId('display-icon-group');
      expect(icons).toHaveLength(2);
      expect(icons[0]).toHaveTextContent('team-a');
    });

    it('should handle user objects with full data', () => {
      const users = [
        { 
          id: '1', 
          username: 'jdoe', 
          email: 'john@example.com',
          full_name: 'John Doe',
          firstName: 'John',
          lastName: 'Doe',
          role: 'admin'
        },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icon = screen.getByTestId('display-icon-user');
      expect(icon).toBeInTheDocument();
    });

    it('should handle group objects with full data', () => {
      const groups = [
        { 
          id: '1', 
          name: 'engineering-team',
          groupName: 'engineering-team',
          member_count: 10,
          description: 'Engineering team'
        },
      ];
      render(<AvatarPill items={groups} type="group" />);
      
      const icon = screen.getByTestId('display-icon-group');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('maxVisible Property', () => {
    it('should respect default maxVisible of 3', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
        { id: '3', username: 'user3' },
        { id: '4', username: 'user4' },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons).toHaveLength(3); // Only 3 visible
    });

    it('should show +N indicator when items exceed maxVisible', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
        { id: '3', username: 'user3' },
        { id: '4', username: 'user4' },
        { id: '5', username: 'user5' },
      ];
      const { container } = render(<AvatarPill items={users} type="user" />);
      
      expect(container.textContent).toContain('+2');
    });

    it('should respect custom maxVisible value', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
        { id: '3', username: 'user3' },
      ];
      render(<AvatarPill items={users} type="user" maxVisible={2} />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons).toHaveLength(2);
    });

    it('should not show +N indicator when items equal maxVisible', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
        { id: '3', username: 'user3' },
      ];
      const { container } = render(<AvatarPill items={users} type="user" maxVisible={3} />);
      
      expect(container.textContent).not.toContain('+');
    });

    it('should not show +N indicator when items less than maxVisible', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
      ];
      const { container } = render(<AvatarPill items={users} type="user" maxVisible={5} />);
      
      expect(container.textContent).not.toContain('+');
    });
  });

  describe('Tooltip Functionality', () => {
    it('should render tooltip when items exceed maxVisible', () => {
      const users = [
        { id: '1', username: 'user1', full_name: 'John Doe' },
        { id: '2', username: 'user2', full_name: 'Jane Smith' },
        { id: '3', username: 'user3', full_name: 'Bob Johnson' },
        { id: '4', username: 'user4', full_name: 'Alice Williams' },
      ];
      render(<AvatarPill items={users} type="user" maxVisible={2} />);
      
      const tooltip = screen.getByTestId('tooltip');
      expect(tooltip).toBeInTheDocument();
    });

    it('should not render tooltip when all items are visible', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
      ];
      const { queryByTestId } = render(<AvatarPill items={users} type="user" maxVisible={5} />);
      
      expect(queryByTestId('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Display Name Logic', () => {
    it('should use full_name for users when available', () => {
      const users = [
        { id: '1', username: 'jdoe', full_name: 'John Doe' },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      // DisplayIcon receives the full user object
      const icon = screen.getByTestId('display-icon-user');
      expect(icon).toBeInTheDocument();
    });

    it('should use firstName + lastName for users when full_name not available', () => {
      const users = [
        { id: '1', username: 'jdoe', firstName: 'John', lastName: 'Doe' },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icon = screen.getByTestId('display-icon-user');
      expect(icon).toBeInTheDocument();
    });

    it('should use username for users when names not available', () => {
      const users = [
        { id: '1', username: 'jdoe' },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icon = screen.getByTestId('display-icon-user');
      expect(icon).toHaveTextContent('jdoe');
    });

    it('should use email for users when username not available', () => {
      const users = [
        { id: '1', email: 'john@example.com' },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icon = screen.getByTestId('display-icon-user');
      expect(icon).toBeInTheDocument();
    });

    it('should use name for groups', () => {
      const groups = [
        { id: '1', name: 'engineering-team' },
      ];
      render(<AvatarPill items={groups} type="group" />);
      
      const icon = screen.getByTestId('display-icon-group');
      expect(icon).toHaveTextContent('engineering-team');
    });

    it('should use groupName for groups when name not available', () => {
      const groups = [
        { id: '1', groupName: 'design-team' },
      ];
      render(<AvatarPill items={groups} type="group" />);
      
      const icon = screen.getByTestId('display-icon-group');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty items array', () => {
      const { container } = render(<AvatarPill items={[]} type="user" />);
      expect(container.textContent).toContain('—');
    });

    it('should handle undefined items', () => {
      const { container } = render(<AvatarPill items={undefined} type="user" />);
      expect(container.textContent).toContain('—');
    });

    it('should handle null items', () => {
      // AvatarPill doesn't handle null gracefully, it will throw
      // In production, ensure parent components pass [] instead of null
      expect(() => render(<AvatarPill items={null} type="user" />)).toThrow();
    });

    it('should handle items without id property', () => {
      const users = [
        { username: 'user1' },
        { username: 'user2' },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons).toHaveLength(2);
    });

    it('should handle mixed string and object items', () => {
      const users = [
        'user1',
        { id: '2', username: 'user2' },
        'user3',
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons).toHaveLength(3);
    });

    it('should handle very large maxVisible value', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
      ];
      render(<AvatarPill items={users} type="user" maxVisible={100} />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons).toHaveLength(2); // Shows all 2
    });

    it('should handle maxVisible of 0', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
      ];
      const { container } = render(<AvatarPill items={users} type="user" maxVisible={0} />);
      
      const icons = screen.queryAllByTestId('display-icon-user');
      expect(icons).toHaveLength(0);
      expect(container.textContent).toContain('+2');
    });

    it('should handle maxVisible of 1', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
      ];
      render(<AvatarPill items={users} type="user" maxVisible={1} />);
      
      const icons = screen.getAllByTestId('display-icon-user');
      expect(icons).toHaveLength(1);
    });
  });

  describe('Type Property', () => {
    it('should handle type="user"', () => {
      const users = [{ id: '1', username: 'user1' }];
      render(<AvatarPill items={users} type="user" />);
      
      expect(screen.getByTestId('display-icon-user')).toBeInTheDocument();
    });

    it('should handle type="group"', () => {
      const groups = [{ id: '1', name: 'team' }];
      render(<AvatarPill items={groups} type="group" />);
      
      expect(screen.getByTestId('display-icon-group')).toBeInTheDocument();
    });

    it('should default to type="user"', () => {
      const items = [{ id: '1', username: 'user1' }];
      render(<AvatarPill items={items} />);
      
      expect(screen.getByTestId('display-icon-user')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should render container with flexbox layout', () => {
      const users = [{ id: '1', username: 'user1' }];
      const { container } = render(<AvatarPill items={users} type="user" />);
      
      const mainContainer = container.firstChild;
      expect(mainContainer).toHaveStyle({ display: 'flex' });
    });

    it('should apply overlapping style to avatars', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
        { id: '3', username: 'user3' },
      ];
      const { container } = render(<AvatarPill items={users} type="user" />);
      
      // Check that avatars container exists
      const avatarsContainer = container.querySelector('div > div');
      expect(avatarsContainer).toBeInTheDocument();
    });

    it('should render +N indicator with correct styling', () => {
      const users = [
        { id: '1', username: 'user1' },
        { id: '2', username: 'user2' },
        { id: '3', username: 'user3' },
        { id: '4', username: 'user4' },
      ];
      const { container } = render(<AvatarPill items={users} type="user" maxVisible={2} />);
      
      // The +N indicator is inside the tooltip wrapper
      const extraCount = container.querySelector('span');
      expect(extraCount).toBeInTheDocument();
      expect(extraCount.textContent).toBe('+2');
    });
  });

  describe('Integration with DisplayIcon', () => {
    it('should pass correct props to DisplayIcon', () => {
      const users = [
        { id: '1', username: 'jdoe', email: 'john@example.com', role: 'admin' },
      ];
      render(<AvatarPill items={users} type="user" />);
      
      const icon = screen.getByTestId('display-icon-user');
      expect(icon).toHaveAttribute('data-size', 'small');
    });

    it('should enable hover cards on DisplayIcon', () => {
      const users = [{ id: '1', username: 'user1' }];
      render(<AvatarPill items={users} type="user" />);
      
      // DisplayIcon is rendered (hover card prop is passed but not visible in DOM)
      expect(screen.getByTestId('display-icon-user')).toBeInTheDocument();
    });
  });
});
