/**
 * FilterButton.test.jsx
 *
 * Test suite for the FilterButton component
 * Tests filter rendering, selection, and callback behavior
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterButton from "../FilterButton/FilterButton";

describe("FilterButton Component", () => {
  const mockFilterGroups = [
    {
      id: "status",
      label: "Status",
      type: "checkbox",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      id: "role",
      label: "Role",
      type: "radio",
      options: [
        { value: "admin", label: "Admin" },
        { value: "user", label: "User" },
      ],
    },
  ];

  const mockActiveFilters = {
    status: new Set(["active"]),
    role: new Set(["admin"]),
  };

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const onFilterChange = jest.fn();
      const { container } = render(
        <FilterButton onFilterChange={onFilterChange} />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders filter button", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      expect(screen.getByText("Filter")).toBeInTheDocument();
    });

    test("renders with empty filter groups", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton filterGroups={[]} onFilterChange={onFilterChange} />
      );

      expect(screen.getByText("Filter")).toBeInTheDocument();
    });
  });

  describe("Popover Behavior", () => {
    test("opens popover when button is clicked", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Role")).toBeInTheDocument();
    });

    test("closes popover when backdrop is clicked", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      // Popover should be open
      expect(screen.getByText("Status")).toBeInTheDocument();

      // Find and click backdrop
      const backdrop = document.querySelector('[style*="position: fixed"]');
      if (backdrop) {
        fireEvent.click(backdrop);
      }
    });

    test("toggles popover on button click", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");

      // Open popover
      fireEvent.click(button);
      expect(screen.getByText("Status")).toBeInTheDocument();

      // Close popover
      fireEvent.click(button);
    });
  });

  describe("Filter Groups Display", () => {
    test("displays all filter group labels", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      mockFilterGroups.forEach((group) => {
        expect(screen.getByText(group.label)).toBeInTheDocument();
      });
    });

    test("displays all filter options", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      expect(screen.getByText("Active")).toBeInTheDocument();
      expect(screen.getByText("Inactive")).toBeInTheDocument();
      expect(screen.getByText("Admin")).toBeInTheDocument();
      expect(screen.getByText("User")).toBeInTheDocument();
    });
  });

  describe("Filter Selection", () => {
    test("calls onFilterChange when checkbox filter is clicked", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      const activeOption = screen.getByText("Active");
      fireEvent.click(activeOption);

      expect(onFilterChange).toHaveBeenCalledWith("status", "active", true);
    });

    test("calls onFilterChange when radio filter is clicked", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      const adminOption = screen.getByText("Admin");
      fireEvent.click(adminOption);

      expect(onFilterChange).toHaveBeenCalled();
    });

    test("handles multiple checkbox selections", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      fireEvent.click(screen.getByText("Active"));
      fireEvent.click(screen.getByText("Inactive"));

      expect(onFilterChange).toHaveBeenCalledTimes(2);
    });
  });

  describe("Active Filters", () => {
    test("displays active filters correctly", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={mockActiveFilters}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      // Component should show active state
      expect(screen.getByText("Active")).toBeInTheDocument();
    });
  });

  describe("Custom Styling", () => {
    test("applies custom styles", () => {
      const onFilterChange = jest.fn();
      const customStyle = { margin: "10px" };
      const { container } = render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
          style={customStyle}
        />
      );

      expect(container.firstChild).toHaveStyle({ margin: "10px" });
    });
  });

  describe("Keyboard Navigation", () => {
    test("opens popover with Enter key", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByRole('button', { name: /filter options/i });
      fireEvent.keyDown(button, { key: 'Enter' });

      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    test("opens popover with Space key", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByRole('button', { name: /filter options/i });
      fireEvent.keyDown(button, { key: ' ' });

      expect(screen.getByText("Status")).toBeInTheDocument();
    });

    test("does not open popover with other keys", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByRole('button', { name: /filter options/i });
      fireEvent.keyDown(button, { key: 'a' });
      fireEvent.keyDown(button, { key: 'Escape' });

      expect(screen.queryByText("Status")).not.toBeInTheDocument();
    });

    test("triggers filter change with Enter key on option", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      const activeOption = screen.getByRole('button', { name: /select active/i });
      fireEvent.keyDown(activeOption, { key: 'Enter' });

      expect(onFilterChange).toHaveBeenCalledWith("status", "active", true);
    });

    test("triggers filter change with Space key on option", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      const inactiveOption = screen.getByRole('button', { name: /select inactive/i });
      fireEvent.keyDown(inactiveOption, { key: ' ' });

      expect(onFilterChange).toHaveBeenCalledWith("status", "inactive", true);
    });

    test("does not trigger filter change with other keys on option", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      const activeOption = screen.getByRole('button', { name: /select active/i });
      fireEvent.keyDown(activeOption, { key: 'a' });
      fireEvent.keyDown(activeOption, { key: 'Tab' });

      expect(onFilterChange).not.toHaveBeenCalled();
    });
  });

  describe("Hover Effects", () => {
    test("applies hover styles to filter button", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByRole('button', { name: /filter options/i });
      
      fireEvent.mouseEnter(button);
      expect(button.style.background).toBe('rgb(36, 36, 36)');
      expect(button.style.borderColor).toBe('rgba(255, 255, 255, 0.2)');
      
      fireEvent.mouseLeave(button);
      expect(button.style.background).toBe('rgb(10, 10, 10)');
      expect(button.style.borderColor).toBe('rgba(255, 255, 255, 0.1)');
    });

    test("applies hover styles to filter options", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      const activeOption = screen.getByRole('button', { name: /select active/i });
      
      fireEvent.mouseEnter(activeOption);
      expect(activeOption.style.backgroundColor).toBe('rgba(255, 255, 255, 0.05)');
      
      fireEvent.mouseLeave(activeOption);
      expect(activeOption.style.backgroundColor).toBe('transparent');
    });
  });

  describe("Active Filter Count", () => {
    test("displays active filter count when filters are active", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={mockActiveFilters}
          onFilterChange={onFilterChange}
        />
      );

      expect(screen.getByText("2")).toBeInTheDocument();
    });

    test("does not display count when no filters are active", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });
  });

  describe("Accessibility", () => {
    test("has proper accessibility attributes on main button", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByRole('button', { name: /filter options/i });
      expect(button).toHaveAttribute('role', 'button');
      expect(button).toHaveAttribute('tabIndex', '0');
      expect(button).toHaveAttribute('aria-label', 'Filter options');
    });

    test("has proper accessibility attributes on filter options", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={{}}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      const activeOption = screen.getByRole('button', { name: /select active/i });
      const inactiveOption = screen.getByRole('button', { name: /select inactive/i });

      [activeOption, inactiveOption].forEach(option => {
        expect(option).toHaveAttribute('role', 'button');
        expect(option).toHaveAttribute('tabIndex', '0');
      });
    });

    test("updates aria-label when filter is active", () => {
      const onFilterChange = jest.fn();
      render(
        <FilterButton
          filterGroups={mockFilterGroups}
          activeFilters={mockActiveFilters}
          onFilterChange={onFilterChange}
        />
      );

      const button = screen.getByText("Filter");
      fireEvent.click(button);

      const activeOption = screen.getByRole('button', { name: /deselect active/i });
      expect(activeOption).toHaveAttribute('aria-label', 'Deselect Active');
    });
  });
});
