import { app, BrowserWindow, ipcMain, dialog, Tray, Menu, nativeImage } from "electron";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { spawn, spawnSync } from "node:child_process";
import { list } from "regedit-rs";
import { OVPNPathResult } from "./models/OVPNPathResult.ts";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { VPNConnectInput, VPNState } from "../src/models/VPN.ts";
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

const CLOUDSHIELD_LOGO_SVG_PATH = path.join(
  process.env.VITE_PUBLIC,
  "cloudshield_logo.svg",
);

const CLOUDSHIELD_LOGO_SOURCE_SVG_PATH = path.join(
  process.env.APP_ROOT,
  "src",
  "assets",
  "cloudShieldLogo.svg",
);

const CLOUDSHIELD_LOGO_PNG_PATH = path.join(
  process.env.APP_ROOT,
  "src",
  "assets",
  "cloudshield_logo_white.png",
);

const CLOUDSHIELD_SVG_PATHS = [
  CLOUDSHIELD_LOGO_SVG_PATH,
  CLOUDSHIELD_LOGO_SOURCE_SVG_PATH,
];

const createNativeImageFromSvgFile = (svgPath: string) => {
  try {
    if (!svgPath || !fs.existsSync(svgPath)) return null;
    const svgMarkup = fs.readFileSync(svgPath, "utf8");
    if (!svgMarkup) return null;

    const dataUrl = `data:image/svg+xml;base64,${Buffer.from(svgMarkup).toString("base64")}`;
    const icon = nativeImage.createFromDataURL(dataUrl);
    return icon.isEmpty() ? null : icon;
  } catch {
    return null;
  }
};

const createNativeImageFromPathList = (paths: string[]) => {
  for (const candidatePath of paths) {
    if (!candidatePath) continue;
    const icon = nativeImage.createFromPath(candidatePath);
    if (!icon.isEmpty()) return icon;
  }

  return null;
};

const getCloudshieldNativeIcon = (width?: number, height?: number) => {
  let icon = null;

  for (const svgPath of CLOUDSHIELD_SVG_PATHS) {
    icon = createNativeImageFromSvgFile(svgPath);
    if (icon) break;
  }

  icon ??= createNativeImageFromPathList(CLOUDSHIELD_SVG_PATHS);
  icon ??= createNativeImageFromPathList([CLOUDSHIELD_LOGO_PNG_PATH]);

  if (!icon) return null;

  if (typeof width === "number" && typeof height === "number") {
    return icon.resize({ width, height, quality: "best" });
  }

  return icon;
};

let win: BrowserWindow | null;
let appIcon: Tray | null = null;
let isQuitting = false;

const showMainWindow = () => {
  if (!win || win.isDestroyed()) {
    createWindow();
    return;
  }

  if (win.isMinimized()) {
    win.restore();
  }

  win.show();
  win.focus();
};

function createWindow() {
  win = new BrowserWindow({
    minWidth: 980,
    icon: getCloudshieldNativeIcon() ?? undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
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

  win.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    win?.hide();
  });
}

let vpnState: VPNState = {
  status: "disconnected",
};
let activeVPNProcess: ReturnType<typeof spawn> | null = null;
let activeVPNPidFile: string | null = null;

const getVPNStatusLabel = (): string => {
  switch (vpnState.status) {
    case "disconnected":
      return "VPN: Disconnected";
    case "connecting":
      return "VPN: Connecting...";
    case "connected":
      return "VPN: Connected";
    case "disconnecting":
      return "VPN: Disconnecting...";
    case "error":
      return `VPN: Error (${vpnState.error ?? "unknown"})`;
    default:
      return "VPN: Unknown";
  }
};

const refreshTrayMenu = () => {
  if (!appIcon) return;

  const contextMenu = Menu.buildFromTemplate([
    { label: getVPNStatusLabel(), enabled: false },
    { type: "separator" },
    { label: "Show", click: () => showMainWindow() },
    { role: "quit" },
  ]);

  appIcon.setToolTip(getVPNStatusLabel());
  appIcon.setContextMenu(contextMenu);
};

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

ipcMain.handle("killProcess", async (_event, params: { pid: number }) => {
  return new Promise((resolve, reject) => {
    try {
      process.kill(params.pid);
      resolve({ success: true, message: `Process ${params.pid} killed.` });
    } catch (err) {
      reject(err);
    }
  });
});

const updateVPNState = (newVPNState: VPNState) => {
  vpnState = newVPNState;
  win?.webContents.send("vpn:stateChanged", vpnState);
  refreshTrayMenu();
};

ipcMain.handle("vpn:getState", async () => {
  return vpnState;
});

ipcMain.handle("vpn:receiveError", async (_event, errorMessage: string) => {
  updateVPNState({ status: "error", error: errorMessage });
});

