export type VPNConfig = {
  filename: string;
  content_b64: string;
  created_at: string | null;
  updated_at: string | null;
};

export const mapVPNConfig = (raw: unknown): VPNConfig => {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    filename: String(r.filename ?? ""),
    content_b64: String(r.content_b64 ?? ""),
    created_at: r.created_at ? String(r.created_at) : null,
    updated_at: r.updated_at ? String(r.updated_at) : null,
  };
};

type VPNStatus = "disconnected" | "connecting" | "connected" | "disconnecting" | "error";

export type VPNState = {
  status: VPNStatus;
  pid?: number;
  error?: string | null;
  connectedAt?: number;
};

export type VPNConnectInput = {
  ovpnPath?: string;
  ovpnData?: VPNConfig;
};