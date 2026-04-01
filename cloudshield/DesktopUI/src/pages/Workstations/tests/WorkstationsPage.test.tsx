import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkstationsPage from "../WorkstationsPage";
import {
  mockWorkstationTemplates,
  mockWorkstations,
} from "../../../mocks/WorkstationsMock";
const getWorkstationTemplatesMock = vi.hoisted(() => vi.fn());
const getWorkstationsMock = vi.hoisted(() => vi.fn());
const assignWorkStationMock = vi.hoisted(() => vi.fn());
const releaseWorkStationMock = vi.hoisted(() => vi.fn());

vi.mock("../../../services/WorkstationService", () => ({
  default: {
    getWorkstationTemplates: getWorkstationTemplatesMock,
    getWorkstations: getWorkstationsMock,
    assignWorkStation: assignWorkStationMock,
    releaseWorkStation: releaseWorkStationMock,
  },
}));

vi.mock("../../../services/OrgService", () => ({
  default: {
    getOrganization: vi.fn().mockResolvedValue({ domain_name: "cloudshield" }),
  },
}));

vi.mock("../../../utils/jwtLocalStorage", () => ({
  decodeJwtClaims: vi.fn(() => ({ preferred_username: "johndoe" })),
}));

vi.mock("../../../utils/usernameUtil", () => ({
  deriveUsername: vi.fn(() => "johndoe"),
}));

vi.mock("../../../utils/passwordMemory", () => ({
  getSessionPassword: vi.fn(() => "password123"),
}));

describe("WorkstationsPage", () => {
  const loadAuthMock = vi.fn<AuthStoreAPI["loadAuth"]>();
  const clearAuthMock = vi.fn<AuthStoreAPI["clearAuth"]>();
  const runXfreerdpMock = vi.fn<ElectronAPI["runXfreerdp"]>();
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
    expect(screen.getByText("Logout")).toBeTruthy();
  });

  it("switches between list and icons display layouts", async () => {
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

    expect(await screen.findByText("Development")).toBeTruthy();
    expect(screen.getByTestId("workstations-list-view")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /icons/i }));

    await waitFor(() => {
      expect(screen.getByTestId("workstations-icons-view")).toBeTruthy();
    });
  });

  it("renders the empty state when no auth is available in bypass mode", async () => {
    loadAuthMock.mockReturnValue({});
    getWorkstationTemplatesMock.mockResolvedValueOnce([]);

    render(<WorkstationsPage />);

    expect(
      await screen.findByText(/no assigned workstation templates found/i),
    ).toBeTruthy();
  });

  it("renders the empty state when the token is expired in bypass mode", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() - 1000,
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce([]);

    render(<WorkstationsPage />);

    expect(
      await screen.findByText(/no assigned workstation templates found/i),
    ).toBeTruthy();
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
    expect(screen.getByText("Connect")).toBeTruthy();
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
    expect(screen.getByText("Building template")).toBeTruthy();
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
    assignWorkStationMock.mockResolvedValueOnce(mockWorkstations[0]);
    getWorkstationTemplatesMock.mockResolvedValueOnce(mockWorkstationTemplates);
    render(<WorkstationsPage />);
    expect((await screen.findAllByText("Windows 10 Pro")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("Connect")[0]);
    await waitFor(() => {
      expect(screen.getByText(/Connected to workstation/)).toBeTruthy();
      expect(screen.getByText(/192.168.122.106/)).toBeTruthy();
      expect(screen.getByText(/Launch RDP/)).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Launch RDP"));
    await waitFor(() => {
      expect(runXfreerdpMock).toHaveBeenCalled();
      expect(screen.getByText("Connected! (PID: 12345)")).toBeTruthy();
    });
  });

});
