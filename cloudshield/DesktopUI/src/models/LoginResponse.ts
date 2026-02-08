export type LoginResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: string;
};

export const mapLoginResponse = (raw: unknown): LoginResponse => {
  if (!raw || typeof raw !== "object") {
    return {};
  }
console.log("raw", raw);
  const data = raw as Record<string, unknown>;
  console.log("data", data);

  return {
    access_token:
      data.access_token?.toString(),
    token_type: data.token_type?.toString(),
    expires_in: data.expires_in as number | -1,
    error: data.error?.toString(),
  };
};
