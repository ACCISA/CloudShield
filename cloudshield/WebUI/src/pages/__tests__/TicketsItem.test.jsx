import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import TicketsItem from "../Tickets/TicketsItem";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
}));

const mockNavigate = jest.fn();

beforeEach(() => {
  useNavigate.mockReturnValue(mockNavigate);
  mockNavigate.mockClear();
});

const baseTicket = {
  id: "abc123",
  title: "VPN not connecting",
  created_at: "2026-03-09T10:00:00",
  priority: "High",
  status: "Open",
  org_id: "org_xyz789",
};

const renderItem = (props = {}) =>
  render(
    <MemoryRouter>
      <TicketsItem ticket={baseTicket} isEven={false} isSuperAdmin={false} {...props} />
    </MemoryRouter>
  );

describe("TicketsItem", () => {
  it("renders ticket title", () => {
    renderItem();
    expect(screen.getByText("VPN not connecting")).toBeInTheDocument();
  });

  it("renders priority", () => {
    renderItem();
    expect(screen.getByText("High")).toBeInTheDocument();
  });

  it("renders status", () => {
    renderItem();
    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("navigates to ticket detail on row click", () => {
    renderItem();
    fireEvent.click(screen.getByText("VPN not connecting"));
    expect(mockNavigate).toHaveBeenCalledWith("/tickets/abc123");
  });

  it("does not show org_id when not super admin", () => {
    renderItem({ isSuperAdmin: false });
    expect(screen.queryByText(/org_xyz/i)).not.toBeInTheDocument();
  });

  it("shows truncated org_id when super admin", () => {
    renderItem({ isSuperAdmin: true });
    expect(screen.getByText(/org_xyz7\.\.\./i)).toBeInTheDocument();
  });

  it("renders Medium priority correctly", () => {
    renderItem({ ticket: { ...baseTicket, priority: "Medium" } });
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("renders Low priority correctly", () => {
    renderItem({ ticket: { ...baseTicket, priority: "Low" } });
    expect(screen.getByText("Low")).toBeInTheDocument();
  });

  it("renders Closed status", () => {
    renderItem({ ticket: { ...baseTicket, status: "Closed" } });
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });
});