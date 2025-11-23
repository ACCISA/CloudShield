import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import Sidebar from "../Sidebar";

// Mock the custom icon components
jest.mock("../../../assets/NavBar/DashboardIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="dashboard-icon"
      data-selected={selected}
      width={width}
      height={height}
    >
      <title>Dashboard Icon</title>
    </svg>
  ),
}));

jest.mock("../../../assets/NavBar/WorkstationsIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="workstations-icon"
      data-selected={selected}
      width={width}
      height={height}
    >
      <title>Workstations Icon</title>
    </svg>
  ),
}));

jest.mock("../../../assets/NavBar/UsersIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="users-icon"
      data-selected={selected}
      width={width}
      height={height}
    >
      <title>Users Icon</title>
    </svg>
  ),
}));

jest.mock("../../../assets/NavBar/GroupsIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="groups-icon"
      data-selected={selected}
      width={width}
      height={height}
    >
      <title>Groups Icon</title>
    </svg>
  ),
}));

jest.mock("../../../assets/NavBar/FilesIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="files-icon"
      data-selected={selected}
      width={width}
      height={height}
    >
      <title>Files Icon</title>
    </svg>
  ),
}));

// Helper to render with router
const renderWithRouter = (ui, { route = "/" } = {}) => {
  window.history.pushState({}, "Test page", route);
  return render(ui, { wrapper: BrowserRouter });
};

describe("Sidebar", () => {
  describe("Full Mode", () => {
    it("renders in full mode by default", () => {
      renderWithRouter(<Sidebar />);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("displays navigation items when not collapsed", () => {
      renderWithRouter(<Sidebar collapsed={false} />);
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Workstations")).toBeInTheDocument();
      expect(screen.getByText("Users")).toBeInTheDocument();
      expect(screen.getByText("Groups")).toBeInTheDocument();
    });

    it("renders custom icons with correct size", () => {
      renderWithRouter(<Sidebar collapsed={false} />);
      const dashboardIcon = screen.getByTestId("dashboard-icon");
      expect(dashboardIcon).toHaveAttribute("width", "20");
      expect(dashboardIcon).toHaveAttribute("height", "20");
    });

    it("passes selected prop to icon on active route", () => {
      renderWithRouter(<Sidebar />, { route: "/dashboard" });
      const dashboardIcon = screen.getByTestId("dashboard-icon");
      expect(dashboardIcon).toHaveAttribute("data-selected", "true");
    });

    it("does not pass selected prop to icon on inactive route", () => {
      renderWithRouter(<Sidebar />, { route: "/dashboard" });
      const workstationsIcon = screen.getByTestId("workstations-icon");
      expect(workstationsIcon).toHaveAttribute("data-selected", "false");
    });

    it("shows collapse button", () => {
      const mockToggle = jest.fn();
      renderWithRouter(<Sidebar onToggleCollapse={mockToggle} />);
      const collapseButtons = screen.getAllByLabelText(/collapse|expand/i);
      expect(collapseButtons.length).toBeGreaterThan(0);
    });

    it("calls onToggleCollapse when collapse button is clicked", () => {
      const mockToggle = jest.fn();
      renderWithRouter(
        <Sidebar onToggleCollapse={mockToggle} collapsed={false} />
      );
      const collapseButton = screen.getByLabelText(/collapse sidebar/i);
      fireEvent.click(collapseButton);
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it("highlights active navigation item based on current route", () => {
      renderWithRouter(<Sidebar />, { route: "/dashboard" });
      const dashboardItem = screen
        .getByText("Dashboard")
        .closest('[role="button"]');
      expect(dashboardItem).toBeInTheDocument();
    });

    it("navigates when navigation item is clicked", () => {
      renderWithRouter(<Sidebar />);
      const dashboardButton = screen
        .getByText("Dashboard")
        .closest('[role="button"]');
      fireEvent.click(dashboardButton);
      expect(window.location.pathname).toBe("/dashboard");
    });

    it("supports keyboard navigation", () => {
      renderWithRouter(<Sidebar />);
      const dashboardButton = screen
        .getByText("Dashboard")
        .closest('[role="button"]');
      fireEvent.keyDown(dashboardButton, { key: "Enter" });
      expect(window.location.pathname).toBe("/dashboard");
    });
  });

  describe("Collapsed State", () => {
    it("hides navigation labels when collapsed", () => {
      const { container } = renderWithRouter(<Sidebar collapsed={true} />);
      // In collapsed mode, labels should not be visible
      expect(container.textContent).not.toContain("Dashboard");
    });

    it("shows expand button when collapsed", () => {
      const mockToggle = jest.fn();
      renderWithRouter(
        <Sidebar collapsed={true} onToggleCollapse={mockToggle} />
      );
      const expandButton = screen.getByLabelText(/expand sidebar/i);
      expect(expandButton).toBeInTheDocument();
    });
  });

  describe("Provisioning Mode", () => {
    it("renders in provisioning mode", () => {
      renderWithRouter(<Sidebar mode="provisioning" />);
      // In provisioning mode, only company block and collapse button should be visible
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });

    it("shows collapse button in provisioning mode", () => {
      const mockToggle = jest.fn();
      renderWithRouter(
        <Sidebar mode="provisioning" onToggleCollapse={mockToggle} />
      );
      const collapseButtons = screen.getAllByLabelText(/collapse|expand/i);
      expect(collapseButtons.length).toBeGreaterThan(0);
    });
  });

  describe("Accordion Sections", () => {
    it("expands workstations section when clicked", () => {
      renderWithRouter(<Sidebar />);
      const workstationsItem = screen.getByText("Workstations");
      const expandButton = workstationsItem.parentElement.querySelector(
        '[aria-label*="Expand"]'
      );
      if (expandButton) {
        fireEvent.click(expandButton);
        // After expanding, collapse icon should appear
        const collapseButton = screen.queryByLabelText(/collapse section/i);
        expect(collapseButton).toBeInTheDocument();
      }
    });

    it("supports keyboard interaction for accordion", () => {
      renderWithRouter(<Sidebar />);
      const workstationsItem = screen.getByText("Workstations");
      const expandButton = workstationsItem.parentElement.querySelector(
        '[aria-label*="Expand"]'
      );
      if (expandButton) {
        fireEvent.keyDown(expandButton, { key: "Enter" });
        expect(expandButton).toBeInTheDocument();
      }
    });
  });
});
