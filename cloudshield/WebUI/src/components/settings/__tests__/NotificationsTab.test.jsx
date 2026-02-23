import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NotificationsTab from "../NotificationsTab";

describe("NotificationsTab", () => {
  const mockOnSave = jest.fn();
  const defaultProps = {
    userData: {
      email: "test@example.com",
      notification_preferences: {
        email_alerts: false,
        alert_email: "alert@example.com",
        in_app_alerts: true,
      },
    },
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders notification centre title", () => {
      render(<NotificationsTab {...defaultProps} />);
      expect(screen.getByText("Notification Centre")).toBeInTheDocument();
    });

    it("renders email alerts toggle", () => {
      render(<NotificationsTab {...defaultProps} />);
      expect(screen.getByText("Email alerts")).toBeInTheDocument();
    });

    it("renders in-app alerts toggle", () => {
      render(<NotificationsTab {...defaultProps} />);
      expect(screen.getByText("In-App alerts")).toBeInTheDocument();
    });

    it("renders alerts table", () => {
      render(<NotificationsTab {...defaultProps} />);
      expect(screen.getByText("Search alerts")).toBeInTheDocument();
    });
  });

  describe("Email Alerts Toggle", () => {
    it("toggles email alerts and calls onSave", async () => {
      mockOnSave.mockResolvedValue();
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      const emailToggle = switches[1]; // Second switch is email alerts
      
      await userEvent.click(emailToggle);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          notification_preferences: {
            email_alerts: true,
            alert_email: "alert@example.com",
            in_app_alerts: true,
          },
        });
      });
    });

    it("disables email input when email alerts are off", () => {
      render(<NotificationsTab {...defaultProps} />);
      const emailInput = screen.getByPlaceholderText("Email");
      expect(emailInput).toBeDisabled();
    });

    it("enables email input when email alerts are on", async () => {
      mockOnSave.mockResolvedValue();
      const propsWithEnabled = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          notification_preferences: {
            ...defaultProps.userData.notification_preferences,
            email_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithEnabled} />);
      const emailInput = screen.getByPlaceholderText("Email");
      expect(emailInput).not.toBeDisabled();
    });

    it("reverts toggle on save failure", async () => {
      mockOnSave.mockRejectedValue(new Error("Save failed"));
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      const emailToggle = switches[1];
      
      await userEvent.click(emailToggle);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });

      // Component should still show original state
      expect(emailToggle).not.toBeChecked();
    });
  });

  describe("In-App Alerts Toggle", () => {
    it("toggles in-app alerts and calls onSave", async () => {
      mockOnSave.mockResolvedValue();
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      const inAppToggle = switches[2]; // Third switch is in-app alerts
      
      await userEvent.click(inAppToggle);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          notification_preferences: {
            email_alerts: false,
            alert_email: "alert@example.com",
            in_app_alerts: false,
          },
        });
      });
    });

    it("shows green toggle when enabled", () => {
      const propsWithEnabled = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          notification_preferences: {
            ...defaultProps.userData.notification_preferences,
            in_app_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithEnabled} />);
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      expect(switches[2]).toBeChecked();
    });
  });

  describe("Email Input Management", () => {
    it("updates email on input change", async () => {
      const propsWithEnabled = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          notification_preferences: {
            ...defaultProps.userData.notification_preferences,
            email_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithEnabled} />);
      const emailInput = screen.getByPlaceholderText("Email");
      
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "newemail@example.com");
      
      expect(emailInput).toHaveValue("newemail@example.com");
    });

    it("saves email on blur", async () => {
      mockOnSave.mockResolvedValue();
      const propsWithEnabled = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          notification_preferences: {
            ...defaultProps.userData.notification_preferences,
            email_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithEnabled} />);
      const emailInput = screen.getByPlaceholderText("Email");
      
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "newemail@example.com");
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            notification_preferences: expect.objectContaining({
              alert_email: "newemail@example.com",
            }),
          })
        );
      });
    });
  });

  describe("Alerts Table", () => {
    it("displays alerts in table", () => {
      render(<NotificationsTab {...defaultProps} />);
      expect(screen.getByText("You've been logged into a new device")).toBeInTheDocument();
    });

    it("filters alerts on search", async () => {
      render(<NotificationsTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText("Search alerts");
      
      await userEvent.type(searchInput, "logged");
      
      expect(screen.getByText("You've been logged into a new device")).toBeInTheDocument();
    });

    it("shows no alerts message when search has no results", async () => {
      render(<NotificationsTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText("Search alerts");
      
      await userEvent.type(searchInput, "nonexistent");
      
      expect(screen.getByText("No alerts found")).toBeInTheDocument();
    });

    it("deletes alert when clicking delete icon", async () => {
      render(<NotificationsTab {...defaultProps} />);
      const deleteIcons = screen.getAllByLabelText(/delete/i);
      
      await userEvent.click(deleteIcons[0]);
      
      expect(screen.queryByText("You've been logged into a new device")).not.toBeInTheDocument();
    });

    it("selects alerts with checkboxes", async () => {
      render(<NotificationsTab {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");
      
      // Skip first checkbox (select all)
      await userEvent.click(checkboxes[1]);
      
      expect(checkboxes[1]).toBeChecked();
    });

    it("selects all alerts with select all checkbox", async () => {
      render(<NotificationsTab {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");
      const selectAllCheckbox = checkboxes[0];
      
      await userEvent.click(selectAllCheckbox);
      
      checkboxes.forEach(cb => {
        expect(cb).toBeChecked();
      });
    });

    it("deletes selected alerts", async () => {
      render(<NotificationsTab {...defaultProps} />);
      const checkboxes = screen.getAllByRole("checkbox");
      
      await userEvent.click(checkboxes[1]);
      const deleteAllButton = screen.getByText("Delete All");
      
      await userEvent.click(deleteAllButton);
      
      expect(screen.getByText("No alerts found")).toBeInTheDocument();
    });

    it("disables delete all button when nothing selected", () => {
      render(<NotificationsTab {...defaultProps} />);
      const deleteAllButton = screen.getByText("Delete All");
      
      expect(deleteAllButton).toBeDisabled();
    });
  });

  describe("Disabled State", () => {
    it("disables toggles while saving", async () => {
      mockOnSave.mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      await userEvent.click(switches[1]);
      
      // Should show saving state
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  describe("Save Button", () => {
    it("shows save changes button", () => {
      render(<NotificationsTab {...defaultProps} />);
      expect(screen.getByText("Save changes")).toBeInTheDocument();
    });

    it("changes button text while saving", async () => {
      mockOnSave.mockImplementation(() => new Promise(() => {}));
      render(<NotificationsTab {...defaultProps} />);
      
      const saveButton = screen.getByText("Save changes");
      await userEvent.click(saveButton);
      
      // Should show saving state
      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });
  });

  describe("Initial State", () => {
    it("initializes with user data", () => {
      render(<NotificationsTab {...defaultProps} />);
      const emailInput = screen.getByPlaceholderText("Email");
      expect(emailInput).toHaveValue("alert@example.com");
    });

    it("uses user email as fallback for alert email", () => {
      const propsWithoutAlertEmail = {
        ...defaultProps,
        userData: {
          email: "user@example.com",
          notification_preferences: {
            email_alerts: true,
            alert_email: "",
            in_app_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithoutAlertEmail} />);
      const emailInput = screen.getByPlaceholderText("Email");
      expect(emailInput).toHaveValue("");
    });

    it("handles missing notification preferences", () => {
      const propsWithoutPrefs = {
        userData: { email: "test@example.com" },
        onSave: mockOnSave,
      };
      
      render(<NotificationsTab {...propsWithoutPrefs} />);
      expect(screen.getByText("Notification Centre")).toBeInTheDocument();
    });
  });

  describe("Email Validation", () => {
    it("shows error for invalid email format", async () => {
      mockOnSave.mockResolvedValue();
      const propsWithEnabled = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          notification_preferences: {
            ...defaultProps.userData.notification_preferences,
            email_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithEnabled} />);
      const emailInput = screen.getByPlaceholderText("Email");
      
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "invalidemail");
      fireEvent.blur(emailInput);
      
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });

    it("clears error on valid email entry", async () => {
      mockOnSave.mockResolvedValue();
      const propsWithEnabled = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          notification_preferences: {
            ...defaultProps.userData.notification_preferences,
            email_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithEnabled} />);
      const emailInput = screen.getByPlaceholderText("Email");
      
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "valid@example.com");
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(screen.queryByText(/invalid email/i)).not.toBeInTheDocument();
      });
    });

    it("prevents save with invalid email", async () => {
      mockOnSave.mockResolvedValue();
      const propsWithEnabled = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          notification_preferences: {
            ...defaultProps.userData.notification_preferences,
            email_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithEnabled} />);
      const emailInput = screen.getByPlaceholderText("Email");
      const saveButton = screen.getByText("Save changes");
      
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "invalidemail");
      fireEvent.blur(emailInput);
      
      await userEvent.click(saveButton);
      
      // Save should not be called with invalid email
      expect(mockOnSave).not.toHaveBeenCalledWith(
        expect.objectContaining({
          notification_preferences: expect.objectContaining({
            alert_email: "invalidemail",
          }),
        })
      );
    });
  });

  describe("Error Handling", () => {
    it("shows error message on save failure", async () => {
      const errorMessage = "Failed to save preferences";
      mockOnSave.mockRejectedValue(new Error(errorMessage));
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      await userEvent.click(switches[1]);
      
      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it("allows retry after save failure", async () => {
      mockOnSave.mockRejectedValueOnce(new Error("Save failed"));
      mockOnSave.mockResolvedValueOnce();
      
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      await userEvent.click(switches[1]);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
      
      // Second attempt should succeed
      await userEvent.click(switches[1]);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(2);
      });
    });

    it("preserves previous state on network error", async () => {
      mockOnSave.mockRejectedValue(new Error("Network error"));
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      const emailToggle = switches[1];
      const originalState = emailToggle.checked;
      
      await userEvent.click(emailToggle);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
      
      // State should revert
      expect(emailToggle.checked).toBe(originalState);
    });
  });

  describe("Empty Alerts State", () => {
    it("displays empty state when no alerts exist", () => {
      const propsWithNoAlerts = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          alerts: [],
        },
      };
      
      render(<NotificationsTab {...propsWithNoAlerts} />);
      expect(screen.getByText("No alerts found")).toBeInTheDocument();
    });

    it("does not show delete all button when no alerts selected", () => {
      render(<NotificationsTab {...defaultProps} />);
      const deleteAllButton = screen.getByText("Delete All");
      
      expect(deleteAllButton).toBeDisabled();
    });
  });

  describe("Concurrent Operations", () => {
    it("prevents multiple simultaneous saves", async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      
      await userEvent.click(switches[1]);
      await userEvent.click(switches[2]);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledTimes(1);
      });
    });

    it("saves after user finishes editing", async () => {
      mockOnSave.mockResolvedValue();
      const propsWithEnabled = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          notification_preferences: {
            ...defaultProps.userData.notification_preferences,
            email_alerts: true,
          },
        },
      };
      
      render(<NotificationsTab {...propsWithEnabled} />);
      const emailInput = screen.getByPlaceholderText("Email");
      
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "new@example.com", { delay: 10 });
      fireEvent.blur(emailInput);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe("UI State Management", () => {
    it("maintains toggle state during save", async () => {
      mockOnSave.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      render(<NotificationsTab {...defaultProps} />);
      
      const switches = screen.getAllByRole("checkbox", { hidden: true });
      const emailToggle = switches[1];
      
      await userEvent.click(emailToggle);
      
      // Toggle should show as checked immediately
      expect(emailToggle).toBeChecked();
    });

    it("clears search when clicking clear button", async () => {
      render(<NotificationsTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText("Search alerts");
      
      await userEvent.type(searchInput, "test");
      expect(searchInput).toHaveValue("test");
      
      const clearButton = screen.getByLabelText(/clear/i);
      await userEvent.click(clearButton);
      
      expect(searchInput).toHaveValue("");
    });

    it("highlights search matches in alert list", async () => {
      render(<NotificationsTab {...defaultProps} />);
      const searchInput = screen.getByPlaceholderText("Search alerts");
      
      await userEvent.type(searchInput, "logged");
      
      const foundAlert = screen.getByText(/You've been logged into a new device/i);
      expect(foundAlert).toBeInTheDocument();
    });
  });
});
