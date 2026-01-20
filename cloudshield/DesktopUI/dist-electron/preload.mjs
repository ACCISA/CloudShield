import { contextBridge, ipcRenderer } from "electron";
import Store from "electron-store";

contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...eventArgs) =>
      listener(event, ...eventArgs)
    );
  },
  off(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

contextBridge.exposeInMainWorld("electronAPI", {
  runXfreerdp: (username, password, ip) =>
    ipcRenderer.invoke("run-xfreerdp", { username, password, ip }),
  runOpenVPN: (ovpnPath) => ipcRenderer.invoke("run-openvpn", { ovpnPath }),
  showOpenDialog: (options) => ipcRenderer.invoke("show-open-dialog", options),
});

const authStore = new Store({ name: "auth" });

contextBridge.exposeInMainWorld("authStore", {
  saveAuth: (payload) => {
    const expiresAt = payload.expiresIn
      ? Date.now() + payload.expiresIn * 1000
      : undefined;

    authStore.set({
      accessToken: payload.accessToken,
      tokenType: payload.tokenType ?? "Bearer",
      expiresAt,
      email: payload.email,
    });
  },
  loadAuth: () => authStore.store,
  clearAuth: () => authStore.clear(),
});
