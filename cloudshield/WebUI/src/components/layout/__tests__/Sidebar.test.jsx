import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import Sidebar from "../Sidebar";

// Mock react-router-dom's useNavigate and useLocation to test navigation and active route marking
const mockNavigate = jest.fn();
let mockPathname = "/";

jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: mockPathname }),
  };
});

// Mock API hooks and client
jest.mock("../../../api/client", () => ({
  apiGet: jest.fn(),
}));

jest.mock("../../../api/useOrgMetrics.js", () => ({
  useOrgMetrics: jest.fn(),
}));

const mockLogout = jest.fn();
jest.mock("../../../context/AuthContext.jsx", () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

// Mock icons to test that they receive the correct props without rendering the actual SVGs
jest.mock("../../../assets/NavBar/DashboardIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="dashboard-icon"
      data-selected={String(!!selected)}
      width={width}
      height={height}
    />
  ),
}));

jest.mock("../../../assets/NavBar/WorkstationsIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="workstations-icon"
      data-selected={String(!!selected)}
      width={width}
      height={height}
    />
  ),
}));

jest.mock("../../../assets/NavBar/UsersIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="users-icon"
      data-selected={String(!!selected)}
      width={width}
      height={height}
    />
  ),
}));

jest.mock("../../../assets/NavBar/GroupsIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="groups-icon"
      data-selected={String(!!selected)}
      width={width}
      height={height}
    />
  ),
}));

jest.mock("../../../assets/NavBar/FilesIcon", () => ({
  __esModule: true,
  default: ({ selected, width, height }) => (
    <svg
      data-testid="files-icon"
      data-selected={String(!!selected)}
      width={width}
      height={height}
    />
  ),
}));

const { apiGet } = require("../../../api/client");
const { useOrgMetrics } = require("../../../api/useOrgMetrics.js");

// Helper
const renderSidebar = (props = {}, { route = "/" } = {}) => {
  mockPathname = route;
  return render(<Sidebar {...props} />);
};

