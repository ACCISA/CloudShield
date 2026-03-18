import { renderHook, act, waitFor } from "@testing-library/react";
import { useTickets, createTicket, replyToTicket, updateTicketStatus } from "../ticketsApi";

jest.mock("../client", () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
  apiPatch: jest.fn(),
}));
import { apiGet, apiPost, apiPatch } from "../client";

const MOCK_TICKETS = [
  { id: "1", title: "VPN issue", status: "Open", priority: "High" },
  { id: "2", title: "Drive access", status: "Pending", priority: "Medium" },
];

describe("ticketsApi — useTickets", () => {
  afterEach(() => jest.clearAllMocks());

  it("returns tickets on successful fetch", async () => {
    apiGet.mockResolvedValue({ tickets: MOCK_TICKETS });
    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tickets).toEqual(MOCK_TICKETS);
    expect(result.current.error).toBeNull();
  });

  it("handles array response directly", async () => {
    apiGet.mockResolvedValue(MOCK_TICKETS);
    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets).toEqual(MOCK_TICKETS);
  });

  it("sets error on API failure", async () => {
    apiGet.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeTruthy();
    expect(result.current.tickets).toEqual([]);
  });

  it("starts with loading true", () => {
    apiGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() => useTickets());
    expect(result.current.loading).toBe(true);
  });

  it("refreshTickets re-fetches data", async () => {
    apiGet.mockResolvedValue({ tickets: MOCK_TICKETS });
    const { result } = renderHook(() => useTickets());

    await waitFor(() => expect(result.current.loading).toBe(false));

    apiGet.mockResolvedValue({ tickets: [MOCK_TICKETS[0]] });
    await act(async () => {
      await result.current.refreshTickets();
    });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets).toHaveLength(1);
  });

  it("returns empty array when response has no tickets key", async () => {
    apiGet.mockResolvedValue({});
    const { result } = renderHook(() => useTickets());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tickets).toEqual([]);
  });
});

describe("ticketsApi — createTicket", () => {
  afterEach(() => jest.clearAllMocks());

  it("calls apiPost with correct args", async () => {
    apiPost.mockResolvedValue({ id: "t1" });
    const result = await createTicket({ title: "VPN", description: "broken", priority: "High" });
    expect(apiPost).toHaveBeenCalledWith("/tickets", { title: "VPN", description: "broken", priority: "High" });
    expect(result).toEqual({ id: "t1" });
  });

  it("throws on API error", async () => {
    apiPost.mockRejectedValue(new Error("Bad request"));
    await expect(createTicket({ title: "" })).rejects.toThrow("Bad request");
  });
});

describe("ticketsApi — replyToTicket", () => {
  afterEach(() => jest.clearAllMocks());

  it("calls apiPost with ticket id and message", async () => {
    apiPost.mockResolvedValue({ message: "Reply added" });
    await replyToTicket("t1", "Hello");
    expect(apiPost).toHaveBeenCalledWith("/tickets/t1/reply", { message: "Hello" });
  });
});

describe("ticketsApi — updateTicketStatus", () => {
  afterEach(() => jest.clearAllMocks());

  it("calls apiPatch with ticket id and status", async () => {
    apiPatch.mockResolvedValue({ message: "Updated" });
    await updateTicketStatus("t1", "Closed");
    expect(apiPatch).toHaveBeenCalledWith("/tickets/t1/status", { status: "Closed" });
  });
});