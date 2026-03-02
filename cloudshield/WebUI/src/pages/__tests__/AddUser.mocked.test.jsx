import React from "react";
import { render, screen } from "@testing-library/react";
import AddUserPage from "../AddUser";

jest.mock("../../hooks/useAsyncTask.js", () => ({
  useAsyncTask: jest.fn(),
}));

jest.mock("../../components/provisioning/ProvisioningControls.jsx", () => {
  return function DummyProvisioningControls() {
    return <div data-testid="provisioning-controls">Provisioning Controls</div>;
  };
});

const { useAsyncTask } = require("../../hooks/useAsyncTask.js");

describe("AddUserPage (mocked states)", () => {
  beforeEach(() => {
    useAsyncTask.mockReset();
  });

  it("shows running state with default progress text when progress is null", () => {
    useAsyncTask.mockReturnValue({
      jobId: "job-1",
      status: "running",
      message: "",
      progress: null,
      result: null,
      executeTask: jest.fn(),
      reset: jest.fn(),
    });

    render(<AddUserPage />);
    expect(screen.getByText("Adding user…")).toBeInTheDocument();
  });

  it("shows failed state without message text when message is empty", () => {
    useAsyncTask.mockReturnValue({
      jobId: "job-1",
      status: "failed",
      message: "",
      progress: null,
      result: null,
      executeTask: jest.fn(),
      reset: jest.fn(),
    });

    render(<AddUserPage />);
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.queryByText(/Failed to start|error/i)).not.toBeInTheDocument();
  });

  it("shows success fallback message when result.message is missing", () => {
    useAsyncTask.mockReturnValue({
      jobId: "job-1",
      status: "succeeded",
      message: "",
      progress: null,
      result: { org_id: "org-1", username: "user-1", role: "user" },
      executeTask: jest.fn(),
      reset: jest.fn(),
    });

    render(<AddUserPage />);
    expect(
      screen.getByText("The user has been created successfully.")
    ).toBeInTheDocument();
    expect(screen.getByText("Org ID: org-1")).toBeInTheDocument();
    expect(screen.getByText("Username: user-1")).toBeInTheDocument();
    expect(screen.getByText("Role: user")).toBeInTheDocument();
  });

  it("does not render org/user/role fields when missing", () => {
    useAsyncTask.mockReturnValue({
      jobId: "job-1",
      status: "succeeded",
      message: "",
      progress: null,
      result: { message: "ok" },
      executeTask: jest.fn(),
      reset: jest.fn(),
    });

    render(<AddUserPage />);
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(screen.queryByText(/Org ID:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Username:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Role:/i)).not.toBeInTheDocument();
  });
});
