import React from "react";
import { render, screen, within } from "@testing-library/react";
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

  it("shows failed state without rendering the message text when message is empty", () => {
    useAsyncTask.mockReturnValue({
      jobId: "job-1",
      status: "failed",
      message: "", // empty => message Typography should NOT render
      progress: null,
      result: null,
      executeTask: jest.fn(),
      reset: jest.fn(),
    });

    render(<AddUserPage />);

    // "Failed" can appear multiple times (MUI Chip label duplication), so assert via *AllBy*
    const failedLabels = screen.getAllByText("Failed");
    expect(failedLabels.length).toBeGreaterThan(0);

    // Generic failure copy always shows
    const failureTitle = screen.getByText("We couldn't add the user.");
    const failureHint = screen.getByText(
      "Try verifying the organization ID and email, then run the task again."
    );
    expect(failureTitle).toBeInTheDocument();
    expect(failureHint).toBeInTheDocument();

    // Scope checks to the failure section (prefer role="alert" if present)
    const failureSection =
      failureTitle.closest('[role="alert"]') ||
      // fallback: climb a bit to a reasonable container (MUI often wraps in Boxes)
      failureTitle.closest("div");

    expect(failureSection).toBeTruthy();

    // Assert that no message body2 Typography is rendered (since message is empty), except for the known generic hint line.
    const body2InFailure = failureSection.querySelectorAll(".MuiTypography-body2");
    // Typically: exactly 1 body2 line ("Try verifying...") when message is empty
    expect(body2InFailure).toHaveLength(1);

    // And as an extra guard, ensure we don't accidentally render any “empty message” node
    // (No extra text beyond the known generic lines in that section).
    expect(within(failureSection).getByText("We couldn't add the user.")).toBeInTheDocument();
    expect(
      within(failureSection).getByText(
        "Try verifying the organization ID and email, then run the task again."
      )
    ).toBeInTheDocument();
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
    expect(screen.getByText("The user has been created successfully.")).toBeInTheDocument();
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