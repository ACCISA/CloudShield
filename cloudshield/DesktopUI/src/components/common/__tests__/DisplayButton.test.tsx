import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import DisplayButton from "../DisplayButton";

describe("DisplayButton", () => {
  it("opens and closes the menu from the trigger button", async () => {
    render(<DisplayButton />);

    const trigger = screen.getByRole("button", { name: "Display" });

    fireEvent.click(trigger);
    expect(
      screen.getByRole("menu", { name: "Display options" }),
    ).not.toBeNull();

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(
        screen.queryByRole("menu", { name: "Display options" }),
      ).toBeNull();
    });
  });

  it("calls onLayoutChange when selecting an option", () => {
    const onLayoutChange = vi.fn();
    render(<DisplayButton layout="list" onLayoutChange={onLayoutChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Icons" }));

    expect(onLayoutChange).toHaveBeenCalledWith("icons");
  });

  it("handles selection without an onLayoutChange callback", () => {
    render(<DisplayButton layout="icons" />);

    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "List" }));

    expect(
      screen.getByRole("menu", { name: "Display options" }),
    ).not.toBeNull();
  });

  it("closes the menu when clicking outside", async () => {
    render(<DisplayButton />);

    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(
        screen.queryByRole("menu", { name: "Display options" }),
      ).toBeNull();
    });
  });

  it("closes the menu via Escape key from document and overlay", async () => {
    render(<DisplayButton />);

    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("menu", { name: "Display options" }),
      ).toBeNull();
    });

    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    const overlay = screen.getByRole("button", {
      name: "Close display options",
    });

    fireEvent.keyDown(overlay, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("menu", { name: "Display options" }),
      ).toBeNull();
    });
  });
});
