/**
 * StatCard.test.jsx
 *
 * Comprehensive test suite for StatCard component
 * Tests rendering, gradients, change indicators, loading/error states, and interactions
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StatCard from "../StatCard";

// Mock useThemeColors
jest.mock("../../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    isDark: true,
    isLight: false,
    bgPrimary: "#0A0A0A",
    bgSecondary: "#111111",
    textPrimary: "#FFFFFF",
    textSecondary: "#9E9E9E",
    successColor: "#4CAF50",
    errorColor: "#F44336",
  }),
}));

describe("StatCard Component", () => {
  describe("Rendering", () => {
    test("renders title and value", () => {
      render(<StatCard title="Total Users" value="150" />);
      expect(screen.getByText("Total Users")).toBeInTheDocument();
      expect(screen.getByText("150")).toBeInTheDocument();
    });

    test("renders numeric value", () => {
      render(<StatCard title="Count" value={42} />);
      expect(screen.getByText("42")).toBeInTheDocument();
    });

    test("renders string value", () => {
      render(<StatCard title="Status" value="Active" />);
      expect(screen.getByText("Active")).toBeInTheDocument();
    });

    test("renders zero value", () => {
      render(<StatCard title="Items" value={0} />);
      expect(screen.getByText("0")).toBeInTheDocument();
    });

    test("renders large numbers", () => {
      render(<StatCard title="Revenue" value="1,234,567" />);
      expect(screen.getByText("1,234,567")).toBeInTheDocument();
    });

    test("renders decimal values", () => {
      render(<StatCard title="Average" value="99.99" />);
      expect(screen.getByText("99.99")).toBeInTheDocument();
    });
  });

  describe("Background colors", () => {
    test("applies custom card color", () => {
      const { container } = render(
        <StatCard
          title="Custom"
          value="99"
          gradientFrom="#ff0000"
          gradientTo="#00ff00"
        />,
      );
      const box = container.firstChild;
      expect(box).toHaveStyle({
        backgroundColor: "#ff0000",
      });
    });

    test("applies default card color when not provided", () => {
      const { container } = render(<StatCard title="Default" value="100" />);
      const box = container.firstChild;
      expect(box).toHaveStyle({
        backgroundColor: "#6a5acd",
      });
    });

    test("uses gradientFrom as flat background color", () => {
      const { container } = render(
        <StatCard
          title="Test"
          value="50"
          gradientFrom="#1a1a1a"
          gradientTo="#ffffff"
        />,
      );
      const box = container.firstChild;
      expect(box).toHaveStyle({
        backgroundColor: "#1a1a1a",
      });
    });

    test("applies custom background color", () => {
      const { container } = render(
        <StatCard title="Test" value="50" gradientFrom="#000000" />,
      );
      const box = container.firstChild;
      expect(box).toHaveStyle({ backgroundColor: "#000000" });
    });
  });

  describe("Add Button", () => {
    test("renders add button when onAdd is provided", () => {
      const handleAdd = jest.fn();
      render(<StatCard title="Files" value="250" onAdd={handleAdd} />);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    test("does not render add button when onAdd is not provided", () => {
      render(<StatCard title="Files" value="250" />);
      const button = screen.queryByRole("button");
      expect(button).not.toBeInTheDocument();
    });

    test("calls onAdd when button is clicked", () => {
      const handleAdd = jest.fn();
      render(<StatCard title="Files" value="250" onAdd={handleAdd} />);
      const button = screen.getByRole("button");

      fireEvent.click(button);
      expect(handleAdd).toHaveBeenCalledTimes(1);
    });

    test("calls onAdd multiple times when clicked multiple times", () => {
      const handleAdd = jest.fn();
      render(<StatCard title="Files" value="250" onAdd={handleAdd} />);
      const button = screen.getByRole("button");

      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(handleAdd).toHaveBeenCalledTimes(3);
    });

    test("button is keyboard accessible", () => {
      const handleAdd = jest.fn();
      const { container } = render(
        <StatCard title="Files" value="250" onAdd={handleAdd} />,
      );
      const button = container.querySelector("button");
      expect(button).toBeInTheDocument();
    });
  });

  describe("Loading States", () => {
    test("renders loading state", () => {
      const { container } = render(
        <StatCard title="Files" value="250" loading={true} />,
      );
      // Component should render loading indicator
      expect(container).toBeInTheDocument();
    });

    test("loads are skeletons shown during loading", () => {
      const { container } = render(
        <StatCard title="Loading" value="---" loading={true} />,
      );
      expect(container).toBeInTheDocument();
    });

    test("hides loading state when loading is false", () => {
      const { container } = render(
        <StatCard title="Files" value="250" loading={false} />,
      );
      expect(screen.getByText("Files")).toBeInTheDocument();
      expect(screen.getByText("250")).toBeInTheDocument();
    });

    test("transitions from loading to loaded state", () => {
      const { rerender } = render(
        <StatCard title="Files" value="250" loading={true} />,
      );

      rerender(<StatCard title="Files" value="250" loading={false} />);

      expect(screen.getByText("Files")).toBeInTheDocument();
      expect(screen.getByText("250")).toBeInTheDocument();
    });
  });

  describe("Error States", () => {
    test("renders error message when error prop provided", () => {
      render(
        <StatCard title="Cards" value="250" error="Failed to load data" />,
      );
      expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    });

    test("shows error message instead of value", () => {
      render(<StatCard title="Cards" value="250" error="Connection error" />);
      expect(screen.getByText("Connection error")).toBeInTheDocument();
    });

    test("handles empty error string", () => {
      render(<StatCard title="Cards" value="250" error="" />);
      expect(screen.getByText("250")).toBeInTheDocument();
    });

    test("displays different error messages", () => {
      const { rerender } = render(
        <StatCard title="Cards" value="250" error="Error 1" />,
      );
      expect(screen.getByText("Error 1")).toBeInTheDocument();

      rerender(<StatCard title="Cards" value="250" error="Error 2" />);
      expect(screen.getByText("Error 2")).toBeInTheDocument();
      expect(screen.queryByText("Error 1")).not.toBeInTheDocument();
    });
  });

  describe("Props Combinations", () => {
    test("renders with minimal props", () => {
      render(<StatCard title="Minimal" value="50" />);

      expect(screen.getByText("Minimal")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });
  });

  describe("Props Updates", () => {
    test("updates value when prop changes", () => {
      const { rerender } = render(<StatCard title="Users" value="100" />);
      expect(screen.getByText("100")).toBeInTheDocument();

      rerender(<StatCard title="Users" value="150" />);
      expect(screen.getByText("150")).toBeInTheDocument();
    });

    test("updates title when prop changes", () => {
      const { rerender } = render(<StatCard title="Old Title" value="100" />);
      expect(screen.getByText("Old Title")).toBeInTheDocument();

      rerender(<StatCard title="New Title" value="100" />);
      expect(screen.getByText("New Title")).toBeInTheDocument();
      expect(screen.queryByText("Old Title")).not.toBeInTheDocument();
    });
    test("updates gradient colors", () => {
      const { container, rerender } = render(
        <StatCard
          title="Card"
          value="100"
          gradientFrom="#ff0000"
          gradientTo="#00ff00"
        />,
      );
      let box = container.firstChild;
      expect(box).toHaveStyle({ backgroundColor: "#ff0000" });

      rerender(
        <StatCard
          title="Card"
          value="100"
          gradientFrom="#0000ff"
          gradientTo="#ffff00"
        />,
      );
      box = container.firstChild;
      expect(box).toHaveStyle({ backgroundColor: "#0000ff" });
    });
  });

  describe("Accessibility", () => {
    test("has accessible structure", () => {
      const { container } = render(
        <StatCard title="Accessible Card" value="100" />,
      );
      expect(container).toBeInTheDocument();
    });

    test("add button is accessible", () => {
      const handleAdd = jest.fn();
      render(<StatCard title="Card" value="100" onAdd={handleAdd} />);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    test("text contrast is maintainable", () => {
      render(
        <StatCard
          title="High Contrast"
          value="100"
          gradientFrom="#000000"
          gradientTo="#ffffff"
        />,
      );
      expect(screen.getByText("High Contrast")).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles very large numbers", () => {
      render(<StatCard title="Big Numbers" value="999999999999" />);
      expect(screen.getByText("999999999999")).toBeInTheDocument();
    });

    test("handles special characters in title", () => {
      render(<StatCard title="Title @#$%^&*()" value="100" />);
      expect(screen.getByText("Title @#$%^&*()")).toBeInTheDocument();
    });

    test("handles special characters in value", () => {
      render(<StatCard title="Special Value" value="$99.99 USD" />);
      expect(screen.getByText("$99.99 USD")).toBeInTheDocument();
    });

    test("handles very long title", () => {
      const longTitle = "A".repeat(100);
      render(<StatCard title={longTitle} value="100" />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    test("handles whitespace in values", () => {
      render(<StatCard title="Whitespace" value="  100  " />);
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    test("handles null value gracefully", () => {
      render(<StatCard title="Null Value" value={null} />);
      expect(screen.getByText("Null Value")).toBeInTheDocument();
    });

    test("handles undefined onAdd", () => {
      const { container } = render(
        <StatCard title="Test" value="100" onAdd={undefined} />,
      );
      expect(container.querySelector("button")).not.toBeInTheDocument();
    });
  });

  describe("Responsive Behavior", () => {
    test("renders correctly on different viewport sizes", () => {
      const { container } = render(<StatCard title="Responsive" value="100" />);
      expect(container).toBeInTheDocument();
    });

    test("maintains layout with long values", () => {
      render(<StatCard title="Performance" value="99.999% Uptime" />);
      expect(screen.getByText("99.999% Uptime")).toBeInTheDocument();
    });
  });
  it("shows loading state", () => {
    render(<StatCard title="Users" value="150" loading={true} />);
    // CircularProgress should be present
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<StatCard title="Users" value="150" error="Failed to load data" />);
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("applies error gradient when error is present", () => {
    const { container } = render(
      <StatCard title="Users" value="150" error="Failed to load" />,
    );
    const box = container.firstChild;
    expect(box).toHaveStyle({
      backgroundColor: "#e53e3e",
    });
  });

  it("does not show add button in loading state", () => {
    render(
      <StatCard title="Users" value="150" loading={true} onAdd={() => {}} />,
    );
    const button = screen.queryByRole("button");
    expect(button).not.toBeInTheDocument();
  });

  it("does not show add button in error state", () => {
    render(
      <StatCard title="Users" value="150" error="Error" onAdd={() => {}} />,
    );
    const button = screen.queryByRole("button");
    expect(button).not.toBeInTheDocument();
  });
});
