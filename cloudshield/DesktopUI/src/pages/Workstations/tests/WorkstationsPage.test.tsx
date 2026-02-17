import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkstationsPage from "../WorkstationsPage";
import {
  mockWorkstationTemplates,
  mockWorkstations,
} from "../../../mocks/WorkstationsMock";
const getWorkstationTemplatesMock = vi.hoisted(() => vi.fn());
const getWorkstationsMock = vi.hoisted(() => vi.fn());

vi.mock("../../../services/WorkstationService", () => ({
  default: {
    getWorkstationTemplates: getWorkstationTemplatesMock,
    getWorkstations: getWorkstationsMock,
  },
}));

describe("WorkstationsPage", () => {
  const loadAuthMock = vi.fn<AuthStoreAPI["loadAuth"]>();
  const clearAuthMock = vi.fn<AuthStoreAPI["clearAuth"]>();
  const runXfreerdpMock = vi.fn<ElectronAPI["runXfreerdp"]>();
  const runOpenVPNMock = vi.fn<ElectronAPI["runOpenVPN"]>();
  const showOpenDialogMock = vi.fn<ElectronAPI["showOpenDialog"]>();
  const killProcessMock = vi.fn<ElectronAPI["killProcess"]>();
  beforeEach(() => {
    window.authStore = {
      saveAuth: vi.fn(),
      loadAuth: loadAuthMock,
      clearAuth: clearAuthMock,
    };
    localStorage.clear();
    global.window.electronAPI = {
      runXfreerdp: runXfreerdpMock,
      runOpenVPN: runOpenVPNMock,
      showOpenDialog: showOpenDialogMock,
      killProcess: killProcessMock,
    };
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
    getWorkstationTemplatesMock.mockResolvedValueOnce([]);

    render(<WorkstationsPage />);

    await screen.findByText(/no assigned workstation templates/i);

    expect(
      screen.getByPlaceholderText("Search workstation templates"),
    ).toBeTruthy();
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

  it("renders workstation template rows from the API", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce([
      {
        name: "Development",
        org_id: "ORG-001",
        description: "Dev template",
        software: [
          { name: "VS Code", description: "Editor", path: "/usr/bin" },
        ],
        is_ready: true,
        access_groups: ["Developers"],
      },
    ]);

    render(<WorkstationsPage />);

    expect(await screen.findByText("Development")).toBeTruthy();
    expect(screen.getByText("Use")).toBeTruthy();
    expect(screen.getByText("Ready")).toBeTruthy();
  });

  it("shows not ready action for provisioning templates", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce([
      {
        name: "Marketing",
        org_id: "ORG-002",
        description: "Marketing template",
        software: [],
        is_ready: false,
        access_groups: [],
      },
    ]);

    render(<WorkstationsPage />);

    expect(await screen.findByText("Marketing")).toBeTruthy();
    expect(screen.getByText("Not Ready")).toBeTruthy();
  });

  it("shows API error details when request fails", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockRejectedValueOnce(new Error("No access"));

    render(<WorkstationsPage />);

    expect(await screen.findByText(/no access/i)).toBeTruthy();
  });

  it("uses local storage auth when authStore is unavailable", async () => {
    delete window.authStore;
    localStorage.setItem(
      "cloudshield.auth",
      JSON.stringify({ accessToken: "local-token", expiresAt: Date.now() + 60000 })
    );
    getWorkstationTemplatesMock.mockResolvedValueOnce([]);

    render(<WorkstationsPage />);

    await screen.findByText(/no assigned workstation templates/i);
  });

  it("filters workstation templates by search query", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce([
      {
        name: "Development",
        org_id: "ORG-001",
        description: "Dev template",
        software: [],
        is_ready: true,
        access_groups: [],
      },
      {
        name: "Marketing",
        org_id: "ORG-002",
        description: "Marketing template",
        software: [],
        is_ready: true,
        access_groups: [],
      },
    ]);

    render(<WorkstationsPage />);

    await screen.findByText("Development");

    fireEvent.change(
      screen.getByPlaceholderText("Search workstation templates"),
      {
        target: { value: "marketing" },
      },
    );

    expect(screen.queryByText("Development")).toBeNull();
    expect(screen.getByText("Marketing")).toBeTruthy();
  });

  it("refreshes the list when refresh button is clicked", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValue([]);

    render(<WorkstationsPage />);

    await waitFor(() => {
      expect(getWorkstationTemplatesMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));

    await waitFor(() => {
      expect(getWorkstationTemplatesMock).toHaveBeenCalledTimes(2);
    });
  });
  it("clears auth when logout is clicked", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce([]);
    localStorage.setItem("cloudshield.auth", "{}");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<WorkstationsPage />);

    await screen.findByText(/no assigned workstation templates/i);

    fireEvent.click(screen.getByText("Logout"));

    expect(clearAuthMock).toHaveBeenCalled();
    expect(localStorage.getItem("cloudshield.auth")).toBeNull();
    expect(dispatchSpy).toHaveBeenCalled();

    dispatchSpy.mockRestore();
  });

  it("handles RDP launch", async () => {
    runXfreerdpMock.mockResolvedValueOnce({
      success: true,
      pid: 12345,
      message: "xfreerdp3 launched",
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce(mockWorkstationTemplates);
    getWorkstationsMock.mockResolvedValueOnce(mockWorkstations);
    render(<WorkstationsPage />);
    expect(await screen.findByText("Windows 10 Pro")).toBeTruthy();
    fireEvent.click(screen.getAllByText("Use")[0]);
    await waitFor(() => {
      expect(screen.getAllByText(/Connected to workstation/)).toBeTruthy();
      expect(screen.getByText(/192.168.122.106/)).toBeTruthy();
      expect(screen.getByText(/Launch RDP/)).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Launch RDP"));
    await waitFor(() => {
      expect(runXfreerdpMock).toHaveBeenCalled();
      expect(screen.getByText("Connected! (PID: 12345)")).toBeTruthy();
    });
  });

  it("shows empty state with icon when no workstations match search", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce([
      {
        name: "Development",
        org_id: "ORG-001",
        description: "Dev template",
        software: [],
        is_ready: true,
        access_groups: [],
      },
    ]);

    render(<WorkstationsPage />);

    await screen.findByText("Development");

    fireEvent.change(
      screen.getByPlaceholderText("Search workstation templates"),
      {
        target: { value: "nonexistent" },
      },
    );

    expect(screen.getByTestId("empty-workstations")).toBeTruthy();
    expect(screen.getByText("No workstations found")).toBeTruthy();
    expect(screen.getByText("Try adjusting your search query")).toBeTruthy();
  });

  it("shows EmptyState component when templates list is empty", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce([]);

    render(<WorkstationsPage />);

    expect(await screen.findByTestId("empty-workstations")).toBeTruthy();
    expect(screen.getByText(/no assigned workstation templates/i)).toBeTruthy();
  });

  it("renders pagination component when templates exist", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce(mockWorkstationTemplates);

    render(<WorkstationsPage />);

    await screen.findByText("Windows 10 Pro");

    expect(screen.getByTestId("workstations-pagination")).toBeTruthy();
    expect(screen.getByTestId("workstations-pagination-rows-per-page")).toBeTruthy();
  });

  it("renders profile image in header", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
      email: "test@example.com",
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce([]);

    render(<WorkstationsPage />);

    await screen.findByTestId("empty-workstations");

    expect(screen.getByTestId("header-profile-image")).toBeTruthy();
    expect(screen.getByText("test@example.com")).toBeTruthy();
  });

  it("renders profile images for each workstation template row", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce(mockWorkstationTemplates);

    render(<WorkstationsPage />);

    await screen.findByText("Windows 10 Pro");

    expect(screen.getByTestId("profile-image-0")).toBeTruthy();
    expect(screen.getByTestId("profile-image-1")).toBeTruthy();
  });

  it("changes rows per page when selector is changed", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce(mockWorkstationTemplates);

    render(<WorkstationsPage />);

    await screen.findByText("Windows 10 Pro");

    const selector = screen.getByTestId("workstations-pagination-rows-per-page");
    fireEvent.change(selector, { target: { value: "5" } });

    expect(selector).toHaveValue("5");
  });

});

