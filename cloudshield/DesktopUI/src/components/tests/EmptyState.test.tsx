import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import EmptyState from "../EmptyState";

describe("EmptyState Component", () => {
  it("renders the message correctly", () => {
    render(<EmptyState message="No workstations found" />);

    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.getByTestId("empty-state-message")).toHaveTextContent(
      "No workstations found"
    );
  });

  it("renders with a custom testId", () => {
    render(<EmptyState message="No data" testId="custom-empty" />);

    expect(screen.getByTestId("custom-empty")).toBeTruthy();
    expect(screen.getByTestId("custom-empty-message")).toHaveTextContent(
      "No data"
    );
  });

  it("renders description when provided", () => {
    render(
      <EmptyState
        message="No workstations found"
        description="Try adjusting your search"
      />
    );

    expect(screen.getByTestId("empty-state-description")).toHaveTextContent(
      "Try adjusting your search"
    );
  });

  it("does not render description when not provided", () => {
    render(<EmptyState message="No workstations found" />);

    expect(screen.queryByTestId("empty-state-description")).toBeNull();
  });

  it("renders icon when provided", () => {
    render(
      <EmptyState
        message="No workstations found"
        icon={<svg data-testid="custom-icon" />}
      />
    );

    expect(screen.getByTestId("empty-state-icon")).toBeTruthy();
    expect(screen.getByTestId("custom-icon")).toBeTruthy();
  });

  it("does not render icon when not provided", () => {
    render(<EmptyState message="No workstations found" />);

    expect(screen.queryByTestId("empty-state-icon")).toBeNull();
  });

  it("applies correct CSS classes for styling", () => {
    render(<EmptyState message="Test" />);

    const container = screen.getByTestId("empty-state");
    expect(container.className).toContain("rounded-2xl");
    expect(container.className).toContain("border");
  });
});
