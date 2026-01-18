import { ipcMain, BrowserWindow, dialog, app } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "child_process";
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
const getBinPath = (exeName) => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", exeName);
  }
  const platform = process.platform === "win32" ? "win" : process.platform === "darwin" ? "mac" : "linux";
  return path.join(
    __dirname$1,
    "..",
    "..",
    "resources",
    "bin",
    platform,
    exeName
  );
};
ipcMain.handle(
  "run-openvpn",
  async (_event, params = {
    ovpnPath: ""
  }) => {
    return new Promise((resolve, reject) => {
      var _a, _b;
      try {
        if (!fs.existsSync(params.ovpnPath)) {
          return reject(
            new Error(`OpenVPN config not found: ${params.ovpnPath}`)
          );
        }
        const child = spawn("openvpn", [params.ovpnPath]);
        let output = "";
        let error = "";
        resolve({
          success: true,
          pid: child.pid,
          message: `OpenVPN launched with config ${params.ovpnPath}`
        });
        (_a = child.stdout) == null ? void 0 : _a.on("data", (data) => {
          output += data.toString();
          console.log(output);
        });
        (_b = child.stderr) == null ? void 0 : _b.on("data", (data) => {
          error += data.toString();
          console.log("[openvpn stderr]:", data.toString());
        });
        child.on("close", (code) => {
          if (code !== 0) {
            console.log(`[openvpn] Process exited with code ${code}`);
            if (error) console.log("[openvpn error output]:", error);
          }
        });
        child.on("error", (err) => {
          console.error("[openvpn spawn error]:", err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
);
ipcMain.handle("show-open-dialog", async (_event, options) => {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused) return await dialog.showOpenDialog(focused, options);
  return await dialog.showOpenDialog(options);
});
ipcMain.handle(
  "run-xfreerdp",
  async (_event, params) => {
    return new Promise((resolve, reject) => {
      var _a, _b;
      try {
        const isWin = process.platform === "win32";
        const exeName = isWin ? "wfreerdp.exe" : "xfreerdp3";
        let exePath = exeName;
        if (isWin) {
          const candidate = getBinPath(exeName);
          if (fs.existsSync(candidate)) exePath = candidate;
          else if (!fs.existsSync(candidate))
            return reject(
              new Error(`Bundled xfreerdp not found at ${candidate}`)
            );
        }
        const child = spawn(exePath, [
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
  VITE_DEV_SERVER_URL,
  getBinPath
};
