import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BasicInfoTab from "../BasicInfoTab";
import "@testing-library/jest-dom";

describe("BasicInfoTab", () => {
  const mockUserData = {
    id: "user-123",
    full_name: "John Doe",
    email: "john@example.com",
    profile_image: null,
  };

  const mockOnSave = jest.fn();

  beforeEach(() => {
    mockOnSave.mockClear();
  });

  test("renders section labels and input fields", () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    expect(screen.getByText("Basic Info")).toBeInTheDocument();
    expect(screen.getByText("Take a look at your personal information")).toBeInTheDocument();
    expect(screen.getByText("Profile picture")).toBeInTheDocument();
    expect(screen.getByLabelText("First Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  test("populates fields with user data on mount", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    await waitFor(() => {
      expect(screen.getByLabelText("First Name")).toHaveValue("John");
      expect(screen.getByLabelText("Last Name")).toHaveValue("Doe");
      expect(screen.getByLabelText("Email")).toHaveValue("john@example.com");
    });
  });

  test("updates state when input fields change", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const firstNameInput = screen.getByLabelText("First Name");
    const lastNameInput = screen.getByLabelText("Last Name");

    await act(async () => {
      fireEvent.change(firstNameInput, { target: { value: "Jane" } });
      fireEvent.change(lastNameInput, { target: { value: "Smith" } });
    });

    expect(firstNameInput).toHaveValue("Jane");
    expect(lastNameInput).toHaveValue("Smith");
  });

  test("validates required fields", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const firstNameInput = screen.getByLabelText("First Name");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(firstNameInput, { target: { value: "" } });
      fireEvent.click(saveButton);
    });

    expect(screen.getByText("First name is required")).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  test("validates email field", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const emailInput = screen.getByLabelText("Email");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "" } });
      fireEvent.click(saveButton);
    });

    expect(screen.getByText("Email is required")).toBeInTheDocument();
  });

  test("validates password length", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const passwordInput = screen.getByLabelText("New password");
    const confirmPasswordInput = screen.getByLabelText("Confirm password");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "Short1!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "Short1!" } });
      fireEvent.click(saveButton);
    });

    expect(screen.getByText("Password must be at least 12 characters")).toBeInTheDocument();
  });

  test("validates password confirmation match", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const passwordInput = screen.getByLabelText("New password");
    const confirmPasswordInput = screen.getByLabelText("Confirm password");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "LongPassword123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "DifferentPassword123!" } });
      fireEvent.click(saveButton);
    });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("calls onSave with updated user data", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const firstNameInput = screen.getByLabelText("First Name");
    const lastNameInput = screen.getByLabelText("Last Name");
    const emailInput = screen.getByLabelText("Email");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(firstNameInput, { target: { value: "Jane" } });
      fireEvent.change(lastNameInput, { target: { value: "Smith" } });
      fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Jane Smith",
          email: "jane@example.com",
        })
      );
    });
  });

  test("includes password in payload when provided", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const passwordInput = screen.getByLabelText("New password");
    const confirmPasswordInput = screen.getByLabelText("Confirm password");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "NewSecurePassword123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "NewSecurePassword123!" } });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "NewSecurePassword123!",
        })
      );
    });
  });

  test("clears password fields after successful save", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const passwordInput = screen.getByLabelText("New password");
    const confirmPasswordInput = screen.getByLabelText("Confirm password");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(passwordInput, { target: { value: "NewSecurePassword123!" } });
      fireEvent.change(confirmPasswordInput, { target: { value: "NewSecurePassword123!" } });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(passwordInput).toHaveValue("");
      expect(confirmPasswordInput).toHaveValue("");
    });
  });

  test("shows loading state while saving", async () => {
    let resolveOnSave;
    mockOnSave.mockReturnValue(
      new Promise((resolve) => {
        resolveOnSave = resolve;
      })
    );

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const firstNameInput = screen.getByLabelText("First Name");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(firstNameInput, { target: { value: "Jane" } });
      fireEvent.click(saveButton);
    });

    expect(screen.getByText("Saving...")).toBeInTheDocument();

    await act(async () => {
      resolveOnSave(true);
    });

    await waitFor(() => {
      expect(screen.getByText("Save changes")).toBeInTheDocument();
    });
  });

  test("handles profile image upload", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const file = new File(["image"], "profile.png", { type: "image/png" });
    // Get the hidden file input
    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    // Avatar should display initials initially, image will be set after FileReader completes
    await waitFor(() => {
      expect(fileInput).toHaveAttribute("accept", "image/*");
    });
  });

  test("displays profile avatar with user initials", () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const avatar = screen.getByText("J");
    expect(avatar).toBeInTheDocument();
  });

  test("does not send unchanged fields in save payload", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).not.toHaveBeenCalled();
    });
  });

  test("updates fields when userData prop changes", async () => {
    const { rerender } = render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const newUserData = {
      ...mockUserData,
      full_name: "Jane Smith",
      email: "jane@example.com",
    };

    rerender(<BasicInfoTab userData={newUserData} onSave={mockOnSave} />);

    await waitFor(() => {
      expect(screen.getByLabelText("First Name")).toHaveValue("Jane");
      expect(screen.getByLabelText("Last Name")).toHaveValue("Smith");
      expect(screen.getByLabelText("Email")).toHaveValue("jane@example.com");
    });
  });

  test("handles missing profile image gracefully", () => {
    const userDataWithoutImage = { ...mockUserData, profile_image: null };

    render(<BasicInfoTab userData={userDataWithoutImage} onSave={mockOnSave} />);

    expect(screen.getByText("J")).toBeInTheDocument();
  });

  test("normalizes email to lowercase", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const emailInput = screen.getByLabelText("Email");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(emailInput, { target: { value: "JANE@EXAMPLE.COM" } });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "jane@example.com",
        })
      );
    });
  });
});
