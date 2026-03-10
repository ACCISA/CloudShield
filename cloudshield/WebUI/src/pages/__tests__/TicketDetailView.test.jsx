import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TicketDetailView from "../Tickets/TicketDetailView";

// jsdom doesn't implement scrollIntoView — mock it globally
window.HTMLElement.prototype.scrollIntoView = jest.fn();

// --- Mocks ---
jest.mock("../../api/client", () => ({
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
}));
jest.mock("../../api/ticketsApi", () => ({
  replyToTicket: jest.fn(),
}));
jest.mock("react-markdown", () => ({
  __esModule: true,
  default: ({ children }) => <span data-testid="md">{children}</span>,
}));

import { apiGet, apiPatch } from "../../api/client";
import { replyToTicket } from "../../api/ticketsApi";

// --- Fixtures ---
const TICKET_ID = "ticket-abc-123";

const makeTicket = (overrides = {}) => ({
  id: TICKET_ID,
  title: "VPN not connecting",
  description: "I cannot connect to the VPN.",
  status: "Open",
  priority: "High",
  user_id: "alice@org.com",
  org_id: "org-deadbeef1234",
  created_at: "2026-03-09T10:00:00",
  replies: [],
  ...overrides,
});

const makeReply = (overrides = {}) => ({
  id: "reply-1",
  user_id: "alice@org.com",
  message: "Still not working",
  created_at: "2026-03-09T10:05:00",
  metadata: {},
  ...overrides,
});

const renderView = () =>
  render(
    <MemoryRouter initialEntries={[`/tickets/${TICKET_ID}`]}>
      <Routes>
        <Route path="/tickets/:ticketId" element={<TicketDetailView />} />
      </Routes>
    </MemoryRouter>
  );

// Default: /users/me returns regular user, /tickets/:id returns ticket
const setupDefault = (ticket = makeTicket(), replies = []) => {
  ticket.replies = replies;
  apiGet.mockImplementation((url) => {
    if (url === "/users/me") return Promise.resolve({ user: { email: "alice@org.com" } });
    if (url.startsWith("/tickets/")) return Promise.resolve(ticket);
    return Promise.reject(new Error("unknown"));
  });
};

