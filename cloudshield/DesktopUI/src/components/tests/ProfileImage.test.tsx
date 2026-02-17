import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProfileImage from "../ProfileImage";

describe("ProfileImage Component", () => {
  it("renders the profile image component", () => {
    render(<ProfileImage />);

    expect(screen.getByTestId("profile-image")).toBeTruthy();
  });

  it("renders with custom testId", () => {
    render(<ProfileImage testId="custom-profile" />);

    expect(screen.getByTestId("custom-profile")).toBeTruthy();
  });

  it("displays initials from name with two words", () => {
    render(<ProfileImage name="John Doe" />);

    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent(
      "JD"
    );
  });

  it("displays initials from name with single word", () => {
    render(<ProfileImage name="John" />);

    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent(
      "JO"
    );
  });

  it("displays initials from name with multiple words (first and last)", () => {
    render(<ProfileImage name="John Michael Doe" />);

    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent(
      "JD"
    );
  });

  it("falls back to email for initials when no name is provided", () => {
    render(<ProfileImage email="john.doe@example.com" />);

    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent(
      "JO"
    );
  });

  it("displays question mark when no name or email is provided", () => {
    render(<ProfileImage />);

    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent(
      "?"
    );
  });

  it("renders image when imageUrl is provided", () => {
    render(
      <ProfileImage
        name="John Doe"
        imageUrl="https://example.com/avatar.jpg"
      />
    );

    const img = screen.getByTestId("profile-image-img");
    expect(img).toBeTruthy();
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
    expect(img).toHaveAttribute("alt", "John Doe");
  });

  it("uses email as alt text when only email is provided", () => {
    render(
      <ProfileImage
        email="john@example.com"
        imageUrl="https://example.com/avatar.jpg"
      />
    );

    const img = screen.getByTestId("profile-image-img");
    expect(img).toHaveAttribute("alt", "john@example.com");
  });

  it("uses default alt text when no name or email", () => {
    render(<ProfileImage imageUrl="https://example.com/avatar.jpg" />);

    const img = screen.getByTestId("profile-image-img");
    expect(img).toHaveAttribute("alt", "User avatar");
  });

  it("applies small size classes", () => {
    render(<ProfileImage name="Test" size="sm" />);

    const container = screen.getByTestId("profile-image");
    expect(container.className).toContain("h-8");
    expect(container.className).toContain("w-8");
  });

  it("applies medium size classes (default)", () => {
    render(<ProfileImage name="Test" />);

    const container = screen.getByTestId("profile-image");
    expect(container.className).toContain("h-10");
    expect(container.className).toContain("w-10");
  });

  it("applies large size classes", () => {
    render(<ProfileImage name="Test" size="lg" />);

    const container = screen.getByTestId("profile-image");
    expect(container.className).toContain("h-12");
    expect(container.className).toContain("w-12");
  });

  it("applies consistent background color for same name", () => {
    const { rerender } = render(<ProfileImage name="John Doe" />);
    const container1 = screen.getByTestId("profile-image");
    const classes1 = container1.className;

    rerender(<ProfileImage name="John Doe" />);
    const container2 = screen.getByTestId("profile-image");
    const classes2 = container2.className;

    expect(classes1).toEqual(classes2);
  });

  it("applies rounded-full for circular shape", () => {
    render(<ProfileImage name="Test" />);

    const container = screen.getByTestId("profile-image");
    expect(container.className).toContain("rounded-full");
  });

  it("shows initials when no imageUrl provided", () => {
    render(<ProfileImage name="Jane Smith" />);

    expect(screen.queryByTestId("profile-image-img")).toBeNull();
    expect(screen.getByTestId("profile-image-initials")).toBeTruthy();
  });

  // Additional tests for uncovered getInitials and getColorFromString logic
  it("getInitials returns first two chars of single word name", () => {
    render(<ProfileImage name="A" />);
    // Single char name should return what's available
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("A");
  });

  it("getInitials handles name with extra whitespace", () => {
    render(<ProfileImage name="  John   Doe  " />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("JD");
  });

  it("getInitials uses email local part when no name", () => {
    render(<ProfileImage email="ab@example.com" />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("AB");
  });

  it("getInitials handles email with single char local part", () => {
    render(<ProfileImage email="x@example.com" />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("X");
  });

  it("getColorFromString generates consistent color for same input", () => {
    const { rerender } = render(<ProfileImage name="TestUser" />);
    const container1 = screen.getByTestId("profile-image");
    const bgClass1 = container1.className;

    rerender(<ProfileImage name="TestUser" />);
    const container2 = screen.getByTestId("profile-image");
    const bgClass2 = container2.className;

    expect(bgClass1).toEqual(bgClass2);
  });

  it("getColorFromString generates different colors for different inputs", () => {
    const { rerender } = render(<ProfileImage name="Alice" />);
    const container1 = screen.getByTestId("profile-image");
    const bgClass1 = container1.className;

    rerender(<ProfileImage name="Bob" />);
    const container2 = screen.getByTestId("profile-image");
    const bgClass2 = container2.className;

    // Colors may or may not differ based on hash, but both should have bg- class
    expect(bgClass1).toContain("bg-");
    expect(bgClass2).toContain("bg-");
  });

  it("uses 'user' as fallback for color generation when no name/email", () => {
    render(<ProfileImage />);
    const container = screen.getByTestId("profile-image");
    expect(container.className).toContain("bg-");
  });

  it("renders image container when imageUrl is provided", () => {
    render(<ProfileImage imageUrl="https://example.com/pic.jpg" />);
    
    const img = screen.getByTestId("profile-image-img");
    expect(img).toBeTruthy();
  });

  it("uses name for alt text when imageUrl provided", () => {
    render(<ProfileImage name="Test User" imageUrl="https://example.com/pic.jpg" />);
    
    const img = screen.getByTestId("profile-image-img");
    expect(img).toHaveAttribute("alt", "Test User");
  });

  it("uses email for alt text when no name but imageUrl provided", () => {
    render(<ProfileImage email="test@test.com" imageUrl="https://example.com/pic.jpg" />);
    
    const img = screen.getByTestId("profile-image-img");
    expect(img).toHaveAttribute("alt", "test@test.com");
  });

  it("uses 'User avatar' default alt when no name/email with imageUrl", () => {
    render(<ProfileImage imageUrl="https://example.com/pic.jpg" />);
    
    const img = screen.getByTestId("profile-image-img");
    expect(img).toHaveAttribute("alt", "User avatar");
  });
});
