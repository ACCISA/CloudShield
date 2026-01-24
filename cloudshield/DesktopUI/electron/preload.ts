import { ipcRenderer, contextBridge } from "electron";
import { createRequire } from "node:module";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) =>
      listener(event, ...args)
    );
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },

  // You can expose other APTs you need here.
  // ...
});

contextBridge.exposeInMainWorld("electronAPI", {
  runXfreerdp: (username: string, password: string, ip: string) =>
    ipcRenderer.invoke("run-xfreerdp", { username, password, ip }),
  runOpenVPN: (ovpnPath?: string) => ipcRenderer.invoke("run-openvpn", { ovpnPath }),
  showOpenDialog: (options: Parameters<typeof ipcRenderer.invoke>[1]) =>
    ipcRenderer.invoke("show-open-dialog", options),
});

type AuthStoreSnapshot = {
  accessToken?: string;
  tokenType?: string;
  expiresAt?: number;
  email?: string;
};

type SaveAuthPayload = {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
  email?: string;
};

// Persist auth tokens without exposing file system access to the renderer
type AuthStore = {
  set: (value: AuthStoreSnapshot) => void;
  store: AuthStoreSnapshot;
  clear: () => void;
};

const inMemoryStore: AuthStoreSnapshot = {};
let authStore: AuthStore | null = null;

try {
  const require = createRequire(import.meta.url);
  type StoreConstructor = new <T extends Record<string, unknown>>(
    options?: import("electron-store").Options<T>
  ) => import("electron-store").default<T>;
  const Store = require("electron-store") as StoreConstructor;
  authStore = new Store<AuthStoreSnapshot>({ name: "auth" });
} catch (error) {
  // Fall back to in-memory store when electron-store is unavailable
  authStore = {
    set: (value) => {
      Object.assign(inMemoryStore, value);
    },
    get store() {
      return { ...inMemoryStore };
    },
    clear: () => {
      for (const key of Object.keys(inMemoryStore)) {
        delete inMemoryStore[key as keyof AuthStoreSnapshot];
      }
    },
  };
}

contextBridge.exposeInMainWorld("authStore", {
  saveAuth: (payload: SaveAuthPayload) => {
    const expiresAt = payload.expiresIn
      ? Date.now() + payload.expiresIn * 1000
      : undefined;

    authStore?.set({
      accessToken: payload.accessToken,
      tokenType: payload.tokenType ?? "Bearer",
      expiresAt,
      email: payload.email,
    });
  },
  loadAuth: (): AuthStoreSnapshot => authStore?.store ?? {},
  clearAuth: () => authStore?.clear(),
});
