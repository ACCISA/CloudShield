import { apiPost } from "../api/client.js";

export const createWorkstation = async (orgId, name, ip, groups) => {
  try {
    const response = await apiPost(
      "/workstations",
      {
        org_id: orgId,
        name,
        ip,
        groups: groups?.map((group) => group.id) || [],
      },
      { credentials: "include" },
    );

    return typeof response?.json === "function"
      ? await response.json()
      : response;
  } catch (error) {
    console.error("Failed to create workstation:", error);
    return null;
  }
};
