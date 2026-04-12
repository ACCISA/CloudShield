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
const apiGetMock = vi.hoisted(() => vi.fn());
const getSessionPasswordMock = vi.hoisted(() => vi.fn());

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

vi.mock("../../../utils/APIService", () => ({
  default: {
    get: apiGetMock,
  },
}));

vi.mock("../../../utils/passwordMemory", () => ({
  getSessionPassword: getSessionPasswordMock,
}));

describe("WorkstationsPage", () => {
  const loadAuthMock = vi.fn<AuthStoreAPI["loadAuth"]>();
  const clearAuthMock = vi.fn<AuthStoreAPI["clearAuth"]>();
  const runXfreerdpMock = vi.fn<ElectronAPI["runXfreerdp"]>();
  const showOpenDialogMock = vi.fn<ElectronAPI["showOpenDialog"]>();
  const killProcessMock = vi.fn<ElectronAPI["killProcess"]>();
  const appWindow = globalThis as unknown as Window;
  beforeEach(() => {
    loadAuthMock.mockReset();
    clearAuthMock.mockReset();
    runXfreerdpMock.mockReset();
    showOpenDialogMock.mockReset();
    killProcessMock.mockReset();
    getWorkstationTemplatesMock.mockReset();
    assignWorkStationMock.mockReset();
    releaseWorkStationMock.mockReset();
    getOrganizationMock.mockReset();
    apiGetMock.mockReset();
    getSessionPasswordMock.mockReset();

    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });

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
    localStorage.setItem("user_id", "user-1");
    getOrganizationMock.mockResolvedValue({ domain_name: "march.local", realm_name: "MARCH.LOCAL" });
    apiGetMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ user: { username: "employee" } }),
    });
    getSessionPasswordMock.mockReturnValue("pass123!");
    releaseWorkStationMock.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.resetAllMocks();
    delete appWindow.authStore;
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

  it("triggers template connect from icons layout when template is ready", async () => {
    const templates = mockWorkstationTemplates.map((template, index) => ({
      ...template,
      _id: `template-${index + 1}`,
      is_ready: true,
    }));
    getWorkstationTemplatesMock.mockResolvedValue(templates);
    assignWorkStationMock.mockResolvedValueOnce(mockWorkstations[0]);
    runXfreerdpMock.mockResolvedValueOnce({
      success: true,
      pid: 1001,
      message: "xfreerdp3 launched",
    });

    render(<WorkstationsPage />);

    expect(await screen.findByText("Windows 10 Pro")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Display" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: /icons/i }));

    await waitFor(() => {
      expect(screen.getByTestId("workstations-icons-view")).toBeTruthy();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);

    await waitFor(() => {
      expect(assignWorkStationMock).toHaveBeenCalledWith("template-1");
    });
  });

  it("shows auth error when no token is available", async () => {
    loadAuthMock.mockReturnValue({});

    render(<WorkstationsPage />);

    expect(await screen.findByText(/missing access token/i)).toBeTruthy();
  });

  it("shows auth error when token is expired", async () => {
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
    delete appWindow.authStore;
    localStorage.setItem(
      "cloudshield.auth",
      JSON.stringify({
        accessToken: "local-token",
        expiresAt: Date.now() + 60000,
      }),
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
    const dispatchSpy = vi.spyOn(appWindow, "dispatchEvent");

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
      expect(
        screen.getByText("Error: Electron API not available"),
      ).toBeTruthy();
      expect(runXfreerdpMock).not.toHaveBeenCalled();
      expect(assignWorkStationMock).not.toHaveBeenCalled();
    });
  });

  it("rejects rdp when workstation ip isn't available", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      expiresAt: Date.now() + 60000,
    });

    const templates = mockWorkstationTemplates.map((template, index) => ({
      ...template,
      _id: `template-${index + 1}`,
    }));
    getWorkstationTemplatesMock.mockResolvedValue(templates);

    assignWorkStationMock.mockResolvedValueOnce({
      ...mockWorkstations[0],
      ipv4_address: "",
    });

    render(<WorkstationsPage />);

    expect(await screen.findByText("Windows 10 Pro")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);

    await waitFor(() => {
      expect(assignWorkStationMock).toHaveBeenCalledWith("template-1");
      expect(runXfreerdpMock).not.toHaveBeenCalled();
      expect(releaseWorkStationMock).toHaveBeenCalled();
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
    expect(
      (await screen.findAllByText("Windows 10 Pro")).length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);
    await waitFor(() => {
      expect(assignWorkStationMock).toHaveBeenCalledWith("template-1");
      expect(runXfreerdpMock).toHaveBeenCalledWith(
        "MARCH.LOCAL\\employee",
        "pass123!",
        mockWorkstations[0].ipv4_address,
      );
      expect(releaseWorkStationMock).toHaveBeenCalled();
    });
  });

  it("blocks starting another connect while an RDP connect flow is active", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });

    const templates = [
      {
        ...mockWorkstationTemplates[0],
        _id: "template-1",
        name: "Windows 10 Pro",
        is_ready: true,
      },
      {
        ...mockWorkstationTemplates[0],
        _id: "template-2",
        name: "Windows 11 Pro",
        is_ready: true,
      },
    ];

    let resolveAssign: ((value: (typeof mockWorkstations)[0]) => void) | undefined;
    assignWorkStationMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveAssign = resolve;
        }),
    );
    runXfreerdpMock.mockResolvedValueOnce({
      success: true,
      pid: 1111,
      message: "xfreerdp3 launched",
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce(templates);

    render(<WorkstationsPage />);

    expect(await screen.findByText("Windows 10 Pro")).toBeTruthy();
    expect(screen.getByText("Windows 11 Pro")).toBeTruthy();

    const connectButtons = screen.getAllByRole("button", { name: "Connect" });
    fireEvent.click(connectButtons[0]);

    await waitFor(() => {
      expect(assignWorkStationMock).toHaveBeenCalledTimes(1);
      expect(connectButtons[1].hasAttribute("disabled")).toBe(true);
    });

    fireEvent.click(connectButtons[1]);

    await waitFor(() => {
      expect(assignWorkStationMock).toHaveBeenCalledTimes(1);
    });

    if (resolveAssign) {
      resolveAssign(mockWorkstations[0]);
    }

    await waitFor(() => {
      expect(runXfreerdpMock).toHaveBeenCalledTimes(1);
      expect(releaseWorkStationMock).toHaveBeenCalled();
    });
  });

  it("releases workstation after RDP session closes", async () => {
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
      expect(assignWorkStationMock).toHaveBeenCalledWith("template-1");
      expect(runXfreerdpMock).toHaveBeenCalled();
      expect(releaseWorkStationMock).toHaveBeenCalled();
      expect(killProcessMock).not.toHaveBeenCalled();
    });
  });

  it("shows fallback status when release workstation fails with non-Error", async () => {
    loadAuthMock.mockReturnValue({
      accessToken: "token",
      tokenType: "Bearer",
      expiresAt: Date.now() + 60000,
    });
    runXfreerdpMock.mockResolvedValueOnce({
      success: true,
      pid: 2222,
      message: "xfreerdp3 launched",
    });
    getWorkstationTemplatesMock.mockResolvedValueOnce(
      mockWorkstationTemplates.map((template, index) => ({
        ...template,
        _id: `template-${index + 1}`,
      })),
    );
    assignWorkStationMock.mockResolvedValueOnce(mockWorkstations[0]);
    releaseWorkStationMock.mockRejectedValueOnce("disconnect failed");

    render(<WorkstationsPage />);
    expect(await screen.findByText("Windows 10 Pro")).toBeTruthy();

    fireEvent.click(screen.getAllByRole("button", { name: "Connect" })[0]);

    await waitFor(() => {
      expect(releaseWorkStationMock).toHaveBeenCalled();
      expect(runXfreerdpMock).toHaveBeenCalled();
      expect(getWorkstationTemplatesMock).toHaveBeenCalledTimes(2);
    });
  });
});
