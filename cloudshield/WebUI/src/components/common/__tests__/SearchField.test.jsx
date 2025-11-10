/**
 * SearchField.test.jsx
 *
 * Test suite for the SearchField component
 * Tests functionality, debouncing, responsiveness, and edge cases
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import SearchField from "../SearchField/SearchField";

// Create a theme for testing
const theme = createTheme();

// Helper function to render with theme
const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe("SearchField Component", () => {
  // Basic rendering tests
  describe("Rendering", () => {
    test("renders without crashing", () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchField value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      expect(input).toBeInTheDocument();
    });

    test("renders with custom placeholder", () => {
      const onChange = jest.fn();
      renderWithTheme(
        <SearchField
          value=""
          onChange={onChange}
          placeholder="Search activities"
        />
      );

      expect(
        screen.getByPlaceholderText("Search activities")
      ).toBeInTheDocument();
    });

    test("renders with search icon by default", () => {
      const onChange = jest.fn();
      const { container } = renderWithTheme(
        <SearchField value="" onChange={onChange} />
      );

      // Check for the search icon SVG
      const icon = container.querySelector(
        '[data-testid="SearchOutlinedIcon"]'
      );
      expect(icon).toBeInTheDocument();
    });

    test("hides search icon when showIcon is false", () => {
      const onChange = jest.fn();
      const { container } = renderWithTheme(
        <SearchField value="" onChange={onChange} showIcon={false} />
      );

      const icon = container.querySelector(
        '[data-testid="SearchOutlinedIcon"]'
      );
      expect(icon).not.toBeInTheDocument();
    });

    test("displays the provided value", () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchField value="test search" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      expect(input).toHaveValue("test search");
    });
  });

  // Input interaction tests
  describe("User Interactions", () => {
    test("calls onChange when user types (no debounce)", async () => {
      const onChange = jest.fn();

      renderWithTheme(<SearchField value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "test" } });

      // With no debounce, onChange should be called once
      expect(onChange).toHaveBeenCalledWith("test");
    });

    test("updates input value as user types", async () => {
      const onChange = jest.fn();
      const { rerender } = renderWithTheme(<SearchField value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "search" } });

      expect(onChange).toHaveBeenCalledWith("search");
      
      // Rerender with updated value to simulate parent component updating
      rerender(
        <ThemeProvider theme={theme}>
          <SearchField value="search" onChange={onChange} />
        </ThemeProvider>
      );
      
      expect(input).toHaveValue("search");
    });

    test("allows clearing the input", async () => {
      const onChange = jest.fn();

      renderWithTheme(<SearchField value="test" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "" } });

      expect(onChange).toHaveBeenCalledWith("");
    });

    test("handles special characters", async () => {
      const onChange = jest.fn();

      renderWithTheme(<SearchField value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: "test@123!#" } });

      expect(onChange).toHaveBeenCalledWith("test@123!#");
    });
  });

  // Debouncing tests
  describe("Debouncing", () => {
    jest.useFakeTimers();

    test("debounces onChange calls when debounceMs is set", async () => {
      const onChange = jest.fn();
      const user = userEvent.setup({ delay: null }); // Disable delay for fake timers

      renderWithTheme(
        <SearchField value="" onChange={onChange} debounceMs={300} />
      );

      const input = screen.getByPlaceholderText("Search...");
      await user.type(input, "test");

      // onChange should not be called immediately
      expect(onChange).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(300);

      // Now onChange should be called once with the final value
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith("test");
      });
    });

    test("cancels previous debounce when typing continues", async () => {
      const onChange = jest.fn();
      const user = userEvent.setup({ delay: null });

      renderWithTheme(
        <SearchField value="" onChange={onChange} debounceMs={300} />
      );

      const input = screen.getByPlaceholderText("Search...");

      // Type first character
      await user.type(input, "t");
      jest.advanceTimersByTime(100);

      // Type second character before debounce completes
      await user.type(input, "e");
      jest.advanceTimersByTime(100);

      // Type third character
      await user.type(input, "s");

      // Still no calls yet
      expect(onChange).not.toHaveBeenCalled();

      // Complete the debounce
      jest.advanceTimersByTime(300);

      await waitFor(() => {
        // Should only be called once with final value
        expect(onChange).toHaveBeenCalledTimes(1);
      });
    });

    afterEach(() => {
      jest.clearAllTimers();
    });
  });

  // Controlled component tests
  describe("Controlled Component Behavior", () => {
    test("updates when value prop changes", () => {
      const onChange = jest.fn();
      const { rerender } = renderWithTheme(
        <SearchField value="initial" onChange={onChange} />
      );

      const input = screen.getByPlaceholderText("Search...");
      expect(input).toHaveValue("initial");

      // Update the value prop
      rerender(
        <ThemeProvider theme={theme}>
          <SearchField value="updated" onChange={onChange} />
        </ThemeProvider>
      );

      expect(input).toHaveValue("updated");
    });

    test("maintains value when onChange is not called", () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchField value="test" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      expect(input).toHaveValue("test");
    });
  });

  // Props validation tests
  describe("Props", () => {
    test("applies custom width", () => {
      const onChange = jest.fn();
      const { container } = renderWithTheme(
        <SearchField value="" onChange={onChange} width="500px" />
      );

      const input = container.querySelector(".MuiOutlinedInput-root");
      expect(input).toHaveStyle({ width: "500px" });
    });

    test("applies custom styles via sx prop", () => {
      const onChange = jest.fn();
      const { container } = renderWithTheme(
        <SearchField
          value=""
          onChange={onChange}
          sx={{ backgroundColor: "red" }}
        />
      );

      const input = container.querySelector(".MuiOutlinedInput-root");
      expect(input).toHaveStyle({ backgroundColor: "red" });
    });

    test("uses default placeholder when not provided", () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchField value="" onChange={onChange} />);

      expect(screen.getByPlaceholderText("Search...")).toBeInTheDocument();
    });

    test("uses default width when not provided", () => {
      const onChange = jest.fn();
      const { container } = renderWithTheme(
        <SearchField value="" onChange={onChange} />
      );

      const input = container.querySelector(".MuiOutlinedInput-root");
      expect(input).toHaveStyle({ width: "360px" });
    });
  });

  // Edge cases
  describe("Edge Cases", () => {
    test("handles empty string value", () => {
      const onChange = jest.fn();
      renderWithTheme(<SearchField value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      expect(input).toHaveValue("");
    });

    test("handles very long input", async () => {
      const onChange = jest.fn();
      const longText = "a".repeat(1000);

      renderWithTheme(<SearchField value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");
      fireEvent.change(input, { target: { value: longText } });

      expect(onChange).toHaveBeenCalledWith(longText);
    });

    test("handles rapid typing", async () => {
      const onChange = jest.fn();

      renderWithTheme(<SearchField value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");

      // Type very quickly
      fireEvent.change(input, { target: { value: "abcdefghijk" } });

      expect(onChange).toHaveBeenCalledWith("abcdefghijk");
    });

    test("handles onChange being undefined gracefully", () => {
      // This should not crash
      expect(() => {
        renderWithTheme(<SearchField value="" />);
      }).not.toThrow();
    });

    test("handles value being null or undefined", () => {
      const onChange = jest.fn();

      // Should not crash with null
      const { rerender } = renderWithTheme(
        <SearchField value={null} onChange={onChange} />
      );

      // Should not crash with undefined
      rerender(
        <ThemeProvider theme={theme}>
          <SearchField value={undefined} onChange={onChange} />
        </ThemeProvider>
      );
    });
  });

  // Accessibility tests
  describe("Accessibility", () => {
    test("input is keyboard accessible", async () => {
      const onChange = jest.fn();

      renderWithTheme(<SearchField value="" onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");

      // Focus the input
      input.focus();
      expect(input).toHaveFocus();

      // Type with keyboard
      fireEvent.change(input, { target: { value: "test" } });
      expect(onChange).toHaveBeenCalledWith("test");
    });

    test("supports screen readers with placeholder", () => {
      const onChange = jest.fn();
      renderWithTheme(
        <SearchField
          value=""
          onChange={onChange}
          placeholder="Search for users"
        />
      );

      const input = screen.getByPlaceholderText("Search for users");
      expect(input).toHaveAttribute("placeholder", "Search for users");
    });
  });

  // Integration tests
  describe("Integration", () => {
    test("works in a typical search scenario", async () => {
      const mockData = [
        { id: 1, name: "John Doe" },
        { id: 2, name: "Jane Smith" },
        { id: 3, name: "Bob Johnson" },
      ];

      let searchTerm = "";
      const onChange = (value) => {
        searchTerm = value;
      };

      renderWithTheme(<SearchField value={searchTerm} onChange={onChange} />);

      const input = screen.getByPlaceholderText("Search...");

      // Search for "john"
      fireEvent.change(input, { target: { value: "john" } });

      // Filter would happen in parent component
      const filtered = mockData.filter((item) =>
        item.name.toLowerCase().includes("john")
      );

      expect(filtered).toHaveLength(2); // John Doe and Bob Johnson
    });

    test("clears search and shows all results", async () => {
      let searchValue = "test";
      const onChange = (value) => {
        searchValue = value;
      };

      const { rerender } = renderWithTheme(
        <SearchField value={searchValue} onChange={onChange} />
      );

      const input = screen.getByPlaceholderText("Search...");
      expect(input).toHaveValue("test");

      // Clear the search
      fireEvent.change(input, { target: { value: "" } });

      // Rerender with cleared value
      rerender(
        <ThemeProvider theme={theme}>
          <SearchField value="" onChange={onChange} />
        </ThemeProvider>
      );

      expect(input).toHaveValue("");
    });
  });
});
