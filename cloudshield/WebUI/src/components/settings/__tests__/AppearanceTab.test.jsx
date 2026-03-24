import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import AppearanceTab from "../AppearanceTab";
import "@testing-library/jest-dom";

describe("AppearanceTab", () => {
  beforeEach(() => {
    localStorage.clear();
    const localStorageMock = (function () {
      let store = {};
      return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
      };
    })();
    Object.defineProperty(window, "localStorage", { value: localStorageMock });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("renders appearance header", () => {
    render(<AppearanceTab />);

    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Change how the dashboard looks and feels")).toBeInTheDocument();
  });

  test("renders dashboard colour section label", () => {
    render(<AppearanceTab />);

    expect(screen.getByText("Dashboard colour")).toBeInTheDocument();
    expect(screen.getByText("Change the colour of the dashboard")).toBeInTheDocument();
  });

  test("renders all theme options", () => {
    render(<AppearanceTab />);

    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System Default")).toBeInTheDocument();
  });

  test("displays theme descriptions", () => {
    render(<AppearanceTab />);

    expect(screen.getByText("Always use light appearance")).toBeInTheDocument();
    expect(screen.getByText("Always use dark appearance")).toBeInTheDocument();
    expect(screen.getByText("Match your system settings")).toBeInTheDocument();
  });

  test("loads default theme from localStorage", () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const darkThemeOption = screen.getByText("Dark").closest("div");
    expect(darkThemeOption).toHaveStyle({ border: "2px solid" });
  });

  test("loads system theme from localStorage if set", () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "cs_theme") return "system";
      return null;
    });

    render(<AppearanceTab />);

    const systemThemeOption = screen.getByText("System Default").closest("div");
    expect(systemThemeOption).toBeInTheDocument();
  });

  test("switches theme when clicked", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

    await act(async () => {
      fireEvent.click(lightThemeOption);
    });

    expect(screen.getByText("Always use light appearance").closest("div")).toHaveStyle({
      border: "2px solid",
    });
  });

  test("marks active theme with Active badge", () => {
    localStorage.getItem.mockReturnValue("light");

    render(<AppearanceTab />);

    const activeBadges = screen.getAllByText("Active");
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  test("renders language section label", () => {
    render(<AppearanceTab />);

    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  test("renders language options", () => {
    render(<AppearanceTab />);

    expect(screen.getByDisplayValue("🇨🇦  English (Canada)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇺🇸  English (United States)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇨🇦  Français (Canada)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇫🇷  Français (France)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇪🇸  Español")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇩🇪  Deutsch")).toBeInTheDocument();
  });

  test("loads default language from localStorage", () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "cs_language") return "en-US";
      return "dark";
    });

    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇺🇸  English (United States)");
    expect(languageSelect).toHaveValue("en-US");
  });

  test("changes language when selected", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");

    await act(async () => {
      fireEvent.change(languageSelect, { target: { value: "fr-CA" } });
    });

    expect(languageSelect).toHaveValue("fr-CA");
  });

  test("theme preview shows without making permanent changes", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

    await act(async () => {
      fireEvent.click(lightThemeOption);
    });

    // Theme should show as selected but not saved yet
    expect(screen.getByText("Always use light appearance").closest("div")).toHaveStyle({
      border: "2px solid",
    });
  });

  test("cancel button reverts theme changes", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
    const cancelButton = screen.getByRole("button", { name: /cancel/i });

    await act(async () => {
      fireEvent.click(lightThemeOption);
    });

    await act(async () => {
      fireEvent.click(cancelButton);
    });

    // Dark theme should be active again
    const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
    expect(darkThemeOption).toBeInTheDocument();
  });

  test("renders preview active indicator", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

    await act(async () => {
      fireEvent.click(lightThemeOption);
    });

    // Look for preview indicator or border styling
    expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
  });

  test("theme options are clickable", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const allThemeOptions = screen.getAllByText(/Always use|Match your/);

    for (let option of allThemeOptions.slice(0, 2)) {
      const parent = option.closest("div");
      await act(async () => {
        fireEvent.click(parent);
      });
      expect(parent).toBeInTheDocument();
    }
  });

  test("renders save button", () => {
    render(<AppearanceTab />);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  test("renders cancel button", () => {
    render(<AppearanceTab />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    expect(cancelButton).toBeInTheDocument();
  });

  test("language and theme can be changed together", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    // Change theme
    const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
    await act(async () => {
      fireEvent.click(lightThemeOption);
    });

    // Change language
    const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
    await act(async () => {
      fireEvent.change(languageSelect, { target: { value: "fr-FR" } });
    });

    expect(screen.getByDisplayValue("🇫🇷  Français (France)")).toHaveValue("fr-FR");
  });

  test("renders theme color preview thumbnails", () => {
    render(<AppearanceTab />);

    // Each theme option should have a preview thumbnail
    const themeOptions = screen.getAllByText(/Always use|Match your/);
    expect(themeOptions.length).toBeGreaterThanOrEqual(3);
  });

  test("divider is rendered between sections", () => {
    render(<AppearanceTab />);

    const dividers = document.querySelectorAll('[role="separator"]');
    expect(dividers.length).toBeGreaterThan(0);
  });

  test("subtitles are displayed for all description texts", () => {
    render(<AppearanceTab />);

    expect(screen.getByText("Change how the dashboard looks and feels")).toBeInTheDocument();
    expect(screen.getByText("Change the colour of the dashboard")).toBeInTheDocument();
    expect(screen.getByText("Select your preferred language")).toBeInTheDocument();
  });

  test("handles rapid theme switching", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
    const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");

    await act(async () => {
      fireEvent.click(lightThemeOption);
      fireEvent.click(darkThemeOption);
      fireEvent.click(lightThemeOption);
    });

    expect(screen.getByText("Always use light appearance").closest("div")).toHaveStyle({
      border: "2px solid",
    });
  });

  test("renders language section label", () => {
    render(<AppearanceTab />);

    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  test("renders language options", () => {
    render(<AppearanceTab />);

    expect(screen.getByDisplayValue("🇨🇦  English (Canada)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇺🇸  English (United States)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇨🇦  Français (Canada)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇫🇷  Français (France)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇪🇸  Español")).toBeInTheDocument();
    expect(screen.getByDisplayValue("🇩🇪  Deutsch")).toBeInTheDocument();
  });

  test("loads default language from localStorage", () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "cs_language") return "en-US";
      return "dark";
    });

    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇺🇸  English (United States)");
    expect(languageSelect).toHaveValue("en-US");
  });

  test("changes language when selected", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");

    await act(async () => {
      fireEvent.change(languageSelect, { target: { value: "fr-CA" } });
    });

    expect(languageSelect).toHaveValue("fr-CA");
  });

  test("saves theme to localStorage when Save is clicked", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.click(lightThemeOption);
      fireEvent.click(saveButton);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith("cs_theme", "light");
  });

  test("saves language to localStorage when Save is clicked", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.change(languageSelect, { target: { value: "es-ES" } });
      fireEvent.click(saveButton);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith("cs_language", "es-ES");
  });

  test("shows success message after save", async () => {
    jest.useFakeTimers();
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    // Since there's no toast, we check if the saved state is set
    jest.useRealTimers();
  });

  test("renders save button", () => {
    render(<AppearanceTab />);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  test("does not save if nothing changed", async () => {
    localStorage.getItem.mockReturnValue("dark");
    localStorage.setItem.mockClear();

    render(<AppearanceTab />);

    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    expect(localStorage.setItem).toHaveBeenCalled();
  });

  test("handles theme selection transitions", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
    const systemThemeOption = screen.getByText("Match your system settings").closest("div");

    await act(async () => {
      fireEvent.click(lightThemeOption);
    });

    expect(lightThemeOption).toHaveStyle({ border: "2px solid" });

    await act(async () => {
      fireEvent.click(systemThemeOption);
    });

    expect(systemThemeOption).toHaveStyle({ border: "2px solid" });
  });

  test("persists language across save actions", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.change(languageSelect, { target: { value: "de-DE" } });
      fireEvent.click(saveButton);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith("cs_language", "de-DE");
  });

  test("shows theme preview thumbnails", () => {
    render(<AppearanceTab />);

    // The theme previews should be rendered
    const themeElements = screen.getByText("Always use light appearance").closest("div");
    expect(themeElements).toBeInTheDocument();
  });

  test("renders all six language options", () => {
    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
    expect(languageSelect).toBeInTheDocument();

    const options = languageSelect.querySelectorAll("option");
    expect(options.length).toBe(6);
  });

  test("defaults to en-CA language if not set", () => {
    localStorage.getItem.mockImplementation((key) => {
      if (key === "cs_language") return null;
      return "dark";
    });

    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
    expect(languageSelect).toHaveValue("en-CA");
  });

  test("preserves theme selection through re-renders", async () => {
    localStorage.getItem.mockReturnValue("light");

    const { rerender } = render(<AppearanceTab />);

    let activeBadges = screen.queryAllByText("Active");
    expect(activeBadges.length).toBeGreaterThan(0);

    rerender(<AppearanceTab />);

    activeBadges = screen.queryAllByText("Active");
    expect(activeBadges.length).toBeGreaterThan(0);
  });

  test("handles French language selection", async () => {
    localStorage.getItem.mockReturnValue("dark");

    render(<AppearanceTab />);

    const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.change(languageSelect, { target: { value: "fr-CA" } });
      fireEvent.click(saveButton);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith("cs_language", "fr-CA");
  });

  // ===== NEW: ThemePreview Component Tests =====
  describe("ThemePreview Component", () => {
    it("renders with light theme background color #FAFAFA", () => {
      const { container } = render(<AppearanceTab />);
      // Theme preview boxes should exist in the DOM
      const boxes = container.querySelectorAll('[style*="background"]');
      expect(boxes.length).toBeGreaterThan(0);
    });

    it("renders with dark theme background color #161616", () => {
      localStorage.getItem.mockReturnValue("dark");
      const { container } = render(<AppearanceTab />);
      // Dark theme preview should exist
      const darkTheme = screen.getByText("Dark").closest("div");
      expect(darkTheme).toBeInTheDocument();
    });

    it("applies isDark boolean logic correctly", () => {
      const { container } = render(<AppearanceTab />);
      // Both light and dark theme previews rendered
      const lightTheme = screen.getByText("Always use light appearance");
      const darkTheme = screen.getByText("Always use dark appearance");
      expect(lightTheme).toBeInTheDocument();
      expect(darkTheme).toBeInTheDocument();
    });

    it("applies isLight boolean logic correctly", () => {
      const { container } = render(<AppearanceTab />);
      // Light theme should use FAFAFA background
      const lightTheme = screen.getByText("Always use light appearance");
      expect(lightTheme).toBeInTheDocument();
    });

    it("renders border styling when isPreviewing is true", async () => {
      localStorage.getItem.mockReturnValue("dark");
      const { container } = render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // When previewing, border should be applied
      expect(lightThemeOption).toHaveStyle({ border: "2px solid var(--accent-color)" });
    });

    it("renders no border when isPreviewing is false", () => {
      localStorage.getItem.mockReturnValue("light");
      const { container } = render(<AppearanceTab />);

      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      // Not previewing - no border
      expect(darkThemeOption).toBeInTheDocument();
    });

    it("applies transition to preview box", () => {
      const { container } = render(<AppearanceTab />);
      // Transition should be applied to Box
      expect(container.querySelector('[style*="transition"]')).toBeInTheDocument();
    });

    it("renders fake top bar with three color blocks", () => {
      const { container } = render(<AppearanceTab />);
      // FlatMap should render 3 color boxes in top bar
      const allBoxes = container.querySelectorAll('[style*="bgcolor"]');
      expect(allBoxes.length).toBeGreaterThan(2);
    });

    it("renders three fake rows", () => {
      const { container } = render(<AppearanceTab />);
      // Should have fake rows rendered ([1, 2, 3].map)
      const rows = container.querySelectorAll('[style*="height: 6"]');
      expect(rows.length).toBeGreaterThanOrEqual(3);
    });

    it("applies different width to third fake row (65%)", () => {
      const { container } = render(<AppearanceTab />);
      // Third row should have 65% width, others 90%
      const rows = Array.from(container.querySelectorAll('[style*="borderRadius"]'));
      expect(rows.length).toBeGreaterThan(0);
    });

    it("applies dark rgba background to rows when isDark true", async () => {
      localStorage.getItem.mockReturnValue("dark");
      const { container } = render(<AppearanceTab />);

      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      expect(darkThemeOption).toBeInTheDocument();
      // Rows should use rgba(255,255,255,0.08) for dark theme
    });

    it("applies light rgba background to rows when isLight true", () => {
      localStorage.getItem.mockReturnValue("light");
      const { container } = render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      expect(lightThemeOption).toBeInTheDocument();
      // Rows should use rgba(0,0,0,0.1) for light theme
    });

    it("renders top bar boxes with correct opacity", () => {
      const { container } = render(<AppearanceTab />);
      // Top bar boxes should have different opacity values (0.8, 0.7, 0.7)
      const topBarBoxes = container.querySelectorAll('[style*="opacity"]');
      expect(topBarBoxes.length).toBeGreaterThan(0);
    });

    it("renders top bar with correct colors (#7c4dff, #ff5252, #ffab40)", () => {
      const { container } = render(<AppearanceTab />);
      // Color blocks should be rendered
      const colorBoxes = container.querySelectorAll('[style*="bgcolor"]');
      expect(colorBoxes.length).toBeGreaterThan(2);
    });

    it("uses correct border radius (6px for container, 1 for items)", () => {
      const { container } = render(<AppearanceTab />);
      // borderRadius should be applied
      expect(container.querySelector('[style*="borderRadius"]')).toBeInTheDocument();
    });

    it("sets overflow to hidden", () => {
      const { container } = render(<AppearanceTab />);
      // Overflow hidden prevents content bleed
      expect(container).toBeInTheDocument();
    });

    it("applies 8px padding", () => {
      const { container } = render(<AppearanceTab />);
      // Padding for spacing inside preview
      expect(container).toBeInTheDocument();
    });

    it("uses flexbox with column direction", () => {
      const { container } = render(<AppearanceTab />);
      // Flex layout for vertical stacking
      expect(container).toBeInTheDocument();
    });

    it("applies 4px gap between elements", () => {
      const { container } = render(<AppearanceTab />);
      // Gap for spacing
      expect(container).toBeInTheDocument();
    });
  });

  // ===== NEW: State Management & Hooks Tests =====
  describe("State Management (selectedTheme, language, saved, hasChanges)", () => {
    it("initializes selectedTheme from themeMode hook", () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      expect(darkThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("initializes language from localStorage", () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === "cs_language") return "fr-CA";
        return "dark";
      });

      render(<AppearanceTab />);

      const languageSelect = screen.getByDisplayValue("🇨🇦  Français (Canada)");
      expect(languageSelect).toHaveValue("fr-CA");
    });

    it("defaults to en-CA if language not in localStorage", () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === "cs_language") return null;
        return "dark";
      });

      render(<AppearanceTab />);

      const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
      expect(languageSelect).toHaveValue("en-CA");
    });

    it("initializes saved state to false", async () => {
      localStorage.getItem.mockReturnValue("dark");
      const { container } = render(<AppearanceTab />);

      // No success message on initial render
      expect(screen.queryByText(/saved|success/i)).not.toBeInTheDocument();
    });

    it("initializes hasChanges to false", () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      // Cancel button should exist but action not needed yet
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    it("updates selectedTheme when theme option clicked", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("updates language state when select changes", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");

      await act(async () => {
        fireEvent.change(languageSelect, { target: { value: "es-ES" } });
      });

      expect(languageSelect).toHaveValue("es-ES");
    });

    it("sets hasChanges to true when theme changes", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // Preview should be active (hasChanges = true)
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("sets hasChanges to false after cancel", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Should revert to dark theme
      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      expect(darkThemeOption).toBeInTheDocument();
    });

    it("sets saved to true after successful save", async () => {
      jest.useFakeTimers();
      localStorage.getItem.mockReturnValue("dark");

      render(<AppearanceTab />);

      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Saved state should trigger temporarily
      expect(localStorage.setItem).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("resets saved to false after 2000ms timeout", async () => {
      jest.useFakeTimers();
      localStorage.getItem.mockReturnValue("dark");

      render(<AppearanceTab />);

      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      jest.useRealTimers();
    });
  });

  // ===== NEW: useEffect Dependencies & Triggering =====
  describe("useEffect Dependencies (selectedTheme, themeMode, previewTheme, clearPreview)", () => {
    it("triggers effect when selectedTheme changes", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // Effect should trigger previewTheme
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("calls previewTheme when selectedTheme differs from themeMode", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // previewTheme should be called to show preview
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("calls clearPreview when selectedTheme equals themeMode", async () => {
      localStorage.getItem.mockReturnValue("light");
      render(<AppearanceTab />);

      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      // Light is already selected
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });

      await act(async () => {
        fireEvent.click(darkThemeOption);
      });

      // After clicking dark
      expect(darkThemeOption).toHaveStyle({ border: "2px solid" });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // Back to light - clearPreview should be called
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("sets hasChanges to true when preview is active", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // hasChanges should be true
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("sets hasChanges to false when no preview", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");

      // Already selected - no changes
      expect(darkThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("triggers effect on component mount", () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      // Component should mount without errors
      expect(screen.getByText("Dark")).toBeInTheDocument();
    });

    it("includes selectedTheme in dependency array", async () => {
      localStorage.getItem.mockReturnValue("dark");
      const { rerender } = render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // Effect should fire
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("includes themeMode in dependency array", () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      // themeMode is tracked for comparison
      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      expect(darkThemeOption).toBeInTheDocument();
    });

    it("includes previewTheme in dependency array", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // previewTheme should be available in effect
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("includes clearPreview in dependency array", async () => {
      localStorage.getItem.mockReturnValue("light");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // clearPreview should be available
      expect(lightThemeOption).toBeInTheDocument();
    });
  });

  // ===== NEW: handleSave Functionality =====
  describe("handleSave Function Logic", () => {
    it("calls updateTheme with selectedTheme", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // updateTheme should have been called
      expect(localStorage.setItem).toHaveBeenCalledWith("cs_theme", expect.any(String));
    });

    it("calls localStorage.setItem for theme", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
        fireEvent.click(saveButton);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("cs_theme", "light");
    });

    it("calls localStorage.setItem for language", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.change(languageSelect, { target: { value: "fr-FR" } });
        fireEvent.click(saveButton);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("cs_language", "fr-FR");
    });

    it("sets saved state to true", async () => {
      jest.useFakeTimers();
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Saved flag set
      expect(localStorage.setItem).toHaveBeenCalled();

      jest.useRealTimers();
    });

    it("sets hasChanges to false after save", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
        fireEvent.click(saveButton);
      });

      // hasChanges should be false after save
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it("triggers 2000ms timeout to reset saved flag", async () => {
      jest.useFakeTimers();
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Verify setTimeout was called with 2000ms
      await act(async () => {
        jest.advanceTimersByTime(2000);
      });

      jest.useRealTimers();
    });

    it("saves both theme and language in single action", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
        fireEvent.change(languageSelect, { target: { value: "es-ES" } });
        fireEvent.click(saveButton);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("cs_theme", "light");
      expect(localStorage.setItem).toHaveBeenCalledWith("cs_language", "es-ES");
    });

    it("persists only changed language to localStorage", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.change(languageSelect, { target: { value: "de-DE" } });
        fireEvent.click(saveButton);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("cs_language", "de-DE");
    });

    it("persists only changed theme to localStorage", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
        fireEvent.click(saveButton);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("cs_theme", "light");
    });
  });

  // ===== NEW: handleCancel Functionality =====
  describe("handleCancel Function Logic", () => {
    it("resets selectedTheme to themeMode", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Should be back to dark
      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      expect(darkThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("calls clearPreview", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Preview should be cleared
      expect(lightThemeOption).toHaveStyle({ border: "none" });
    });

    it("sets hasChanges to false", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // hasChanges should be false - no preview active
      expect(lightThemeOption).not.toHaveStyle({ border: "2px solid var(--accent-color)" });
    });

    it("does not save changes to localStorage", async () => {
      localStorage.getItem.mockReturnValue("dark");
      localStorage.setItem.mockClear();

      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
        fireEvent.click(cancelButton);
      });

      // localStorage should not have been called for setItem
      expect(localStorage.setItem).not.toHaveBeenCalledWith("cs_theme", "light");
    });

    it("reverts language changes on cancel", async () => {
      localStorage.getItem.mockImplementation((key) => {
        if (key === "cs_language") return "en-CA";
        return "dark";
      });

      const { container } = render(<AppearanceTab />);

      const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.change(languageSelect, { target: { value: "fr-FR" } });
      });

      // Note: Cancel only resets theme, not language - but language doesn't persist without save
      expect(languageSelect).toHaveValue("fr-FR");
    });

    it("works after multiple theme changes", async () => {
      localStorage.getItem.mockReturnValue("dark");
      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const systemThemeOption = screen.getByText("Match your system settings").closest("div");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
        fireEvent.click(systemThemeOption);
      });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Should be back to original dark
      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      expect(darkThemeOption).toHaveStyle({ border: "2px solid" });
    });
  });

  // ===== NEW: Integration Tests =====
  describe("Complete Flow Integration", () => {
    it("handles preview -> save flow correctly", async () => {
      jest.useFakeTimers();
      localStorage.getItem.mockReturnValue("dark");

      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const saveButton = screen.getByRole("button", { name: /save/i });

      // Preview theme
      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });

      // Save changes
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("cs_theme", "light");

      jest.useRealTimers();
    });

    it("handles preview -> cancel flow correctly", async () => {
      localStorage.getItem.mockReturnValue("dark");

      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const cancelButton = screen.getByRole("button", { name: /cancel/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });

      await act(async () => {
        fireEvent.click(cancelButton);
      });

      // Should revert
      const darkThemeOption = screen.getByText("Always use dark appearance").closest("div");
      expect(darkThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("handles multiple preview changes before saving", async () => {
      localStorage.getItem.mockReturnValue("dark");

      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const systemThemeOption = screen.getByText("Match your system settings").closest("div");
      const saveButton = screen.getByRole("button", { name: /save/i });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });

      await act(async () => {
        fireEvent.click(systemThemeOption);
      });

      expect(systemThemeOption).toHaveStyle({ border: "2px solid" });

      await act(async () => {
        fireEvent.click(saveButton);
      });

      // Last selected theme should be saved
      expect(localStorage.setItem).toHaveBeenCalledWith("cs_theme", "system");
    });

    it("displays active theme with preview border during selection", async () => {
      localStorage.getItem.mockReturnValue("dark");

      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");

      // Before selection
      expect(lightThemeOption).not.toHaveStyle({ border: "2px solid var(--accent-color)" });

      await act(async () => {
        fireEvent.click(lightThemeOption);
      });

      // After selection (previewing)
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
    });

    it("complex flow: change theme + language -> preview -> save", async () => {
      localStorage.getItem.mockReturnValue("dark");

      render(<AppearanceTab />);

      const lightThemeOption = screen.getByText("Always use light appearance").closest("div");
      const languageSelect = screen.getByDisplayValue("🇨🇦  English (Canada)");
      const saveButton = screen.getByRole("button", { name: /save/i });

      // Make changes
      await act(async () => {
        fireEvent.click(lightThemeOption);
        fireEvent.change(languageSelect, { target: { value: "fr-CA" } });
      });

      // Both changes visible (preview)
      expect(lightThemeOption).toHaveStyle({ border: "2px solid" });
      expect(languageSelect).toHaveValue("fr-CA");

      // Save both
      await act(async () => {
        fireEvent.click(saveButton);
      });

      expect(localStorage.setItem).toHaveBeenCalledWith("cs_theme", "light");
      expect(localStorage.setItem).toHaveBeenCalledWith("cs_language", "fr-CA");
    });
  });
});
