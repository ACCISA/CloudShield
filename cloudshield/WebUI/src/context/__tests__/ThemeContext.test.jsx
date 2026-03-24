import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { ThemeProvider_Custom, useAppTheme } from "../ThemeContext";

function TestComponent() {
  const {
    themeMode,
    effectiveTheme,
    previewMode,
    updateTheme,
    previewTheme,
    clearPreview,
  } = useAppTheme();

  return (
    <div>
      <div data-testid="theme-mode">{themeMode}</div>
      <div data-testid="effective-theme">{effectiveTheme}</div>
      <div data-testid="preview-mode">{previewMode || ""}</div>

      <button data-testid="update-light" onClick={() => updateTheme("light")}>
        Update Light
      </button>
      <button data-testid="update-dark" onClick={() => updateTheme("dark")}>
        Update Dark
      </button>
      <button data-testid="update-system" onClick={() => updateTheme("system")}>
        Update System
      </button>
      <button data-testid="preview-light" onClick={() => previewTheme("light")}>
        Preview Light
      </button>
      <button data-testid="clear-preview" onClick={clearPreview}>
        Clear Preview
      </button>
    </div>
  );
}

describe("ThemeContext", () => {
  let listeners;

  beforeEach(() => {
    listeners = [];
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    document.body.removeAttribute("style");

    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addEventListener: (event, cb) => {
        if (event === "change") listeners.push(cb);
      },
      removeEventListener: (event, cb) => {
        if (event === "change") {
          listeners = listeners.filter((fn) => fn !== cb);
        }
      },
      dispatchEvent: jest.fn(),
    }));
  });

  it("provides default dark theme context", () => {
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>,
    );

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("effective-theme")).toHaveTextContent("dark");
    expect(screen.getByTestId("preview-mode")).toHaveTextContent("");
  });

  it("loads persisted theme mode and saves updates", () => {
    localStorage.setItem("cs_theme_mode", "light");

    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>,
    );

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("light");

    fireEvent.click(screen.getByTestId("update-dark"));

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("dark");
    expect(localStorage.getItem("cs_theme_mode")).toBe("dark");
  });

  it("preview mode overrides effective theme until cleared", () => {
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>,
    );

    fireEvent.click(screen.getByTestId("preview-light"));

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("dark");
    expect(screen.getByTestId("preview-mode")).toHaveTextContent("light");
    expect(screen.getByTestId("effective-theme")).toHaveTextContent("light");

    fireEvent.click(screen.getByTestId("clear-preview"));

    expect(screen.getByTestId("preview-mode")).toHaveTextContent("");
    expect(screen.getByTestId("effective-theme")).toHaveTextContent("dark");
  });

  it("updateTheme clears any active preview", () => {
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>,
    );

    fireEvent.click(screen.getByTestId("preview-light"));
    expect(screen.getByTestId("preview-mode")).toHaveTextContent("light");

    fireEvent.click(screen.getByTestId("update-dark"));

    expect(screen.getByTestId("preview-mode")).toHaveTextContent("");
    expect(screen.getByTestId("effective-theme")).toHaveTextContent("dark");
  });

  it("uses system mode and reacts to matchMedia changes", async () => {
    localStorage.setItem("cs_theme_mode", "system");

    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>,
    );

    expect(screen.getByTestId("theme-mode")).toHaveTextContent("system");
    expect(screen.getByTestId("effective-theme")).toHaveTextContent("dark");

    act(() => {
      listeners.forEach((cb) => cb({ matches: false }));
    });

    await waitFor(() => {
      expect(screen.getByTestId("effective-theme")).toHaveTextContent("light");
    });
  });

  it("writes CSS variables and body styles for current theme", async () => {
    render(
      <ThemeProvider_Custom>
        <TestComponent />
      </ThemeProvider_Custom>,
    );

    const root = document.documentElement;

    await waitFor(() => {
      expect(root.style.getPropertyValue("--bg-primary")).toBe("#0A0A0A");
      expect(root.style.getPropertyValue("--input-bg")).toBe("#161616");
      expect(document.body.style.backgroundColor).toBe("rgb(10, 10, 10)");
    });

    fireEvent.click(screen.getByTestId("update-light"));

    await waitFor(() => {
      expect(root.style.getPropertyValue("--bg-primary")).toBe("#FFFFFF");
      expect(root.style.getPropertyValue("--input-bg")).toBe("#FAFAFA");
      expect(document.body.style.backgroundColor).toBe("rgb(255, 255, 255)");
    });
  });

  it("throws when useAppTheme is used outside ThemeProvider_Custom", () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    function OutsideConsumer() {
      useAppTheme();
      return <div />;
    }

    expect(() => render(<OutsideConsumer />)).toThrow(
      "useAppTheme must be used within ThemeProvider_Custom",
    );

    consoleSpy.mockRestore();
  });
});
