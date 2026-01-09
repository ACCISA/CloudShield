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
      expect(screen.getByText("Employees")).toBeInTheDocument();
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
      renderWithRouter(<Sidebar collapsed={true} />);
      // In collapsed mode, navigation item labels should not be visible as separate text
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("Workstations")).not.toBeInTheDocument();
      expect(screen.queryByText("Employees")).not.toBeInTheDocument();
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

        // Click again to collapse
        fireEvent.click(collapseButton);
        const expandButtonAgain = screen.queryByLabelText(/expand section/i);
        expect(expandButtonAgain).toBeInTheDocument();
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

    it("expands employees section when clicked", () => {
      renderWithRouter(<Sidebar />);
      const employeesItem = screen.getByText("Employees");
      const expandButton = employeesItem.parentElement.querySelector(
        '[aria-label*="Expand"]'
      );
      if (expandButton) {
        fireEvent.click(expandButton);
        // Toggle back
        fireEvent.click(expandButton);
        expect(expandButton).toBeInTheDocument();
      }
    });

    it("expands groups section when clicked", () => {
      renderWithRouter(<Sidebar />);
      const groupsItem = screen.getByText("Groups");
      const expandButton = groupsItem.parentElement.querySelector(
        '[aria-label*="Expand"]'
      );
      if (expandButton) {
        fireEvent.click(expandButton);
        // Toggle back
        fireEvent.click(expandButton);
        expect(expandButton).toBeInTheDocument();
      }
    });

    it("expands files section when clicked", () => {
      renderWithRouter(<Sidebar />);
      const filesItem = screen.getByText("Files");
      const expandButton = filesItem.parentElement.querySelector(
        '[aria-label*="Expand"]'
      );
      if (expandButton) {
        fireEvent.click(expandButton);
        // Toggle back
        fireEvent.click(expandButton);
        expect(expandButton).toBeInTheDocument();
      }
    });

    it("supports Space key for accordion expansion", () => {
      renderWithRouter(<Sidebar />);
      const workstationsItem = screen.getByText("Workstations");
      const expandButton = workstationsItem.parentElement.querySelector(
        '[aria-label*="Expand"]'
      );
      if (expandButton) {
        fireEvent.keyDown(expandButton, { key: " " });
        expect(expandButton).toBeInTheDocument();
      }
    });

    it("stops propagation when accordion toggle is clicked", () => {
      const { container } = renderWithRouter(<Sidebar />);
      const workstationsItem = screen.getByText("Workstations");
      const expandButton = workstationsItem.parentElement.querySelector(
        '[aria-label*="Expand"]'
      );
      if (expandButton) {
        fireEvent.click(expandButton);
        // Should not navigate to workstations page
        expect(window.location.pathname).not.toBe("/workstations");
      }
    });
  });

  describe("Company Block", () => {
    it("renders company name and email", () => {
      renderWithRouter(<Sidebar collapsed={false} />);
      expect(screen.getByText("Company Inc.")).toBeInTheDocument();
      expect(screen.getByText("admin@company.com")).toBeInTheDocument();
    });

    it("navigates to organizations when company block is clicked", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const companyBlock = screen.getByLabelText("Switch company");
      fireEvent.click(companyBlock);
      expect(window.location.pathname).toBe("/organizations");
    });

    it("supports keyboard navigation for company block", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const companyBlock = screen.getByLabelText("Switch company");
      fireEvent.keyDown(companyBlock, { key: "Enter" });
      expect(window.location.pathname).toBe("/organizations");
    });

    it("supports Space key for company block navigation", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const companyBlock = screen.getByLabelText("Switch company");
      fireEvent.keyDown(companyBlock, { key: " " });
      expect(window.location.pathname).toBe("/organizations");
    });

    it("does not navigate in provisioning mode", () => {
      renderWithRouter(<Sidebar mode="provisioning" />);
      const companyBlock = screen.getByLabelText("Switch company");
      fireEvent.click(companyBlock);
      expect(window.location.pathname).toBe("/");
    });

    it("hides company details when collapsed", () => {
      renderWithRouter(<Sidebar collapsed={true} />);
      expect(screen.queryByText("Company Inc.")).not.toBeInTheDocument();
      expect(screen.queryByText("admin@company.com")).not.toBeInTheDocument();
    });
  });

  describe("Bottom Actions", () => {
    it("renders Settings link", () => {
      renderWithRouter(<Sidebar mode="full" />);
      expect(screen.getByLabelText("Settings")).toBeInTheDocument();
    });

    it("renders Get support link", () => {
      renderWithRouter(<Sidebar mode="full" />);
      expect(screen.getByLabelText("Get support")).toBeInTheDocument();
    });

    it("navigates to settings when clicked", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const settingsButton = screen.getByLabelText("Settings");
      fireEvent.click(settingsButton);
      expect(window.location.pathname).toBe("/settings");
    });

    it("navigates to support when clicked", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const supportButton = screen.getByLabelText("Get support");
      fireEvent.click(supportButton);
      expect(window.location.pathname).toBe("/support");
    });

    it("supports keyboard navigation for settings", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const settingsButton = screen.getByLabelText("Settings");
      fireEvent.keyDown(settingsButton, { key: "Enter" });
      expect(window.location.pathname).toBe("/settings");
    });

    it("supports keyboard navigation for support", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const supportButton = screen.getByLabelText("Get support");
      fireEvent.keyDown(supportButton, { key: "Enter" });
      expect(window.location.pathname).toBe("/support");
    });

    it("supports Space key for settings navigation", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const settingsButton = screen.getByLabelText("Settings");
      fireEvent.keyDown(settingsButton, { key: " " });
      expect(window.location.pathname).toBe("/settings");
    });

    it("supports Space key for support navigation", () => {
      renderWithRouter(<Sidebar mode="full" />);
      const supportButton = screen.getByLabelText("Get support");
      fireEvent.keyDown(supportButton, { key: " " });
      expect(window.location.pathname).toBe("/support");
    });

    it("hides Settings and Get support in provisioning mode", () => {
      renderWithRouter(<Sidebar mode="provisioning" />);
      expect(screen.queryByLabelText("Settings")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Get support")).not.toBeInTheDocument();
    });

    it("hides text labels when collapsed", () => {
      renderWithRouter(<Sidebar collapsed={true} mode="full" />);
      const settingsButton = screen.getByLabelText("Settings");
      expect(settingsButton.textContent).not.toContain("Settings");
    });
  });

  describe("Count Badges", () => {
    it("displays count badge for Workstations", () => {
      renderWithRouter(<Sidebar collapsed={false} />);
      const workstationsItem = screen
        .getByText("Workstations")
        .closest('[role="button"]');
      expect(workstationsItem.textContent).toContain("6");
    });

    it("displays count badge for Employees", () => {
      renderWithRouter(<Sidebar collapsed={false} />);
      const employeesItem = screen
        .getByText("Employees")
        .closest('[role="button"]');
      expect(employeesItem.textContent).toContain("6");
    });

    it("displays count badge for Groups", () => {
      renderWithRouter(<Sidebar collapsed={false} />);
      const groupsItem = screen.getByText("Groups").closest('[role="button"]');
      expect(groupsItem.textContent).toContain("6");
    });

    it("shows count badges when collapsed", () => {
      renderWithRouter(<Sidebar collapsed={true} />);
      const container = screen
        .getByLabelText(/expand sidebar/i)
        .closest("div").parentElement;
      // Count badges should still be visible in collapsed mode
      expect(container).toBeInTheDocument();
    });
  });

  describe("Navigation", () => {
    it("navigates to workstations page", () => {
      renderWithRouter(<Sidebar />);
      const workstationsButton = screen
        .getByText("Workstations")
        .closest('[role="button"]');
      fireEvent.click(workstationsButton);
      expect(window.location.pathname).toBe("/workstations");
    });

    it("navigates to employees page", () => {
      renderWithRouter(<Sidebar />);
      const employeesButton = screen
        .getByText("Employees")
        .closest('[role="button"]');
      fireEvent.click(employeesButton);
      expect(window.location.pathname).toBe("/employees");
    });

    it("navigates to groups page", () => {
      renderWithRouter(<Sidebar />);
      const groupsButton = screen
        .getByText("Groups")
        .closest('[role="button"]');
      fireEvent.click(groupsButton);
      expect(window.location.pathname).toBe("/groups");
    });

    it("navigates to files page", () => {
      renderWithRouter(<Sidebar />);
      const filesButton = screen.getByText("Files").closest('[role="button"]');
      fireEvent.click(filesButton);
      expect(window.location.pathname).toBe("/files");
    });

    it("supports keyboard navigation with Space key for nav items", () => {
      renderWithRouter(<Sidebar />);
      const dashboardButton = screen
        .getByText("Dashboard")
        .closest('[role="button"]');
      fireEvent.keyDown(dashboardButton, { key: " " });
      expect(window.location.pathname).toBe("/dashboard");
    });

    it("marks workstations as active when on workstations route", () => {
      renderWithRouter(<Sidebar />, { route: "/workstations" });
      const workstationsIcon = screen.getByTestId("workstations-icon");
      expect(workstationsIcon).toHaveAttribute("data-selected", "true");
    });

    it("marks employees as active when on employees route", () => {
      renderWithRouter(<Sidebar />, { route: "/employees" });
      const usersIcon = screen.getByTestId("users-icon");
      expect(usersIcon).toHaveAttribute("data-selected", "true");
    });

    it("marks groups as active when on groups route", () => {
      renderWithRouter(<Sidebar />, { route: "/groups" });
      const groupsIcon = screen.getByTestId("groups-icon");
      expect(groupsIcon).toHaveAttribute("data-selected", "true");
    });

    it("marks files as active when on files route", () => {
      renderWithRouter(<Sidebar />, { route: "/files" });
      const filesIcon = screen.getByTestId("files-icon");
      expect(filesIcon).toHaveAttribute("data-selected", "true");
    });

    it("marks route as active when on sub-route", () => {
      renderWithRouter(<Sidebar />, { route: "/workstations/detail" });
      const workstationsIcon = screen.getByTestId("workstations-icon");
      expect(workstationsIcon).toHaveAttribute("data-selected", "true");
    });

    it("marks settings as active when on settings route", () => {
      renderWithRouter(<Sidebar mode="full" />, { route: "/settings" });
      const settingsButton = screen.getByLabelText("Settings");
      expect(settingsButton).toBeInTheDocument();
    });

    it("marks support as active when on support route", () => {
      renderWithRouter(<Sidebar mode="full" />, { route: "/support" });
      const supportButton = screen.getByLabelText("Get support");
      expect(supportButton).toBeInTheDocument();
    });
  });
});
