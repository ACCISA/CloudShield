/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string;
    /** /dist/ or /public/ */
    VITE_PUBLIC: string;
  }
}

// Used in Renderer process, expose in `preload.ts`
interface ElectronAPI {
  runXfreerdp: (
    username: string,
    password: string,
    ip: string,
  ) => Promise<unknown>;
  showOpenDialog: (
    options: import("electron").OpenDialogOptions,
  ) => Promise<import("electron").OpenDialogReturnValue>;
  killProcess: (pid: number) => Promise<{ success: boolean; message: string }>;
}

type VPNState = import("../src/models/VPN").VPNState;
type VPNConnectInput = import("../src/models/VPN").VPNConnectInput;

interface VPNAPI {
  getState: () => Promise<VPNState>;
  connect: (input: VPNConnectInput) => Promise<unknown>;
  disconnect: () => Promise<unknown>;
  onStateChanged: (cb: (state: VPNState) => void) => () => void;
}

interface AuthStoreAPI {
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
}

interface Window {
  ipcRenderer: import("electron").IpcRenderer;
  electronAPI?: ElectronAPI;
  vpnAPI?: VPNAPI;
  authStore?: AuthStoreAPI;
}
