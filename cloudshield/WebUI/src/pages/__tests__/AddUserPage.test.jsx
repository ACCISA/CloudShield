import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import AddUserPage from "../AddUser";

describe("AddUserPage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  test("starts add user flow and shows success details", async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 202,
        json: async () => ({ job_id: "job-123" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: "finished",
          result: { message: "User created", org_id: "acme", username: "alice", role: "employee" },
        }),
      });

    render(<AddUserPage />);

    fireEvent.change(screen.getByLabelText(/Organization ID/i), { target: { value: "acme" } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: "alice" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "SuperSecret123!" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5050/task/dc/add_user",
      expect.objectContaining({ method: "POST" })
    );

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await screen.findByText(/User Added Successfully/i);
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
    expect(screen.getByText(/acme/i)).toBeInTheDocument();
  });

  test("shows error when start request fails", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "backend error",
    });

    render(<AddUserPage />);

    fireEvent.change(screen.getByLabelText(/Organization ID/i), { target: { value: "acme" } });
    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: "bob" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "AnotherSecret123!" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));
    });

    await screen.findByText(/Status: failed/i);
    expect(screen.getAllByText(/backend error/i).length).toBeGreaterThan(0);
  });
});
