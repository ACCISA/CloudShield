import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkstationsPage from "../WorkstationsPage";

const WORKSTATIONS_URL = "http://127.0.0.1:5050/api/workstations/assigned";

const mockResponse = (payload: unknown, ok = true): Response =>
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

  it("shows connect action for available workstations", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        items: [{ id: "WS-010", name: "Marketing", status: "online" }],
      })
    );

    render(<WorkstationsPage />);

    expect(await screen.findByText("Marketing")).toBeTruthy();
    expect(screen.getByText("Connect")).toBeTruthy();
  });

  it("shows API error details when request fails", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({ error: "No access" }, false)
    );

    render(<WorkstationsPage />);

    expect(await screen.findByText(/no access/i)).toBeTruthy();
  });

  it("uses local storage auth when authStore is unavailable", async () => {
    delete window.authStore;
    localStorage.setItem(
      "cloudshield.auth",
      JSON.stringify({ accessToken: "local-token", expiresAt: Date.now() + 60000 })
    );
    fetchMock.mockResolvedValueOnce(mockResponse({ items: [] }));

    render(<WorkstationsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        WORKSTATIONS_URL,
        expect.objectContaining({
          headers: { Authorization: "Bearer local-token" },
        })
      );
    });
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

  it("loads the RDPDraft", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        items: [{ id: "WS-010", name: "Marketing", status: "online" }],
      }),
    );
    localStorage.setItem(
      "cloudshield.rdpDraft",
      '{"username":"testuser","password":"testpassword"}',
    );

    render(<WorkstationsPage />);

    await screen.findByText("Marketing");

    fireEvent.click(screen.getByText("Connect"));

    const usernameInput = await screen.findByTestId("rdp-username-input");
    const passwordInput = await screen.findByTestId("rdp-password-input");

    expect((usernameInput as HTMLInputElement).value).toBe("testuser");
    expect((passwordInput as HTMLInputElement).value).toBe("testpassword");
  });
  it("clears auth when logout is clicked", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(mockResponse({ items: [] }));
    localStorage.setItem("cloudshield.auth", "{}");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<WorkstationsPage />);

    await screen.findByText(/no assigned workstations/i);

    fireEvent.click(screen.getByText("Logout"));

    expect(clearAuthMock).toHaveBeenCalled();
    expect(localStorage.getItem("cloudshield.auth")).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();

    dispatchSpy.mockRestore();
  });

  it("shows error when Electron API is unavailable", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        items: [
          { id: "WS-100", name: "Sales", status: "online", ip: "10.0.0.1" },
        ],
      }),
    );
    window.electronAPI = {} as ElectronAPI;

    render(<WorkstationsPage />);

    await screen.findByText("Sales");

    fireEvent.click(screen.getByText("Connect"));

    fireEvent.change(screen.getByTestId("rdp-username-input"), {
      target: { value: "user" },
    });
    fireEvent.change(screen.getByTestId("rdp-password-input"), {
      target: { value: "pass" },
    });

    fireEvent.click(screen.getByText("Launch RDP"));

    expect(
      await screen.findByText("Error: Electron API not available"),
    ).toBeTruthy();
  });

  it("shows error when workstation IP is missing", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        items: [{ id: "WS-101", name: "Design", status: "online" }],
      }),
    );
    window.electronAPI = { runXfreerdp: vi.fn() } as unknown as ElectronAPI;

    render(<WorkstationsPage />);

    await screen.findByText("Design");

    fireEvent.click(screen.getByText("Connect"));

    fireEvent.change(screen.getByTestId("rdp-username-input"), {
      target: { value: "user" },
    });
    fireEvent.change(screen.getByTestId("rdp-password-input"), {
      target: { value: "pass" },
    });

    fireEvent.click(screen.getByText("Launch RDP"));

    expect(
      await screen.findByText("Error: Workstation IP is missing"),
    ).toBeTruthy();
  });

  it("shows error when username or password is missing", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        items: [
          {
            id: "WS-102",
            name: "Ops",
            status: "online",
            ip: "10.0.0.20",
          },
        ],
      }),
    );
    window.electronAPI = { runXfreerdp: vi.fn() } as unknown as ElectronAPI;

    render(<WorkstationsPage />);

    await screen.findByText("Ops");

    fireEvent.click(screen.getByText("Connect"));

    fireEvent.change(screen.getByTestId("rdp-username-input"), {
      target: { value: "user" },
    });

    fireEvent.click(screen.getByText("Launch RDP"));

    expect(
      await screen.findByText("Error: Please provide username and password"),
    ).toBeTruthy();
  });

  it("launches RDP and stores draft on success", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        items: [
          {
            id: "WS-103",
            name: "QA",
            status: "online",
            ip: "10.0.0.30",
          },
        ],
      }),
    );
    const runXfreerdp = vi.fn().mockResolvedValue({
      success: true,
      pid: 1234,
      message: "ok",
    });
    window.electronAPI = { runXfreerdp } as unknown as ElectronAPI;

    render(<WorkstationsPage />);

    await screen.findByText("QA");

    fireEvent.click(screen.getByText("Connect"));

    fireEvent.change(screen.getByTestId("rdp-username-input"), {
      target: { value: "user" },
    });
    fireEvent.change(screen.getByTestId("rdp-password-input"), {
      target: { value: "pass" },
    });

    fireEvent.click(screen.getByText("Launch RDP"));

    await screen.findByText("Connected! (PID: 1234)");
    expect(runXfreerdp).toHaveBeenCalledWith("user", "pass", "10.0.0.30");
    expect(localStorage.getItem("cloudshield.rdpDraft")).toBe(
      JSON.stringify({ username: "user", password: "pass" }),
    );
  });
});
