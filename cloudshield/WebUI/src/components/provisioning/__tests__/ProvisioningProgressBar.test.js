import React from "react";
import { render, screen } from "@testing-library/react";
import ProvisioningProgressBar from "../ProvisioningProgressBar.jsx";
import "@testing-library/jest-dom";

describe("ProvisioningProgressBar", () => {
  test("renders the percentage text correctly", () => {
    render(<ProvisioningProgressBar percent={50} />);
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  test("clamps negative values to 0%", () => {
    render(<ProvisioningProgressBar percent={-20} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  test("clamps values over 100 to 100%", () => {
    render(<ProvisioningProgressBar percent={150} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  test("handles null or undefined by defaulting to 0%", () => {
    const { rerender } = render(<ProvisioningProgressBar percent={null} />);
    expect(screen.getByText("0%")).toBeInTheDocument();

    rerender(<ProvisioningProgressBar percent={undefined} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  test("sets the correct width style on the fill bar", () => {
    // We need to find the specific div that acts as the fill bar. 
    // Since it doesn't have an ID, we look for the element with the specific style.
    const { container } = render(<ProvisioningProgressBar percent={75} />);
    
    // The fill bar is the div that has the width property set
    // In your code, it's the inner div inside the track.
    // We can use a query selector to find the div with the width style.
    const fillBar = container.querySelector('div[style*="width: 75%"]');
    
    expect(fillBar).toBeInTheDocument();
    expect(fillBar).toHaveStyle("backgroundColor: #9CA3AF"); // Check the metallic color
  });
});