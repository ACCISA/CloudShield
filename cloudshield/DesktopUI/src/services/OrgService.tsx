import { Organization, mapOrganization } from "../models/Organization";
import APIService from "../utils/APIService";
import { decodeJwtClaims, getAuthFromLocalStorage } from "../utils/jwtLocalStorage";

class OrgService {
    private static instance: OrgService | null = null;

    private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): OrgService {
    if (!OrgService.instance) {
      OrgService.instance = new OrgService();
    }
    return OrgService.instance;
  }

  public async getOrganization(): Promise<Organization> {
    const response = await APIService.get("organizations/me")
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData?.error || "Failed to fetch organization details.");
    }

    const payload = await response.json();
    return mapOrganization(payload["organization"]);
  }
}

export default OrgService.getInstance();