ipcMain.handle("vpn:connect", async (_event, params: VPNConnectInput = {}) => {
  if (vpnState.status === "connected" || vpnState.status === "connecting") {
    return;
  }

  let ovpnPath = params.ovpnPath;
  if (!ovpnPath && params.ovpnData?.content_b64) {
    const safeFilename = (params.ovpnData.filename || "default.ovpn").replace(
      /[^a-zA-Z0-9._-]/g,
      "_",
    );
    const vpnDir = path.join(app.getPath("userData"), "vpn");
    fs.mkdirSync(vpnDir, { recursive: true });
    ovpnPath = path.join(vpnDir, safeFilename);
    fs.writeFileSync(
      ovpnPath,
      Buffer.from(params.ovpnData.content_b64, "base64"),
    );
  }

  if (!ovpnPath || !fs.existsSync(ovpnPath)) {
    updateVPNState({ status: "error", error: "OVPN file not found" });
    return;
  }

  const vpnRuntimeDir = path.join(app.getPath("userData"), "vpn");
  fs.mkdirSync(vpnRuntimeDir, { recursive: true });
  const pidFilePath = path.join(vpnRuntimeDir, "openvpn.pid");
  activeVPNPidFile = pidFilePath;
  if (fs.existsSync(pidFilePath)) {
    try {
      fs.unlinkSync(pidFilePath);
    } catch {
      // Ignore stale pid file cleanup errors.
    }
  }

  let command = "openvpn";
  const args: string[] = ["--config", ovpnPath, "--writepid", pidFilePath];



  if (process.platform === "win32") {
    const winOVPN = await getWinOVPNPath();
    if (!winOVPN.success) {
      updateVPNState({ status: "error", error: winOVPN.message });
      return;
    }
    command = winOVPN.path!;
  }

  // On Linux, OpenVPN needs elevated privileges to create/use TUN interfaces.
  // Use pkexec by default for non-root users so the OS can prompt for admin auth.
  // Set OPENVPN_USE_PKEXEC=false to bypass this behavior.
  if (
    process.platform === "linux" &&
    process.env.OPENVPN_USE_PKEXEC !== "false" &&
    typeof process.getuid === "function" &&
    process.getuid() !== 0
  ) {
    command = "pkexec";
    args.unshift("/usr/sbin/openvpn");
  }

  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
  }); //NOSONAR typescript:S4036
  activeVPNProcess = child;

  let latestOutput = "";
  let detailedError: string | null = null;
  let launchError: string | null = null;
  let fatalRuntimeErrorSignaled = false;

  const handleOpenVPNOutput = (chunk: Buffer, isStdErr = false) => {
    const output = chunk.toString();
    latestOutput += output;

    if (isStdErr) {
      process.stderr.write(output);
    } else {
      process.stdout.write(output);
    }

    if (output.includes("Initialization Sequence Completed")) {
      updateVPNState({
        status: "connected",
        pid: child.pid,
        connectedAt: Date.now(),
      });
      return;
    }

    const permissionIssue =
      /Operation not permitted|Cannot allocate DCO dev dynamically|TUNSETIFF|Cannot ioctl TUNSETIFF|cannot open TUN\/TAP/i.test(
        output,
      );
    const tlsNegotiationFailed =
      /TLS key negotiation failed|TLS handshake failed|Inactivity timeout/i.test(
        output,
      );
    const authFailed = /AUTH_FAILED|auth failed/i.test(output);

    if (permissionIssue) {
      detailedError =
        "OpenVPN needs elevated network privileges on Linux (CAP_NET_ADMIN). Run the app/OpenVPN with required privileges.";
    }

    if (!fatalRuntimeErrorSignaled && (tlsNegotiationFailed || authFailed)) {
      fatalRuntimeErrorSignaled = true;
      detailedError = authFailed
        ? "OpenVPN authentication failed. Refresh credentials/config and try again."
        : "OpenVPN TLS handshake timed out. VPN endpoint is unreachable from this container/network.";
      try {
        child.kill("SIGTERM");
      } catch {
        // Ignore shutdown race.
      }
    }
  };

  child.on("spawn", () => {
    updateVPNState({ status: "connecting", pid: child.pid });
  });

  child.stdout?.on("data", (data) => handleOpenVPNOutput(data));
  child.stderr?.on("data", (data) => handleOpenVPNOutput(data, true));

  child.on("error", (err) => {
    if (activeVPNProcess?.pid === child.pid) {
      activeVPNProcess = null;
    }
    if (process.platform === "linux" && command === "pkexec") {
      const msg = /ENOENT/i.test(err.message)
        ? "pkexec not found. Install polkit or run OpenVPN with CAP_NET_ADMIN/root."
        : `Failed to start elevated OpenVPN: ${err.message}`;
      launchError = msg;
      updateVPNState({ status: "error", error: msg });
      return;
    }
    launchError = err.message;
    updateVPNState({ status: "error", error: err.message });
  });

  child.on("close", (code) => {
    if (activeVPNProcess?.pid === child.pid) {
      activeVPNProcess = null;
    }
    if (launchError) {
      return;
    }
    if (process.platform === "linux" && command === "pkexec" && code === 126) {
      updateVPNState({
        status: "error",
        error:
          "OpenVPN elevation was denied or canceled. Please authorize admin access to connect.",
      });
      return;
    }
    if (code === 0) {
      updateVPNState({ status: "disconnected" });
    } else {
      updateVPNState({
        status: "error",
        error:
          detailedError ||
          `OpenVPN exited with code ${code ?? "unknown"}${latestOutput ? ". Check logs for details." : ""}`,
      });
    }
  });
});

