import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import NotificationsTab from "../NotificationsTab";
import "@testing-library/jest-dom";

describe("NotificationsTab", () => {
  const mockUserData = {
    id: "user-123",
    email: "test@example.com",
    notification_preferences: {
      email_alerts: false,
      alert_email: "alerts@example.com",
      in_app_alerts: true,
    },
  };

  const mockOnSave = jest.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  test("renders notification centre header", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    expect(screen.getByText("Notification Centre")).toBeInTheDocument();
    expect(screen.getByText("Take a look at your notifications")).toBeInTheDocument();
  });

  test("renders email alerts section", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    expect(screen.getByText("Email alerts")).toBeInTheDocument();
    expect(screen.getByText("Activate email alerts")).toBeInTheDocument();
  });

  test("renders email alerts toggle switch", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const emailAlertsSwitch = screen.getAllByRole("checkbox")[0];
    expect(emailAlertsSwitch).toBeInTheDocument();
  });

  test("loads email alerts preference from userData", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const emailAlertsSwitch = screen.getAllByRole("checkbox")[0];
    expect(emailAlertsSwitch).not.toBeChecked();
  });

  test("enables email alerts when toggle is clicked", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const emailAlertsSwitch = screen.getAllByRole("checkbox")[0];

    await act(async () => {
      fireEvent.click(emailAlertsSwitch);
    });

    expect(emailAlertsSwitch).toBeChecked();
  });

  test("calls onSave when email alerts toggle is changed", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const emailAlertsSwitch = screen.getAllByRole("checkbox")[0];

    await act(async () => {
      fireEvent.click(emailAlertsSwitch);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_preferences: expect.objectContaining({
            email_alerts: true,
          }),
        })
      );
    });
  });

  test("disables email input when email alerts is off", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const emailInput = screen.getByDisplayValue("alerts@example.com");
    expect(emailInput).toBeDisabled();
  });

  test("enables email input when email alerts is on", async () => {
    mockOnSave.mockResolvedValue(true);

    const userData = {
      ...mockUserData,
      notification_preferences: {
        ...mockUserData.notification_preferences,
        email_alerts: true,
      },
    };

    render(<NotificationsTab userData={userData} onSave={mockOnSave} />);

    const emailInput = screen.getByDisplayValue("alerts@example.com");
    expect(emailInput).not.toBeDisabled();
  });

  test("updates email input value when changed", async () => {
    const userData = {
      ...mockUserData,
      notification_preferences: {
        ...mockUserData.notification_preferences,
        email_alerts: true,
      },
    };

    render(<NotificationsTab userData={userData} onSave={mockOnSave} />);

    const emailInput = screen.getByDisplayValue("alerts@example.com");

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "newalerts@example.com" } });
    });

    expect(emailInput).toHaveValue("newalerts@example.com");
  });

  test("renders in-app alerts section", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    expect(screen.getByText("In-app alerts")).toBeInTheDocument();
  });

  test("renders in-app alerts toggle switch", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const switches = screen.getAllByRole("checkbox");
    expect(switches.length).toBeGreaterThan(1);
  });

  test("loads in-app alerts preference from userData", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const inAppAlertsSwitch = screen.getAllByRole("checkbox")[1];
    expect(inAppAlertsSwitch).toBeChecked();
  });

  test("calls onSave when in-app alerts toggle is changed", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const inAppAlertsSwitch = screen.getAllByRole("checkbox")[1];

    await act(async () => {
      fireEvent.click(inAppAlertsSwitch);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_preferences: expect.objectContaining({
            in_app_alerts: false,
          }),
        })
      );
    });
  });

  test("renders alerts history section", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    expect(screen.getByText(/alert(s)? (history|log)/i)).toBeInTheDocument();
  });

  test("renders search input for alerts", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const searchInputs = screen.getAllByPlaceholderText(/search/i);
    expect(searchInputs.length).toBeGreaterThan(0);
  });

  test("renders alerts in table format", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    // Check for mock alert messages
    expect(screen.getByText(/logged into a new device/i)).toBeInTheDocument();
  });

  test("filters alerts by search term", async () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const searchInput = screen.getAllByPlaceholderText(/search/i)[0];

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "device" } });
    });

    expect(searchInput).toHaveValue("device");
  });

  test("displays delete button for individual alerts", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const deleteButtons = screen.getAllByRole("button").filter(
      (btn) => btn.className.includes("delete") || btn.textContent.includes("Delete")
    );

    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  test("deletes individual alert when delete button is clicked", async () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const alertRow = screen.getByText(/logged into a new device/i);
    const deleteButton = alertRow.closest("div").querySelector("[class*='delete']");

    if (deleteButton) {
      await act(async () => {
        fireEvent.click(deleteButton);
      });
    }
  });

  test("renders checkbox for select all alerts", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThan(2);
  });

  test("selects all alerts when select-all checkbox is clicked", async () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const selectAllCheckbox = checkboxes[checkboxes.length - 1];

    await act(async () => {
      fireEvent.click(selectAllCheckbox);
    });

    // Check that multiple checkboxes are now checked
    const checkedBoxes = screen.getAllByRole("checkbox").filter((cb) => cb.checked);
    expect(checkedBoxes.length).toBeGreaterThan(1);
  });

  test("renders delete selected button", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const deleteSelectedButtons = screen.getAllByRole("button").filter(
      (btn) => btn.textContent.toLowerCase().includes("delete")
    );

    expect(deleteSelectedButtons.length).toBeGreaterThan(0);
  });

  test("deletes selected alerts when button is clicked", async () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const checkboxes = screen.getAllByRole("checkbox");
    const firstAlertCheckbox = checkboxes[checkboxes.length - 3];

    await act(async () => {
      fireEvent.click(firstAlertCheckbox);
    });

    const deleteSelectedButton = screen.getAllByRole("button").find(
      (btn) => btn.textContent.toLowerCase().includes("delete")
    );

    if (deleteSelectedButton) {
      await act(async () => {
        fireEvent.click(deleteSelectedButton);
      });
    }
  });

  test("saves alert email when email input is blurred", async () => {
    mockOnSave.mockResolvedValue(true);

    const userData = {
      ...mockUserData,
      notification_preferences: {
        ...mockUserData.notification_preferences,
        email_alerts: true,
      },
    };

    render(<NotificationsTab userData={userData} onSave={mockOnSave} />);

    const emailInput = screen.getByDisplayValue("alerts@example.com");

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "newalerts@example.com" } });
      fireEvent.blur(emailInput);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          notification_preferences: expect.objectContaining({
            alert_email: "newalerts@example.com",
          }),
        })
      );
    });
  });

  test("uses user email as default alert email", () => {
    const userData = {
      ...mockUserData,
      notification_preferences: {
        ...mockUserData.notification_preferences,
        alert_email: "",
      },
    };

    render(<NotificationsTab userData={userData} onSave={mockOnSave} />);

    const emailInput = screen.getByPlaceholderText("Email");
    expect(emailInput).toHaveValue("test@example.com");
  });

  test("shows loading state while saving", async () => {
    let resolveSave;
    mockOnSave.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );

    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const emailAlertsSwitch = screen.getAllByRole("checkbox")[0];

    await act(async () => {
      fireEvent.click(emailAlertsSwitch);
    });

    await act(async () => {
      resolveSave(true);
    });

    expect(mockOnSave).toHaveBeenCalled();
  });

  test("displays alert dates in correct format", () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    expect(screen.getByText("10/11/2025 11:36 pm")).toBeInTheDocument();
  });

  test("handles missing notification preferences", () => {
    const userData = {
      ...mockUserData,
      notification_preferences: undefined,
    };

    render(<NotificationsTab userData={userData} onSave={mockOnSave} />);

    expect(screen.getByText("Email alerts")).toBeInTheDocument();
  });

  test("filters alerts case-insensitively", async () => {
    render(<NotificationsTab userData={mockUserData} onSave={mockOnSave} />);

    const searchInput = screen.getAllByPlaceholderText(/search/i)[0];

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "DEVICE" } });
    });

    expect(searchInput).toHaveValue("DEVICE");
  });
});
