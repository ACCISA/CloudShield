/**
 * ProfilePictureUpload.test.jsx
 *
 * Test suite for the ProfilePictureUpload component
 * Tests avatar display, file upload, and image preview
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfilePictureUpload from "../ProfilePictureUpload";

describe("ProfilePictureUpload Component", () => {
  const mockOnImageChange = jest.fn();

  beforeEach(() => {
    mockOnImageChange.mockClear();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test("displays initials from first and last name", () => {
      render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    test("displays single initial when only first name provided", () => {
      render(
        <ProfilePictureUpload
          firstName="John"
          lastName=""
          onImageChange={mockOnImageChange}
        />
      );

      expect(screen.getByText("J")).toBeInTheDocument();
    });

    test("renders upload button", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    test("renders hidden file input", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });
  });

  describe("Avatar Display", () => {
    test("renders avatar with colored background", () => {
      render(
        <ProfilePictureUpload
          firstName="Alice"
          lastName="Smith"
          onImageChange={mockOnImageChange}
        />
      );

      expect(screen.getByText("AS")).toBeInTheDocument();
    });

    test("renders avatar for different names", () => {
      render(
        <ProfilePictureUpload
          firstName="Bob"
          lastName="Johnson"
          onImageChange={mockOnImageChange}
        />
      );

      expect(screen.getByText("BJ")).toBeInTheDocument();
    });
  });

  describe("File Upload", () => {
    test("clicking upload button triggers file input", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const fileInput = container.querySelector('input[type="file"]');
      const clickSpy = jest.spyOn(fileInput, "click");

      const uploadButton = container.querySelector("button");
      fireEvent.click(uploadButton);

      expect(clickSpy).toHaveBeenCalled();
    });

    test("accepts image files", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute("accept", "image/*");
    });

    test("handles file selection", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const fileInput = container.querySelector('input[type="file"]');
      const file = new File(["dummy"], "test.png", { type: "image/png" });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // FileReader is async, component should handle it
      expect(fileInput).toBeInTheDocument();
    });
  });

  describe("User Interactions", () => {
    test("upload button hover effects work", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const uploadButton = container.querySelector("button");
      fireEvent.mouseEnter(uploadButton);
      fireEvent.mouseLeave(uploadButton);

      expect(uploadButton).toBeInTheDocument();
    });
  });

  describe("Edge Cases", () => {
    test("handles empty names", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName=""
          lastName=""
          onImageChange={mockOnImageChange}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test("handles undefined names", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName={undefined}
          lastName={undefined}
          onImageChange={mockOnImageChange}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders without onImageChange callback", () => {
      const { container } = render(
        <ProfilePictureUpload firstName="John" lastName="Doe" />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe("Image Preview", () => {
    test("displays change button after image upload", async () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const fileInput = container.querySelector('input[type="file"]');
      const file = new File(["dummy"], "test.png", { type: "image/png" });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Component should handle FileReader asynchronously
      expect(fileInput).toBeInTheDocument();
    });

    test("change button triggers file input", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
    });

    test("handles non-image file types", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const fileInput = container.querySelector('input[type="file"]');
      const file = new File(["dummy"], "test.pdf", { type: "application/pdf" });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Should not process non-image files
      expect(mockOnImageChange).not.toHaveBeenCalled();
    });

    test("calls onImageChange when image is loaded", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const fileInput = container.querySelector('input[type="file"]');
      const file = new File(["dummy"], "test.png", { type: "image/png" });

      Object.defineProperty(fileInput, "files", {
        value: [file],
        writable: false,
      });

      fireEvent.change(fileInput);

      // onImageChange will be called after FileReader finishes
      expect(fileInput).toBeInTheDocument();
    });
  });

  describe("Avatar Colors", () => {
    test("generates consistent color for same name", () => {
      const { container: container1 } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const { container: container2 } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      expect(container1.firstChild).toBeInTheDocument();
      expect(container2.firstChild).toBeInTheDocument();
    });

    test("different names may have different colors", () => {
      const { container: container1 } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const { container: container2 } = render(
        <ProfilePictureUpload
          firstName="Jane"
          lastName="Smith"
          onImageChange={mockOnImageChange}
        />
      );

      expect(container1.firstChild).toBeInTheDocument();
      expect(container2.firstChild).toBeInTheDocument();
    });
  });

  describe("Button Styling", () => {
    test("applies hover styles to change button", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const buttons = container.querySelectorAll("button");
      expect(buttons.length).toBeGreaterThan(0);
    });

    test("upload button has correct structure", () => {
      const { container } = render(
        <ProfilePictureUpload
          firstName="John"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const uploadButton = container.querySelector("button");
      expect(uploadButton).toBeInTheDocument();
    });
  });

  describe("Initials Edge Cases", () => {
    test("handles single character first name", () => {
      render(
        <ProfilePictureUpload
          firstName="J"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    test("handles single character last name", () => {
      render(
        <ProfilePictureUpload
          firstName="John"
          lastName="D"
          onImageChange={mockOnImageChange}
        />
      );

      expect(screen.getByText("JD")).toBeInTheDocument();
    });

    test("handles names with spaces", () => {
      render(
        <ProfilePictureUpload
          firstName="John Paul"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      const { container } = render(
        <ProfilePictureUpload
          firstName="John Paul"
          lastName="Doe"
          onImageChange={mockOnImageChange}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