describe("Sidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    mockLogout.mockClear();
    mockPathname = "/";

    // Keep Sidebar stable: use default labels by returning matching data
    apiGet.mockReset();
    apiGet
      .mockResolvedValueOnce({ user: { email: "admin@company.com" } })
      .mockResolvedValueOnce({ organization: { name: "Company Inc." } });

    // Default stats: your tests expect "6"
    useOrgMetrics.mockReset();
    useOrgMetrics.mockReturnValue({
      stats: { workstations: 6, users: 6, groups: 6, shares: 6 },
      loading: false,
    });
  });

  describe("Full Mode", () => {
    it("renders in full mode by default", () => {
      renderSidebar();
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
    });

    it("displays navigation items when not collapsed", () => {
      renderSidebar({ collapsed: false });
      expect(screen.getByText("Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Workstations")).toBeInTheDocument();
      expect(screen.getByText("Employees")).toBeInTheDocument();
      expect(screen.getByText("Groups")).toBeInTheDocument();
    });

    it("renders custom icons with correct size", () => {
      renderSidebar({ collapsed: false });
      const dashboardIcon = screen.getByTestId("dashboard-icon");
      expect(dashboardIcon).toHaveAttribute("width", "20");
      expect(dashboardIcon).toHaveAttribute("height", "20");
    });

    it("passes selected prop to icon on active route", () => {
      renderSidebar({}, { route: "/dashboard" });
      const dashboardIcon = screen.getByTestId("dashboard-icon");
      expect(dashboardIcon).toHaveAttribute("data-selected", "true");
    });

    it("does not pass selected prop to icon on inactive route", () => {
      renderSidebar({}, { route: "/dashboard" });
      const workstationsIcon = screen.getByTestId("workstations-icon");
      expect(workstationsIcon).toHaveAttribute("data-selected", "false");
    });

    it("shows collapse button", () => {
      renderSidebar({ onToggleCollapse: jest.fn() });
      const btn = screen.getByLabelText(/collapse sidebar/i);
      expect(btn).toBeInTheDocument();
    });

    it("calls onToggleCollapse when collapse button is clicked", () => {
      const mockToggle = jest.fn();
      renderSidebar({ onToggleCollapse: mockToggle, collapsed: false });

      const collapseButton = screen.getByLabelText(/collapse sidebar/i);
      fireEvent.click(collapseButton);

      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it("navigates when navigation item is clicked (assert navigate called)", () => {
      renderSidebar();
      fireEvent.click(screen.getByRole("button", { name: "Dashboard" }));
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("supports keyboard navigation (Enter) for nav items", () => {
      renderSidebar();
      const dashboardBtn = screen.getByRole("button", { name: "Dashboard" });
      fireEvent.keyDown(dashboardBtn, { key: "Enter" });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });

    it("supports keyboard navigation (Space) for nav items", () => {
      renderSidebar();
      const dashboardBtn = screen.getByRole("button", { name: "Dashboard" });
      fireEvent.keyDown(dashboardBtn, { key: " " });
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Collapsed State", () => {
    it("hides navigation labels when collapsed", () => {
      renderSidebar({ collapsed: true });

      // Labels are inside {!collapsed && ...}, so they won't render
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("Workstations")).not.toBeInTheDocument();
      expect(screen.queryByText("Employees")).not.toBeInTheDocument();
    });

    it("shows expand button when collapsed", () => {
      renderSidebar({ collapsed: true, onToggleCollapse: jest.fn() });
      const expandButton = screen.getByLabelText(/expand sidebar/i);
      expect(expandButton).toBeInTheDocument();
    });
  });

  describe("Provisioning Mode", () => {
    it("renders in provisioning mode (no main tabs)", () => {
      renderSidebar({ mode: "provisioning" });
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.getByLabelText("Switch company")).toBeInTheDocument();
    });

    it("shows collapse/expand button in provisioning mode", () => {
      renderSidebar({ mode: "provisioning", onToggleCollapse: jest.fn() });
      const btn = screen.getByLabelText(/collapse sidebar|expand sidebar/i);
      expect(btn).toBeInTheDocument();
    });
  });

  describe("Company Block", () => {
    it("renders company name and email (default or loaded)", () => {
      renderSidebar({ collapsed: false });

      // Because apiGet resolves to Company Inc + admin@company.com in beforeEach
      expect(screen.getByText("Company Inc.")).toBeInTheDocument();
      expect(screen.getByText("admin@company.com")).toBeInTheDocument();
    });

    it("navigates to organizations when company block is clicked (full mode)", () => {
      renderSidebar({ mode: "full" });

      const companyBlock = screen.getByLabelText("Switch company");
      fireEvent.click(companyBlock);

      expect(mockNavigate).toHaveBeenCalledWith("/organizations");
    });

    it("supports keyboard navigation for company block (Enter)", () => {
      renderSidebar({ mode: "full" });

      const companyBlock = screen.getByLabelText("Switch company");
      fireEvent.keyDown(companyBlock, { key: "Enter" });

      expect(mockNavigate).toHaveBeenCalledWith("/organizations");
    });

    it("supports Space key for company block navigation", () => {
      renderSidebar({ mode: "full" });

      const companyBlock = screen.getByLabelText("Switch company");
      fireEvent.keyDown(companyBlock, { key: " " });

      expect(mockNavigate).toHaveBeenCalledWith("/organizations");
    });

    it("does not navigate in provisioning mode", () => {
      renderSidebar({ mode: "provisioning" });

      const companyBlock = screen.getByLabelText("Switch company");
      fireEvent.click(companyBlock);
      fireEvent.keyDown(companyBlock, { key: "Enter" });
      fireEvent.keyDown(companyBlock, { key: " " });

      expect(mockNavigate).not.toHaveBeenCalledWith("/organizations");
    });

    it("hides company details when collapsed", () => {
      renderSidebar({ collapsed: true });
      expect(screen.queryByText("Company Inc.")).not.toBeInTheDocument();
      expect(screen.queryByText("admin@company.com")).not.toBeInTheDocument();
    });
  });

  describe("Bottom Actions", () => {
    it("renders Settings + Sign out in full mode", () => {
      renderSidebar({ mode: "full" });
      expect(screen.getByLabelText("Settings")).toBeInTheDocument();
      expect(screen.getByLabelText("Sign out")).toBeInTheDocument();
    });

    it("navigates to settings when clicked", () => {
      renderSidebar({ mode: "full" });
      fireEvent.click(screen.getByLabelText("Settings"));
      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });

    it("opens a confirmation modal before signing out", () => {
      renderSidebar({ mode: "full" });
      fireEvent.click(screen.getByLabelText("Sign out"));
      expect(screen.getByText("Confirm Sign Out")).toBeInTheDocument();
      expect(mockLogout).not.toHaveBeenCalled();
    });

    it("logs out and navigates to login when sign out is confirmed", () => {
      renderSidebar({ mode: "full" });
      fireEvent.click(screen.getByLabelText("Sign out"));
      fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));
      expect(mockLogout).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });

    it("closes the sign out modal without logging out when cancelled", () => {
      renderSidebar({ mode: "full" });
      fireEvent.click(screen.getByLabelText("Sign out"));
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      return waitFor(() => {
        expect(screen.queryByText("Confirm Sign Out")).not.toBeInTheDocument();
        expect(mockLogout).not.toHaveBeenCalled();
      });
    });

    it("supports keyboard navigation for settings (Enter + Space)", () => {
      renderSidebar({ mode: "full" });
      const settings = screen.getByLabelText("Settings");

      fireEvent.keyDown(settings, { key: "Enter" });
      fireEvent.keyDown(settings, { key: " " });

      expect(mockNavigate).toHaveBeenCalledWith("/settings");
    });

    it("supports keyboard navigation for sign out (Enter + Space)", () => {
      renderSidebar({ mode: "full" });
      const signOut = screen.getByLabelText("Sign out");

      fireEvent.keyDown(signOut, { key: "Enter" });
      expect(screen.getByText("Confirm Sign Out")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));
      expect(mockNavigate).toHaveBeenCalledWith("/login", { replace: true });
    });

    it("hides Settings and Sign out in provisioning mode", () => {
      renderSidebar({ mode: "provisioning" });
      expect(screen.queryByLabelText("Settings")).not.toBeInTheDocument();
      expect(screen.queryByLabelText("Sign out")).not.toBeInTheDocument();
    });

    it("hides text labels when collapsed", () => {
      renderSidebar({ collapsed: true, mode: "full" });
      const settingsButton = screen.getByLabelText("Settings");
      // In collapsed mode, the Typography doesn't render
      expect(settingsButton.textContent).not.toContain("Settings");
    });
  });

  describe("Count Badges", () => {
    it("displays count badge for Workstations (not collapsed)", () => {
      renderSidebar({ collapsed: false });
      const workstations = screen.getByRole("button", { name: "Workstations" });
      expect(workstations.textContent).toContain("6");
    });

    it("displays count badge for Employees (not collapsed)", () => {
      renderSidebar({ collapsed: false });
      const employees = screen.getByRole("button", { name: "Employees" });
      expect(employees.textContent).toContain("6");
    });

    it("displays count badge for Groups (not collapsed)", () => {
      renderSidebar({ collapsed: false });
      const groups = screen.getByRole("button", { name: "Groups" });
      expect(groups.textContent).toContain("6");
    });

    it("does NOT render count labels when collapsed (counts are undefined in collapsed mode)", () => {
      useOrgMetrics.mockReturnValue({
        stats: { workstations: 6, users: 6, groups: 6, shares: 0 },
        loading: false,
      });

      renderSidebar({ collapsed: true });

      expect(screen.queryByText("6")).not.toBeInTheDocument();
      expect(screen.queryByText("-")).not.toBeInTheDocument();
    });
  });

  
  describe("Active Route Marking", () => {
    it("marks workstations as active when on workstations route", () => {
      renderSidebar({}, { route: "/workstations" });
      const icon = screen.getByTestId("workstations-icon");
      expect(icon).toHaveAttribute("data-selected", "true");
    });

    it("marks employees as active when on employees route", () => {
      renderSidebar({}, { route: "/employees" });
      const icon = screen.getByTestId("users-icon");
      expect(icon).toHaveAttribute("data-selected", "true");
    });

    it("marks groups as active when on groups route", () => {
      renderSidebar({}, { route: "/groups" });
      const icon = screen.getByTestId("groups-icon");
      expect(icon).toHaveAttribute("data-selected", "true");
    });

    it("marks files as active when on files route", () => {
      renderSidebar({}, { route: "/files" });
      const icon = screen.getByTestId("files-icon");
      expect(icon).toHaveAttribute("data-selected", "true");
    });

    it("marks route as active when on sub-route", () => {
      renderSidebar({}, { route: "/workstations/detail" });
      const icon = screen.getByTestId("workstations-icon");
      expect(icon).toHaveAttribute("data-selected", "true");
    });
  });

  it('displays "-" for Shares when shares count is 0 (not collapsed)', () => {
    useOrgMetrics.mockReturnValue({
      stats: { workstations: 6, users: 6, groups: 6, shares: 0 },
      loading: false,
    });

    renderSidebar({ collapsed: false });

    const shares = screen.getByRole("button", { name: "Shares" });
    expect(shares.textContent).toContain("-");
    expect(shares.textContent).not.toContain("0");
  });

  it("displays numeric badge for Shares when shares count is greater than 0", () => {
    useOrgMetrics.mockReturnValue({
      stats: { workstations: 6, users: 6, groups: 6, shares: 33 },
      loading: false,
    });

    renderSidebar({ collapsed: false });

    const shares = screen.getByRole("button", { name: "Shares" });
    expect(shares.textContent).toContain("33");
  });
});
