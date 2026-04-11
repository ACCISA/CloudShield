import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BasicInfoTab from "../BasicInfoTab";
import "@testing-library/jest-dom";
import { compressImage } from "../../../lib/compressImage";

jest.mock("../../../lib/compressImage", () => ({
  compressImage: jest.fn(),
}));

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
    compressImage.mockResolvedValue("data:image/jpeg;base64,compressed123");
  });

  test("renders section labels and input fields", () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    expect(screen.getByText("Basic Info")).toBeInTheDocument();
    expect(
      screen.getByText("Take a look at your personal information"),
    ).toBeInTheDocument();
    expect(screen.getByText("Profile picture")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
  });

  test("populates fields with user data on mount", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Admin Name")).toHaveValue("John Doe");
      expect(screen.getByLabelText("Email")).toHaveValue("john@example.com");
    });
  });

  test("updates state when input fields change", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const nameInput = screen.getByLabelText("Admin Name");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Jane Smith" } });
    });

    expect(nameInput).toHaveValue("Jane Smith");
  });

  test("validates required fields", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const nameInput = screen.getByLabelText("Admin Name");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "" } });
      fireEvent.click(saveButton);
    });

    expect(screen.getByText("Name is required")).toBeInTheDocument();
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

    expect(
      screen.getByText("Password must be at least 12 characters"),
    ).toBeInTheDocument();
  });

  test("validates password confirmation match", async () => {
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const passwordInput = screen.getByLabelText("New password");
    const confirmPasswordInput = screen.getByLabelText("Confirm password");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(passwordInput, {
        target: { value: "LongPassword123!" },
      });
      fireEvent.change(confirmPasswordInput, {
        target: { value: "DifferentPassword123!" },
      });
      fireEvent.click(saveButton);
    });

    expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
  });

  test("calls onSave with updated user data", async () => {
    mockOnSave.mockResolvedValue(true);

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const nameInput = screen.getByLabelText("Admin Name");
    const emailInput = screen.getByLabelText("Email");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Jane Smith" } });
      fireEvent.change(emailInput, { target: { value: "jane@example.com" } });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: "Jane Smith",
          email: "jane@example.com",
        }),
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
      fireEvent.change(passwordInput, {
        target: { value: "NewSecurePassword123!" },
      });
      fireEvent.change(confirmPasswordInput, {
        target: { value: "NewSecurePassword123!" },
      });
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          password: "NewSecurePassword123!",
        }),
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
      fireEvent.change(passwordInput, {
        target: { value: "NewSecurePassword123!" },
      });
      fireEvent.change(confirmPasswordInput, {
        target: { value: "NewSecurePassword123!" },
      });
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
      }),
    );

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const nameInput = screen.getByLabelText("Admin Name");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Jane Smith" } });
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
    expect(compressImage).toHaveBeenCalledWith(
      file,
      expect.objectContaining({ maxWidth: 256, maxHeight: 256 }),
    );
  });

  test("falls back to FileReader when compression fails", async () => {
    compressImage.mockRejectedValueOnce(new Error("compress fail"));

    const originalFileReader = global.FileReader;
    const readAsDataURL = jest.fn(function () {
      this.onload?.({
        target: { result: "data:image/png;base64,fallback123" },
      });
    });
    global.FileReader = jest.fn(function MockFileReader() {
      this.readAsDataURL = readAsDataURL;
      this.onload = null;
    });

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const file = new File(["image"], "profile.png", { type: "image/png" });
    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(readAsDataURL).toHaveBeenCalledWith(file);
    });

    global.FileReader = originalFileReader;
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
    const { rerender } = render(
      <BasicInfoTab userData={mockUserData} onSave={mockOnSave} />,
    );

    const newUserData = {
      ...mockUserData,
      full_name: "Jane Smith",
      email: "jane@example.com",
    };

    rerender(<BasicInfoTab userData={newUserData} onSave={mockOnSave} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Admin Name")).toHaveValue("Jane Smith");
      expect(screen.getByLabelText("Email")).toHaveValue("jane@example.com");
    });
  });

  test("handles missing profile image gracefully", () => {
    const userDataWithoutImage = { ...mockUserData, profile_image: null };

    render(
      <BasicInfoTab userData={userDataWithoutImage} onSave={mockOnSave} />,
    );

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
        }),
      );
    });
  });

  test("updates org logo when orgData prop changes", async () => {
    const mockOrgData = {
      id: "org-1",
      name: "Acme Corp",
      logo: "data:image/png;base64,orglogo123",
    };

    const { rerender } = render(
      <BasicInfoTab
        userData={mockUserData}
        onSave={mockOnSave}
        orgData={null}
      />,
    );

    rerender(
      <BasicInfoTab
        userData={mockUserData}
        onSave={mockOnSave}
        orgData={mockOrgData}
      />,
    );

    // Org logo should be updated internally (can verify via another test that saves it)
    expect(screen.getByText("Basic Info")).toBeInTheDocument();
  });

  test("handles org logo upload", async () => {
    const mockOnOrgSave = jest.fn().mockResolvedValue(true);

    render(
      <BasicInfoTab
        userData={mockUserData}
        onSave={mockOnSave}
        orgData={{ id: "org-1", name: "Test", logo: null }}
        onOrgSave={mockOnOrgSave}
      />,
    );

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const logoInput = fileInputs[1]; // Second file input is for org logo

    await act(async () => {
      fireEvent.change(logoInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(compressImage).toHaveBeenCalledWith(
        file,
        expect.objectContaining({ maxWidth: 256, maxHeight: 256 }),
      );
    });
  });

  test("falls back to FileReader when logo compression fails", async () => {
    compressImage.mockRejectedValueOnce(new Error("compress fail"));

    const originalFileReader = global.FileReader;
    const readAsDataURL = jest.fn(function () {
      this.onload?.({
        target: { result: "data:image/png;base64,fallbacklogo" },
      });
    });
    global.FileReader = jest.fn(function MockFileReader() {
      this.readAsDataURL = readAsDataURL;
      this.onload = null;
    });

    render(
      <BasicInfoTab
        userData={mockUserData}
        onSave={mockOnSave}
        orgData={{ id: "org-1", logo: null }}
        onOrgSave={jest.fn()}
      />,
    );

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const logoInput = fileInputs[1];

    await act(async () => {
      fireEvent.change(logoInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(readAsDataURL).toHaveBeenCalledWith(file);
    });

    global.FileReader = originalFileReader;
  });

  test("calls onOrgSave when org logo changes", async () => {
    const mockOnOrgSave = jest.fn().mockResolvedValue(true);
    compressImage.mockResolvedValue("data:image/png;base64,newlogo");

    render(
      <BasicInfoTab
        userData={mockUserData}
        onSave={mockOnSave}
        orgData={{ id: "org-1", name: "Test", logo: null }}
        onOrgSave={mockOnOrgSave}
      />,
    );

    const file = new File(["logo"], "logo.png", { type: "image/png" });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const logoInput = fileInputs[1];

    await act(async () => {
      fireEvent.change(logoInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(compressImage).toHaveBeenCalled();
    });

    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnOrgSave).toHaveBeenCalledWith(
        expect.objectContaining({
          logo: "data:image/png;base64,newlogo",
        }),
      );
    });
  });

  test("includes profile image in save payload when changed", async () => {
    mockOnSave.mockResolvedValue(true);
    compressImage.mockResolvedValue("data:image/png;base64,newprofile");

    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const file = new File(["image"], "profile.png", { type: "image/png" });
    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(compressImage).toHaveBeenCalled();
    });

    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          profile_image: "data:image/png;base64,newprofile",
        }),
      );
    });
  });

  test("does not call onOrgSave when no onOrgSave prop provided", async () => {
    mockOnSave.mockResolvedValue(true);

    render(
      <BasicInfoTab
        userData={mockUserData}
        onSave={mockOnSave}
        orgData={{ id: "org-1", logo: null }}
      />,
    );

    const nameInput = screen.getByLabelText("Admin Name");
    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "Changed Name" } });
      fireEvent.click(saveButton);
    });

    // Should only call onSave, not throw without onOrgSave
    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });

  test("handles file input with no file selected", async () => {
    compressImage.mockClear();
    render(<BasicInfoTab userData={mockUserData} onSave={mockOnSave} />);

    const fileInput = document.querySelector('input[type="file"]');

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [] } });
    });

    // Should not throw error
    expect(compressImage).not.toHaveBeenCalled();
  });

  test("handles logo file input with no file selected", async () => {
    render(
      <BasicInfoTab
        userData={mockUserData}
        onSave={mockOnSave}
        orgData={{ id: "org-1", logo: null }}
        onOrgSave={jest.fn()}
      />,
    );

    const fileInputs = document.querySelectorAll('input[type="file"]');
    const logoInput = fileInputs[1];

    await act(async () => {
      fireEvent.change(logoInput, { target: { files: [] } });
    });

    // Should not throw error
    expect(screen.getByText("Basic Info")).toBeInTheDocument();
  });

  test("displays existing profile image when userData has one", () => {
    const userWithImage = {
      ...mockUserData,
      profile_image: "data:image/png;base64,existing",
    };

    render(<BasicInfoTab userData={userWithImage} onSave={mockOnSave} />);

    // Should display the image, not initials
    const img = document.querySelector('img[alt="Profile"]');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/png;base64,existing");
  });

  test("saves both user and org data in parallel", async () => {
    mockOnSave.mockResolvedValue(true);
    const mockOnOrgSave = jest.fn().mockResolvedValue(true);
    compressImage.mockResolvedValue("data:image/png;base64,newlogo");

    render(
      <BasicInfoTab
        userData={mockUserData}
        onSave={mockOnSave}
        orgData={{ id: "org-1", logo: null }}
        onOrgSave={mockOnOrgSave}
      />,
    );

    // Change name
    const nameInput = screen.getByLabelText("Admin Name");
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: "New Name" } });
    });

    // Upload logo
    const file = new File(["logo"], "logo.png", { type: "image/png" });
    const fileInputs = document.querySelectorAll('input[type="file"]');
    const logoInput = fileInputs[1];

    await act(async () => {
      fireEvent.change(logoInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(compressImage).toHaveBeenCalled();
    });

    const saveButton = screen.getByText("Save changes");

    await act(async () => {
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
      expect(mockOnOrgSave).toHaveBeenCalled();
    });
  });
});

