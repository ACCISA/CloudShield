/// <reference types="vite/client" />
import type { VPNConnectInput, VPNState } from "./models/VPN";

type ElectronAPI = {
  runXfreerdp: (
    username: string,
    password: string,
    ip: string,
  ) => Promise<unknown>;
  killProcess: (pid: number) => Promise<unknown>;
  showOpenDialog: (options: unknown) => Promise<unknown>;
};

type VPNAPI = {
  getState: () => Promise<VPNState>;
  connect: (input: VPNConnectInput) => Promise<unknown>;
  disconnect: () => Promise<unknown>;
  onStateChanged: (cb: (state: VPNState) => void) => () => void;
  receiveError: (errorMessage: string) => Promise<unknown>;
};

type AuthStoreAPI = {
  saveAuth: (payload: {
    accessToken: string;
    tokenType?: string;
    expiresIn?: number;
    email?: string;
  }) => void;
  loadAuth: () => {
    accessToken?: string;
    tokenType?: string;
    expiresAt?: number;
    email?: string;
  };
  clearAuth: () => void;
};

declare global {
  interface Window {
    ipcRenderer: import("electron").IpcRenderer;
    electronAPI?: ElectronAPI;
    vpnAPI?: VPNAPI;
    authStore?: AuthStoreAPI;
  }
}

export {};
