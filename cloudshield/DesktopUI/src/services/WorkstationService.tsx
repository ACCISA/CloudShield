// import APIService from "../utils/APIService";
import {
  // mapWorkstationTemplate,
  Workstation,
  WorkstationTemplate,
} from "../models/Workstations";
import {
  mockWorkstations,
  mockWorkstationTemplates,
} from "../mocks/WorkstationsMock";
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
    // TODO: Replace with real API call when backend is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockWorkstationTemplates);
      }, 500); // Simulate network delay
    });
    // const response = await APIService.get("workstations/templates");
    // if (response.status === 200) {
    //     let templates: WorkstationTemplate[] = [];
    //     const body = response.body;
    //     if (Array.isArray(body)) {
    //         templates = body.map((item) => {
    //             return mapWorkstationTemplate(item);
    //         });
    //     }
    //     return templates;
    // }
    // else{
    //     throw new Error(response.status.toString() + response.body);
    // }
  }

  public async getWorkstations(): Promise<Workstation[]> {
    // TODO: Replace with real API call when backend is ready
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(mockWorkstations);
      }, 500); // Simulate network delay
    });
    // const response = await APIService.get("workstations/pool");
    // if (response.status === 200) {
    //     let workstations: Workstation[] = [];
    //     const body = response.body;
    //     if (Array.isArray(body)) {
    //         workstations = body.map((item) => {
    //             return mapWorkstation(item);
    //         });
    //     }
    //     return workstations;
    // }
    // else{
    //     throw new Error(response.status.toString() + response.body);
    // }
  }
}

export default WorkstationService.getInstance();
