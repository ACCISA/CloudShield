import React from "react";
import { render, screen, act, fireEvent } from "@testing-library/react";
import ProvisioningPage from "../ProvisioningPage";
import "@testing-library/jest-dom";
import { apiGet, apiPost } from "../../api/client";

jest.mock("../../assets/cloudshield_logo_white.png", () => "logo-mock.png");

jest.mock("../../api/client", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));

jest.mock("../../components/provisioning/ProvisioningProgressBar.jsx", () => {
  return function MockProgressBar({ percent }) {
    return <div data-testid="progress-bar">Progress: {percent}%</div>;
  };
});

describe("ProvisioningPage", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    jest.useFakeTimers();
    apiGet.mockReset();
    apiPost.mockReset();

    const localStorageMock = (function () {
      let store = {};
      return {
        getItem: jest.fn((key) => store[key] || null),
        setItem: jest.fn((key, value) => {
          store[key] = value.toString();
        }),
        removeItem: jest.fn((key) => {
          delete store[key];
        }),
        clear: jest.fn(() => {
          store = {};
        }),
      };
    })();
    Object.defineProperty(window, "localStorage", { value: localStorageMock });

    delete window.location;
    window.location = { href: "", reload: jest.fn() };
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    window.location = originalLocation;
  });

  const buildResponse = (data, status = 200) => ({
    status,
    json: async () => data,
  });

  test("Shows error if Organization ID is missing", async () => {
    window.localStorage.getItem.mockReturnValue(null);

    await act(async () => {
      render(<ProvisioningPage />);
    });

    expect(screen.getByText(/Error: Organization ID missing/i)).toBeInTheDocument();
  });

  test("Starts a new provisioning job if 'provision_job_id' is missing", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org-123";
      return null;
    });

    apiPost.mockReturnValueOnce({
      json: async () => ({ job_id: "new-job-id" }),
    });
    apiGet.mockResolvedValue(buildResponse({ status: "running" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    expect(apiPost).toHaveBeenCalledWith(
      "/task/provision",
      { org_id: "test-org-123" }
    );

    expect(window.localStorage.setItem).toHaveBeenCalledWith("provision_job_id", "new-job-id");
  });

  test("Mock Animation increments percent independently of backend", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "existing-job";
      return null;
    });

    apiGet.mockResolvedValue(buildResponse({ status: "running" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    expect(screen.getByText("Initializing user environment...")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveTextContent("Progress: 0%");

    await act(async () => {
      jest.advanceTimersByTime(1300 * 5);
    });

    expect(screen.getByTestId("progress-bar")).toHaveTextContent("Progress: 5%");
    expect(apiGet).toHaveBeenCalledWith("/status/existing-job");
  });

  test("Success State: Jumps to 100% and redirects", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    apiGet.mockResolvedValue(buildResponse({ status: "succeeded" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    expect(screen.getByText("All good! Redirecting...")).toBeInTheDocument();
    expect(screen.getByTestId("progress-bar")).toHaveTextContent("Progress: 100%");

    expect(window.localStorage.setItem).toHaveBeenCalledWith("isProvisioned", "true");
    expect(window.localStorage.removeItem).toHaveBeenCalledWith("provision_job_id");

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    expect(window.location.href).toBe("/dashboard");
  });

  test("Failure State: Stops animation and shows retry button", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-fail";
      return null;
    });

    apiGet.mockResolvedValue(
      buildResponse({ status: "failed", error: "Database error" }),
    );

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(2100);
    });

    expect(screen.getByText(/Provisioning failed: Database error/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole("button", { name: "Retry Provisioning" });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(window.location.reload).toHaveBeenCalled();
  });

  test("getMockText displays correct message for percent < 20", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    apiGet.mockResolvedValue(buildResponse({ status: "running" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    expect(screen.getByText("Initializing user environment...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent < 40", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    apiGet.mockResolvedValue(buildResponse({ status: "running" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(1300 * 20);
    });

    expect(screen.getByText("Generating secure credentials...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent < 60", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    apiGet.mockResolvedValue(buildResponse({ status: "running" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(1300 * 40);
    });

    expect(screen.getByText("Provisioning workstation infrastructure...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent < 80", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    apiGet.mockResolvedValue(buildResponse({ status: "running" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(1300 * 60);
    });

    expect(screen.getByText("Configuring groups and permissions...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent < 95", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    apiGet.mockResolvedValue(buildResponse({ status: "running" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(1300 * 80);
    });

    expect(screen.getByText("Finalizing network & file systems...")).toBeInTheDocument();
  });

  test("getMockText displays correct message for percent >= 95", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org";
      if (key === "provision_job_id") return "job-123";
      return null;
    });

    apiGet.mockResolvedValue(buildResponse({ status: "running" }));

    await act(async () => {
      render(<ProvisioningPage />);
    });

    await act(async () => {
      jest.advanceTimersByTime(1300 * 95);
    });

    expect(screen.getByText("Finishing up...")).toBeInTheDocument();
  });

  test("Start job failure: shows friendly error message and retry button", async () => {
    window.localStorage.getItem.mockImplementation((key) => {
      if (key === "org_id") return "test-org-123";
      return null;
    });

    apiPost.mockReturnValueOnce({
      json: async () => {
        throw new Error("Server blew up");
      },
    });

    await act(async () => {
      render(<ProvisioningPage />);
    });

    expect(screen.getByText(/Provisioning failed: Server blew up/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry Provisioning" })).toBeInTheDocument();
  });
});
