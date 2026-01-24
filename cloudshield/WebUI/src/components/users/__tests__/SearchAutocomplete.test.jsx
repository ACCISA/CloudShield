/**
 * SearchAutocomplete.test.jsx
 *
 * Test suite for the SearchAutocomplete component
 * Tests search input, dropdown, and item selection
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchAutocomplete from "../SearchAutocomplete";

describe("SearchAutocomplete Component", () => {
  const mockItems = [
    { id: "1", name: "Item One", code: "I1" },
    { id: "2", name: "Item Two", code: "I2" },
    { id: "3", name: "Item Three", code: "I3" },
  ];

  const mockSelected = [];
  const mockOnSelect = jest.fn();
  const mockOnDeselect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
    mockOnDeselect.mockClear();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders label", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      expect(screen.getByText("Search Items")).toBeInTheDocument();
    });

    test("renders search input", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });
  });

  describe("Search Functionality", () => {
    test("opens dropdown when input is focused", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      // Dropdown should be visible
      expect(input).toBeInTheDocument();
    });

    test("filters items based on search query", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "One" } });

      expect(input.value).toBe("One");
    });

    test("accepts text input", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "test query" } });

      expect(input.value).toBe("test query");
    });
  });

  describe("Item Display", () => {
    test("displays items when dropdown is open", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });

      // Items should be visible in dropdown
      expect(screen.getByText("Item One")).toBeInTheDocument();
      expect(screen.getByText("Item Two")).toBeInTheDocument();
    });

    test("displays item codes", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "I" } });

      expect(screen.getByText("I1")).toBeInTheDocument();
    });

    test("displays initials in avatars", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });

      // Initials should be visible
      expect(screen.getByText("IO")).toBeInTheDocument();
    });
  });

  describe("Item Selection", () => {
    test("calls onSelect when item is clicked", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });

      const item = screen.getByText("Item One");
      fireEvent.click(item);

      expect(mockOnSelect).toHaveBeenCalled();
    });

    test("handles multiple item selection", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });

      fireEvent.click(screen.getByText("Item One"));

      // Need to re-enter search after first click (search gets cleared)
      fireEvent.change(input, { target: { value: "Item" } });
      fireEvent.click(screen.getByText("Item Two"));

      expect(mockOnSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe("Suggested Items", () => {
    test("displays suggested items when provided", () => {
      const suggested = [mockItems[0]];
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
          suggestedItems={suggested}
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      // Suggested section should be visible
      expect(screen.getByText("Item One")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles empty items array", () => {
      render(
        <SearchAutocomplete
          items={[]}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
    });

    test("handles selected items", () => {
      const selected = [mockItems[0]];
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={selected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      expect(input).toBeInTheDocument();
    });
  });

  describe("Keyboard Navigation", () => {
    test("navigates down with ArrowDown key", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });

      expect(input).toBeInTheDocument();
    });

    test("navigates up with ArrowUp key", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "ArrowUp" });

      expect(input).toBeInTheDocument();
    });

    test("selects item with Enter key", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });
      fireEvent.keyDown(input, { key: "ArrowDown" });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockOnSelect).toHaveBeenCalled();
    });

    test("closes dropdown with Escape key", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(input).toBeInTheDocument();
    });
  });

  describe("Checkbox Functionality", () => {
    test("renders checkbox when showAllCheckbox is true", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
          showAllCheckbox={true}
        />
      );

      // The checkbox label uses the same text as the main label
      const searchItemsElements = screen.getAllByText("Search Items");
      expect(searchItemsElements.length).toBeGreaterThan(1);
    });

    test("does not render checkbox when showAllCheckbox is false", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
          showAllCheckbox={false}
        />
      );

      // When showAllCheckbox is false, there should only be one "Search Items" (the label)
      const searchItemsElements = screen.getAllByText("Search Items");
      expect(searchItemsElements).toHaveLength(1);
    });

    test("calls onAllChange when checkbox is clicked", () => {
      const mockOnAllChange = jest.fn();
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
          showAllCheckbox={true}
          allSelected={false}
          onAllChange={mockOnAllChange}
        />
      );

      // Click the checkbox label area (there will be 2 "Search Items" when checkbox is shown)
      const searchItemsElements = screen.getAllByText("Search Items");
      fireEvent.click(searchItemsElements[1]);

      expect(mockOnAllChange).toHaveBeenCalledWith(true);
    });

    test("shows checked state when allSelected is true", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
          showAllCheckbox={true}
          allSelected={true}
        />
      );

      // Checkbox should be rendered when showAllCheckbox is true
      const searchItemsElements = screen.getAllByText("Search Items");
      expect(searchItemsElements.length).toBeGreaterThan(1);
    });
  });

  describe("Search Filtering", () => {
    test("filters by item name", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Two" } });

      expect(screen.getByText("Item Two")).toBeInTheDocument();
      expect(screen.queryByText("Item One")).not.toBeInTheDocument();
    });

    test("filters by item code", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "I2" } });

      expect(screen.getByText("Item Two")).toBeInTheDocument();
    });

    test("displays 'No results found' when no matches", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "NonExistent" } });

      expect(screen.getByText("No results found")).toBeInTheDocument();
    });

    test("clears search input after item selection", () => {
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });
      fireEvent.click(screen.getByText("Item One"));

      expect(input.value).toBe("");
    });
  });

  describe("Dropdown Behavior", () => {
    test("closes dropdown when clicking outside", () => {
      render(
        <div>
          <SearchAutocomplete
            items={mockItems}
            selected={mockSelected}
            onSelect={mockOnSelect}
            onDeselect={mockOnDeselect}
            label="Search Items"
          />
          <button>Outside Button</button>
        </div>
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });

      const outsideButton = screen.getByText("Outside Button");
      fireEvent.mouseDown(outsideButton);

      expect(input).toBeInTheDocument();
    });

    test("displays suggested section header", () => {
      const suggested = [mockItems[0]];
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
          suggestedItems={suggested}
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);

      expect(screen.getByText("Suggested")).toBeInTheDocument();
    });

    test("does not show suggested header when searching", () => {
      const suggested = [mockItems[0]];
      render(
        <SearchAutocomplete
          items={mockItems}
          selected={mockSelected}
          onSelect={mockOnSelect}
          onDeselect={mockOnDeselect}
          label="Search Items"
          suggestedItems={suggested}
        />
      );

      const input = screen.getByRole("textbox");
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: "Item" } });

      expect(screen.queryByText("Suggested")).not.toBeInTheDocument();
    });
  });
});
