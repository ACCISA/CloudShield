import { app, BrowserWindow, ipcMain, dialog } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "child_process";
import { list } from "regedit-rs";
import { OVPNPathResult } from "./models/OVPNPathResult.ts";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
}

const getWinOVPNPath = async (): Promise<OVPNPathResult> => {
  const res = await list(["HKLM\\SOFTWARE\\OpenVPN"]);
  if (!res["HKLM\\SOFTWARE\\OpenVPN"].exists) {
    return { success: false, message: "OpenVPN is not installed.", path: null };
  }
  const exePath = res["HKLM\\SOFTWARE\\OpenVPN"].values["exe_path"]
    .value as string;
  if (!fs.existsSync(exePath)) {
    return {
      success: false,
      message: "OpenVPN executable not found.",
      path: null,
    };
  }
  return { success: true, message: "OpenVPN is installed.", path: exePath };
};

ipcMain.handle("get-win-ovpn-path", async (): Promise<OVPNPathResult> => {
  return getWinOVPNPath();
});

export const getBinPath = (exeName: string) => {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "bin", exeName);
  }

  const platform =
    process.platform === "win32"
      ? "win"
      : process.platform === "darwin"
        ? "mac"
        : "linux";

  return path.join(
    __dirname,
    "..",
    "..",
    "resources",
    "bin",
    platform,
    exeName,
  );
};

ipcMain.handle(
  "run-openvpn",
  async (
    _event,
    params: { ovpnPath: string } = {
      ovpnPath: "",
    },
  ) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!fs.existsSync(params.ovpnPath)) {
          return reject(
            new Error(`OpenVPN config not found: ${params.ovpnPath}`),
          );
        }

        let command: string = "openvpn";

        if (process.platform === "win32") {
          let winOVPN = await getWinOVPNPath();
          if (winOVPN.success) {
            command = winOVPN.path!;
          } else {
            return reject(new Error(winOVPN.message));
          }
        }
        const child = spawn(command, [params.ovpnPath], {
          stdio: "inherit",
        }); //NOSONAR typescript:S4036
        let output = "";
        let error = "";

        resolve({
          success: true,
          pid: child.pid,
          message: `OpenVPN launched with config ${params.ovpnPath}`,
        });

        child.stdout?.on("data", (data) => {
          output += data.toString();
          console.log(output);
        });

        child.stderr?.on("data", (data) => {
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
  },
);

ipcMain.handle("show-open-dialog", async (_event, options) => {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused) return await dialog.showOpenDialog(focused, options);
  return await dialog.showOpenDialog(options);
});

ipcMain.handle(
  "run-xfreerdp",
  async (
    _event,
    params: { username: string; password: string; ip: string },
  ) => {
    return new Promise((resolve, reject) => {
      try {
        const isWin = process.platform === "win32";
        const exeName = isWin ? "wfreerdp.exe" : "xfreerdp3";
        let exePath: string = exeName;

        if (isWin) {
          const candidate = getBinPath(exeName);
          if (fs.existsSync(candidate)) exePath = candidate;
          else if (!fs.existsSync(candidate))
            return reject(
              new Error(`Bundled xfreerdp not found at ${candidate}`),
            );
        }

        //NOSONAR typescript:S4036
        const child = spawn(exePath, [
          `/u:${params.username}`,
          `/p:${params.password}`,
          `/v:${params.ip}`,
          "/cert:tofu",
        ]);
        let error = "";

        resolve({
          success: true,
          pid: child.pid,
          message: "xfreerdp3 launched",
        });

        child.stdout?.on("data", () => undefined);

        child.stderr?.on("data", (data) => {
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
  },
);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(createWindow);
