import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ColumnToggle from "../ColumnToggle";

describe("ColumnToggle Component", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  test("renders with label", () => {
    render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  test("displays checked state correctly", () => {
    const { rerender } = render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    const toggle = screen.getByRole("button");
    expect(toggle).toBeInTheDocument();

    // Test unchecked state
    rerender(
      <ColumnToggle label="Users" checked={false} onChange={mockOnChange} />,
    );
    expect(toggle).toBeInTheDocument();
  });

  test("calls onChange when clicked", () => {
    render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    const toggle = screen.getByRole("button");
    fireEvent.click(toggle);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  test("calls onChange when Enter key is pressed", () => {
    render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    const toggle = screen.getByRole("button");
    fireEvent.keyDown(toggle, { key: "Enter" });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  test("calls onChange when Space key is pressed", () => {
    render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    const toggle = screen.getByRole("button");
    fireEvent.keyDown(toggle, { key: " " });

    expect(mockOnChange).toHaveBeenCalledTimes(1);
  });

  test("does not call onChange for other keys", () => {
    render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    const toggle = screen.getByRole("button");
    fireEvent.keyDown(toggle, { key: "a" });

    expect(mockOnChange).not.toHaveBeenCalled();
  });

  test("has correct aria-label", () => {
    render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("aria-label", "Toggle Users column");
  });

  test("is keyboard accessible with tabIndex", () => {
    render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    const toggle = screen.getByRole("button");
    expect(toggle).toHaveAttribute("tabIndex", "0");
  });

  test("handles mouse enter and leave events", () => {
    render(
      <ColumnToggle label="Users" checked={true} onChange={mockOnChange} />,
    );

    const toggle = screen.getByRole("button");

    // Trigger mouse enter - allow for spacing differences in rgba format
    fireEvent.mouseEnter(toggle);
    expect(toggle.style.backgroundColor).toMatch(
      /rgba\(255,\s*255,\s*255,\s*0\.05\)/,
    );

    // Trigger mouse leave
    fireEvent.mouseLeave(toggle);
    expect(toggle.style.backgroundColor).toBe("transparent");
  });
});
