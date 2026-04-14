import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AppearanceTab from "../AppearanceTab";

const mockUpdateTheme = jest.fn();
const mockPreviewTheme = jest.fn();
const mockClearPreview = jest.fn();

jest.mock("../../../context/ThemeContext.jsx", () => ({
  useAppTheme: () => ({
    themeMode: "dark",
    previewMode: null,
    updateTheme: mockUpdateTheme,
    previewTheme: mockPreviewTheme,
    clearPreview: mockClearPreview,
  }),
}));

describe("AppearanceTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("renders core sections", () => {
    render(<AppearanceTab />);

    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Dashboard colour")).toBeInTheDocument();
    expect(screen.getByText("Language")).toBeInTheDocument();
  });

  test("save button is disabled when there are no changes", () => {
    render(<AppearanceTab />);

    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  test("selecting another theme enables save and calls preview", () => {
    render(<AppearanceTab />);

    fireEvent.click(screen.getByText("Always use light appearance"));

    expect(mockPreviewTheme).toHaveBeenCalledWith("light");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  test("cancel clears preview and hides cancel button", () => {
    render(<AppearanceTab />);

    fireEvent.click(screen.getByText("Always use light appearance"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(mockClearPreview).toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
  });

  test("save persists language and updates theme", () => {
    render(<AppearanceTab />);

    fireEvent.click(screen.getByText("Always use light appearance"));
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "fr-FR" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mockUpdateTheme).toHaveBeenCalledWith("light");
    expect(localStorage.getItem("cs_language")).toBe("fr-FR");
  });

  test("shows temporary saved state", () => {
    jest.useFakeTimers();
    render(<AppearanceTab />);

    fireEvent.click(screen.getByText("Always use light appearance"));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByRole("button", { name: "Saved!" })).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
    jest.useRealTimers();
  });
});
