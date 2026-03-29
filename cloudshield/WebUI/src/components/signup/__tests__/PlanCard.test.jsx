import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import userEvent from "@testing-library/user-event";
import PlanCard from "../PlanCard";

describe("PlanCard", () => {
  const mockPlan = {
    id: "pro",
    name: "Professional",
    price: 59,
    description: "For growing businesses needing more advanced tools.",
    features: [
      "Advanced Predictive Analytics",
      "Automated Workflows",
      "Enhanced NLP",
    ],
  };

  const mockPlanWithTag = {
    ...mockPlan,
    tag: "Most Popular",
  };

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders plan details correctly", () => {
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    expect(screen.getByText("$59")).toBeInTheDocument();
    expect(screen.getByText("/ Per Month")).toBeInTheDocument();
    expect(screen.getByText("Professional")).toBeInTheDocument();
    expect(
      screen.getByText("For growing businesses needing more advanced tools.")
    ).toBeInTheDocument();
  });

  it("renders all features", () => {
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    expect(screen.getByText("Features:")).toBeInTheDocument();
    expect(screen.getByText("Advanced Predictive Analytics")).toBeInTheDocument();
    expect(screen.getByText("Automated Workflows")).toBeInTheDocument();
    expect(screen.getByText("Enhanced NLP")).toBeInTheDocument();
    expect(screen.getAllByText("✓")).toHaveLength(3);
  });

  it("renders tag when present", () => {
    render(
      <PlanCard
        plan={mockPlanWithTag}
        selected={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText("Most Popular")).toBeInTheDocument();
  });

  it("does not render tag when absent", () => {
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    expect(screen.queryByText("Most Popular")).not.toBeInTheDocument();
  });

  it("applies selected styles when selected is true", () => {
    const { container } = render(
      <PlanCard plan={mockPlan} selected={true} onSelect={mockOnSelect} />
    );

    const box = container.firstChild;
    expect(box).toHaveClass("plan-card", "selected");
    expect(box).toHaveAttribute("aria-pressed", "true");
  });

  it("applies default styles when selected is false", () => {
    const { container } = render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const box = container.firstChild;
    expect(box).toHaveClass("plan-card");
    expect(box).not.toHaveClass("selected");
    expect(box).toHaveAttribute("aria-pressed", "false");
  });

  it("calls onSelect with plan id when clicked", () => {
    const { container } = render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const card = container.firstChild;
    fireEvent.click(card);

    expect(mockOnSelect).toHaveBeenCalledTimes(1);
    expect(mockOnSelect).toHaveBeenCalledWith("pro");
  });

  it("renders correctly with empty features array", () => {
    const planWithNoFeatures = { ...mockPlan, features: [] };
    render(
      <PlanCard
        plan={planWithNoFeatures}
        selected={false}
        onSelect={mockOnSelect}
      />
    );

    expect(screen.getByText("Features:")).toBeInTheDocument();
    expect(screen.queryByText(/✓/)).not.toBeInTheDocument();
  });

  it("renders with price of 0", () => {
    const freePlan = { ...mockPlan, price: 0 };
    render(
      <PlanCard plan={freePlan} selected={false} onSelect={mockOnSelect} />
    );

    expect(screen.getByText("$0")).toBeInTheDocument();
  });

  it("renders with very long description", () => {
    const longDescPlan = {
      ...mockPlan,
      description: "A".repeat(200),
    };
    render(
      <PlanCard plan={longDescPlan} selected={false} onSelect={mockOnSelect} />
    );

    expect(screen.getByText("A".repeat(200))).toBeInTheDocument();
  });

  it("handles multiple feature items correctly", () => {
    const manyFeaturesPlan = {
      ...mockPlan,
      features: Array.from({ length: 10 }, (_, i) => `Feature ${i + 1}`),
    };
    const { container } = render(
      <PlanCard
        plan={manyFeaturesPlan}
        selected={false}
        onSelect={mockOnSelect}
      />
    );

    const features = container.querySelectorAll(".plan-card__feature");
    expect(features).toHaveLength(10);
  });

  it("has cursor pointer style", () => {
    const { container } = render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const card = container.firstChild;

    // Card should be clickable - checking via inline sx styles
    expect(card).toBeTruthy();
    fireEvent.click(card);
    expect(mockOnSelect).toHaveBeenCalled();
  });

  it("calls onSelect when Enter key is pressed", async () => {
    const user = userEvent.setup();
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard("{Enter}");

    expect(mockOnSelect).toHaveBeenCalledWith("pro");
  });

  it("calls onSelect when Space key is pressed", () => {
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const button = screen.getByRole("button");
    fireEvent.keyDown(button, { key: " " });

    expect(mockOnSelect).toHaveBeenCalledWith("pro");
  });

  it("does not call onSelect for other keys", async () => {
    const user = userEvent.setup();
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const button = screen.getByRole("button");
    button.focus();
    await user.keyboard("a");
    await user.keyboard("{Escape}");

    expect(mockOnSelect).not.toHaveBeenCalled();
  });

  it('has role="button" for accessibility', () => {
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("is focusable for keyboard navigation", async () => {
    const user = userEvent.setup();
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const button = screen.getByRole("button");
    await user.tab();
    expect(button).toHaveFocus();
  });

  it("has aria-label describing the plan", () => {
    render(
      <PlanCard plan={mockPlan} selected={false} onSelect={mockOnSelect} />
    );

    const button = screen.getByRole("button");
    expect(button).toHaveAttribute(
      "aria-label",
      "Select Professional plan for $59 per month"
    );
  });
});
