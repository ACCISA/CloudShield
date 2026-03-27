import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import VPNLoadingScreen from "../VPNLoadingScreen";

describe("VPNLoadingScreen", () => {
  it("renders connecting state content", () => {
    render(
      <VPNLoadingScreen
        vpnState={{ status: "connecting" }}
        onRetry={async () => undefined}
      />,
    );

    expect(screen.getByText("Securing your session")).toBeTruthy();
    expect(screen.getByText("Connecting to VPN...")).toBeTruthy();
    expect(screen.queryByText("Retry VPN connection")).toBeNull();
  });

  it("renders disconnecting label", () => {
    render(
      <VPNLoadingScreen
        vpnState={{ status: "disconnecting" }}
        onRetry={async () => undefined}
      />,
    );

    expect(
      screen.getByText("Disconnecting previous VPN session..."),
    ).toBeTruthy();
  });

  it("renders error and allows retry", () => {
    const retryMock = vi.fn(async () => undefined);

    render(
      <VPNLoadingScreen
        vpnState={{ status: "error", error: "TLS handshake failed" }}
        onRetry={retryMock}
      />,
    );

    expect(screen.getByText("VPN connection failed")).toBeTruthy();
    expect(screen.getByText("TLS handshake failed")).toBeTruthy();

    fireEvent.click(screen.getByText("Retry VPN connection"));
    expect(retryMock).toHaveBeenCalledTimes(1);
  });
});
