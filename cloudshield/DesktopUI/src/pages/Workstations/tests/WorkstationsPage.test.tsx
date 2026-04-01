import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkstationsPage from "../WorkstationsPage";
import {
  mockWorkstationTemplates,
  mockWorkstations,
} from "../../../mocks/WorkstationsMock";
const getWorkstationTemplatesMock = vi.hoisted(() => vi.fn());
const assignWorkStationMock = vi.hoisted(() => vi.fn());
const releaseWorkStationMock = vi.hoisted(() => vi.fn());
const getOrganizationMock = vi.hoisted(() => vi.fn());
const getSessionPasswordMock = vi.hoisted(() => vi.fn());
const deriveUsernameMock = vi.hoisted(() => vi.fn());
const decodeJwtClaimsMock = vi.hoisted(() => vi.fn());

vi.mock("../../../services/WorkstationService", () => ({
  default: {
    getWorkstationTemplates: getWorkstationTemplatesMock,
    assignWorkStation: assignWorkStationMock,
    releaseWorkStation: releaseWorkStationMock,
  },
}));

vi.mock("../../../services/OrgService", () => ({
  default: {
    getOrganization: getOrganizationMock,
  },
}));

vi.mock("../../../utils/passwordMemory", () => ({
  getSessionPassword: getSessionPasswordMock,
}));

vi.mock("../../../utils/usernameUtil", () => ({
  deriveUsername: deriveUsernameMock,
}));

vi.mock("../../../utils/jwtLocalStorage", () => ({
  decodeJwtClaims: decodeJwtClaimsMock,
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
    getOrganizationMock.mockResolvedValue({ domain_name: "march.local" });
    getSessionPasswordMock.mockReturnValue("pass123!");
    deriveUsernameMock.mockReturnValue("employee");
    decodeJwtClaimsMock.mockReturnValue({ sub: "user-1" });
    releaseWorkStationMock.mockResolvedValue(true);
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

  it("rejects rdp when electron isn't available", async () => {
    if (global.window.electronAPI) {
      (
        global.window.electronAPI as unknown as {
          runXfreerdp?: ElectronAPI["runXfreerdp"];
        }
      ).runXfreerdp = undefined;
    }
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() + 60000,
    });

    getWorkstationTemplatesMock.mockResolvedValueOnce(
      mockWorkstationTemplates.map((template, index) => ({
        ...template,
        _id: `template-${index + 1}`,
      })),
    );
    assignWorkStationMock.mockResolvedValueOnce(mockWorkstations[0]);

    render(<WorkstationsPage />);

    expect(await screen.findByText("Windows 10 Pro")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);

    await waitFor(() => {
      expect(screen.getByText(/Connected to workstation/i)).toBeTruthy();
      expect(screen.getByText("Launch RDP")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Launch RDP"));

    await waitFor(() => {
      expect(
        screen.getByText("Error: Electron API not available"),
      ).toBeTruthy();
      expect(runXfreerdpMock).not.toHaveBeenCalled();
    });
  });

  it("rejects rdp when workstation ip isn't available", async () => {

    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() + 60000,
    });

    getWorkstationTemplatesMock.mockResolvedValueOnce(
      mockWorkstationTemplates.map((template, index) => ({
        ...template,
        _id: `template-${index + 1}`,
      })),
    );
    
    assignWorkStationMock.mockResolvedValueOnce({
      ...mockWorkstations[0],
      ipv4_address: "",
    });

    render(<WorkstationsPage />);

    expect(await screen.findByText("Windows 10 Pro")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);

    await waitFor(() => {
      expect(screen.getByText(/Connected to workstation/i)).toBeTruthy();
      expect(screen.getByText("Launch RDP")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Launch RDP"));

    await waitFor(() => {
      expect(
        screen.getByText("Error: Workstation IP is missing"),
      ).toBeTruthy();
      expect(runXfreerdpMock).not.toHaveBeenCalled();
    });
  });

  it("handles RDP launch", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    runXfreerdpMock.mockResolvedValueOnce({
      success: true,
      pid: 12345,
      message: "xfreerdp3 launched",
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce(
      mockWorkstationTemplates.map((template, index) => ({
        ...template,
        _id: `template-${index + 1}`,
      })),
    );
    assignWorkStationMock.mockResolvedValueOnce(mockWorkstations[0]);
    render(<WorkstationsPage />);
    expect((await screen.findAllByText("Windows 10 Pro")).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);
    await waitFor(() => {
      expect(assignWorkStationMock).toHaveBeenCalledWith("template-1");
      expect(screen.getByText(/Connected to workstation/)).toBeTruthy();
      expect(screen.getByText(/192.168.122.106/)).toBeTruthy();
      expect(screen.getByText(/Launch RDP/)).toBeTruthy();
    });
    fireEvent.click(screen.getByText("Launch RDP"));
    await waitFor(() => {
      expect(runXfreerdpMock).toHaveBeenCalled();
    });
  });

  it("kills RDP process on disconnect when pid is set", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    runXfreerdpMock.mockResolvedValueOnce({
      success: true,
      pid: 9876,
      message: "xfreerdp3 launched",
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce(
      mockWorkstationTemplates.map((template, index) => ({
        ...template,
        _id: `template-${index + 1}`,
      })),
    );
    assignWorkStationMock.mockResolvedValueOnce(mockWorkstations[0]);

    render(<WorkstationsPage />);
    expect(await screen.findByText("Windows 10 Pro")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);
    await waitFor(() => {
      expect(screen.getByText("Launch RDP")).toBeTruthy();
      expect(screen.getByText("Disconnect")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Launch RDP"));
    await waitFor(() => {
      expect(screen.getByText("Connected! (PID: 9876)")).toBeTruthy();
    });

    fireEvent.click(screen.getByText("Disconnect"));
    await waitFor(() => {
      expect(releaseWorkStationMock).toHaveBeenCalled();
      expect(killProcessMock).toHaveBeenCalledWith(9876);
    });
  });

});
