import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import WorkstationsPage from "../WorkstationsPage";

const getWorkstationTemplatesMock = vi.hoisted(() => vi.fn());

vi.mock("../../../services/WorkstationService", () => ({
  default: { getWorkstationTemplates: getWorkstationTemplatesMock },
}));

describe("WorkstationsPage", () => {
  const loadAuthMock = vi.fn<AuthStoreAPI["loadAuth"]>();
  const clearAuthMock = vi.fn<AuthStoreAPI["clearAuth"]>();
  beforeEach(() => {
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

  it("renders workstation rows from the API", async () => {
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

  it("filters workstations by search query", async () => {
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

});