describe("TicketDetailView", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    apiGet.mockReset();
    apiPatch.mockReset();
    replyToTicket.mockReset();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  // --- Loading / error / not found ---

  it("shows loading state initially", () => {
    apiGet.mockReturnValue(new Promise(() => {})); // never resolves
    render(
      <MemoryRouter initialEntries={[`/tickets/${TICKET_ID}`]}>
        <Routes><Route path="/tickets/:ticketId" element={<TicketDetailView />} /></Routes>
      </MemoryRouter>
    );
    expect(screen.getByText(/Loading ticket/i)).toBeInTheDocument();
  });

  it("shows error when ticket fetch fails", async () => {
    apiGet.mockImplementation((url) => {
      if (url === "/users/me") return Promise.resolve({ user: { email: "alice@org.com" } });
      return Promise.reject(new Error("Network error"));
    });
    await act(async () => { renderView(); });
    expect(screen.getByText(/Network error/i)).toBeInTheDocument();
  });

  it("shows ticket-not-found when response is null", async () => {
    apiGet.mockImplementation((url) => {
      if (url === "/users/me") return Promise.resolve({ user: { email: "alice@org.com" } });
      return Promise.resolve(null);
    });
    await act(async () => { renderView(); });
    expect(screen.getByText(/Ticket not found/i)).toBeInTheDocument();
  });

  // --- Basic render ---

  it("renders ticket title and description", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText("VPN not connecting")).toBeInTheDocument();
    expect(screen.getByText("I cannot connect to the VPN.")).toBeInTheDocument();
  });

  it("renders Back to Helpdesk button", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/Back to Helpdesk/i)).toBeInTheDocument();
  });

  it("renders requester name in sidebar", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText("alice@org.com")).toBeInTheDocument();
  });

  it("renders status and priority selects", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it("shows empty state when no replies", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/Start the conversation/i)).toBeInTheDocument();
  });

  // --- Category parsing ---

  it("strips [Category:] prefix from description", async () => {
    setupDefault(makeTicket({ description: "[Category: Network]\n\nCannot reach VPN." }));
    await act(async () => { renderView(); });
    expect(screen.getByText("Cannot reach VPN.")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.queryByText(/\[Category:/)).not.toBeInTheDocument();
  });

  // --- Messages ---

  it("renders a user reply", async () => {
    setupDefault(makeTicket(), [makeReply()]);
    await act(async () => { renderView(); });
    expect(screen.getByText("Still not working")).toBeInTheDocument();
  });

  it("labels AI reply as Cortex AI", async () => {
    const aiReply = makeReply({
      user_id: "CloudShield Support",
      message: "Try restarting the Desktop App.",
      metadata: { ai_generated: true },
    });
    setupDefault(makeTicket(), [aiReply]);
    await act(async () => { renderView(); });
    expect(screen.getByText("Cortex AI")).toBeInTheDocument();
  });

  it("labels system message as System Alert", async () => {
    const sysReply = makeReply({
      user_id: "CloudShield Support",
      message: "[SYSTEM] Ticket escalated.",
      metadata: {},
    });
    setupDefault(makeTicket(), [sysReply]);
    await act(async () => { renderView(); });
    expect(screen.getByText("System Alert")).toBeInTheDocument();
  });

  it("labels own user reply as You", async () => {
    const myReply = makeReply({ user_id: "alice@org.com", message: "Please help me." });
    setupDefault(makeTicket(), [myReply]);
    await act(async () => { renderView(); });
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("shows other user's name from email prefix", async () => {
    const otherReply = makeReply({ user_id: "bob@org.com", message: "I see the issue." });
    setupDefault(makeTicket(), [otherReply]);
    await act(async () => { renderView(); });
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  // --- Reply form ---

  it("renders reply textarea when ticket is open", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByPlaceholderText(/Type a message/i)).toBeInTheDocument();
  });

  it("send button is disabled when textarea is empty", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    const btn = screen.getByRole("button", { name: "" }); // send icon btn
    // The submit button is disabled when no text
    const form = screen.getByPlaceholderText(/Type a message/i).closest("form");
    const submitBtn = form.querySelector("button[type=submit]");
    expect(submitBtn).toBeDisabled();
  });

  it("submits reply and clears textarea", async () => {
    replyToTicket.mockResolvedValue({});
    setupDefault();
    await act(async () => { renderView(); });

    const textarea = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(textarea, { target: { value: "Hello support team" } });

    await act(async () => {
      fireEvent.submit(textarea.closest("form"));
    });

    expect(replyToTicket).toHaveBeenCalledWith(TICKET_ID, "Hello support team");
    expect(textarea.value).toBe("");
  });

  it("submits reply on Enter key", async () => {
    replyToTicket.mockResolvedValue({});
    setupDefault();
    await act(async () => { renderView(); });

    const textarea = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(textarea, { target: { value: "Quick message" } });

    await act(async () => {
      fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });
    });

    expect(replyToTicket).toHaveBeenCalledWith(TICKET_ID, "Quick message");
  });

  it("does not submit on Shift+Enter", async () => {
    setupDefault();
    await act(async () => { renderView(); });

    const textarea = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(textarea, { target: { value: "Line one" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(replyToTicket).not.toHaveBeenCalled();
  });

  // --- Closed ticket ---

  it("shows closed message and hides reply form when status is Closed", async () => {
    setupDefault(makeTicket({ status: "Closed" }));
    await act(async () => { renderView(); });
    expect(screen.getByText(/This ticket has been closed/i)).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Type a message/i)).not.toBeInTheDocument();
  });

  it("hides escalate button when closed", async () => {
    setupDefault(makeTicket({ status: "Closed" }));
    await act(async () => { renderView(); });
    expect(screen.queryByText(/Escalate to Human Agent/i)).not.toBeInTheDocument();
  });

  it("hides close ticket button when closed", async () => {
    setupDefault(makeTicket({ status: "Closed" }));
    await act(async () => { renderView(); });
    expect(screen.queryByText(/Close Ticket/i)).not.toBeInTheDocument();
  });

  // --- Status / priority update ---

  it("calls apiPatch when status is changed", async () => {
    apiPatch.mockResolvedValue({});
    setupDefault();
    await act(async () => { renderView(); });

    await act(async () => {
      const [statusSelect] = screen.getAllByRole("combobox");
      fireEvent.change(statusSelect, { target: { value: "Pending" } });
    });

    expect(apiPatch).toHaveBeenCalledWith(
      `/tickets/${TICKET_ID}/status`,
      { status: "Pending" }
    );
  });

  it("calls apiPatch when priority is changed", async () => {
    apiPatch.mockResolvedValue({});
    setupDefault();
    await act(async () => { renderView(); });

    await act(async () => {
      const selects = screen.getAllByRole("combobox");
      fireEvent.change(selects[1], { target: { value: "Low" } });
    });

    expect(apiPatch).toHaveBeenCalledWith(
      `/tickets/${TICKET_ID}/status`,
      { priority: "Low" }
    );
  });

  it("closes ticket when Close Ticket button is clicked", async () => {
    apiPatch.mockResolvedValue({});
    setupDefault();
    await act(async () => { renderView(); });

    await act(async () => {
      fireEvent.click(screen.getByText(/Close Ticket/i));
    });

    expect(apiPatch).toHaveBeenCalledWith(
      `/tickets/${TICKET_ID}/status`,
      { status: "Closed" }
    );
  });

  // --- Escalate button ---

  it("renders Escalate to Human Agent button for regular open ticket", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/Escalate to Human Agent/i)).toBeInTheDocument();
  });

  it("clicking escalate calls replyToTicket with [SYSTEM] message", async () => {
    replyToTicket.mockResolvedValue({});
    setupDefault();
    await act(async () => { renderView(); });

    await act(async () => {
      fireEvent.click(screen.getByText(/Escalate to Human Agent/i));
    });

    expect(replyToTicket).toHaveBeenCalledWith(
      TICKET_ID,
      expect.stringContaining("[SYSTEM]")
    );
  });

  // --- Super admin view ---

  it("shows org_id for super admin", async () => {
    apiGet.mockImplementation((url) => {
      if (url === "/users/me") return Promise.resolve({ user: { email: "support@cloudshield.com" } });
      return Promise.resolve(makeTicket());
    });
    await act(async () => { renderView(); });
    expect(screen.getByText(/Organization ID/i)).toBeInTheDocument();
  });

  it("hides escalate button for super admin", async () => {
    apiGet.mockImplementation((url) => {
      if (url === "/users/me") return Promise.resolve({ user: { email: "support@cloudshield.com" } });
      return Promise.resolve(makeTicket());
    });
    await act(async () => { renderView(); });
    expect(screen.queryByText(/Escalate to Human Agent/i)).not.toBeInTheDocument();
  });

  // --- Polling ---

  it("polls for updates every 5 seconds", async () => {
    setupDefault();
    await act(async () => { renderView(); });

    const callsBefore = apiGet.mock.calls.filter(c => c[0].startsWith("/tickets/")).length;

    await act(async () => { jest.advanceTimersByTime(5000); });
    await act(async () => {}); // flush promises

    const callsAfter = apiGet.mock.calls.filter(c => c[0].startsWith("/tickets/")).length;
    expect(callsAfter).toBeGreaterThan(callsBefore);
  });

  // --- Disclaimer ---

  it("shows AI disclaimer when ticket is open", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/CloudShield AI processes this chat/i)).toBeInTheDocument();
  });
});


