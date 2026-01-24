import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RDPOpenVPNCard from "../RDPOpenVPNCard";

describe("LoginCard Component", () => {
  const consoleLogMock = vi.spyOn(console, "log").mockImplementation(() => {});
  const consoleErrorMock = vi
    .spyOn(console, "error")
    .mockImplementation(() => {});
  const runOpenVPNMock = vi.fn<ElectronAPI["runOpenVPN"]>();
  const runXfreerdpMock = vi.fn<ElectronAPI["runXfreerdp"]>();
  beforeEach(() => {
    global.fetch = vi.fn();
    global.window.alert = vi.fn();
    global.window.electronAPI = {
      runOpenVPN: runOpenVPNMock,
      runXfreerdp: runXfreerdpMock,
      showOpenDialog: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogMock.mockReset();
    consoleErrorMock.mockReset();
  });

  it("renders the component", () => {
    const { container } = render(<RDPOpenVPNCard />);
    expect(container).toBeTruthy();
  });

  it("renders the buttons", () => {
    render(<RDPOpenVPNCard />);
    const button = screen.queryAllByRole("button");
    expect(button.length).toBeGreaterThan(0);
  });

  it("handles OpenVPN launch", async () => {
    runOpenVPNMock.mockResolvedValueOnce({
      success: true,
      pid: 12345,
      message: "OpenVPN started successfully",
    });
    render(<RDPOpenVPNCard />);

    const openVpnButton = screen.getByText("Connect OpenVPN");
    fireEvent.click(openVpnButton);

    await waitFor(() => {
      expect(window.electronAPI!.runOpenVPN).toHaveBeenCalled();
      expect(consoleLogMock).toHaveBeenLastCalledWith("OpenVPN launched:", {
        success: true,
        pid: 12345,
        message: "OpenVPN started successfully",
      });
    });
  });

  it("handles RDP launch", async () => {
    runXfreerdpMock.mockResolvedValueOnce({
      success: true,
      pid: 12345,
      message: "xfreerdp3 launched",
    });
    render(<RDPOpenVPNCard />);

    const usernameInput = screen.getByPlaceholderText("Username");
    const passwordInput = screen.getByPlaceholderText("Password");
    const ipInput = screen.getByPlaceholderText(
      "IP Address (e.g., 192.168.1.100)"
    );

    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(passwordInput, { target: { value: "testpass" } });
    fireEvent.change(ipInput, { target: { value: "192.168.1.100" } });

    const rdpButton = screen.getByText("Connect RDP");
    fireEvent.click(rdpButton);

    await waitFor(() => {
      expect(window.electronAPI!.runXfreerdp).toHaveBeenCalled();
      expect(consoleLogMock).toHaveBeenLastCalledWith("RDP launched:", {
        success: true,
        pid: 12345,
        message: "xfreerdp3 launched",
      });
      expect(screen.queryByText("Connected! (PID: 12345)")).not.toBeNull();
    });
  });

  it("shows an error if electron isn't available", async () => {
    delete window.electronAPI;
    render(<RDPOpenVPNCard />);
    expect(screen.queryByText("Error: Electron API not available")).toBeNull();

    const rdpButton = screen.getByText("Connect RDP");
    fireEvent.click(rdpButton);
    await waitFor(() => {
      expect(
        screen.queryByText("Error: Electron API not available")
      ).not.toBeNull();
    });
  });

    it("shows an error if openvpn isn't available", async () => {
      delete window.electronAPI;
      render(<RDPOpenVPNCard />);

      const openVPNButton = screen.getByText("Connect OpenVPN");
      fireEvent.click(openVPNButton);
      await waitFor(() => {
        expect(consoleErrorMock).toHaveBeenLastCalledWith(
          "runOpenVPN not available",
        );
      });
    });

    it("shows an error if showOpenDialog isn't available", async () => {
      delete window.electronAPI;
      render(<RDPOpenVPNCard />);

      const openVPNButton = screen.getByText("Select OVPN File");
      fireEvent.click(openVPNButton);
      await waitFor(() => {
        expect(consoleErrorMock).toHaveBeenLastCalledWith(
          "showOpenDialog not available",
        );
      });
    });

    it("successfully selects an OVPN file", async () => {
      const showOpenDialogMock = vi.fn<ElectronAPI["showOpenDialog"]>();
      (window.electronAPI as any).showOpenDialog = showOpenDialogMock;
      showOpenDialogMock.mockResolvedValueOnce({
        canceled: false,
        filePaths: ["/path/to/file.ovpn"],
      });

      render(<RDPOpenVPNCard />);
      const openVPNButton = screen.getByText("Select OVPN File");

      fireEvent.click(openVPNButton);

      await waitFor(() => {
        expect(showOpenDialogMock).toHaveBeenCalled();
        expect(consoleLogMock).toHaveBeenLastCalledWith(
          "Selected OVPN file:",
          "/path/to/file.ovpn",
        );
      });
    });

    it("shows an alert if OpenVPN fails to launch", async () => {
      runOpenVPNMock.mockRejectedValueOnce(new Error("OpenVPN failed"));
      render(<RDPOpenVPNCard />);

      const openVpnButton = screen.getByText("Connect OpenVPN");
      fireEvent.click(openVpnButton);

      await waitFor(() => {
        expect(global.window.alert).toHaveBeenLastCalledWith(
          "Failed to launch OpenVPN: OpenVPN failed",
        );
      });
    });


  it("rejects empty fields", async () => {
    render(<RDPOpenVPNCard />);
    expect(
      screen.queryByText("Error: Please fill in username, password, and IP")
    ).toBeNull();

    const rdpButton = screen.getByText("Connect RDP");
    fireEvent.click(rdpButton);
    await waitFor(() => {
      expect(
        screen.queryByText("Error: Please fill in username, password, and IP")
      ).not.toBeNull();
    });
  });
});
