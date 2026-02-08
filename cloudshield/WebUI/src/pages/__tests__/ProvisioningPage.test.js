import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import ProvisioningPage from "../ProvisioningPage"; // Adjust path if needed
import "@testing-library/jest-dom";

// --- 1. Mock External Assets ---
jest.mock("../../assets/cloudshield_logo_white.png", () => "logo-mock.png");

// --- 2. Mock Child Components ---
// We mock the bar to isolate testing to the Page logic only
jest.mock("../../components/provisioning/ProvisioningProgressBar.jsx", () => {
  return function MockProgressBar({ percent }) {
    return <div data-testid="progress-bar">Progress: {percent}%</div>;
  };
});

describe("ProvisioningPage", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // 1. Setup Fake Timers
    jest.useFakeTimers();

    // 2. Mock Fetch
    global.fetch = jest.fn();

    // 3. Mock LocalStorage
    const localStorageMock = (function () {
      let store = {};
      return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
        removeItem: jest.fn((key) => { delete store[key]; }),
        clear: jest.fn(() => { store = {}; }),
      };
    })();
    Object.defineProperty(window, "localStorage", { value: localStorageMock });

    // 4. Mock Window Location (for redirect/reload)
    delete window.location;
    window.location = { href: "", reload: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    window.location = originalLocation;
  });

  // --- TEST CASES ---

  test("Shows error if Organization ID is missing", async () => {
    window.localStorage.getItem.mockReturnValue(null); // No org_id

    await act(async () => {
      render(<ProvisioningPage />);
    });

    expect(screen.getByText(/Error: Organization ID missing/i)).toBeInTheDocument();
  });

  test("Starts a new provisioning job if 'provision_job_id' is missing", async () => {
    // Setup: Org exists, Job missing
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org-123";
      return null;
    });

    // Mock 1: The POST request to start provisioning
    global.fetch.mockImplementationOnce((url, options) => {
      if (url.includes("/api/task/provision") && options.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ job_id: "new-job-id" }),
        });
      }
      return Promise.reject("Unknown call");
    });

    // Mock 2: The subsequent polling status check
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/status")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ status: "running" }),
        });
      }
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Assert: POST was called
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/task/provision"),
      expect.objectContaining({ method: "POST" })
    );

    // Assert: Job ID saved to storage
    expect(window.localStorage.setItem).toHaveBeenCalledWith("provision_job_id", "new-job-id");
  });

  test("Mock Animation increments percent independently of backend", async () => {
    // Setup: Existing job
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "existing-job";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "running" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Initial state
    expect(screen.getByText("Initializing user environment...")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveTextContent("Progress: 0%");

    // Advance Timer (Animation runs every 1300ms)
    await act(async () => {
      jest.advanceTimersByTime(1300 * 5); // 5 ticks (~6.5 seconds) -> Should be 5%
    });

    // Verify percent incremented
    expect(screen.getByTestId("progress-bar")).toHaveTextContent("Progress: 5%");
    
    // Verify backend was also polled (Poll runs every 2000ms)
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/status/existing-job")
    );
  });

  test("Success State: Jumps to 100% and redirects", async () => {
    // Setup
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    // Mock polling returning SUCCESS
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "succeeded" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Advance timer to ensure poll fires
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    // Assert UI Update
    expect(screen.getByText("All good! Redirecting...")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveTextContent("Progress: 100%");

    // Assert Storage Cleanup
    expect(window.localStorage.setItem).toHaveBeenCalledWith("isProvisioned", "true");
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("provision_job_id");

    // Advance timer for the Redirect Delay (1500ms)
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    // Assert Redirect
    expect(window.location.href).toBe("/dashboard");
  });

  test("Failure State: Stops animation and shows retry button", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-fail";
      return null;
    });

    // Mock polling returning FAILURE
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "failed", error: "Database error" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Advance timer to catch failure
    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    // Assert Error UI
    expect(screen.getByText(/Provisioning failed: Database error/i)).toBeInTheDocument();
    
    // Assert Retry Button
    const retryBtn = screen.getByText("Retry Provisioning");
    expect(retryBtn).toBeInTheDocument();

    // Verify Retry Click
    fireEvent.click(retryBtn);
    expect(window.location.reload).toHaveBeenCalled();
  });

  test("getMockText displays correct message for percent < 20", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "running" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // At 0%, should show initial message
    expect(screen.getByText("Initializing user environment...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent < 40", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "running" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Advance to reach 20%+ (4 ticks = 4%, but starts at 0)
    await act(async () => {
      jest.advanceTimersByTime(1300 * 20); // 20 ticks = 20%
    });

    expect(screen.getByText("Generating secure credentials...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent < 60", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "running" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Advance to reach 40%+
    await act(async () => {
      jest.advanceTimersByTime(1300 * 40); // 40 ticks = 40%
    });

    expect(screen.getByText("Provisioning workstation infrastructure...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent < 80", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "running" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Advance to reach 60%+
    await act(async () => {
      jest.advanceTimersByTime(1300 * 60); // 60 ticks = 60%
    });

    expect(screen.getByText("Configuring groups and permissions...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent < 95", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "running" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Advance to reach 80%+
    await act(async () => {
      jest.advanceTimersByTime(1300 * 80); // 80 ticks = 80%
    });

    expect(screen.getByText("Finalizing network & file systems...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent >= 95", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "running" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    // Advance to reach 95%
    await act(async () => {
      jest.advanceTimersByTime(1300 * 95); // 95 ticks = 95%
    });

    expect(screen.getByText("Finishing up...")).toBeInTheDocument();
  });

  test("Retry button hover effects: handleHighlight applies styles", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-fail";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "failed", error: "Test error" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    const retryBtn = screen.getByText("Retry Provisioning");

    // Trigger mouseEnter (calls handleHighlight)
    fireEvent.mouseEnter(retryBtn);

    // Verify styles were applied (browser may return hex or rgb)
    expect(retryBtn.style.backgroundColor).toMatch(/(rgb\(255, 255, 255\)|#fff)/i);
    expect(retryBtn.style.color).toMatch(/(rgb\(10, 10, 10\)|#0A0A0A)/i);
    expect(retryBtn.style.borderColor).toMatch(/(rgb\(255, 255, 255\)|#fff)/i);
  });

  test("Retry button hover effects: handleReset resets styles", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-fail";
      return null;
    });

    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: "failed", error: "Test error" }),
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    const retryBtn = screen.getByText("Retry Provisioning");

    // First highlight the button
    fireEvent.mouseEnter(retryBtn);

    // Then reset (calls handleReset)
    fireEvent.mouseLeave(retryBtn);

    // Verify styles were reset (browser may return hex or rgb)
    expect(retryBtn.style.backgroundColor).toBe("transparent");
    expect(retryBtn.style.color).toMatch(/(rgb\(255, 255, 255\)|#fff)/i);
    expect(retryBtn.style.borderColor).toBe("rgba(255, 255, 255, 0.3)");
  });
});