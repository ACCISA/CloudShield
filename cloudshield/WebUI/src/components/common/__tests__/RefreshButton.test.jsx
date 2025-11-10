/**
 * RefreshButton.test.jsx
 *
 * Test suite for the RefreshButton component
 * Tests functionality, loading states, and responsiveness
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import RefreshButton from "../RefreshButton/RefreshButton";

// Create a theme for testing
const theme = createTheme();

// Helper function to render with theme
const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe("RefreshButton Component", () => {
  // Basic rendering tests
  describe("Rendering", () => {
    test("renders without crashing", () => {
      const onClick = jest.fn();
      renderWithTheme(<RefreshButton onClick={onClick} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    test("renders refresh icon when not loading", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} loading={false} />
      );

      const icon = container.querySelector(
        '[data-testid="RefreshOutlinedIcon"]'
      );
      expect(icon).toBeInTheDocument();
    });

    test("renders spinner when loading", () => {
      const onClick = jest.fn();
      renderWithTheme(<RefreshButton onClick={onClick} loading={true} />);

      const spinner = screen.getByRole("progressbar");
      expect(spinner).toBeInTheDocument();
    });

    test("renders with tooltip", async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      renderWithTheme(
        <RefreshButton onClick={onClick} tooltip="Refresh data" />
      );

      const button = screen.getByRole("button");

      // Hover to show tooltip
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByText("Refresh data")).toBeInTheDocument();
      });
    });

    test("uses default tooltip when not provided", async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      renderWithTheme(<RefreshButton onClick={onClick} />);

      const button = screen.getByRole("button");
      await user.hover(button);

      await waitFor(() => {
        expect(screen.getByText("Refresh")).toBeInTheDocument();
      });
    });

    test("does not show tooltip when loading", () => {
      const onClick = jest.fn();
      renderWithTheme(
        <RefreshButton onClick={onClick} loading={true} tooltip="Refresh" />
      );

      // Tooltip should not be rendered when loading
      expect(screen.queryByText("Refresh")).not.toBeInTheDocument();
    });
  });

  // Click interaction tests
  describe("User Interactions", () => {
    test("calls onClick when button is clicked", async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      renderWithTheme(<RefreshButton onClick={onClick} />);

      const button = screen.getByRole("button");
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test("does not call onClick when disabled", async () => {
      const onClick = jest.fn();

      renderWithTheme(<RefreshButton onClick={onClick} disabled={true} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      
      // Disabled buttons don't fire click events in the browser
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    test("does not call onClick when loading", async () => {
      const onClick = jest.fn();

      renderWithTheme(<RefreshButton onClick={onClick} loading={true} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      
      // Disabled buttons don't fire click events in the browser
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    test("can be clicked multiple times when not disabled", async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      renderWithTheme(<RefreshButton onClick={onClick} />);

      const button = screen.getByRole("button");
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(3);
    });
  });

  // Loading state tests
  describe("Loading States", () => {
    test("is enabled when not loading", () => {
      const onClick = jest.fn();
      renderWithTheme(<RefreshButton onClick={onClick} loading={false} />);

      const button = screen.getByRole("button");
      expect(button).not.toBeDisabled();
    });

    test("is disabled when loading", () => {
      const onClick = jest.fn();
      renderWithTheme(<RefreshButton onClick={onClick} loading={true} />);

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
    });

    test("shows spinner with correct size for small button", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} loading={true} size="small" />
      );

      const spinner = container.querySelector(".MuiCircularProgress-root");
      expect(spinner).toHaveStyle({ width: "20px", height: "20px" });
    });

    test("shows spinner with correct size for medium button", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} loading={true} size="medium" />
      );

      const spinner = container.querySelector(".MuiCircularProgress-root");
      expect(spinner).toHaveStyle({ width: "20px", height: "20px" });
    });

    test("shows spinner with correct size for large button", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} loading={true} size="large" />
      );

      const spinner = container.querySelector(".MuiCircularProgress-root");
      expect(spinner).toHaveStyle({ width: "24px", height: "24px" });
    });

    test("transitions from loading to not loading", () => {
      const onClick = jest.fn();
      const { rerender, container } = renderWithTheme(
        <RefreshButton onClick={onClick} loading={true} />
      );

      // Initially loading
      expect(screen.getByRole("progressbar")).toBeInTheDocument();

      // Stop loading
      rerender(
        <ThemeProvider theme={theme}>
          <RefreshButton onClick={onClick} loading={false} />
        </ThemeProvider>
      );

      // Should show icon again
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
      const icon = container.querySelector(
        '[data-testid="RefreshOutlinedIcon"]'
      );
      expect(icon).toBeInTheDocument();
    });
  });

  // Size prop tests
  describe("Size Variations", () => {
    test("renders with small size", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} size="small" />
      );

      const button = container.querySelector(".MuiIconButton-root");
      expect(button).toHaveStyle({ width: "44px", height: "44px" });
    });

    test("renders with medium size", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} size="medium" />
      );

      const button = container.querySelector(".MuiIconButton-root");
      expect(button).toHaveStyle({ width: "44px", height: "44px" });
    });

    test("renders with large size", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} size="large" />
      );

      const button = container.querySelector(".MuiIconButton-root");
      expect(button).toHaveStyle({ width: "48px", height: "48px" });
    });
  });

  // Custom styling tests
  describe("Custom Styling", () => {
    test("applies custom styles via sx prop", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} sx={{ backgroundColor: "red" }} />
      );

      const button = container.querySelector(".MuiIconButton-root");
      expect(button).toHaveStyle({ backgroundColor: "red" });
    });

    test("applies default styles", () => {
      const onClick = jest.fn();
      const { container } = renderWithTheme(
        <RefreshButton onClick={onClick} />
      );

      const button = container.querySelector(".MuiIconButton-root");
      // Check that button exists and has the expected border radius style
      expect(button).toBeInTheDocument();
      expect(button).toHaveStyle({ borderRadius: "24px" });
    });
  });

  // Async operation tests
  describe("Async Operations", () => {
    test("handles async onClick function", async () => {
      const asyncClick = jest.fn(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      const user = userEvent.setup();
      renderWithTheme(<RefreshButton onClick={asyncClick} />);

      const button = screen.getByRole("button");
      await user.click(button);

      await waitFor(() => {
        expect(asyncClick).toHaveBeenCalledTimes(1);
      });
    });

    test("works with loading state management", async () => {
      let loading = false;
      const setLoading = (value) => {
        loading = value;
      };

      const handleRefresh = async () => {
        setLoading(true);
        await new Promise((resolve) => setTimeout(resolve, 100));
        setLoading(false);
      };

      const onClick = jest.fn(handleRefresh);
      const user = userEvent.setup();

      const { rerender } = renderWithTheme(
        <RefreshButton onClick={onClick} loading={loading} />
      );

      const button = screen.getByRole("button");
      await user.click(button);

      expect(onClick).toHaveBeenCalled();
    });
  });

  // Edge cases
  describe("Edge Cases", () => {
    test("handles onClick being undefined", () => {
      expect(() => {
        renderWithTheme(<RefreshButton />);
      }).not.toThrow();
    });

    test("handles empty tooltip", async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      renderWithTheme(<RefreshButton onClick={onClick} tooltip="" />);

      const button = screen.getByRole("button");
      await user.hover(button);

      // Should not show tooltip
      await waitFor(() => {
        expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      });
    });

    test("handles both disabled and loading", () => {
      const onClick = jest.fn();
      renderWithTheme(
        <RefreshButton onClick={onClick} disabled={true} loading={true} />
      );

      const button = screen.getByRole("button");
      expect(button).toBeDisabled();
      expect(screen.getByRole("progressbar")).toBeInTheDocument();
    });

    test("handles rapid clicks", async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      renderWithTheme(<RefreshButton onClick={onClick} />);

      const button = screen.getByRole("button");

      // Click multiple times rapidly
      await user.click(button);
      await user.click(button);
      await user.click(button);
      await user.click(button);

      expect(onClick).toHaveBeenCalledTimes(4);
    });
  });

  // Accessibility tests
  describe("Accessibility", () => {
    test("button is keyboard accessible", async () => {
      const onClick = jest.fn();
      const user = userEvent.setup();

      renderWithTheme(<RefreshButton onClick={onClick} />);

      // Tab to button
      await user.tab();
      const button = screen.getByRole("button");
      expect(button).toHaveFocus();

      // Press Enter
      await user.keyboard("{Enter}");
      expect(onClick).toHaveBeenCalled();
    });

    test("button has proper role", () => {
      const onClick = jest.fn();
      renderWithTheme(<RefreshButton onClick={onClick} />);

      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    test("spinner has proper role when loading", () => {
      const onClick = jest.fn();
      renderWithTheme(<RefreshButton onClick={onClick} loading={true} />);

      const spinner = screen.getByRole("progressbar");
      expect(spinner).toBeInTheDocument();
    });
  });
});
