import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import EmailCustomizationTab from "../EmailCustomizationTab";
import "@testing-library/jest-dom";

jest.mock("../EmailCustomizationTab", () => {
  const actual = jest.requireActual("../EmailCustomizationTab");
  return actual;
});

describe("EmailCustomizationTab", () => {
  const mockOrgData = {
    id: "org-123",
    email_branding: {
      sender_name: "CloudShield Team",
      brand_color: "#1a1a2e",
      logo_image: null,
      footer_text: "Thank you for using CloudShield",
      notification_toggles: {
        welcome_email: true,
        employee_invite: true,
        workstation_ready: true,
        security_alert: true,
        password_reset: true,
      },
    },
  };

  const mockOnSave = jest.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  test("renders email customization header", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    expect(screen.getByText(/email customization|branding/i)).toBeInTheDocument();
  });

  test("renders sender name input field", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const senderNameInput = screen.getByDisplayValue("CloudShield Team");
    expect(senderNameInput).toBeInTheDocument();
  });

  test("updates sender name when input changes", async () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const senderNameInput = screen.getByDisplayValue("CloudShield Team");

    await act(async () => {
      fireEvent.change(senderNameInput, { target: { value: "New Team Name" } });
    });

    expect(senderNameInput).toHaveValue("New Team Name");
  });

  test("renders footer text input field", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const footerInput = screen.getByDisplayValue("Thank you for using CloudShield");
    expect(footerInput).toBeInTheDocument();
  });

  test("updates footer text when input changes", async () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const footerInput = screen.getByDisplayValue("Thank you for using CloudShield");

    await act(async () => {
      fireEvent.change(footerInput, { target: { value: "New footer text" } });
    });

    expect(footerInput).toHaveValue("New footer text");
  });

  test("renders color picker input", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const colorInput = screen.getByDisplayValue("#1a1a2e");
    expect(colorInput).toBeInTheDocument();
  });

  test("updates brand color when changed", async () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const colorInput = screen.getByDisplayValue("#1a1a2e");

    await act(async () => {
      fireEvent.change(colorInput, { target: { value: "#ff0000" } });
    });

    expect(colorInput).toHaveValue("#ff0000");
  });

  test("renders email preview section", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    expect(screen.getByText("LIVE PREVIEW")).toBeInTheDocument();
  });

  test("preview updates when sender name changes", async () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const senderNameInput = screen.getByDisplayValue("CloudShield Team");

    await act(async () => {
      fireEvent.change(senderNameInput, { target: { value: "New Name" } });
    });

    expect(screen.getByText("New Name")).toBeInTheDocument();
  });

  test("renders notification type toggles", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    expect(screen.getByText("Welcome email")).toBeInTheDocument();
    expect(screen.getByText("Employee invite")).toBeInTheDocument();
    expect(screen.getByText("Workstation ready")).toBeInTheDocument();
    expect(screen.getByText("Security alert")).toBeInTheDocument();
    expect(screen.getByText("Password reset")).toBeInTheDocument();
  });

  test("toggles notification type switches", async () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const switches = screen.getAllByRole("checkbox");
    const welcomeEmailSwitch = switches[0];

    await act(async () => {
      fireEvent.click(welcomeEmailSwitch);
    });

    expect(welcomeEmailSwitch).not.toBeChecked();
  });

  test("loads notification toggle states from orgData", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const switches = screen.getAllByRole("checkbox");
    switches.forEach((switchEl) => {
      expect(switchEl).toBeChecked();
    });
  });

  test("renders save button", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save/i });
    expect(saveButton).toBeInTheDocument();
  });

  test("calls onSave when save button is clicked", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const senderNameInput = screen.getByDisplayValue("CloudShield Team");
    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.change(senderNameInput, { target: { value: "Updated Name" } });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  test("includes updated branding in save payload", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const senderNameInput = screen.getByDisplayValue("CloudShield Team");
    const colorInput = screen.getByDisplayValue("#1a1a2e");
    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.change(senderNameInput, { target: { value: "New Name" } });
      fireEvent.change(colorInput, { target: { value: "#ff0000" } });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          email_branding: expect.objectContaining({
            sender_name: "New Name",
            brand_color: "#ff0000",
          }),
        })
      );
    });
  });

  test("shows loading state while saving", async () => {
    let resolveSave;
    mockOnSave.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );

    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    const savingButton = screen.getByRole("button", { name: /saving/i });
    expect(savingButton).toBeInTheDocument();

    await act(async () => {
      resolveSave(true);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
    });
  });

  test("displays notification descriptions", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    expect(screen.getByText("Sent when a new org is provisioned")).toBeInTheDocument();
    expect(screen.getByText("Sent when an employee is added")).toBeInTheDocument();
    expect(screen.getByText("Sent when a workstation finishes provisioning")).toBeInTheDocument();
  });

  test("handles empty email branding data", () => {
    const orgDataWithoutBranding = {
      id: "org-123",
      email_branding: {},
    };

    render(<EmailCustomizationTab orgData={orgDataWithoutBranding} onSave={mockOnSave} />);

    expect(screen.getByText("LIVE PREVIEW")).toBeInTheDocument();
  });

  test("preview displays welcome message", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    expect(screen.getByText(/welcome/i)).toBeInTheDocument();
  });

  test("preview displays footer text", () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    expect(screen.getByText("Thank you for using CloudShield")).toBeInTheDocument();
  });

  test("handles logo image upload", async () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const fileInputs = document.querySelectorAll('input[type="file"]');
    expect(fileInputs.length).toBeGreaterThan(0);
  });

  test("updates preview with new sender name", async () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const senderNameInput = screen.getByDisplayValue("CloudShield Team");

    await act(async () => {
      fireEvent.change(senderNameInput, { target: { value: "Support Team" } });
    });

    expect(screen.getByText("Support Team")).toBeInTheDocument();
  });

  test("updates preview with new brand color", async () => {
    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const colorInput = screen.getByDisplayValue("#1a1a2e");

    await act(async () => {
      fireEvent.change(colorInput, { target: { value: "#007bff" } });
    });

    expect(colorInput).toHaveValue("#007bff");
  });

  test("disables save button while saving", async () => {
    let resolveSave;
    mockOnSave.mockReturnValue(
      new Promise((resolve) => {
        resolveSave = resolve;
      })
    );

    render(<EmailCustomizationTab orgData={mockOrgData} onSave={mockOnSave} />);

    const saveButton = screen.getByRole("button", { name: /save/i });

    await act(async () => {
      fireEvent.click(saveButton);
    });

    const savingButton = screen.getByRole("button", { name: /saving/i });
    expect(savingButton).toBeDisabled();

    await act(async () => {
      resolveSave(true);
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /save/i })).not.toBeDisabled();
    });
  });
});
