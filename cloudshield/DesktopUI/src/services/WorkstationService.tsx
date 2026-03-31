// import APIService from "../utils/APIService";
import { Workstation, WorkstationTemplate } from "../models/Workstations";

import APIService from "../utils/APIService";
import { mapWorkstationTemplate, mapWorkstation } from "../models/Workstations";
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
    const response = await APIService.get("workstations/templates", {}, true);
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

  public async getWorkstations(): Promise<Workstation[]> {

    const response = await APIService.get(
      "workstation/available",
      {},
      false,
      true,
    );
    if (response.status === 200) {
      let workstations: Workstation[] = [];
      const body = response.body;
      if (Array.isArray(body["workstations"])) {
        workstations = body["workstations"].map((item) => {
          return mapWorkstation(item);
        });
      }
      return workstations;
    } else {
      throw new Error(response.status.toString() + response.body);
    }
  }
}

export default WorkstationService.getInstance();
