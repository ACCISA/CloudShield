export type ElectronResult = {
  success: boolean;
  pid?: number;
  message: string;
};

export const mapElectronResult = (raw: unknown): ElectronResult => {
  if (!raw || typeof raw !== "object") {
    return { success: false, message: "" };
  }

  const data = raw as Record<string, unknown>;

  return {
    success: Boolean(data.success),
    pid: typeof data.pid === "number" ? data.pid : undefined,
    message: typeof data.message === "string" ? data.message : "",
  };
};
