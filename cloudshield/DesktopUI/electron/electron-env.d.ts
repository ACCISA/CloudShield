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
    ip: string
  ) => Promise<unknown>;
  runOpenVPN: () => Promise<unknown>;
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
  authStore?: AuthStoreAPI;
}
