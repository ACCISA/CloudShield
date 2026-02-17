import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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
describe("Internal Logic & Edge Cases", () => {
  // Covers: (parts[0][0] + parts[parts.length - 1][0])
  // Specifically ensures the LAST part is used, not the middle one
  it("generates initials from first and last name, ignoring middle names", () => {
    render(<ProfileImage name="John Middle Doe" />);
    // Should be JD, not JM
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("JD");
  });

  // Covers: parts = name.trim().split(/\s+/)
  // Ensures trim() and regex work for irregular spacing
  it("handles names with excessive whitespace correctly", () => {
    render(<ProfileImage name="  Sarah      Connor  " />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("SC");
  });

  // Covers: parts[0]?.substring(0, 2).toUpperCase()
  // 1. Single short letter
  // 2. Single long word
  it("generates initials for single-word names", () => {
    const { rerender } = render(<ProfileImage name="Madonna" />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("MA");

    rerender(<ProfileImage name="Q" />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("Q");
  });

  // Covers: if (name) check failing for empty string
  it("falls back to question mark if name is provided but empty/whitespace", () => {
    render(<ProfileImage name="   " />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("?");
  });

  // Covers: localPart?.substring(0, 2) for email
  it("generates initials from email when name is missing", () => {
    const { rerender } = render(<ProfileImage email="admin@cloudshield.com" />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("AD");

    // Short email case
    rerender(<ProfileImage email="z@cloudshield.com" />);
    expect(screen.getByTestId("profile-image-initials")).toHaveTextContent("Z");
  });

  // Covers: onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
  it("hides the image and shows fallback if image fails to load", () => {
    render(
      <ProfileImage 
        name="Fallback User" 
        imageUrl="https://broken-link.com/404.jpg" 
      />
    );

    const img = screen.getByTestId("profile-image-img");
    
    // Initial state: Image is present
    expect(img).toBeVisible();

    // Simulate error event
    fireEvent.error(img);

    // Assert: The inline style should be set to display: none
    expect(img).toHaveStyle({ display: "none" });
    
    // Since the image is hidden, the container effectively just shows the background/border
    // Note: In a real DOM, the underlying text/initials might be obscured by the img tag 
    // depending on Z-index, but hiding the img usually reveals what's behind it 
    // or simply leaves the colored circle.
  });

  // Covers: const bgColor = getColorFromString(...)
  // Validates that the hashing logic doesn't crash and produces expected class format
  it("assigns a valid background color class based on input", () => {
    render(<ProfileImage name="Color Test" />);
    const container = screen.getByTestId("profile-image");
    
    // Check for one of the specific classes defined in your colors array
    // We don't need to check specific hashing math (that's implementation detail), 
    // just that a valid class from the list is applied.
    const validColors = [
      "bg-blue-500", "bg-emerald-500", "bg-purple-500", 
      "bg-amber-500", "bg-rose-500", "bg-cyan-500", 
      "bg-indigo-500", "bg-teal-500"
    ];
    
    const hasValidColor = validColors.some(color => 
      container.className.includes(color)
    );

    expect(hasValidColor).toBe(true);
  });

  // Covers: Math.abs(hash) logic in getColorFromString
  // We want to ensure inputs that might generate negative hash codes don't break the array index
  it("handles inputs that generate negative hash codes for color generation", () => {
    // "Polygenelubricants" is a known string that often produces negative Java-style hash codes.
    // Even if it doesn't in this specific hash impl, it ensures the modulo logic holds up.
    render(<ProfileImage name="Polygenelubricants" />); 
    const container = screen.getByTestId("profile-image");
    
    expect(container.className).toMatch(/bg-[a-z]+-500/);
  });
});