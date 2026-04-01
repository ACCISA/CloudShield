import { VPNConfig, mapVPNConfig } from "../models/VPN";
import APIService from "../utils/APIService";
import { decodeJwtClaims, getAuthFromLocalStorage } from "../utils/jwtLocalStorage";
import { deriveUsername } from "../utils/usernameUtil";




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

    const auth = window.authStore?.loadAuth() || getAuthFromLocalStorage();
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