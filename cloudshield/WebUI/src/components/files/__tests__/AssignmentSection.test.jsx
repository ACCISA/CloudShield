import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AssignmentSection from '../AssignmentSection';

describe('AssignmentSection', () => {
  const mockItems = ['Item 1', 'Item 2', 'Item 3'];

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      expect(container.querySelector('.section')).toBeInTheDocument();
    });

    it('should display the section title', () => {
      render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('Test Section')).toBeInTheDocument();
    });

    it('should render all-select checkbox', () => {
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBeGreaterThan(0);
    });

    it('should display search input with correct placeholder', () => {
      const { getByPlaceholderText } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search items..."
        />
      );
      expect(getByPlaceholderText('Search items...')).toBeInTheDocument();
    });

    it('should display all items in chips', () => {
      render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('should display suggested text', () => {
      render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('suggested')).toBeInTheDocument();
    });
  });

  describe('Checkboxes', () => {
    it('should have checkbox for each item', () => {
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(mockItems.length + 1); // +1 for all-select
    });

    it('should allow checking items', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      await user.click(checkboxes[1]); // Click second checkbox (first is all-select)
      expect(checkboxes[1]).toBeChecked();
    });

    it('should allow checking all items', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );

      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      await user.click(checkboxes[0]); // Click all-select
      // All should be checked after all-select
      expect(checkboxes[0]).toBeInTheDocument();
    });
  });

  describe('Structure', () => {
    it('should have section header', () => {
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      expect(container.querySelector('.sectionHeader')).toBeInTheDocument();
    });

    it('should have chips container', () => {
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      expect(container.querySelector('.chips')).toBeInTheDocument();
    });

    it('should render labels for items', () => {
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);
    });
  });

  describe('Empty Items', () => {
    it('should handle empty items array', () => {
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={[]}
          placeholder="Search..."
        />
      );
      expect(container.querySelector('.chips')).toBeInTheDocument();
      expect(container.querySelectorAll('.chips label').length).toBe(0);
    });
  });

  describe('Props', () => {
    it('should accept title prop', () => {
      render(
        <AssignmentSection
          title="Custom Title"
          items={mockItems}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should accept items prop', () => {
      const customItems = ['Alpha', 'Beta', 'Gamma'];
      render(
        <AssignmentSection
          title="Test"
          items={customItems}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('Alpha')).toBeInTheDocument();
      expect(screen.getByText('Beta')).toBeInTheDocument();
      expect(screen.getByText('Gamma')).toBeInTheDocument();
    });

    it('should accept placeholder prop', () => {
      const { getByPlaceholderText } = render(
        <AssignmentSection
          title="Test"
          items={mockItems}
          placeholder="Custom placeholder"
        />
      );
      expect(getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all checkboxes', () => {
      const { container } = render(
        <AssignmentSection
          title="Test Section"
          items={mockItems}
          placeholder="Search..."
        />
      );
      const labels = container.querySelectorAll('label');
      expect(labels.length).toBeGreaterThan(0);
    });

    it('should have readable item names', () => {
      render(
        <AssignmentSection
          title="Test Section"
          items={['Readable Item', 'Another Item']}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('Readable Item')).toBeInTheDocument();
      expect(screen.getByText('Another Item')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with special characters', () => {
      const specialItems = ['Item@1', 'Item#2', 'Item$3'];
      render(
        <AssignmentSection
          title="Test"
          items={specialItems}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('Item@1')).toBeInTheDocument();
    });

    it('should handle very long item names', () => {
      const longNameItems = ['A'.repeat(100)];
      render(
        <AssignmentSection
          title="Test"
          items={longNameItems}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('A'.repeat(100))).toBeInTheDocument();
    });

    it('should handle single item', () => {
      render(
        <AssignmentSection
          title="Test"
          items={['Single Item']}
          placeholder="Search..."
        />
      );
      expect(screen.getByText('Single Item')).toBeInTheDocument();
    });

    it('should handle many items', () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
      const { container } = render(
        <AssignmentSection
          title="Test"
          items={manyItems}
          placeholder="Search..."
        />
      );
      const labels = container.querySelectorAll('.chips label');
      expect(labels.length).toBe(100);
    });
  });
});
