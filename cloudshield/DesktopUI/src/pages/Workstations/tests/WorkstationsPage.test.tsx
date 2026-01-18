import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkstationsPage from "../WorkstationsPage";

const WORKSTATIONS_URL = "http://127.0.0.1:5050/api/workstations/assigned";

type WorkstationsResponse = {
  items?: Array<{
    id?: string;
    name?: string;
    status?: string;
    assigned_user?: string;
    last_seen?: string;
    users_count?: number;
  }>;
};

const mockResponse = (payload: WorkstationsResponse, ok = true): Response =>
  ({
    ok,
    json: async () => payload,
  } as Response);

describe("WorkstationsPage", () => {
  const loadAuthMock = vi.fn<AuthStoreAPI["loadAuth"]>();
  const clearAuthMock = vi.fn<AuthStoreAPI["clearAuth"]>();
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    global.fetch = fetchMock as typeof fetch;
    window.authStore = {
      saveAuth: vi.fn(),
      loadAuth: loadAuthMock,
      clearAuth: clearAuthMock,
    };
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete window.authStore;
    localStorage.clear();
  });

  it("renders the toolbar and search input", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(mockResponse({ items: [] }));

    render(<WorkstationsPage />);

    await screen.findByText(/no assigned workstations/i);

    expect(screen.getByPlaceholderText("Search workstations")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Refresh" })).toBeTruthy();
    expect(screen.getByText("Create")).toBeTruthy();
    expect(screen.getByText("Logout")).toBeTruthy();
  });

  it("shows missing token error when no auth is available", async () => {
    loadAuthMock.mockReturnValue({});

    render(<WorkstationsPage />);

    expect(await screen.findByText(/missing access token/i)).toBeTruthy();
  });

  it("shows expired session message when token is expired", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() - 1000,
    });

    render(<WorkstationsPage />);

    expect(await screen.findByText(/session expired/i)).toBeTruthy();
  });

  it("renders workstation rows from the API", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        items: [
          {
            id: "WS-001",
            name: "Development",
            status: "busy",
            assigned_user: "Jim Halpert",
            last_seen: "03/11/2025",
            users_count: 3,
          },
        ],
      })
    );

    render(<WorkstationsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        WORKSTATIONS_URL,
        expect.objectContaining({
          headers: { Authorization: "Bearer token" },
        })
      );
    });

    expect(await screen.findByText("Development")).toBeTruthy();
    expect(screen.getByText("Disconnect")).toBeTruthy();
    expect(screen.getByText("Jim Halpert")).toBeTruthy();
  });

  it("filters workstations by search query", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        items: [
          { id: "WS-001", name: "Development" },
          { id: "WS-002", name: "Marketing" },
        ],
      })
    );

    render(<WorkstationsPage />);

    await screen.findByText("Development");

    fireEvent.change(screen.getByPlaceholderText("Search workstations"), {
      target: { value: "marketing" },
    });

    expect(screen.queryByText("Development")).toBeNull();
    expect(screen.getByText("Marketing")).toBeTruthy();
  });

  it("refreshes the list when refresh button is clicked", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValue(mockResponse({ items: [] }));

    render(<WorkstationsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
