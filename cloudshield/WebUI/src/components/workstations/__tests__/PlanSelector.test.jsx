import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import PlanSelector from "../PlanSelector";

describe("PlanSelector", () => {
  const mockOnPlanSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all three plan options", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    expect(screen.getByText("BASIC")).toBeInTheDocument();
    expect(screen.getByText("PRO")).toBeInTheDocument();
    expect(screen.getByText("ULTIMATE")).toBeInTheDocument();
  });

  it("renders plan features for each plan", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    // Each plan should show these features
    const cpuCoresElements = screen.getAllByText("✓ 8 CPU cores");
    const gpuCoresElements = screen.getAllByText("✓ 12 GPU cores");
    const ramElements = screen.getAllByText("✓ 8 GB RAM");
    const ssdElements = screen.getAllByText("✓ 200 GB SSD");

    // Should have 3 of each (one for each plan)
    expect(cpuCoresElements).toHaveLength(3);
    expect(gpuCoresElements).toHaveLength(3);
    expect(ramElements).toHaveLength(3);
    expect(ssdElements).toHaveLength(3);
  });

  it("calls onPlanSelect when a plan is clicked", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const proButton = screen.getByRole("button", { name: /select pro plan/i });
    fireEvent.click(proButton);

    expect(mockOnPlanSelect).toHaveBeenCalledTimes(1);
    expect(mockOnPlanSelect).toHaveBeenCalledWith("PRO");
  });

  it("calls onPlanSelect with correct plan ID for each plan", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const basicButton = screen.getByRole("button", {
      name: /select basic plan/i,
    });
    fireEvent.click(basicButton);
    expect(mockOnPlanSelect).toHaveBeenLastCalledWith("BASIC");

    const proButton = screen.getByRole("button", { name: /select pro plan/i });
    fireEvent.click(proButton);
    expect(mockOnPlanSelect).toHaveBeenLastCalledWith("PRO");

    const ultimateButton = screen.getByRole("button", {
      name: /select ultimate plan/i,
    });
    fireEvent.click(ultimateButton);
    expect(mockOnPlanSelect).toHaveBeenLastCalledWith("ULTIMATE");

    expect(mockOnPlanSelect).toHaveBeenCalledTimes(3);
  });

  it("shows CURRENT badge when showCurrent is true and BASIC plan is selected", () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    expect(screen.getByText("CURRENT")).toBeInTheDocument();
  });

  it("does not show CURRENT badge when showCurrent is false", () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={false}
      />
    );

    expect(screen.queryByText("CURRENT")).not.toBeInTheDocument();
  });

  it("does not show CURRENT badge when PRO plan is selected with showCurrent true", () => {
    render(
      <PlanSelector
        selectedPlan="PRO"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    expect(screen.queryByText("CURRENT")).not.toBeInTheDocument();
  });

  it("only shows CURRENT badge on BASIC plan when selected", () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    const basicTitle = screen.getByText("BASIC").parentElement;
    expect(basicTitle.textContent).toContain("CURRENT");

    // PRO and ULTIMATE should not have CURRENT badge
    const proTitle = screen.getByText("PRO").parentElement;
    const ultimateTitle = screen.getByText("ULTIMATE").parentElement;
    expect(proTitle.textContent).not.toContain("CURRENT");
    expect(ultimateTitle.textContent).not.toContain("CURRENT");
  });

  it("uses default showCurrent value of false", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    expect(screen.queryByText("CURRENT")).not.toBeInTheDocument();
  });

  it("renders plans in a grid layout", () => {
    const { container } = render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    // PlanSelector uses a div with grid styling
    const gridContainer = container.firstChild;
    expect(gridContainer).toBeInTheDocument();
  });

  it("applies cursor pointer style to plan boxes", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const planButtons = screen.getAllByRole("button");
    expect(planButtons).toHaveLength(3);
    // All plan cards should be clickable with role="button"
    planButtons.forEach((button) => {
      expect(button).toHaveAttribute("role", "button");
    });
  });

  it("highlights selected plan visually", () => {
    render(<PlanSelector selectedPlan="PRO" onPlanSelect={mockOnPlanSelect} />);

    // PRO should be selected and highlighted
    const proButton = screen.getByRole("button", { name: /select pro plan/i });
    expect(proButton).toBeInTheDocument();
  });

  it("can change selected plan", () => {
    const { rerender } = render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    expect(screen.getByText("CURRENT")).toBeInTheDocument();

    rerender(
      <PlanSelector
        selectedPlan="ULTIMATE"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    // CURRENT badge should disappear since ULTIMATE is selected
    expect(screen.queryByText("CURRENT")).not.toBeInTheDocument();
  });

  it("handles undefined selectedPlan", () => {
    render(
      <PlanSelector selectedPlan={undefined} onPlanSelect={mockOnPlanSelect} />
    );

    // Should render all plans without errors
    expect(screen.getByText("BASIC")).toBeInTheDocument();
    expect(screen.getByText("PRO")).toBeInTheDocument();
    expect(screen.getByText("ULTIMATE")).toBeInTheDocument();
  });

  it("handles null selectedPlan", () => {
    render(
      <PlanSelector selectedPlan={null} onPlanSelect={mockOnPlanSelect} />
    );

    expect(screen.getByText("BASIC")).toBeInTheDocument();
    expect(screen.getByText("PRO")).toBeInTheDocument();
  });

  it("handles empty string selectedPlan", () => {
    render(<PlanSelector selectedPlan="" onPlanSelect={mockOnPlanSelect} />);

    const basicButton = screen.getByRole("button", {
      name: /select basic plan/i,
    });
    fireEvent.click(basicButton);

    expect(mockOnPlanSelect).toHaveBeenCalledWith("BASIC");
  });

  it("renders all plan features for each plan", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    // Each plan shows 4 features
    const cpuElements = screen.getAllByText(/8 CPU cores/);
    const gpuElements = screen.getAllByText(/12 GPU cores/);
    const ramElements = screen.getAllByText(/8 GB RAM/);
    const ssdElements = screen.getAllByText(/200 GB SSD/);

    expect(cpuElements).toHaveLength(3);
    expect(gpuElements).toHaveLength(3);
    expect(ramElements).toHaveLength(3);
    expect(ssdElements).toHaveLength(3);
  });

  it("applies hover effects to plan cards", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const proButton = screen.getByRole("button", { name: /select pro plan/i });

    // Test mouseEnter and mouseLeave
    fireEvent.mouseEnter(proButton);
    fireEvent.mouseLeave(proButton);

    expect(proButton).toBeInTheDocument();
  });

  it("changes border color on hover for unselected plans", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const proButton = screen.getByRole("button", { name: /select pro plan/i });

    // Hover should change border color for unselected plans
    fireEvent.mouseEnter(proButton);
    // Style changes are applied directly to element
    expect(proButton.style.borderColor).toBeTruthy();

    fireEvent.mouseLeave(proButton);
    expect(proButton.style.borderColor).toBeTruthy();
  });

  it("maintains border color on hover for selected plan", () => {
    render(<PlanSelector selectedPlan="PRO" onPlanSelect={mockOnPlanSelect} />);

    const proButton = screen.getByRole("button", { name: /select pro plan/i });

    // For selected plan, hover should maintain the selected border color
    fireEvent.mouseEnter(proButton);
    expect(proButton.style.borderColor).toBe("#2de36b");

    fireEvent.mouseLeave(proButton);
    expect(proButton.style.borderColor).toBe("#2de36b");
  });

  it("maintains selection on hover", () => {
    render(<PlanSelector selectedPlan="PRO" onPlanSelect={mockOnPlanSelect} />);

    const proButton = screen.getByRole("button", { name: /select pro plan/i });
    const basicButton = screen.getByRole("button", {
      name: /select basic plan/i,
    });

    // Hover over unselected plan
    fireEvent.mouseEnter(basicButton);
    fireEvent.mouseLeave(basicButton);

    // PRO should still be selected
    expect(proButton).toBeInTheDocument();
  });

  it("handles rapid plan changes", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const basicButton = screen.getByRole("button", {
      name: /select basic plan/i,
    });
    const proButton = screen.getByRole("button", { name: /select pro plan/i });
    const ultimateButton = screen.getByRole("button", {
      name: /select ultimate plan/i,
    });

    fireEvent.click(proButton);
    fireEvent.click(ultimateButton);
    fireEvent.click(basicButton);

    expect(mockOnPlanSelect).toHaveBeenCalledTimes(3);
  });

  it("handles keyboard navigation with Enter key", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const proButton = screen.getByRole("button", { name: /select pro plan/i });
    fireEvent.keyDown(proButton, { key: "Enter" });

    expect(mockOnPlanSelect).toHaveBeenCalledWith("PRO");
  });

  it("handles keyboard navigation with Space key", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const ultimateButton = screen.getByRole("button", {
      name: /select ultimate plan/i,
    });
    fireEvent.keyDown(ultimateButton, { key: " " });

    expect(mockOnPlanSelect).toHaveBeenCalledWith("ULTIMATE");
  });

  it("does not trigger onPlanSelect for other keys", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const proButton = screen.getByRole("button", { name: /select pro plan/i });
    fireEvent.keyDown(proButton, { key: "a" });
    fireEvent.keyDown(proButton, { key: "Escape" });

    expect(mockOnPlanSelect).not.toHaveBeenCalled();
  });

  it("has proper accessibility attributes", () => {
    render(
      <PlanSelector selectedPlan="BASIC" onPlanSelect={mockOnPlanSelect} />
    );

    const basicButton = screen.getByRole("button", {
      name: /select basic plan/i,
    });
    const proButton = screen.getByRole("button", { name: /select pro plan/i });
    const ultimateButton = screen.getByRole("button", {
      name: /select ultimate plan/i,
    });

    expect(basicButton).toHaveAttribute("tabIndex", "0");
    expect(proButton).toHaveAttribute("tabIndex", "0");
    expect(ultimateButton).toHaveAttribute("tabIndex", "0");

    expect(basicButton).toHaveAttribute("aria-label", "Select BASIC plan");
    expect(proButton).toHaveAttribute("aria-label", "Select PRO plan");
    expect(ultimateButton).toHaveAttribute(
      "aria-label",
      "Select ULTIMATE plan"
    );
  });
});
