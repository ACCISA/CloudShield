import { ipcMain, app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "child_process";
createRequire(import.meta.url);
const __dirname$1 = path.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname$1, "preload.mjs")
    }
  });
  win.webContents.on("did-finish-load", () => {
    win == null ? void 0 : win.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}
ipcMain.handle("run-openvpn", async () => {
  return new Promise((resolve, reject) => {
    var _a, _b;
    try {
      const child = spawn("openvpn", ["--config", "/etc/openvpn/client.conf"]);
      let output = "";
      let error = "";
      resolve({
        success: true,
        pid: child.pid,
        message: "xfreerdp3 launched"
      });
      (_a = child.stdout) == null ? void 0 : _a.on("data", (data) => {
        output += data.toString();
      });
      (_b = child.stderr) == null ? void 0 : _b.on("data", (data) => {
        error += data.toString();
        console.log("[xfreerdp3 stderr]:", data.toString());
      });
      child.on("close", (code) => {
        if (code !== 0) {
          console.log(`[xfreerdp3] Process exited with code ${code}`);
          if (error) console.log("[xfreerdp3 error output]:", error);
        }
      });
      child.on("error", (err) => {
        console.error("[xfreerdp3 spawn error]:", err);
      });
    } catch (err) {
      reject(err);
    }
  });
});
ipcMain.handle(
  "run-xfreerdp",
  async (_event, params) => {
    return new Promise((resolve, reject) => {
      var _a, _b;
      try {
        const child = spawn("xfreerdp3", [
          `/u:${params.username}`,
          `/p:${params.password}`,
          `/v:${params.ip}`,
          "/cert:tofu"
        ]);
        let output = "";
        let error = "";
        resolve({
          success: true,
          pid: child.pid,
          message: "xfreerdp3 launched"
        });
        (_a = child.stdout) == null ? void 0 : _a.on("data", (data) => {
          output += data.toString();
        });
        (_b = child.stderr) == null ? void 0 : _b.on("data", (data) => {
          error += data.toString();
          console.log("[xfreerdp3 stderr]:", data.toString());
        });
        child.on("close", (code) => {
          if (code !== 0) {
            console.log(`[xfreerdp3] Process exited with code ${code}`);
            if (error) console.log("[xfreerdp3 error output]:", error);
          }
        });
        child.on("error", (err) => {
          console.error("[xfreerdp3 spawn error]:", err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(createWindow);
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
