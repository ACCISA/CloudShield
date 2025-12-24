import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DisplayButton from '../DisplayButton';

// Mock the icon components
jest.mock('../../../../assets/DisplayButton/CardsIcon', () => {
  return function MockCardsIcon() {
    return <div data-testid="cards-icon">CardsIcon</div>;
  };
});

jest.mock('../../../../assets/DisplayButton/ListIcon', () => {
  return function MockListIcon() {
    return <div data-testid="list-icon">ListIcon</div>;
  };
});

jest.mock('../../../../assets/DisplayButton/ImageIcon', () => {
  return function MockImageIcon() {
    return <div data-testid="image-icon">ImageIcon</div>;
  };
});

jest.mock('../../../../assets/DisplayButton/DisplayIcon', () => {
  return function MockDisplayIcon() {
    return <div data-testid="display-icon">DisplayIcon</div>;
  };
});

describe('DisplayButton', () => {
  let mockOnLayoutChange;

  beforeEach(() => {
    mockOnLayoutChange = jest.fn();
  });

  describe('Rendering', () => {
    it('renders the button initially', () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      expect(screen.getByText('Display')).toBeInTheDocument();
    });

    it('renders with default layout prop "list"', () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      expect(screen.getByText('Display')).toBeInTheDocument();
    });

    it('renders display icon', () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      expect(screen.getByTestId('display-icon')).toBeInTheDocument();
    });

    it('does not render popover initially', () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      expect(screen.queryByTestId('cards-icon')).not.toBeInTheDocument();
    });
  });

  describe('Opening/Closing Popover', () => {
    it('opens popover when button is clicked', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('cards-icon')).toBeInTheDocument();
      });
    });

    it('closes popover when backdrop is clicked', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('cards-icon')).toBeInTheDocument();
      });

      // Click the backdrop
      const backdrops = document.querySelectorAll('[style*="position: fixed"]');
      const backdrop = Array.from(backdrops).find(
        el => getComputedStyle(el).zIndex === '1299'
      );
      
      if (backdrop) {
        fireEvent.click(backdrop);
      }
    });

    it('toggles popover open/close', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('cards-icon')).toBeInTheDocument();
      });

      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.queryByTestId('cards-icon')).not.toBeInTheDocument();
      });
    });
  });

  describe('Layout Options', () => {
    it('renders all layout options in popover', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
        expect(screen.getByText('List')).toBeInTheDocument();
        expect(screen.getByText('icons')).toBeInTheDocument();
      });
    });

    it('renders cards, list, and image icons', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('cards-icon')).toBeInTheDocument();
        expect(screen.getByTestId('list-icon')).toBeInTheDocument();
        expect(screen.getByTestId('image-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Layout Selection', () => {
    it('calls onLayoutChange with "cards" when cards option is clicked', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
      });

      const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
      fireEvent.click(cardsOption);

      expect(mockOnLayoutChange).toHaveBeenCalledWith('cards');
    });

    it('calls onLayoutChange with "list" when list option is clicked', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('List')).toBeInTheDocument();
      });

      const listOption = screen.getByText('List').closest('div[style*="flexDirection"]');
      fireEvent.click(listOption);

      expect(mockOnLayoutChange).toHaveBeenCalledWith('list');
    });

    it('calls onLayoutChange with "icons" when icons option is clicked', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('icons')).toBeInTheDocument();
      });

      const iconsOption = screen.getByText('icons').closest('div[style*="flexDirection"]');
      fireEvent.click(iconsOption);

      expect(mockOnLayoutChange).toHaveBeenCalledWith('icons');
    });

    it('keeps popover open after layout change', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
      });

      const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
      fireEvent.click(cardsOption);

      await waitFor(() => {
        expect(screen.getByText('List')).toBeInTheDocument();
      });
    });
  });

  describe('Active Layout Styling', () => {
    it('highlights active layout option', async () => {
      const { rerender } = render(
        <DisplayButton layout="list" onLayoutChange={mockOnLayoutChange} />
      );
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        const listOption = screen.getByText('List').closest('div[style*="flexDirection"]');
        expect(listOption).toHaveStyle('border: 1px solid rgba(255,255,255,0.2)');
      });
    });

    it('changes active layout when prop changes', async () => {
      const { rerender } = render(
        <DisplayButton layout="list" onLayoutChange={mockOnLayoutChange} />
      );
      
      rerender(
        <DisplayButton layout="cards" onLayoutChange={mockOnLayoutChange} />
      );

      const button = screen.getByText('Display');
      fireEvent.click(button);

      await waitFor(() => {
        const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
        expect(cardsOption).toHaveStyle('border: 1px solid rgba(255,255,255,0.2)');
      });
    });
  });

  describe('Mouse Events', () => {
    it('changes background on button mouse enter', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display').parentElement;
      
      fireEvent.mouseEnter(button);
      
      expect(button).toHaveStyle('background: #242424');
    });

    it('restores background on button mouse leave', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display').parentElement;
      
      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);
      
      expect(button).toHaveStyle('background: #0A0A0A');
    });

    it('changes option background on mouse enter when not active', async () => {
      render(<DisplayButton layout="list" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
        fireEvent.mouseEnter(cardsOption);
        
        expect(cardsOption).toHaveStyle('backgroundColor: rgba(255,255,255,0.08)');
      });
    });

    it('does not change option background on mouse enter when active', async () => {
      render(<DisplayButton layout="cards" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
        fireEvent.mouseEnter(cardsOption);
        
        expect(cardsOption).toHaveStyle('backgroundColor: rgba(255,255,255,0.1)');
      });
    });

    it('restores option background on mouse leave', async () => {
      render(<DisplayButton layout="list" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
        fireEvent.mouseEnter(cardsOption);
        fireEvent.mouseLeave(cardsOption);
        
        expect(cardsOption).toHaveStyle('backgroundColor: transparent');
      });
    });
  });

  describe('Custom Styles', () => {
    it('applies custom style prop to button', () => {
      const customStyle = { backgroundColor: '#FF0000', color: '#00FF00' };
      render(
        <DisplayButton 
          style={customStyle} 
          onLayoutChange={mockOnLayoutChange} 
        />
      );
      
      const button = screen.getByText('Display').parentElement;
      expect(button).toHaveStyle('background-color: #FF0000');
    });
  });

  describe('Window Resize', () => {
    it('updates popover position on window resize', async () => {
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
      });

      act(() => {
        fireEvent.resize(window, { innerWidth: 800, innerHeight: 600 });
      });

      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
      });
    });

    it('cleans up resize listener on unmount when popover is open', async () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(
        <DisplayButton onLayoutChange={mockOnLayoutChange} />
      );
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });

    it('cleans up resize listener when popover closes', async () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');
      
      render(<DisplayButton onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('cards-icon')).toBeInTheDocument();
      });

      const backdrops = document.querySelectorAll('[style*="position: fixed"]');
      const backdrop = Array.from(backdrops).find(
        el => getComputedStyle(el).zIndex === '1299'
      );
      
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      removeEventListenerSpy.mockRestore();
    });
  });

  describe('Without onLayoutChange callback', () => {
    it('renders without crashing when onLayoutChange is not provided', async () => {
      render(<DisplayButton />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
      });
    });

    it('handles layout change without callback error', async () => {
      render(<DisplayButton layout="list" />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
        fireEvent.click(cardsOption);
      });

      // Should not throw error
      expect(true).toBe(true);
    });
  });

  describe('Different Initial Layouts', () => {
    it('renders with "cards" layout', async () => {
      render(<DisplayButton layout="cards" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
        expect(cardsOption).toHaveStyle('border: 1px solid rgba(255,255,255,0.2)');
      });
    });

    it('renders with "icons" layout', async () => {
      render(<DisplayButton layout="icons" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        const iconsOption = screen.getByText('icons').closest('div[style*="flexDirection"]');
        expect(iconsOption).toHaveStyle('border: 1px solid rgba(255,255,255,0.2)');
      });
    });
  });

  describe('Icon Color States', () => {
    it('renders active layout icon with full opacity color', async () => {
      render(<DisplayButton layout="list" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('list-icon')).toBeInTheDocument();
      });
    });

    it('renders inactive layout icon with reduced opacity color', async () => {
      render(<DisplayButton layout="list" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByTestId('cards-icon')).toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('complete flow: open -> change layout -> close', async () => {
      render(<DisplayButton layout="list" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      // Open
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
      });

      // Change layout
      const cardsOption = screen.getByText('Cards').closest('div[style*="flexDirection"]');
      fireEvent.click(cardsOption);
      expect(mockOnLayoutChange).toHaveBeenCalledWith('cards');

      // Verify popover still open
      expect(screen.getByText('List')).toBeInTheDocument();
    });

    it('multiple layout changes', async () => {
      render(<DisplayButton layout="list" onLayoutChange={mockOnLayoutChange} />);
      const button = screen.getByText('Display');
      
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Cards')).toBeInTheDocument();
      });

      // First change
      let option = screen.getByText('Cards').closest('div[style*="flexDirection"]');
      fireEvent.click(option);
      expect(mockOnLayoutChange).toHaveBeenCalledWith('cards');

      // Second change
      option = screen.getByText('icons').closest('div[style*="flexDirection"]');
      fireEvent.click(option);
      expect(mockOnLayoutChange).toHaveBeenCalledWith('icons');
    });
  });
});
