/// <reference types="vite/client" />

type ElectronAPI = {
  runXfreerdp: (
    username: string,
    password: string,
    ip: string,
  ) => Promise<unknown>;
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
    authStore?: AuthStoreAPI;
  }
}

export {};
