import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TicketDashboard from "../Tickets/TicketDashboard";

jest.mock("../../api/ticketsApi", () => ({
  useTickets: jest.fn(),
}));
jest.mock("../../api/client", () => ({
  apiGet: jest.fn(),
}));
jest.mock("../../components/Tickets/CreateTicketModal", () => ({
  __esModule: true,
  default: ({ isOpen }) => isOpen ? <div data-testid="create-modal" /> : null,
}));

import { useTickets } from "../../api/ticketsApi";
import { apiGet } from "../../api/client";

const mockTickets = [
  { id: "1", title: "VPN issue", priority: "High", status: "Open", created_at: "2026-03-09T10:00:00", org_id: "org1" },
  { id: "2", title: "Password reset", priority: "Medium", status: "Pending", created_at: "2026-03-09T09:00:00", org_id: "org1" },
  { id: "3", title: "Drive access", priority: "Low", status: "Closed", created_at: "2026-03-09T08:00:00", org_id: "org1" },
];

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <TicketDashboard />
    </MemoryRouter>
  );

describe("TicketDashboard", () => {
  beforeEach(() => {
    useTickets.mockReturnValue({
      tickets: mockTickets,
      loading: false,
      error: null,
      refreshTickets: jest.fn(),
    });
    apiGet.mockResolvedValue({ user: { email: "admin@org.com" } });
  });
  afterEach(() => jest.clearAllMocks());

  it("renders the page title", async () => {
    await act(async () => { renderDashboard(); });
    await waitFor(() => {
      expect(screen.getByText("Support Helpdesk")).toBeInTheDocument();
    });
  });

  it("renders metric cards with CSS-uppercase labels", async () => {
    await act(async () => { renderDashboard(); });
    // Cards render mixed-case text; CSS handles visual uppercase
    expect(screen.getByText("Total Tickets")).toBeInTheDocument();
    expect(screen.getByText("Active Issues")).toBeInTheDocument();
    expect(screen.getByText("High Priority")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("shows correct total ticket count", async () => {
    await act(async () => { renderDashboard(); });
    await waitFor(() => {
      expect(screen.getByText("3")).toBeInTheDocument();
    });
  });

  it("shows loading state", async () => {
    useTickets.mockReturnValue({ tickets: null, loading: true, error: null, refreshTickets: jest.fn() });
    await act(async () => { renderDashboard(); });
    expect(screen.getByText(/Loading support tickets/i)).toBeInTheDocument();
  });

  it("shows error state", async () => {
    useTickets.mockReturnValue({ tickets: null, loading: false, error: { message: "Network error" }, refreshTickets: jest.fn() });
    await act(async () => { renderDashboard(); });
    expect(screen.getByText(/Error loading tickets/i)).toBeInTheDocument();
  });

  it("shows Create Ticket button for regular user", async () => {
    await act(async () => { renderDashboard(); });
    await waitFor(() => {
      expect(screen.getByText("Create Ticket")).toBeInTheDocument();
    });
  });

  it("hides Create Ticket button for super admin", async () => {
    apiGet.mockResolvedValue({ user: { email: "support@cloudshield.com" } });
    await act(async () => { renderDashboard(); });
    await waitFor(() => {
      expect(screen.queryByText("Create Ticket")).not.toBeInTheDocument();
    });
  });

  it("shows Global Support Helpdesk title for super admin", async () => {
    apiGet.mockResolvedValue({ user: { email: "support@cloudshield.com" } });
    await act(async () => { renderDashboard(); });
    await waitFor(() => {
      expect(screen.getByText("Global Support Helpdesk")).toBeInTheDocument();
    });
  });

  it("renders Support Tickets section header", async () => {
    await act(async () => { renderDashboard(); });
    await waitFor(() => {
      expect(screen.getByText("Support Tickets")).toBeInTheDocument();
    });
  });
});