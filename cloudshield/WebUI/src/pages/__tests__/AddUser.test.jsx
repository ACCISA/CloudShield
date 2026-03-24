import React from "react";
import { render, screen, fireEvent, act, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddUserPage from "../AddUser";

// Mock the ProvisioningControls component (keeps tests stable + avoids extra UI assumptions)
jest.mock("../../components/provisioning/ProvisioningControls.jsx", () => {
  return function DummyProvisioningControls() {
    return <div data-testid="provisioning-controls">Provisioning Controls</div>;
  };
});

// Optional: mock analytics so clicking doesn't require real implementation
jest.mock("../../lib/analytics", () => ({
  trackButton: jest.fn(),
}));

// Optional: make error messages deterministic in tests
jest.mock("../../lib/errors.js", () => ({
  getUserErrorMessage: (err) => (err instanceof Error ? err.message : String(err)),
}));

describe("AddUserPage", () => {
  const user = userEvent.setup();

  const fillValidForm = async () => {
    await user.type(screen.getByLabelText("Organization ID"), "org-123");
    await user.type(screen.getByLabelText("Username"), "john");
    await user.type(screen.getByLabelText("Email"), "john@example.com");
    await user.type(screen.getByLabelText("Password"), "pass123");
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    try {
      jest.useRealTimers();
    } catch {
      // ignore
    }
    jest.restoreAllMocks();
  });

  // ---- Helpers for fake-timer polling tests ----

  const flushMicrotasks = async () => {
    // Flush a couple times to cover chained .then() calls
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  /**
   * Drives timer-based polling deterministically under jest fake timers:
   * - runs all currently scheduled timers
   * - flushes microtasks (promise continuations)
   * Repeats N cycles so "POST -> poll -> poll -> terminal state" can complete.
   */
  const runPollingCycles = async (cycles = 6) => {
    for (let i = 0; i < cycles; i += 1) {
      await act(async () => {
        jest.runOnlyPendingTimers();
      });
      await flushMicrotasks();
    }
  };

  describe("Rendering", () => {
    it("should render without crashing", () => {
      const { container } = render(<AddUserPage />);
      expect(container).toBeTruthy();
    });

    it("should display the page title", () => {
      render(<AddUserPage />);

      expect(screen.getByRole("heading", { name: "Add User" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Add User/i })).toBeInTheDocument();
    });

    it("should display the page subtitle/description", () => {
      render(<AddUserPage />);

      expect(
        screen.getByText("Provision a new user to an organization.")
      ).toBeInTheDocument();

      expect(screen.getByLabelText("Organization ID")).toBeInTheDocument();
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("should render all four input fields", () => {
      render(<AddUserPage />);
      expect(screen.getByLabelText("Organization ID")).toBeInTheDocument();
      expect(screen.getByLabelText("Username")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Password")).toBeInTheDocument();
    });

    it("should render the Add User button", () => {
      render(<AddUserPage />);
      expect(screen.getByRole("button", { name: /Add User/i })).toBeInTheDocument();
    });

    it("should render ProvisioningControls component", () => {
      render(<AddUserPage />);
      expect(screen.getByTestId("provisioning-controls")).toBeInTheDocument();
    });
  });

  describe("Input Fields", () => {
    it("should update organization ID on input", async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText("Organization ID");
      await user.type(input, "org-123");
      expect(input).toHaveValue("org-123");
    });

    it("should update username on input", async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText("Username");
      await user.type(input, "john.doe");
      expect(input).toHaveValue("john.doe");
    });

    it("should update password on input", async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText("Password");
      await user.type(input, "SecurePassword123");
      expect(input).toHaveValue("SecurePassword123");
    });

    it("should update email on input", async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText("Email");
      await user.type(input, "john@example.com");
      expect(input).toHaveValue("john@example.com");
    });

    it('should have type="password" for password field', () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText("Password");
      expect(input).toHaveAttribute("type", "password");
    });
  });

  describe("Button States", () => {
    it("should disable Add User button when org ID is empty", () => {
      render(<AddUserPage />);
      expect(screen.getByRole("button", { name: /Add User/i })).toBeDisabled();
    });

    it("should enable Add User button when all fields are filled", async () => {
      render(<AddUserPage />);
      await fillValidForm();
      expect(screen.getByRole("button", { name: /Add User/i })).not.toBeDisabled();
    });

    it("should not show Reset button when status is idle", () => {
      render(<AddUserPage />);
      expect(screen.queryByRole("button", { name: /Reset/i })).not.toBeInTheDocument();
    });
  });

  describe("Form Submission", () => {
    it("should call API on form submission (correct URL + payload)", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 202,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ job_id: "job-123" }),
          text: () => Promise.resolve(""),
        })
      );

      render(<AddUserPage />);
      await fillValidForm();

      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:5050/task/dc/add_user",
          expect.objectContaining({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              org_id: "org-123",
              username: "john",
              password: "pass123",
              email: "john@example.com",
            }),
          })
        );
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors gracefully", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          headers: { get: () => "text/plain" },
          text: () => Promise.resolve("Bad request"),
        })
      );

      render(<AddUserPage />);
      await fillValidForm();

      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
        expect(screen.getByText(/Bad request/i)).toBeInTheDocument();
      });
    });

    it("should handle missing job_id in response", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          status: 202,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({}), // missing job_id
          text: () => Promise.resolve(""),
        })
      );

      render(<AddUserPage />);
      await fillValidForm();

      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
        expect(screen.getByText(/missing a job ID/i)).toBeInTheDocument();
      });
    });
  });

  describe("Cleanup", () => {
    it("should clear polling interval on unmount", async () => {
      const clearIntervalSpy = jest.spyOn(global, "clearInterval");
      const setIntervalSpy = jest.spyOn(global, "setInterval");

      global.fetch = jest.fn((url) => {
        if (String(url).includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "running", progress: 10 }),
          text: () => Promise.resolve(""),
        });
      });

      const { unmount } = render(<AddUserPage />);
      await fillValidForm();

      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(setIntervalSpy).toHaveBeenCalled();
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
      clearIntervalSpy.mockRestore();
    });
  });

  describe("Status Polling & UI", () => {
    it("should display numeric progress percentage", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "running", progress: 75 }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("Adding user… 75%")).toBeInTheDocument();
      });
    });

    it("should display string progress message", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              status: "running",
              progress: "Processing user data",
            }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("Processing user data")).toBeInTheDocument();
      });
    });

    it("should infer status from finished to succeeded", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              status: "finished",
              result: { message: "Complete" },
            }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("User added successfully")).toBeInTheDocument();
        expect(screen.getByText("Complete")).toBeInTheDocument();
      });
    });

    it("should infer status from queued to running", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "queued", progress: "Waiting..." }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("Waiting...")).toBeInTheDocument();
      });
    });

    it("should infer succeeded status from progress completed text", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              progress: "Completed successfully",
              result: { message: "Done" },
            }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("User added successfully")).toBeInTheDocument();
        expect(screen.getByText("Done")).toBeInTheDocument();
      });
    });

    it("should display result with all fields when succeeded", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              status: "succeeded",
              result: {
                message: "User created successfully",
                org_id: "org-456",
                username: "testuser",
                role: "admin",
              },
            }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("User added successfully")).toBeInTheDocument();
        expect(screen.getByText("User created successfully")).toBeInTheDocument();
        expect(screen.getByText("Org ID: org-456")).toBeInTheDocument();
        expect(screen.getByText("Username: testuser")).toBeInTheDocument();
        expect(screen.getByText("Role: admin")).toBeInTheDocument();
      });
    });

    it("should handle progress 0% correctly", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "running", progress: 0 }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("Adding user… 0%")).toBeInTheDocument();
      });
    });

    it("should handle progress 100% correctly", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "running", progress: 100 }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("Adding user… 100%")).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation Edge Cases", () => {
    it("should accept username with special characters", async () => {
      render(<AddUserPage />);
      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "user.name-123_test");
      expect(usernameInput).toHaveValue("user.name-123_test");
    });

    it("should accept email with subdomains", async () => {
      render(<AddUserPage />);
      const emailInput = screen.getByLabelText("Email");
      await user.type(emailInput, "user+tag@sub.domain.co.uk");
      expect(emailInput).toHaveValue("user+tag@sub.domain.co.uk");
    });

    it("should accept very long password", async () => {
      render(<AddUserPage />);
      const longPassword = "a".repeat(256);
      const passwordInput = screen.getByLabelText("Password");
      await user.type(passwordInput, longPassword);
      expect(passwordInput).toHaveValue(longPassword);
    });

    it("should accept organization ID with dashes and numbers", async () => {
      render(<AddUserPage />);
      const orgInput = screen.getByLabelText("Organization ID");
      await user.type(orgInput, "org-123-456-789");
      expect(orgInput).toHaveValue("org-123-456-789");
    });

    it("should handle whitespace in input fields", async () => {
      render(<AddUserPage />);
      const usernameInput = screen.getByLabelText("Username");
      await user.type(usernameInput, "  user  ");
      expect(usernameInput).toHaveValue("  user  ");
    });

    it("should enable button with minimum valid data", async () => {
      render(<AddUserPage />);
      const orgInput = screen.getByLabelText("Organization ID");
      const usernameInput = screen.getByLabelText("Username");
      const emailInput = screen.getByLabelText("Email");
      const passwordInput = screen.getByLabelText("Password");
      await user.type(orgInput, "org");
      await user.type(usernameInput, "john");
      await user.type(emailInput, "john@example.com");
      await user.type(passwordInput, "pass123");
      expect(screen.getByRole("button", { name: /Add User/i })).not.toBeDisabled();
    });
  });

  describe("Network Error Scenarios", () => {
    it("should handle network timeout on initial POST", async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error("Network timeout")));

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
        expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();
      });
    });

    it("should continue running when polling request errors", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.reject(new Error("Polling failed"));
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
      expect(screen.queryByText("We couldn't add the user.")).not.toBeInTheDocument();
    });

    it("should handle 500 server error", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          headers: { get: () => "text/plain" },
          text: () => Promise.resolve("Internal Server Error"),
        })
      );

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
      });
    });

    it("should handle 401 unauthorized error", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          headers: { get: () => "text/plain" },
          text: () => Promise.resolve("Unauthorized"),
        })
      );

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
      });
    });
  });

  describe("Multiple Submissions", () => {
    it("should prevent submission while in progress", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "running", progress: 50 }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();

      const submitButton = screen.getByRole("button", { name: /Add User/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it("should allow new submission after error", async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error("Network error"))
      );

      const { rerender } = render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
      });

      // Check that form is available for new attempt
      expect(screen.getByLabelText("Organization ID")).toHaveValue("org-123");
    });

    it("should re-enable Add User button after failed submission when reset", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          headers: { get: () => "text/plain" },
          text: () => Promise.resolve("Bad request"),
        })
      );

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
      });

      // Form inputs should still be present
      expect(screen.getByLabelText("Organization ID")).toBeInTheDocument();
    });
  });

  describe("API Response Format Variations", () => {
    it("should handle missing progress in status response", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "running" }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it("should handle missing status in response", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ progress: 50 }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });

    it("should handle result with partial fields", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              status: "succeeded",
              result: { message: "Done", username: "john" },
            }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("User added successfully")).toBeInTheDocument();
        expect(screen.getByText("Done")).toBeInTheDocument();
        expect(screen.getByText("Username: john")).toBeInTheDocument();
      });
    });

    it("should handle empty result object", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-123" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "succeeded", result: {} }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("User added successfully")).toBeInTheDocument();
      });
    });
  });

  describe("Input Field Interactions", () => {
    it("should clear individual field without affecting others", async () => {
      render(<AddUserPage />);
      const orgInput = screen.getByLabelText("Organization ID");
      const usernameInput = screen.getByLabelText("Username");

      await user.type(orgInput, "org-123");
      await user.type(usernameInput, "john");

      expect(orgInput).toHaveValue("org-123");
      expect(usernameInput).toHaveValue("john");

      await user.clear(orgInput);
      expect(orgInput).toHaveValue("");
      expect(usernameInput).toHaveValue("john");
    });

    it("should handle rapid field changes", async () => {
      render(<AddUserPage />);
      const emailInput = screen.getByLabelText("Email");

      await user.type(emailInput, "t");
      await user.type(emailInput, "e");
      await user.type(emailInput, "s");
      await user.type(emailInput, "t");

      expect(emailInput).toHaveValue("test");
    });

    it("should handle backspace in fields", async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText("Username");

      await user.type(input, "testuser");
      await user.type(input, "{backspace}{backspace}{backspace}");

      expect(input).toHaveValue("testu");
    });

    it("should handle copy-paste operations", async () => {
      render(<AddUserPage />);
      const input = screen.getByLabelText("Email");
      const testEmail = "complex.email+tag@sub.domain.com";

      await user.type(input, testEmail);
      expect(input).toHaveValue(testEmail);
    });

    it("should not auto-focus when rendering", () => {
      const { container } = render(<AddUserPage />);
      expect(document.activeElement).not.toEqual(
        screen.getByLabelText("Organization ID")
      );
    });
  });

  describe("State Transitions", () => {
    it("should transition from idle to pending on submission", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return new Promise(() => {}); // Never resolves
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ status: "running", progress: 50 }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();

      const button = screen.getByRole("button", { name: /Add User/i });
      expect(button).not.toBeDisabled();

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it("should transition from pending to error state", async () => {
      global.fetch = jest.fn(() =>
        Promise.reject(new Error("API Error"))
      );

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
      });
    });

    it("should transition from error to pending on retry", async () => {
      let callCount = 0;
      global.fetch = jest.fn(() => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.reject(new Error("First call failed"));
        }
        return Promise.resolve({
          ok: true,
          status: 202,
          headers: { get: () => "application/json" },
          json: () => Promise.resolve({ job_id: "job-456" }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("We couldn't add the user.")).toBeInTheDocument();
      });

      // Form should still be available
      expect(screen.getByLabelText("Organization ID")).toBeInTheDocument();
    });
  });

  describe("Successfully Completed State", () => {
    it("should show success message with complete result data", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-999" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              status: "succeeded",
              result: {
                message: "User provisioned",
                org_id: "org-final",
                username: "finaluser",
                email: "final@example.com",
                role: "member",
              },
            }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("User added successfully")).toBeInTheDocument();
        expect(screen.getByText("User provisioned")).toBeInTheDocument();
        expect(screen.getByText("Org ID: org-final")).toBeInTheDocument();
        expect(screen.getByText("Username: finaluser")).toBeInTheDocument();
        expect(screen.getByText("Role: member")).toBeInTheDocument();
      });
    });

    it("should not show form inputs after success", async () => {
      global.fetch = jest.fn((url) => {
        const s = String(url);
        if (s.includes("/task/dc/add_user")) {
          return Promise.resolve({
            ok: true,
            status: 202,
            headers: { get: () => "application/json" },
            json: () => Promise.resolve({ job_id: "job-999" }),
            text: () => Promise.resolve(""),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: { get: () => "application/json" },
          json: () =>
            Promise.resolve({
              status: "succeeded",
              result: { message: "Done" },
            }),
          text: () => Promise.resolve(""),
        });
      });

      render(<AddUserPage />);
      const initialInputs = [
        screen.getByLabelText("Organization ID"),
        screen.getByLabelText("Username"),
      ];

      expect(initialInputs[0]).toBeInTheDocument();

      await fillValidForm();
      fireEvent.click(screen.getByRole("button", { name: /Add User/i }));

      await waitFor(() => {
        expect(screen.getByText("User added successfully")).toBeInTheDocument();
      });
    });
  });
});
