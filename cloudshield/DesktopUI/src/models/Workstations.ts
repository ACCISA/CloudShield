

export enum WorkstationStatus {
  Active = "active",
  Inactive = "inactive",
}

export type Software = {
    name: string;
    description: string;
    path: string;
}

export type WorkstationTemplate = {
  _id: string;
  name: string;
  org_id: string;
  description: string;
  software: Software[];
  is_ready: boolean;
  access_groups?: string[];
  members?: string[];
};

export type Workstation = {
  _id: string;
  cur_user_id: string;
  template_id: string;
  mac?: string;
  ipv4_address?: string;
  status: WorkstationStatus;
  org_id: string;
  members: string[];
  name: string;
};

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
      _id: "",
      name: "",
      org_id: "",
      description: "",
      software: [],
      is_ready: false,
      access_groups: [],
      members: [],
    };
  }

  const data = raw as Record<string, unknown>;
  const softwareRaw = Array.isArray(data.software) ? data.software : [];

  return {
    _id: typeof data._id === "string" ? data._id : "",
    name: typeof data.name === "string" ? data.name : "",
    org_id: typeof data.org_id === "string" ? data.org_id : "",
    description: typeof data.description === "string" ? data.description : "",
    software: softwareRaw.map(mapSoftware),
    is_ready: typeof data.is_ready === "boolean" ? data.is_ready : false,
    access_groups: Array.isArray(data.access_groups)
      ? toStringArray(data.access_groups)
      : [],
    members: Array.isArray(data.members)
      ? (data.members.filter((m) => typeof m === "string") as string[])
      : [],
  };
};

export const mapWorkstation = (raw: unknown): Workstation => {
    if (!raw || typeof raw !== "object") {
        return {
          _id: "",
          cur_user_id: "",
          template_id: "",
          mac: undefined,
          ipv4_address: undefined,
          status: WorkstationStatus.Inactive,
          org_id: "",
          members: [],
          name: "",
        };
    }

    const data = raw as Record<string, unknown>;
    return {
      _id: typeof data._id === "string" ? data._id : "",
      cur_user_id: typeof data.cur_user_id === "string" ? data.cur_user_id : "",
      template_id: typeof data.template_id === "string" ? data.template_id : "",
      mac: typeof data.mac === "string" ? data.mac : undefined,
      ipv4_address:
        typeof data.ipv4_address === "string" ? data.ipv4_address : undefined,
      status:
        typeof data.status === "string" &&
        (data.status === WorkstationStatus.Active ||
          data.status === WorkstationStatus.Inactive)
          ? (data.status as WorkstationStatus)
          : WorkstationStatus.Inactive,
      org_id: typeof data.org_id === "string" ? data.org_id : "",
      members: Array.isArray(data.members)
        ? (data.members.filter((m) => typeof m === "string") as string[])
        : [],
      name: typeof data.name === "string" ? data.name : "",
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