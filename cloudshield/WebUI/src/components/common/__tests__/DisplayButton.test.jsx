import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DisplayButton from "../DisplayButton/DisplayButton";

jest.mock("../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    text: "#fff",
    textTertiary: "#aaa",
    border: "#333",
    bgHover: "#111",
    lightOverlaySubtle: "rgba(255,255,255,0.08)",
    secondary: "#2f7",
    bgPrimary: "#000",
  }),
}));

describe("DisplayButton", () => {
  test("renders trigger", () => {
    render(<DisplayButton />);

    expect(screen.getByRole("button", { name: "Display options" })).toBeInTheDocument();
  });

  test("opens popover and shows layout options", () => {
    render(<DisplayButton />);

    fireEvent.click(screen.getByRole("button", { name: "Display options" }));

    expect(screen.getByRole("button", { name: "List layout" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Icons layout" })).toBeInTheDocument();
  });

  test("selecting icons calls onLayoutChange", () => {
    const onLayoutChange = jest.fn();
    render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Display options" }));
    fireEvent.click(screen.getByRole("button", { name: "Icons layout" }));

    expect(onLayoutChange).toHaveBeenCalledWith("icons");
    expect(screen.getByRole("button", { name: "List layout" })).toBeInTheDocument();
  });

  test("supports keyboard selection", () => {
    const onLayoutChange = jest.fn();
    render(<DisplayButton onLayoutChange={onLayoutChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Display options" }));
    fireEvent.keyDown(screen.getByRole("button", { name: "Icons layout" }), { key: "Enter" });

    expect(onLayoutChange).toHaveBeenCalledWith("icons");
  });

  test("renders and toggles column options", () => {
    const onToggle = jest.fn();
    render(
      <DisplayButton
        columnToggles={{
          columns: [{ key: "users", label: "Users", checked: true }],
          onToggle,
        }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Display options" }));
    fireEvent.click(screen.getByRole("button", { name: /toggle users column/i }));

    expect(onToggle).toHaveBeenCalledWith("users");
  });

  test("closes popover from backdrop escape key", () => {
    render(<DisplayButton />);

    fireEvent.click(screen.getByRole("button", { name: "Display options" }));
    const backdrop = screen.getByRole("button", { name: "Close display options" });
    fireEvent.keyDown(backdrop, { key: "Escape" });

    expect(screen.queryByRole("button", { name: "List layout" })).not.toBeInTheDocument();
  });
});
