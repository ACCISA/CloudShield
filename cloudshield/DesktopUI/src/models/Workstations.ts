

export enum WorkstationStatus {
  Active = 0,
  Inactive = 1,
}

export type Software = {
    name: string;
    description: string;
    path: string;
}

export type WorkstationTemplate ={
    name: string;
    org_id: string;
    description: string;
    software: Software[];
    is_ready: boolean;
    access_groups: string[];
}

export type Workstation = {
    org_id: string;
    template_id: string;
    mac?: string;
    ipv4_address?: string;
    status: WorkstationStatus;
}

const toStringArray = (value: unknown): string[] => {
    if (!Array.isArray(value)) return [];
    return value.filter((entry) => typeof entry === "string") as string[];
};

export const mapSoftware = (raw: unknown): Software => {
    if (!raw || typeof raw !== "object") {
        return { name: "", description: "", path: "" };
    }
    const data = raw as Record<string, unknown>;
    return {
        name: typeof data.name === "string" ? data.name : "",
        description: typeof data.description === "string" ? data.description : "",
        path: typeof data.path === "string" ? data.path : "",
    };
};



export const mapWorkstationTemplate = (raw: unknown): WorkstationTemplate => {
    if (!raw || typeof raw !== "object") {
        return {
            name: "",
            org_id: "",
            description: "",
            software: [],
            is_ready: false,
            access_groups: [],
        };
    }

    const data = raw as Record<string, unknown>;
    const softwareRaw = Array.isArray(data.software) ? data.software : [];

    return {
        name: typeof data.name === "string" ? data.name : "",
        org_id: typeof data.org_id === "string" ? data.org_id : "",
        description: typeof data.description === "string" ? data.description : "",
        software: softwareRaw.map(mapSoftware),
        is_ready: typeof data.is_ready === "boolean" ? data.is_ready : false,
        access_groups: toStringArray(data.access_groups),
    };
};

export const mapWorkstation = (raw: unknown): Workstation => {
    if (!raw || typeof raw !== "object") {
        return {
            org_id: "",
            template_id: "",
            status: WorkstationStatus.Inactive,
        };
    }

    const data = raw as Record<string, unknown>;
    const statusValue =
        typeof data.status === "number" ? data.status : WorkstationStatus.Inactive;

    return {
        org_id: typeof data.org_id === "string" ? data.org_id : "",
        template_id: typeof data.template_id === "string" ? data.template_id : "",
        mac: typeof data.mac === "string" ? data.mac : undefined,
        ipv4_address:
            typeof data.ipv4_address === "string" ? data.ipv4_address : undefined,
        status: statusValue as WorkstationStatus,
    };
};

export const mapWorkstationTemplates = (raw: unknown): WorkstationTemplate[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map(mapWorkstationTemplate);
};

export const mapWorkstations = (raw: unknown): Workstation[] => {
    if (!Array.isArray(raw)) return [];
    return raw.map(mapWorkstation);
};