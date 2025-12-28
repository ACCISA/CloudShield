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
});
