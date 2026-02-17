import { VPNConfig, mapVPNConfig } from "../models/VPN";
import APIService from "../utils/APIService";
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
    const orgId = localStorage.getItem("org_id");
    if (!orgId) {
      throw new Error("Organization ID not found. Please log in again.");
    }
    const username = localStorage.getItem("full_name");
    if (!username) {
      throw new Error("Username not found. Please log in again.");
    }
    const response = await APIService.get("vpn/config?org_id=" + orgId + "&username=" + username);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || "Failed to fetch VPN configuration.");
    }
    return mapVPNConfig(response.body);
 }
}

export default VPNService.getInstance();