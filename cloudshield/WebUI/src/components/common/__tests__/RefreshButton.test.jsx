import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RefreshButton from "../RefreshButton/RefreshButton";

jest.mock("../../hooks/useThemeColors.js", () => ({
  useThemeColors: () => ({
    text: "#fff",
    bgHover: "#111",
    borderLight: "#444",
  }),
}));

describe("RefreshButton", () => {
  test("renders refresh button", () => {
    render(<RefreshButton onClick={jest.fn()} />);

    expect(screen.getByRole("button", { name: "Refresh" })).toBeInTheDocument();
  });

  test("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<RefreshButton onClick={onClick} />);

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("does not call onClick when disabled", () => {
    const onClick = jest.fn();
    render(<RefreshButton onClick={onClick} disabled={true} />);

    const button = screen.getByRole("button", { name: "Refresh" });
    expect(button).toBeDisabled();

    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test("enters loading state during async click and then recovers", async () => {
    let resolvePromise;
    const onClick = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );
    render(<RefreshButton onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(document.querySelector("div[style*='animation: spin']")).toBeInTheDocument();

    resolvePromise();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  test("prevents duplicate clicks while loading", async () => {
    let resolvePromise;
    const onClick = jest.fn(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        }),
    );
    render(<RefreshButton onClick={onClick} />);

    const button = screen.getByRole("button", { name: "Refresh" });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);

    resolvePromise();
    await waitFor(() => expect(button).not.toBeDisabled());
  });

});
