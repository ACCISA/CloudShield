export type RdpDraft = {
  username?: string;
  password?: string;
};

export const mapRdpDraft = (raw: unknown): RdpDraft => {
  if (!raw || typeof raw !== "object") {
    return {};
  }

  const data = raw as Record<string, unknown>;

  return {
    username: typeof data.username === "string" ? data.username : undefined,
    password: typeof data.password === "string" ? data.password : undefined,
  };
};
