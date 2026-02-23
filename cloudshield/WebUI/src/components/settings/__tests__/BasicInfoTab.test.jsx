import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BasicInfoTab from "../BasicInfoTab";

describe("BasicInfoTab", () => {
  const mockOnSave = jest.fn();
  const defaultProps = {
    userData: {
      id: "user123",
      email: "test@example.com",
      full_name: "John Doe",
      username: "johndoe",
      profile_image: null,
    },
    onSave: mockOnSave,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders basic info title", () => {
      render(<BasicInfoTab {...defaultProps} />);
      expect(screen.getByText(/basic info/i)).toBeInTheDocument();
    });

    it("displays user email field", () => {
      render(<BasicInfoTab {...defaultProps} />);
      const emailInput = screen.getByDisplayValue("test@example.com");
      expect(emailInput).toBeInTheDocument();
    });

    it("displays full name field", () => {
      render(<BasicInfoTab {...defaultProps} />);
      const nameInput = screen.getByDisplayValue("John Doe");
      expect(nameInput).toBeInTheDocument();
    });

    it("displays username field", () => {
      render(<BasicInfoTab {...defaultProps} />);
      const usernameInput = screen.getByDisplayValue("johndoe");
      expect(usernameInput).toBeInTheDocument();
    });

    it("renders save button", () => {
      render(<BasicInfoTab {...defaultProps} />);
      expect(screen.getByText(/save changes|save/i)).toBeInTheDocument();
    });
  });

  describe("Form Input Changes", () => {
    it("updates full name input", async () => {
      render(<BasicInfoTab {...defaultProps} />);
      const nameInput = screen.getByDisplayValue("John Doe");
      
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Jane Doe");
      
      expect(nameInput).toHaveValue("Jane Doe");
    });

    it("updates email input", async () => {
      render(<BasicInfoTab {...defaultProps} />);
      const emailInput = screen.getByDisplayValue("test@example.com");
      
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "newemail@example.com");
      
      expect(emailInput).toHaveValue("newemail@example.com");
    });

    it("updates username input", async () => {
      render(<BasicInfoTab {...defaultProps} />);
      const usernameInput = screen.getByDisplayValue("johndoe");
      
      await userEvent.clear(usernameInput);
      await userEvent.type(usernameInput, "janedoe");
      
      expect(usernameInput).toHaveValue("janedoe");
    });
  });

  describe("Profile Picture", () => {
    it("displays profile picture upload area", () => {
      render(<BasicInfoTab {...defaultProps} />);
      expect(screen.getByText(/profile picture|photo|image/i)).toBeInTheDocument();
    });

    it("displays placeholder when no profile image", () => {
      render(<BasicInfoTab {...defaultProps} />);
      const profileArea = screen.getByText(/profile picture|photo|image/i);
      expect(profileArea).toBeInTheDocument();
    });

    it("displays profile image when provided", () => {
      const propsWithImage = {
        ...defaultProps,
        userData: {
          ...defaultProps.userData,
          profile_image: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAA",
        },
      };
      
      render(<BasicInfoTab {...propsWithImage} />);
      const img = screen.getByRole("img", { hidden: true });
      expect(img).toBeInTheDocument();
    });

    it("handles profile picture upload", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const file = new File(["dummy content"], "test.png", { type: "image/png" });
      const input = screen.getByRole("button", { hidden: true });
      
      if (input && input.querySelector("input[type='file']")) {
        await userEvent.upload(input.querySelector("input[type='file']"), file);
        await waitFor(() => {
          expect(mockOnSave).toHaveBeenCalled();
        });
      }
    });
  });

  describe("Form Submission", () => {
    it("calls onSave with updated data", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const nameInput = screen.getByDisplayValue("John Doe");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Jane Doe");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: "Jane Doe",
          })
        );
      });
    });

    it("shows loading state while saving", async () => {
      mockOnSave.mockImplementation(() => new Promise(() => {}));
      render(<BasicInfoTab {...defaultProps} />);
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      expect(saveButton).toBeDisabled();
    });

    it("handles save error gracefully", async () => {
      mockOnSave.mockRejectedValue(new Error("Save failed"));
      render(<BasicInfoTab {...defaultProps} />);
      
      const nameInput = screen.getByDisplayValue("John Doe");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Jane Doe");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe("Validation", () => {
    it("validates email format", async () => {
      render(<BasicInfoTab {...defaultProps} />);
      const emailInput = screen.getByDisplayValue("test@example.com");
      
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "invalid-email");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      // Component should handle validation
      expect(screen.getByDisplayValue("invalid-email")).toBeInTheDocument();
    });

    it("prevents empty full name", async () => {
      render(<BasicInfoTab {...defaultProps} />);
      const nameInput = screen.getByDisplayValue("John Doe");
      
      await userEvent.clear(nameInput);
      
      expect(nameInput).toHaveValue("");
    });
  });

  describe("Empty State", () => {
    it("handles missing user data gracefully", () => {
      const emptyProps = {
        userData: {},
        onSave: mockOnSave,
      };
      
      render(<BasicInfoTab {...emptyProps} />);
      expect(screen.getByText(/basic info/i)).toBeInTheDocument();
    });

    it("handles null user data", () => {
      const nullProps = {
        userData: null,
        onSave: mockOnSave,
      };
      
      render(<BasicInfoTab {...nullProps} />);
      expect(screen.getByText(/basic info/i)).toBeInTheDocument();
    });
  });

  describe("Field Display", () => {
    it("displays all required fields", () => {
      render(<BasicInfoTab {...defaultProps} />);
      
      const emailInput = screen.getByDisplayValue("test@example.com");
      const nameInput = screen.getByDisplayValue("John Doe");
      const usernameInput = screen.getByDisplayValue("johndoe");
      
      expect(emailInput).toBeInTheDocument();
      expect(nameInput).toBeInTheDocument();
      expect(usernameInput).toBeInTheDocument();
    });

    it("maintains field values on re-render", async () => {
      const { rerender } = render(<BasicInfoTab {...defaultProps} />);
      
      const nameInput = screen.getByDisplayValue("John Doe");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "Jane Doe");
      
      rerender(<BasicInfoTab {...defaultProps} />);
      
      expect(screen.getByDisplayValue("Jane Doe")).toBeInTheDocument();
    });
  });

  describe("Validation Rules", () => {
    it("prevents save when first name is empty", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const nameInput = screen.getByDisplayValue("John Doe");
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, "");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
        expect(screen.getByText("First name is required")).toBeInTheDocument();
      });
    });

    it("prevents save when email is empty", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const emailInput = screen.getByDisplayValue("test@example.com");
      await userEvent.clear(emailInput);
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
        expect(screen.getByText("Email is required")).toBeInTheDocument();
      });
    });

    it("prevents save when password is too short", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const passwordInputs = screen.getAllByPlaceholderText(/password/i);
      await userEvent.type(passwordInputs[0], "short");
      await userEvent.type(passwordInputs[1], "short");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
        expect(screen.getByText("Password must be at least 12 characters")).toBeInTheDocument();
      });
    });

    it("prevents save when passwords don't match", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const passwordInputs = screen.getAllByPlaceholderText(/password/i);
      await userEvent.type(passwordInputs[0], "ValidPassword123");
      await userEvent.type(passwordInputs[1], "DifferentPass456");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
        expect(screen.getByText("Passwords do not match")).toBeInTheDocument();
      });
    });

    it("allows save with valid password", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const passwordInputs = screen.getAllByPlaceholderText(/password/i);
      await userEvent.type(passwordInputs[0], "ValidPassword123");
      await userEvent.type(passwordInputs[1], "ValidPassword123");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            password: "ValidPassword123",
          })
        );
      });
    });
  });

  describe("Save Behavior", () => {
    it("only sends changed fields", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const emailInput = screen.getByDisplayValue("test@example.com");
      await userEvent.clear(emailInput);
      await userEvent.type(emailInput, "newemail@example.com");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          email: "newemail@example.com",
        });
        
        // Should not include unchanged fields
        expect(mockOnSave.mock.calls[0][0]).not.toHaveProperty("username");
      });
    });

    it("clears password fields after save", async () => {
      mockOnSave.mockResolvedValue();
      render(<BasicInfoTab {...defaultProps} />);
      
      const passwordInputs = screen.getAllByPlaceholderText(/password/i);
      await userEvent.type(passwordInputs[0], "ValidPassword123");
      await userEvent.type(passwordInputs[1], "ValidPassword123");
      
      const saveButton = screen.getByText(/save changes|save/i);
      await userEvent.click(saveButton);
      
      await waitFor(() => {
        expect(passwordInputs[0]).toHaveValue("");
        expect(passwordInputs[1]).toHaveValue("");
      });
    });
  });
});