const disconnectVPN = () => {
  if (
    vpnState.status === "disconnected" &&
    !vpnState.pid &&
    !activeVPNProcess?.pid &&
    !activeVPNPidFile
  ) {
    return;
  }

  const pidsToKill = new Set<number>();
  if (vpnState.pid) {
    pidsToKill.add(vpnState.pid);
  }
  if (activeVPNProcess?.pid) {
    pidsToKill.add(activeVPNProcess.pid);
  }
  if (activeVPNPidFile && fs.existsSync(activeVPNPidFile)) {
    const pidRaw = fs.readFileSync(activeVPNPidFile, "utf8").trim();
    const pid = Number.parseInt(pidRaw, 10);
    if (Number.isInteger(pid) && pid > 0) {
      pidsToKill.add(pid);
    }
  }

  try {
    updateVPNState({ status: "disconnecting" });
    for (const pid of pidsToKill) {
      try {
        process.kill(pid);
      } catch (err: any) {
        // If OpenVPN was started elevated (pkexec), killing can require elevation too.
        if (
          process.platform === "linux" &&
          typeof process.getuid === "function" &&
          process.getuid() !== 0 &&
          (err?.code === "EPERM" || err?.code === "EACCES")
        ) {
          spawnSync("pkexec", ["kill", String(pid)], {
            stdio: ["ignore", "pipe", "pipe"],
          });
        }
      }
    }

    if (activeVPNPidFile && fs.existsSync(activeVPNPidFile)) {
      try {
        fs.unlinkSync(activeVPNPidFile);
      } catch {
        // Ignore pid file cleanup errors.
      }
    }

    activeVPNProcess = null;
    updateVPNState({ status: "disconnected" });
  } catch (err: any) {
    updateVPNState({ status: "error", error: err.message });
  }
};

ipcMain.handle("vpn:disconnect", async () => {
  disconnectVPN();
});

ipcMain.handle("show-open-dialog", async (_event, options) => {
  const focused = BrowserWindow.getFocusedWindow();
  if (focused) return await dialog.showOpenDialog(focused, options);
  return await dialog.showOpenDialog(options);
});

ipcMain.handle(
  "runXfreerdp",
  async (
    _event,
    params: { username: string; password: string; ip: string },
  ) => {
    return new Promise((resolve, reject) => {
      try {
        const isWin = process.platform === "win32";
        const exePath: string = "xfreerdp3";
        let settled = false;

        if (isWin) {
          // Fallback to Windows built-in RDP client
          const mstsc = "mstsc.exe";
          const child = spawn(mstsc, ["/v:" + params.ip, "/f"]); //NOSONAR typescript:S4036
          child.on("error", (err) => {
            if (settled) return;
            settled = true;
            reject(err);
          });
          child.on("close", (code) => {
            if (settled) return;
            settled = true;
            if (code !== 0) {
              return reject(
                new Error(`mstsc exited with code ${code ?? "unknown"}`),
              );
            }
            return resolve({
              success: true,
              pid: child.pid,
              message: "mstsc launched",
            });
          });
          return;
        }

        //NOSONAR typescript:S4036
        const child = spawn(exePath, [
          `/u:${params.username}`,
          `/p:${params.password}`,
          `/v:${params.ip}`,
          "/f",
          "/cert:tofu",
        ]);
        let error = "";
        child.stdout?.on("data", () => undefined);

        child.stderr?.on("data", (data) => {
          error += data.toString();
          console.log("[xfreerdp3 stderr]:", data.toString());
        });

        child.on("close", (code) => {
          if (settled) return;
          settled = true;
          if (code !== 0) {
            if (error) console.log("[xfreerdp3 error output]:", error);
            return reject(
              new Error(`xfreerdp3 exited with code ${code ?? "unknown"}`),
            );
          }
          return resolve({
            success: true,
            pid: child.pid,
            message: "xfreerdp3 launched",
          });
        });

        child.on("error", (err) => {
          if (settled) return;
          settled = true;
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  },
);

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
}

app.on("second-instance", () => {
  showMainWindow();
});

app.on("before-quit", () => {
  disconnectVPN();
  isQuitting = true;
});

app.on("window-all-closed", () => {
  // quit using tray instead
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.whenReady().then(() => {
  if (process.platform === "darwin") {
    const dockIcon = getCloudshieldNativeIcon(128, 128);
    if (dockIcon) {
      app.dock.setIcon(dockIcon);
    }
  }

  const trayIcon =
    process.platform === "darwin"
      ? getCloudshieldNativeIcon(18, 18)
      : getCloudshieldNativeIcon();

  if (trayIcon) {
    appIcon = new Tray(trayIcon);
    appIcon.on("click", () => {
      showMainWindow();
    });
    refreshTrayMenu();
  }

  createWindow();
});
