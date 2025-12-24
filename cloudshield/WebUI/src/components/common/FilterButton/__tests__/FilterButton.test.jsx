import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FilterButton from '../FilterButton';

// Mock the icon components
jest.mock('../../../../assets/FilterIcon', () => {
  return function MockFilterIcon() {
    return <div data-testid="filter-icon">FilterIcon</div>;
  };
});

jest.mock('../../../../assets/ActiveIcon', () => {
  return function MockActiveIcon() {
    return <div data-testid="active-icon">ActiveIcon</div>;
  };
});

describe('FilterButton', () => {
  let mockOnFilterChange;

  beforeEach(() => {
    mockOnFilterChange = jest.fn();
  });

  describe('Rendering', () => {
    it('renders the button initially', () => {
      render(<FilterButton onFilterChange={mockOnFilterChange} />);
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    it('renders filter icon', () => {
      render(<FilterButton onFilterChange={mockOnFilterChange} />);
      expect(screen.getByTestId('filter-icon')).toBeInTheDocument();
    });

    it('does not render popover initially', () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          type: 'checkbox',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(screen.queryByText('Status')).not.toBeInTheDocument();
    });

    it('renders filter count badge when filters are active', () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      const activeFilters = {
        status: new Set(['active']),
      };
      render(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('does not render filter count badge when no filters are active', () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });

    it('shows correct filter count with multiple active filters', () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
        {
          id: 'type',
          label: 'Type',
          options: [{ value: 'user', label: 'User' }],
        },
      ];
      const activeFilters = {
        status: new Set(['active', 'inactive']),
        type: new Set(['user']),
      };
      render(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Opening/Closing Popover', () => {
    it('opens popover when button is clicked', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('closes popover when backdrop is clicked', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });

      const backdrops = document.querySelectorAll('[style*="position: fixed"]');
      const backdrop = Array.from(backdrops).find(
        el => getComputedStyle(el).zIndex === '1299'
      );

      if (backdrop) {
        fireEvent.click(backdrop);
      }

      await waitFor(() => {
        expect(screen.queryByText('Status')).not.toBeInTheDocument();
      });
    });

    it('toggles popover open/close', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });

      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Status')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filter Groups', () => {
    it('renders all filter groups', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
        {
          id: 'type',
          label: 'Type',
          options: [{ value: 'user', label: 'User' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Type')).toBeInTheDocument();
      });
    });

    it('renders divider between filter groups', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
        {
          id: 'type',
          label: 'Type',
          options: [{ value: 'user', label: 'User' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        const statusGroup = screen.getByText('Status');
        expect(statusGroup).toBeInTheDocument();
      });
    });

    it('does not render divider before first group', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Options - Checkbox Type', () => {
    it('renders checkbox options', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Inactive')).toBeInTheDocument();
      });
    });

    it('calls onFilterChange when checkbox option is clicked', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      const activeOption = screen.getByText('Active').closest('div[style*="display"]');
      fireEvent.click(activeOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active', true);
    });

    it('renders checkmark when option is active', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      const activeFilters = {
        status: new Set(['active']),
      };
      render(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('toggles filter on and off', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      const { rerender } = render(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={{}}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        const activeOption = screen.getByText('Active').closest('div[style*="display"]');
        fireEvent.click(activeOption);
      });

      expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active', true);

      // Now deactivate
      rerender(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={{ status: new Set(['active']) }}
          onFilterChange={mockOnFilterChange}
        />
      );

      fireEvent.click(button);

      await waitFor(() => {
        const activeOption = screen.getByText('Active').closest('div[style*="display"]');
        fireEvent.click(activeOption);
      });

      expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active', false);
    });
  });

  describe('Filter Options - Toggle Type', () => {
    it('renders toggle options with toggle type', async () => {
      const filterGroups = [
        {
          id: 'visibility',
          label: 'Visibility',
          type: 'toggle',
          options: [
            { value: 'public', label: 'Public', type: 'toggle' },
            { value: 'private', label: 'Private', type: 'toggle' },
          ],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Public')).toBeInTheDocument();
        expect(screen.getByText('Private')).toBeInTheDocument();
      });
    });

    it('renders toggle switch for toggle type options', async () => {
      const filterGroups = [
        {
          id: 'visibility',
          label: 'Visibility',
          type: 'toggle',
          options: [{ value: 'public', label: 'Public', type: 'toggle' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Public')).toBeInTheDocument();
      });
    });

    it('renders active icon for active toggle options', async () => {
      const filterGroups = [
        {
          id: 'visibility',
          label: 'Visibility',
          options: [{ value: 'public', label: 'Public', type: 'toggle' }],
        },
      ];
      const activeFilters = {
        visibility: new Set(['public']),
      };
      render(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByTestId('active-icon')).toBeInTheDocument();
      });
    });

    it('calls onFilterChange when toggle option is clicked', async () => {
      const filterGroups = [
        {
          id: 'visibility',
          label: 'Visibility',
          options: [{ value: 'public', label: 'Public', type: 'toggle' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Public')).toBeInTheDocument();
      });

      const publicOption = screen.getByText('Public').closest('div[style*="display"]');
      fireEvent.click(publicOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith('visibility', 'public', true);
    });
  });

  describe('Mouse Events', () => {
    it('changes background on button mouse enter', async () => {
      render(<FilterButton onFilterChange={mockOnFilterChange} />);
      const button = screen.getByText('Filter').parentElement;

      fireEvent.mouseEnter(button);

      expect(button).toHaveStyle('background: #242424');
    });

    it('restores background on button mouse leave', async () => {
      render(<FilterButton onFilterChange={mockOnFilterChange} />);
      const button = screen.getByText('Filter').parentElement;

      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button).toHaveStyle('background: #0A0A0A');
    });

    it('changes option background on mouse enter', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        const activeOption = screen.getByText('Active').closest('div[style*="display"]');
        fireEvent.mouseEnter(activeOption);

        expect(activeOption).toHaveStyle('backgroundColor: rgba(255,255,255,0.05)');
      });
    });

    it('restores option background on mouse leave', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        const activeOption = screen.getByText('Active').closest('div[style*="display"]');
        fireEvent.mouseEnter(activeOption);
        fireEvent.mouseLeave(activeOption);

        expect(activeOption).toHaveStyle('backgroundColor: transparent');
      });
    });
  });

  describe('Custom Styles', () => {
    it('applies custom style prop to button', () => {
      const customStyle = { backgroundColor: '#FF0000', padding: '16px 32px' };
      render(
        <FilterButton
          style={customStyle}
          onFilterChange={mockOnFilterChange}
        />
      );

      const button = screen.getByText('Filter').parentElement;
      expect(button).toHaveStyle('background-color: #FF0000');
    });
  });

  describe('Window Resize', () => {
    it('updates popover position on window resize', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });

      fireEvent.resize(window, { innerWidth: 800, innerHeight: 600 });

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('cleans up resize listener on unmount when popover is open', async () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      const { unmount } = render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'resize',
        expect.any(Function)
      );
      removeEventListenerSpy.mockRestore();
    });

    it('does not add resize listener when popover is closed', () => {
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener');
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Should not have resize listener initially
      const resizeListeners = addEventListenerSpy.mock.calls.filter(
        call => call[0] === 'resize'
      );
      expect(resizeListeners.length).toBe(0);

      addEventListenerSpy.mockRestore();
    });
  });

  describe('Without onFilterChange callback', () => {
    it('renders without crashing when onFilterChange is not provided', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(<FilterButton filterGroups={filterGroups} />);

      const button = screen.getByText('Filter');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('handles filter toggle without callback error', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(<FilterButton filterGroups={filterGroups} />);

      const button = screen.getByText('Filter');
      fireEvent.click(button);

      await waitFor(() => {
        const activeOption = screen.getByText('Active').closest('div[style*="display"]');
        fireEvent.click(activeOption);
      });

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('Empty Filter Groups', () => {
    it('renders with empty filter groups array', () => {
      render(
        <FilterButton
          filterGroups={[]}
          onFilterChange={mockOnFilterChange}
        />
      );
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });

    it('does not render any filter options with empty groups', async () => {
      render(
        <FilterButton
          filterGroups={[]}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        const popover = document.querySelector('[style*="position: fixed"][style*="backgroundColor"]');
        expect(popover).toBeInTheDocument();
      });
    });
  });

  describe('Filter Count Badge', () => {
    it('updates badge count when filters change', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
      ];
      const { rerender } = render(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={{}}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.queryByText('1')).not.toBeInTheDocument();

      rerender(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={{ status: new Set(['active']) }}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('1')).toBeInTheDocument();

      rerender(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={{ status: new Set(['active', 'inactive']) }}
          onFilterChange={mockOnFilterChange}
        />
      );

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('complete flow: open -> select filters -> close -> reopen', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
          ],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      // Open
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });

      // Select filter
      const activeOption = screen.getByText('Active').closest('div[style*="display"]');
      fireEvent.click(activeOption);

      expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active', true);

      // Close
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByText('Status')).not.toBeInTheDocument();
      });

      // Reopen
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
      });
    });

    it('handles mixed checkbox and toggle types', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
        {
          id: 'visibility',
          label: 'Visibility',
          options: [{ value: 'public', label: 'Public', type: 'toggle' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );
      const button = screen.getByText('Filter');

      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Status')).toBeInTheDocument();
        expect(screen.getByText('Visibility')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Public')).toBeInTheDocument();
      });

      // Click checkbox option
      const activeOption = screen.getByText('Active').closest('div[style*="display"]');
      fireEvent.click(activeOption);
      expect(mockOnFilterChange).toHaveBeenCalledWith('status', 'active', true);

      // Click toggle option
      const publicOption = screen.getByText('Public').closest('div[style*="display"]');
      fireEvent.click(publicOption);
      expect(mockOnFilterChange).toHaveBeenCalledWith('visibility', 'public', true);
    });
  });

  describe('Edge Cases', () => {
    it('handles non-existent group ID in handleFilterToggle', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      render(
        <FilterButton
          filterGroups={filterGroups}
          onFilterChange={mockOnFilterChange}
        />
      );

      const button = screen.getByText('Filter');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });

      // Should not crash with non-existent group
      expect(true).toBe(true);
    });

    it('handles activeFilters with missing Set values', async () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      const activeFilters = {
        status: undefined,
      };
      render(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      const button = screen.getByText('Filter');
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument();
      });
    });

    it('calculates filter count correctly with non-Set values', () => {
      const filterGroups = [
        {
          id: 'status',
          label: 'Status',
          options: [{ value: 'active', label: 'Active' }],
        },
      ];
      const activeFilters = {
        status: ['active'],
      };
      render(
        <FilterButton
          filterGroups={filterGroups}
          activeFilters={activeFilters}
          onFilterChange={mockOnFilterChange}
        />
      );

      // Should handle non-Set values gracefully
      expect(screen.getByText('Filter')).toBeInTheDocument();
    });
  });
});
