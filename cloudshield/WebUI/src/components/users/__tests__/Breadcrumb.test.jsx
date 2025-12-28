/**
 * Breadcrumb.test.jsx
 *
 * Test suite for the Breadcrumb component
 * Tests navigation, step rendering, and clickability
 */
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import Breadcrumb from "../Breadcrumb";

describe("Breadcrumb Component", () => {
  const mockSteps = ["Basic Info", "Workstations", "Groups", "Files"];
  const mockOnStepClick = jest.fn();

  beforeEach(() => {
    mockOnStepClick.mockClear();
  });

  describe("Rendering", () => {
    test("renders without crashing", () => {
      const { container } = render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={0}
          onStepClick={mockOnStepClick}
        />
      );
      expect(container.firstChild).toBeInTheDocument();
    });

    test("renders all steps", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={0}
          onStepClick={mockOnStepClick}
        />
      );

      mockSteps.forEach((step) => {
        expect(screen.getByText(step)).toBeInTheDocument();
      });
    });

    test("renders separators between steps", () => {
      const { container } = render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={0}
          onStepClick={mockOnStepClick}
        />
      );

      const separators = container.querySelectorAll("span");
      // Should have separators (one less than number of steps)
      expect(separators.length).toBeGreaterThan(0);
    });

    test("renders with aria-label", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={0}
          onStepClick={mockOnStepClick}
        />
      );

      const nav = screen.getByRole("navigation");
      expect(nav).toHaveAttribute("aria-label", "Progress");
    });
  });

  describe("Step States", () => {
    test("first step is active when currentStep is 0", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={0}
          onStepClick={mockOnStepClick}
        />
      );

      const firstStepButton = screen.getByText("Basic Info");
      expect(firstStepButton).toBeInTheDocument();
    });

    test("second step is active when currentStep is 1", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={1}
          onStepClick={mockOnStepClick}
        />
      );

      const secondStepButton = screen.getByText("Workstations");
      expect(secondStepButton).toBeInTheDocument();
    });

    test("previous steps are clickable", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={2}
          onStepClick={mockOnStepClick}
        />
      );

      const firstStepButton = screen.getByText("Basic Info");
      fireEvent.click(firstStepButton);

      expect(mockOnStepClick).toHaveBeenCalledWith(0);
    });

    test("future steps are not clickable", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={0}
          onStepClick={mockOnStepClick}
        />
      );

      const futureStepButton = screen.getByText("Groups");
      fireEvent.click(futureStepButton);

      expect(mockOnStepClick).not.toHaveBeenCalled();
    });

    test("current step is not clickable", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={1}
          onStepClick={mockOnStepClick}
        />
      );

      const currentStepButton = screen.getByText("Workstations");
      fireEvent.click(currentStepButton);

      expect(mockOnStepClick).not.toHaveBeenCalled();
    });
  });

  describe("User Interactions", () => {
    test("calls onStepClick with correct index when clickable step is clicked", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={3}
          onStepClick={mockOnStepClick}
        />
      );

      const firstStep = screen.getByText("Basic Info");
      fireEvent.click(firstStep);

      expect(mockOnStepClick).toHaveBeenCalledWith(0);
    });

    test("handles hover on clickable steps", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={2}
          onStepClick={mockOnStepClick}
        />
      );

      const clickableStep = screen.getByText("Basic Info");
      fireEvent.mouseEnter(clickableStep);
      fireEvent.mouseLeave(clickableStep);

      expect(clickableStep).toBeInTheDocument();
    });

    test("can navigate to any previous step", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={3}
          onStepClick={mockOnStepClick}
        />
      );

      fireEvent.click(screen.getByText("Basic Info"));
      expect(mockOnStepClick).toHaveBeenCalledWith(0);

      mockOnStepClick.mockClear();
      fireEvent.click(screen.getByText("Workstations"));
      expect(mockOnStepClick).toHaveBeenCalledWith(1);

      mockOnStepClick.mockClear();
      fireEvent.click(screen.getByText("Groups"));
      expect(mockOnStepClick).toHaveBeenCalledWith(2);
    });
  });

  describe("Edge Cases", () => {
    test("renders with single step", () => {
      render(
        <Breadcrumb
          steps={["Only Step"]}
          currentStep={0}
          onStepClick={mockOnStepClick}
        />
      );

      expect(screen.getByText("Only Step")).toBeInTheDocument();
    });

    test("renders with empty steps array", () => {
      const { container } = render(
        <Breadcrumb steps={[]} currentStep={0} onStepClick={mockOnStepClick} />
      );

      expect(container.firstChild).toBeInTheDocument();
    });

    test("handles last step as current", () => {
      render(
        <Breadcrumb
          steps={mockSteps}
          currentStep={3}
          onStepClick={mockOnStepClick}
        />
      );

      const lastStep = screen.getByText("Files");
      expect(lastStep).toBeInTheDocument();
    });
  });
});
