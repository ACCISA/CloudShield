import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TicketsTable from "../Tickets/TicketsTable";

const mockTickets = [
  {
    id: "t1",
    title: "VPN not connecting",
    created_at: "2026-03-09T10:00:00",
    priority: "High",
    status: "Open",
    org_id: "org_abc123",
  },
  {
    id: "t2",
    title: "Z drive access denied",
    created_at: "2026-03-09T09:00:00",
    priority: "Medium",
    status: "Pending",
    org_id: "org_abc123",
  },
  {
    id: "t3",
    title: "Password reset",
    created_at: "2026-03-09T08:00:00",
    priority: "Low",
    status: "Closed",
    org_id: "org_abc123",
  },
];

const renderTable = (props = {}) =>
  render(
    <MemoryRouter>
      <TicketsTable tickets={mockTickets} {...props} />
    </MemoryRouter>
  );

describe("TicketsTable", () => {
  it("renders column headers", () => {
    renderTable();
    expect(screen.getByText("Ticket Title")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders all ticket titles", () => {
    renderTable();
    expect(screen.getByText("VPN not connecting")).toBeInTheDocument();
    expect(screen.getByText("Z drive access denied")).toBeInTheDocument();
    expect(screen.getByText("Password reset")).toBeInTheDocument();
  });

  it("renders priority labels", () => {
    renderTable();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.getByText("Medium")).toBeInTheDocument();
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("renders status values", () => {
    renderTable();
    expect(screen.getByText("Open")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows empty state when hasNoTickets is true", () => {
    renderTable({ tickets: [], hasNoTickets: true });
    expect(screen.getByText(/No tickets yet/i)).toBeInTheDocument();
  });

  it("shows no results state when hasNoResults is true", () => {
    renderTable({ tickets: [], hasNoResults: true });
    expect(screen.getByText(/No tickets found/i)).toBeInTheDocument();
  });

  it("does not show Org ID column when not super admin", () => {
    renderTable({ isSuperAdmin: false });
    expect(screen.queryByText("Org ID")).not.toBeInTheDocument();
  });

  it("shows Org ID column when super admin", () => {
    renderTable({ isSuperAdmin: true });
    expect(screen.getByText("Org ID")).toBeInTheDocument();
  });
});