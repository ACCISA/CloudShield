import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import IconSelectionBar from "../IconSelectionBar.jsx";

const styles = {
  selectionBar: {},
  selectionLeft: {},
  selectAllButton: {
    background: "rgba(255, 255, 255, 0.03)",
  },
  selectedCount: {},
};

describe("IconSelectionBar", () => {
  test("renders default select-all state and selected count", () => {
    const onToggleSelectAll = jest.fn();
    render(
      <IconSelectionBar
        styles={styles}
        allVisibleSelected={false}
        isIndeterminate={false}
        onToggleSelectAll={onToggleSelectAll}
        selectedCount={0}
      />,
    );

    expect(screen.getByRole("button", { name: "Select all" })).toBeInTheDocument();
    expect(screen.getByText("0 selected")).toBeInTheDocument();
  });

  test("shows clear label when all are selected", () => {
    render(
      <IconSelectionBar
        styles={styles}
        allVisibleSelected={true}
        isIndeterminate={false}
        onToggleSelectAll={jest.fn()}
        selectedCount={3}
      />,
    );

    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
    expect(screen.getByText("3 selected")).toBeInTheDocument();
  });

  test("shows clear label when selection is indeterminate", () => {
    render(
      <IconSelectionBar
        styles={styles}
        allVisibleSelected={false}
        isIndeterminate={true}
        onToggleSelectAll={jest.fn()}
        selectedCount={2}
      />,
    );

    expect(screen.getByRole("button", { name: "Clear selection" })).toBeInTheDocument();
  });

  test("calls toggle handler from button click and checkbox click", () => {
    const onToggleSelectAll = jest.fn();
    render(
      <IconSelectionBar
        styles={styles}
        allVisibleSelected={false}
        isIndeterminate={false}
        onToggleSelectAll={onToggleSelectAll}
        selectedCount={0}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select all" }));
    fireEvent.click(screen.getByRole("checkbox"));
    expect(onToggleSelectAll).toHaveBeenCalledTimes(2);
  });

  test("applies hover background transition on select-all button", () => {
    render(
      <IconSelectionBar
        styles={styles}
        allVisibleSelected={false}
        isIndeterminate={false}
        onToggleSelectAll={jest.fn()}
        selectedCount={0}
      />,
    );

    const button = screen.getByRole("button", { name: "Select all" });
    fireEvent.mouseEnter(button);
    expect(button.style.background).toContain("0.08");

    fireEvent.mouseLeave(button);
    expect(button.style.background).toContain("0.03");
  });
});

