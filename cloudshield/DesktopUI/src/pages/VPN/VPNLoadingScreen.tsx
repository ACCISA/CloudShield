import type { VPNState } from "../../models/VPN";

type VPNLoadingScreenProps = {
  vpnState: VPNState;
  onRetry: () => Promise<void>;
};

export default function VPNLoadingScreen({
  vpnState,
  onRetry,
}: VPNLoadingScreenProps) {
  const isError = vpnState.status === "error";
  const statusLabel =
    vpnState.status === "connecting"
      ? "Connecting to VPN..."
      : vpnState.status === "disconnecting"
        ? "Disconnecting previous VPN session..."
        : isError
          ? "VPN connection failed"
          : "Preparing secure connection...";

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] text-white px-6 py-8 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0f0f0f] p-8 text-center shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        <h1 className="text-xl font-semibold">Securing your session</h1>
        <p className="mt-3 text-sm text-white/70">{statusLabel}</p>

        {isError && (
          <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {vpnState.error || "Could not establish VPN connection."}
          </div>
        )}

        <p className="mt-4 text-xs text-white/45">
          Workstation access is available only after VPN is connected.
        </p>

        {isError && (
          <button
            type="button"
            onClick={() => void onRetry()}
            className="mt-5 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/20"
          >
            Retry VPN connection
          </button>
        )}
      </div>
    </div>
  );
}
