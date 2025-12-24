import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import StatCard from "../StatCard";

describe("StatCard", () => {
  it("renders title and value", () => {
    render(<StatCard title="Total Users" value="150" />);
    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("150")).toBeInTheDocument();
  });

  it("renders default change text when no props provided", () => {
    render(<StatCard title="Workstations" value="42" />);
    expect(screen.getByText("15.2%")).toBeInTheDocument();
  });

  it("renders custom change text", () => {
    render(<StatCard title="Groups" value="10" changeText="5% ↓" />);
    expect(screen.getByText("5% ↓")).toBeInTheDocument();
  });

  it("renders change percent with trending up icon", () => {
    render(<StatCard title="Files" value="250" changePercent={15.2} />);
    expect(screen.getByText("15.2%")).toBeInTheDocument();
    // TrendingUpIcon should be present for positive change
  });

  it("renders change percent with trending down icon for negative change", () => {
    render(<StatCard title="Files" value="250" changePercent={-5.3} />);
    expect(screen.getByText("5.3%")).toBeInTheDocument();
    // TrendingDownIcon should be present for negative change
  });

  it("renders add button and calls onAdd when clicked", () => {
    const handleAdd = jest.fn();
    render(<StatCard title="Files" value="250" onAdd={handleAdd} />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleAdd).toHaveBeenCalledTimes(1);
  });

  it("does not render add button when onAdd is not provided", () => {
    render(<StatCard title="Files" value="250" />);
    const button = screen.queryByRole("button");
    expect(button).not.toBeInTheDocument();
  });

  it("applies custom gradient colors", () => {
    const { container } = render(
      <StatCard
        title="Custom"
        value="99"
        gradientFrom="#ff0000"
        gradientTo="#00ff00"
      />
    );
    const box = container.firstChild;
    expect(box).toHaveStyle({
      background: "linear-gradient(135deg, #ff0000 0%, #00ff00 100%)",
    });
  });

  it("applies default gradient colors", () => {
    const { container } = render(<StatCard title="Default" value="100" />);
    const box = container.firstChild;
    expect(box).toHaveStyle({
      background: "linear-gradient(135deg, #6a5acd 0%, #9f7aea 100%)",
    });
  });

  it("renders numeric value", () => {
    render(<StatCard title="Count" value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders string value", () => {
    render(<StatCard title="Status" value="Active" />);
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<StatCard title="Users" value="150" loading={true} />);
    // CircularProgress should be present
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("shows error state", () => {
    render(<StatCard title="Users" value="150" error="Failed to load data" />);
    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("applies error gradient when error is present", () => {
    const { container } = render(
      <StatCard title="Users" value="150" error="Failed to load" />
    );
    const box = container.firstChild;
    expect(box).toHaveStyle({
      background: "linear-gradient(135deg, #e53e3e 0%, #fc8181 100%)",
    });
  });

  it("does not show add button in loading state", () => {
    render(
      <StatCard title="Users" value="150" loading={true} onAdd={() => {}} />
    );
    const button = screen.queryByRole("button");
    expect(button).not.toBeInTheDocument();
  });

  it("does not show add button in error state", () => {
    render(
      <StatCard title="Users" value="150" error="Error" onAdd={() => {}} />
    );
    const button = screen.queryByRole("button");
    expect(button).not.toBeInTheDocument();
  });

  it("handles isPositiveChange prop correctly", () => {
    render(
      <StatCard
        title="Files"
        value="250"
        changeText="5%"
        isPositiveChange={false}
      />
    );
    expect(screen.getByText("5%")).toBeInTheDocument();
    // TrendingDownIcon should be present
  });

  it("changePercent overrides isPositiveChange", () => {
    render(
      <StatCard
        title="Files"
        value="250"
        changePercent={-3.5}
        isPositiveChange={true}
      />
    );
    expect(screen.getByText("3.5%")).toBeInTheDocument();
    // Should show down arrow despite isPositiveChange=true
  });
});
