import { ipcMain as u, app as d, BrowserWindow as v } from "electron";
import { fileURLToPath as _ } from "node:url";
import n from "node:path";
import { spawn as m } from "child_process";
const w = n.dirname(_(import.meta.url));
process.env.APP_ROOT = n.join(w, "..");
const a = process.env.VITE_DEV_SERVER_URL, T = n.join(process.env.APP_ROOT, "dist-electron"), g = n.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = a ? n.join(process.env.APP_ROOT, "public") : g;
let r;
function P() {
  r = new v({
    icon: n.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: n.join(w, "preload.mjs")
    }
  }), r.webContents.on("did-finish-load", () => {
    r == null || r.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  }), a ? r.loadURL(a) : r.loadFile(n.join(g, "index.html"));
}
u.handle("run-openvpn", async () => new Promise((f, i) => {
  var c, p;
  try {
    const o = m("openvpn", ["--config", "/etc/openvpn/client.conf"]);
    let s = "";
    f({
      success: !0,
      pid: o.pid,
      message: "OpenVPN Connected"
    }), (c = o.stdout) == null || c.on("data", () => {
    }), (p = o.stderr) == null || p.on("data", (e) => {
      s += e.toString(), console.log("[openvpn stderr]:", e.toString());
    }), o.on("close", (e) => {
      e !== 0 && (console.log(`[openvpn] Process exited with code ${e}`), s && console.log("[openvpn error output]:", s));
    }), o.on("error", (e) => {
      console.error("[openvpn spawn error]:", e);
    });
  } catch (o) {
    i(o);
  }
}));
u.handle(
  "run-xfreerdp",
  async (f, i) => new Promise((c, p) => {
    var o, s;
    try {
      const e = m("xfreerdp3", [
        `/u:${i.username}`,
        `/p:${i.password}`,
        `/v:${i.ip}`,
        "/cert:tofu"
      ]);
      let l = "";
      c({
        success: !0,
        pid: e.pid,
        message: "xfreerdp3 launched"
      }), (o = e.stdout) == null || o.on("data", () => {
      }), (s = e.stderr) == null || s.on("data", (t) => {
        l += t.toString(), console.log("[xfreerdp3 stderr]:", t.toString());
      }), e.on("close", (t) => {
        t !== 0 && (console.log(`[xfreerdp3] Process exited with code ${t}`), l && console.log("[xfreerdp3 error output]:", l));
      }), e.on("error", (t) => {
        console.error("[xfreerdp3 spawn error]:", t);
      });
    } catch (e) {
      p(e);
    }
  })
);
d.on("window-all-closed", () => {
  process.platform !== "darwin" && (d.quit(), r = null);
});
d.on("activate", () => {
  v.getAllWindows().length === 0 && P();
});
d.whenReady().then(P);
export {
  T as MAIN_DIST,
  g as RENDERER_DIST,
  a as VITE_DEV_SERVER_URL
};
