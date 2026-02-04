import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { MemoryRouter } from "react-router-dom";
import ProvisioningPage from "../ProvisioningPage";

// Mock React Router
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("ProvisioningPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    global.fetch = jest.fn();
    localStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ProvisioningPage />
      </MemoryRouter>
    );
  };

  it("renders the loading UI initially", () => {
    localStorage.setItem("provision_job_id", "job-123");
    renderPage();

    expect(screen.getByText(/Hang tight, we’re setting/i)).toBeInTheDocument();
    // Progress bar exists (role='progressbar' is implied or check by text)
    expect(screen.getByText(/%/)).toBeInTheDocument();
  });

  it("successfully finishes provisioning and redirects", async () => {
    localStorage.setItem("provision_job_id", "job-123");
    
    // Mock the polling API response
    // We mock fetch to return "succeeded"
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "succeeded", message: "All done" }),
    });

    renderPage();

    // Fast-forward time to trigger the poll
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
        // Check if message updated
        expect(screen.getByText(/Provisioning complete/i)).toBeInTheDocument();
        // Check if progress jumped to 100%
        expect(screen.getByText("100%")).toBeInTheDocument();
    });

    // Fast-forward for the redirect delay
    act(() => {
        jest.advanceTimersByTime(1000);
    });

    // Verify Redirect
    await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
        expect(localStorage.getItem("isProvisioned")).toBe("true");
        expect(localStorage.getItem("provision_job_id")).toBeNull();
    });
  });

  it("displays error state if API fails", async () => {
    localStorage.setItem("provision_job_id", "job-123");

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ status: "failed", message: "Server caught fire" }),
    });

    renderPage();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByText(/Provisioning failed/i)).toBeInTheDocument();
      // Ensure we did NOT redirect
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });
});