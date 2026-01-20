declare module "regedit-rs" {
  type RegistryValue = {
    value?: unknown;
  };

  type RegistryKey = {
    exists: boolean;
    values: Record<string, RegistryValue>;
  };

  export function list(keys: string[]): Promise<Record<string, RegistryKey>>;
}
