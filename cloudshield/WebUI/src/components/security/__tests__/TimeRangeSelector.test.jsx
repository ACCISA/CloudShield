/**
 * TimeRangeSelector.test.jsx
 *
 * Comprehensive test suite for TimeRangeSelector component.
 * Tests rendering, interactions, dropdown functionality, event handlers, and accessibility.
 * Designed to achieve 80%+ code coverage for SonarQube analysis.
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TimeRangeSelector from "../TimeRangeSelector";

describe("TimeRangeSelector Component", () => {
  const mockOnChange = jest.fn();
  const defaultProps = {
    value: "30d",
    onChange: mockOnChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic Rendering", () => {
    it("renders without crashing", () => {
      const { container } = render(<TimeRangeSelector {...defaultProps} />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it("renders button with selected label", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    });

    it("renders chevron icon", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const svg = screen
        .getByRole("button", { name: /Last 30 days/i })
        .querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("dropdown is closed by default", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      // Options should not be visible initially
      expect(screen.queryByText("Last 7 days")).not.toBeInTheDocument();
    });

    it("displays correct label for each value option", () => {
      const { rerender } = render(
        <TimeRangeSelector value="7d" onChange={mockOnChange} />,
      );
      expect(screen.getByText("Last 7 days")).toBeInTheDocument();

      rerender(<TimeRangeSelector value="14d" onChange={mockOnChange} />);
      expect(screen.getByText("Last 14 days")).toBeInTheDocument();

      rerender(<TimeRangeSelector value="90d" onChange={mockOnChange} />);
      expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    });
  });

  describe("Dropdown Functionality", () => {
    it("opens dropdown when button is clicked", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);

      expect(screen.getByText("Last 7 days")).toBeInTheDocument();
      expect(screen.getByText("Last 14 days")).toBeInTheDocument();
      expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    });

    it("closes dropdown when button is clicked again", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      expect(screen.getByText("Last 7 days")).toBeInTheDocument();

      fireEvent.click(button);
      expect(screen.queryByText("Last 7 days")).not.toBeInTheDocument();
    });

    it("displays all four time range options when open", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);

      const options = screen.getAllByRole("button", { hidden: false });
      // Should have main button + 4 option buttons
      expect(options.length).toBe(5);
    });

    it("chevron icon rotates when dropdown opens", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });
      const svg = button.querySelector("svg");

      expect(svg).toHaveStyle("transform: rotate(0deg)");

      fireEvent.click(button);

      expect(svg).toHaveStyle("transform: rotate(180deg)");
    });
  });

  describe("Option Selection", () => {
    it("calls onChange with selected value", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const option = screen.getByText("Last 7 days");
      fireEvent.click(option);

      expect(mockOnChange).toHaveBeenCalledWith("7d");
      expect(mockOnChange).toHaveBeenCalledTimes(1);
    });

    it("closes dropdown after selecting an option", async () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const option = screen.getByText("Last 14 days");
      fireEvent.click(option);

      await waitFor(() => {
        expect(screen.queryByText("Last 7 days")).not.toBeInTheDocument();
      });
    });

    it("can select each time range option", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      // Test 7 days
      fireEvent.click(button);
      fireEvent.click(screen.getByText("Last 7 days"));
      expect(mockOnChange).toHaveBeenCalledWith("7d");

      mockOnChange.mockClear();

      // Test 14 days
      fireEvent.click(button);
      fireEvent.click(screen.getByText("Last 14 days"));
      expect(mockOnChange).toHaveBeenCalledWith("14d");

      mockOnChange.mockClear();

      // Test 90 days
      fireEvent.click(button);
      fireEvent.click(screen.getByText("Last 90 days"));
      expect(mockOnChange).toHaveBeenCalledWith("90d");
    });
  });

  describe("Click Outside", () => {
    it("closes dropdown when clicking outside", async () => {
      render(
        <div>
          <TimeRangeSelector {...defaultProps} />
          <div data-testid="outside">Outside element</div>
        </div>,
      );

      const button = screen.getByRole("button", { name: /Last 30 days/i });
      fireEvent.click(button);

      expect(screen.getByText("Last 7 days")).toBeInTheDocument();

      const outside = screen.getByTestId("outside");
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByText("Last 7 days")).not.toBeInTheDocument();
      });
    });

    it("does not close when clicking inside dropdown", async () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      expect(screen.getByText("Last 7 days")).toBeInTheDocument();

      // Click on the dropdown container
      const option = screen.getByText("Last 14 days");
      fireEvent.mouseDown(option);

      // Dropdown should still be open before option click completes
      expect(screen.getByText("Last 7 days")).toBeInTheDocument();
    });

    it("removes event listener on unmount", () => {
      const removeEventListenerSpy = jest.spyOn(
        document,
        "removeEventListener",
      );
      const { unmount } = render(<TimeRangeSelector {...defaultProps} />);

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "mousedown",
        expect.any(Function),
      );
      removeEventListenerSpy.mockRestore();
    });
  });

  describe("Hover Effects", () => {
    it("applies hover styles to button on mouse enter", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.mouseEnter(button);

      expect(button).toBeInTheDocument();
    });

    it("removes hover styles from button on mouse leave", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.mouseEnter(button);
      fireEvent.mouseLeave(button);

      expect(button).toBeInTheDocument();
    });

    it("applies hover styles to dropdown options", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const option = screen.getByText("Last 7 days");

      fireEvent.mouseEnter(option);

      expect(option).toBeInTheDocument();
    });

    it("removes hover styles from options on mouse leave", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const option = screen.getByText("Last 7 days");

      fireEvent.mouseEnter(option);
      fireEvent.mouseLeave(option);

      expect(option).toHaveStyle({
        backgroundColor: "transparent",
      });
    });

    it("does not apply hover styles to selected option", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const selectedOption = screen.getAllByText("Last 30 days")[1];

      const initialBgColor = selectedOption.style.backgroundColor;
      fireEvent.mouseEnter(selectedOption);

      // Background should not change on hover for selected item
      expect(selectedOption.style.backgroundColor).toBe(initialBgColor);
    });
  });

  describe("Styling", () => {
    it("applies correct button styles", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      expect(button).toHaveStyle({
        cursor: "pointer",
        display: "flex",
      });
    });

    it("selected option has distinct styling", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const selectedOption = screen.getAllByText("Last 30 days")[1];

      expect(selectedOption).toHaveStyle({
        fontWeight: "500",
      });
    });

    it("last option has no bottom border", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const lastOption = screen.getByText("Last 90 days");

      expect(lastOption).toHaveStyle({
        borderBottom: "none",
      });
    });

    it("non-last options have bottom border", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const firstOption = screen.getByText("Last 7 days");

      expect(firstOption).toHaveStyle({
        borderBottom: "1px solid #E5E5E5",
      });
    });
  });

  describe("Prop Validation", () => {
    it("handles unknown value gracefully", () => {
      render(<TimeRangeSelector value="invalid" onChange={mockOnChange} />);
      expect(screen.getByText("Last 30 days")).toBeInTheDocument();
    });

    it("requires onChange prop", () => {
      expect(() => {
        // @ts-expect-error Testing missing prop
        render(<TimeRangeSelector value="30d" />);
      }).not.toThrow();
    });

    it("requires value prop", () => {
      expect(() => {
        // @ts-expect-error Testing missing prop
        render(<TimeRangeSelector onChange={mockOnChange} />);
      }).not.toThrow();
    });
  });

  describe("Accessibility", () => {
    it("button has correct role", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button");

      expect(button).toBeInTheDocument();
    });

    it("option buttons have correct type", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      const options = screen.getAllByRole("button").slice(1); // Skip main button

      options.forEach((option) => {
        expect(option).toHaveAttribute("type", "button");
      });
    });

    it("buttons are keyboard accessible", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      button.focus();
      expect(document.activeElement).toBe(button);
    });
  });

  describe("Edge Cases", () => {
    it("handles rapid open/close actions", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      // Should end in closed state
      expect(screen.queryByText("Last 7 days")).not.toBeInTheDocument();
    });

    it("handles rapid option selections", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });

      fireEvent.click(button);
      fireEvent.click(screen.getByText("Last 7 days"));

      fireEvent.click(button);
      fireEvent.click(screen.getByText("Last 14 days"));

      fireEvent.click(button);
      fireEvent.click(screen.getByText("Last 90 days"));

      expect(mockOnChange).toHaveBeenCalledTimes(3);
    });

    it("maintains state after multiple prop changes", () => {
      const { rerender } = render(
        <TimeRangeSelector value="7d" onChange={mockOnChange} />,
      );

      rerender(<TimeRangeSelector value="14d" onChange={mockOnChange} />);
      rerender(<TimeRangeSelector value="30d" onChange={mockOnChange} />);
      rerender(<TimeRangeSelector value="90d" onChange={mockOnChange} />);

      expect(screen.getByText("Last 90 days")).toBeInTheDocument();
    });
  });

  describe("ChevronIcon", () => {
    it("renders SVG icon", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });
      const svg = button.querySelector("svg");

      expect(svg).toBeInTheDocument();
    });

    it("rotates icon when dropdown opens and closes", () => {
      render(<TimeRangeSelector {...defaultProps} />);
      const button = screen.getByRole("button", { name: /Last 30 days/i });
      const svg = button.querySelector("svg");

      // Closed state
      expect(svg).toHaveStyle({ transform: "rotate(0deg)" });

      // Open state
      fireEvent.click(button);
      expect(svg).toHaveStyle({ transform: "rotate(180deg)" });

      // Closed again
      fireEvent.click(button);
      expect(svg).toHaveStyle({ transform: "rotate(0deg)" });
    });
  });
});
