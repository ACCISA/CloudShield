// import APIService from "../utils/APIService";
import { Workstation, WorkstationTemplate } from "../models/Workstations";

import APIService from "../utils/APIService";
import { mapWorkstationTemplate, mapWorkstation } from "../models/Workstations";
import {
  mockWorkstationTemplates,
  mockWorkstations,
} from "../mocks/WorkstationsMock";

const USE_WORKSTATION_MOCKS =
  (import.meta.env.VITE_DESKTOP_USE_MOCKS ??
    (import.meta.env.DEV ? "true" : "false")) === "true" ||
  (import.meta.env.VITE_DESKTOP_BYPASS_AUTH ??
    (import.meta.env.DEV ? "true" : "false")) === "true";

class WorkstationService {
  private static instance: WorkstationService | null = null;

  private constructor() {
    // Private constructor to prevent direct instantiation
  }

  public static getInstance(): WorkstationService {
    if (!WorkstationService.instance) {
      WorkstationService.instance = new WorkstationService();
    }
    return WorkstationService.instance;
  }

  public async getWorkstationTemplates(): Promise<WorkstationTemplate[]> {
    if (USE_WORKSTATION_MOCKS) {
      return mockWorkstationTemplates;
    }

    const response = await APIService.get(
      "workstations/templates/assigned",
      {},
      true,
      true,
    );
    if (response.status === 200) {
      const data = await response.json();
      if (Array.isArray(data.templates)) {
        return data.templates.map(mapWorkstationTemplate);
      }
      return [];
    } else {
      throw new Error(response.status.toString() + (await response.text()));
    }
  }

  public async assignWorkStation(template_id: string): Promise<Workstation> {
    if (USE_WORKSTATION_MOCKS) {
      const found = mockWorkstations.find(
        (ws) => ws.template_id === template_id,
      );
      if (found) {
        return found;
      }

      return {
        ...mockWorkstations[0],
        _id: `mock-ws-${template_id}`,
        template_id,
      };
    }

    const response = await APIService.get(
      `workstations/assign?template_id=${template_id}`,
      {},
      false,
      true,
    );
    if (response.status === 200) {
      const data = await response.json();
      return mapWorkstation(data["workstation"]);
    } else {
      throw new Error(response.status.toString() + (await response.text()));
    }
  }

  public async releaseWorkStation(): Promise<boolean> {
    if (USE_WORKSTATION_MOCKS) {
      return true;
    }

    const response = await APIService.get(
      "workstations/release",
      {},
      false,
      true,
    );
    if (response.status === 200) {
      const data = await response.json();
      return data["status"];
    } else {
      throw new Error(response.status.toString() + (await response.text()));
    }
  }
}

export default WorkstationService.getInstance();
