import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PlanSelector from '../PlanSelector';

describe('PlanSelector', () => {
  const mockOnPlanSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all three plan options', () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
      />
    );

    expect(screen.getByText('BASIC')).toBeInTheDocument();
    expect(screen.getByText('PRO')).toBeInTheDocument();
    expect(screen.getByText('ULTIMATE')).toBeInTheDocument();
  });

  it('renders plan features for each plan', () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
      />
    );

    // Each plan should show these features
    const cpuCoresElements = screen.getAllByText('✓ 8 CPU cores');
    const gpuCoresElements = screen.getAllByText('✓ 12 GPU cores');
    const ramElements = screen.getAllByText('✓ 8 GB RAM');
    const ssdElements = screen.getAllByText('✓ 200 GB SSD');

    // Should have 3 of each (one for each plan)
    expect(cpuCoresElements).toHaveLength(3);
    expect(gpuCoresElements).toHaveLength(3);
    expect(ramElements).toHaveLength(3);
    expect(ssdElements).toHaveLength(3);
  });

  it('calls onPlanSelect when a plan is clicked', () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
      />
    );

    const proBox = screen.getByText('PRO').closest('.MuiBox-root');
    fireEvent.click(proBox);

    expect(mockOnPlanSelect).toHaveBeenCalledTimes(1);
    expect(mockOnPlanSelect).toHaveBeenCalledWith('PRO');
  });

  it('calls onPlanSelect with correct plan ID for each plan', () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
      />
    );

    const basicBox = screen.getByText('BASIC').closest('.MuiBox-root');
    fireEvent.click(basicBox);
    expect(mockOnPlanSelect).toHaveBeenLastCalledWith('BASIC');

    const proBox = screen.getByText('PRO').closest('.MuiBox-root');
    fireEvent.click(proBox);
    expect(mockOnPlanSelect).toHaveBeenLastCalledWith('PRO');

    const ultimateBox = screen.getByText('ULTIMATE').closest('.MuiBox-root');
    fireEvent.click(ultimateBox);
    expect(mockOnPlanSelect).toHaveBeenLastCalledWith('ULTIMATE');

    expect(mockOnPlanSelect).toHaveBeenCalledTimes(3);
  });

  it('shows CURRENT badge when showCurrent is true and BASIC plan is selected', () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    expect(screen.getByText('CURRENT')).toBeInTheDocument();
  });

  it('does not show CURRENT badge when showCurrent is false', () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={false}
      />
    );

    expect(screen.queryByText('CURRENT')).not.toBeInTheDocument();
  });

  it('does not show CURRENT badge when PRO plan is selected with showCurrent true', () => {
    render(
      <PlanSelector
        selectedPlan="PRO"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    expect(screen.queryByText('CURRENT')).not.toBeInTheDocument();
  });

  it('only shows CURRENT badge on BASIC plan when selected', () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    const basicTitle = screen.getByText('BASIC').parentElement;
    expect(basicTitle.textContent).toContain('CURRENT');

    // PRO and ULTIMATE should not have CURRENT badge
    const proTitle = screen.getByText('PRO').parentElement;
    const ultimateTitle = screen.getByText('ULTIMATE').parentElement;
    expect(proTitle.textContent).not.toContain('CURRENT');
    expect(ultimateTitle.textContent).not.toContain('CURRENT');
  });

  it('uses default showCurrent value of false', () => {
    render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
      />
    );

    expect(screen.queryByText('CURRENT')).not.toBeInTheDocument();
  });

  it('renders plans in a grid layout', () => {
    const { container } = render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
      />
    );

    // Check for grid container by finding the parent box
    const gridContainer = container.querySelector('.MuiBox-root');
    expect(gridContainer).toBeInTheDocument();
    // Verify grid display via computed styles
    const computedStyle = window.getComputedStyle(gridContainer);
    expect(computedStyle.display).toBe('grid');
  });

  it('applies cursor pointer style to plan boxes', () => {
    const { container } = render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
      />
    );

    const planBoxes = container.querySelectorAll('.MuiBox-root');
    // Find the plan boxes (they should have cursor: pointer in sx prop)
    const hasPointerCursor = Array.from(planBoxes).some(box => 
      box.style.cursor === 'pointer' || getComputedStyle(box).cursor === 'pointer'
    );
    
    expect(hasPointerCursor).toBe(true);
  });

  it('highlights selected plan visually', () => {
    render(
      <PlanSelector
        selectedPlan="PRO"
        onPlanSelect={mockOnPlanSelect}
      />
    );

    // The selected plan should have a different border color
    const proBox = screen.getByText('PRO').closest('.MuiBox-root');
    expect(proBox).toBeInTheDocument();
    // Check if it has styling via computed styles (MUI applies styles via emotion)
    const computedStyle = window.getComputedStyle(proBox);
    expect(computedStyle.border).toContain('2px');
    expect(computedStyle.borderColor).toBeTruthy();
  });

  it('can change selected plan', () => {
    const { rerender } = render(
      <PlanSelector
        selectedPlan="BASIC"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    expect(screen.getByText('CURRENT')).toBeInTheDocument();

    rerender(
      <PlanSelector
        selectedPlan="ULTIMATE"
        onPlanSelect={mockOnPlanSelect}
        showCurrent={true}
      />
    );

    // CURRENT badge should disappear since ULTIMATE is selected
    expect(screen.queryByText('CURRENT')).not.toBeInTheDocument();
  });
});