// ===========================================================================
// Extra tests to cover textarea auto-resize and remaining sidebar branches
// ===========================================================================

describe("TicketDetailView — extra coverage", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    apiGet.mockReset();
    apiPatch.mockReset();
    replyToTicket.mockReset();
    window.HTMLElement.prototype.scrollIntoView = jest.fn();
  });
  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const setupDefault = (ticket, replies = []) => {
    if (ticket) ticket.replies = replies;
    apiGet.mockImplementation((url) => {
      if (url === "/users/me") return Promise.resolve({ user: { email: "alice@org.com" } });
      return Promise.resolve(ticket || {
        id: TICKET_ID, title: "T", description: "D", status: "Open",
        priority: "High", user_id: "alice@org.com",
        org_id: "org-deadbeef1234", created_at: "2026-03-09T10:00:00", replies: [],
      });
    });
  };

  it("textarea onChange updates replyText", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    const ta = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(ta, { target: { value: "hello" } });
    expect(ta.value).toBe("hello");
  });

  it("does not submit empty reply on Enter", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    const ta = screen.getByPlaceholderText(/Type a message/i);
    await act(async () => {
      fireEvent.keyDown(ta, { key: "Enter", shiftKey: false });
    });
    expect(replyToTicket).not.toHaveBeenCalled();
  });

  it("renders ticket created date in sidebar", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/Created On/i)).toBeInTheDocument();
  });

  it("renders Ticket Details section label", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/Ticket Details/i)).toBeInTheDocument();
  });

  it("renders Properties section label", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/Properties/i)).toBeInTheDocument();
  });

  it("renders Category in sidebar", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/Category/i)).toBeInTheDocument();
  });

  it("renders Requester label in sidebar", async () => {
    setupDefault();
    await act(async () => { renderView(); });
    expect(screen.getByText(/Requester/i)).toBeInTheDocument();
  });
});