import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RefreshButton from "../RefreshButton";

describe("RefreshButton", () => {
  it("handles hover styling for enabled buttons", () => {
    render(<RefreshButton onClick={vi.fn()} />);

    const button = screen.getByRole("button", { name: "Refresh" });

    expect((button as HTMLButtonElement).style.backgroundColor).toBe(
      "transparent",
    );
    fireEvent.mouseEnter(button);
    expect((button as HTMLButtonElement).style.backgroundColor).toContain(
      "rgba(255, 255, 255, 0.08)",
    );
    fireEvent.mouseLeave(button);
    expect((button as HTMLButtonElement).style.backgroundColor).toBe(
      "transparent",
    );
  });

  it("does not call onClick when disabled", () => {
    const onClick = vi.fn();
    render(<RefreshButton onClick={onClick} disabled />);

    const button = screen.getByRole("button", { name: "Refresh" });
    fireEvent.mouseEnter(button);
    fireEvent.click(button);

    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
    expect((button as HTMLButtonElement).style.backgroundColor).toBe(
      "transparent",
    );
  });

  it("ignores clicks when no click handler is provided", () => {
    render(<RefreshButton />);

    const button = screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(button);

    expect((button as HTMLButtonElement).disabled).toBe(false);
    expect(button.querySelector(".animate-spin")).toBeNull();
  });

  it("shows loading state for async handlers and prevents re-entry", async () => {
    let resolveRequest: (() => void) | undefined;
    const pendingRequest = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    const onClick = vi.fn(() => pendingRequest);
    render(<RefreshButton onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Refresh" });

    fireEvent.click(button);
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(button.querySelector(".animate-spin")).toBeTruthy();

    resolveRequest?.();

    await waitFor(() => {
      expect((button as HTMLButtonElement).disabled).toBe(false);
      expect(button.querySelector(".animate-spin")).toBeNull();
    });
  });
});
