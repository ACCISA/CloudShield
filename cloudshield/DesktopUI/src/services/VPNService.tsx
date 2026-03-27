import { VPNConfig, mapVPNConfig } from "../models/VPN";
import APIService from "../utils/APIService";

type AuthSnapshot = {
  accessToken?: string;
};

type JwtClaims = {
  org_id?: string;
  email?: string;
  full_name?: string;
  username?: string;
};

function getStoredAuth(): AuthSnapshot | null {
  const snapshot = window.authStore?.loadAuth();
  if (snapshot?.accessToken) {
    return { accessToken: snapshot.accessToken };
  }

  const raw = localStorage.getItem("cloudshield.auth");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSnapshot;
    return parsed?.accessToken ? parsed : null;
  } catch {
    return null;
  }
}

function decodeJwtClaims(token: string): JwtClaims {
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return {};
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    return (JSON.parse(json) || {}) as JwtClaims;
  } catch {
    return {};
  }
}

function deriveUsername(claims: JwtClaims): string {
  let username = "";
  if (claims.username?.trim()) username = claims.username.trim();
  if (claims.email?.includes("@")) username = claims.email.split("@")[0].trim();
  if (claims.full_name?.trim())
    username = claims.full_name.trim().toLowerCase();
  console.log("Derived username:", username);
  let firstNameLetter = username.charAt(0);
  let lastName = username.split(" ")[1];
  return firstNameLetter + "_" + lastName;
}

class VPNService {
    private static instance: VPNService | null = null;

    private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): VPNService {
    if (!VPNService.instance) {
      VPNService.instance = new VPNService();
    }
    return VPNService.instance;
  }

 public async getVPNConfig(): Promise<VPNConfig> {
    const auth = getStoredAuth();
    const claims = auth?.accessToken ? decodeJwtClaims(auth.accessToken) : {};

    const orgId = claims.org_id?.trim() || "";
    if (!orgId) {
      throw new Error("Organization ID not found. Please log in again.");
    }

    const username = deriveUsername(claims);
    if (!username) {
      throw new Error("Username not found. Please log in again.");
    }

    const params = new URLSearchParams({ org_id: orgId, username });
    const response = await APIService.get(`vpn/config?${params.toString()}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || "Failed to fetch VPN configuration.");
    }

    const payload = await response.json();
    return mapVPNConfig(payload);
 }
}

export default VPNService.getInstance();