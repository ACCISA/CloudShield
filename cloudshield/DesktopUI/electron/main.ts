import { app, BrowserWindow, ipcMain } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { spawn } from "child_process";

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

// IPC handler for running xfreerdp3 command
ipcMain.handle("run-openvpn", async () => {
  return new Promise((resolve, reject) => {
    try {
      const child = spawn("openvpn", ["--config", "/etc/openvpn/client.conf"]);
      let output = "";
      let error = "";

      // Resolve immediately on successful spawn (xfreerdp3 is a UI app)
      resolve({
        success: true,
        pid: child.pid,
        message: "xfreerdp3 launched",
      });

      child.stdout?.on("data", (data) => {
        output += data.toString();
      });

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
});

ipcMain.handle(
  "run-xfreerdp",
  async (
    _event,
    params: { username: string; password: string; ip: string }
  ) => {
    return new Promise((resolve, reject) => {
      try {
        const child = spawn("xfreerdp3", [
          `/u:${params.username}`,
          `/p:${params.password}`,
          `/v:${params.ip}`,
          "/cert:tofu",
        ]);
        let output = "";
        let error = "";

        // Resolve immediately on successful spawn (xfreerdp3 is a UI app)
        resolve({
          success: true,
          pid: child.pid,
          message: "xfreerdp3 launched",
        });

        child.stdout?.on("data", (data) => {
          output += data.toString();
        });

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
  }
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
