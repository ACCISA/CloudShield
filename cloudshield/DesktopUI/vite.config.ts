import { defineConfig } from "vite";
import path from "node:path";
import electron from "vite-plugin-electron/simple";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const isContainerMode = process.env.DESKTOPUI_CONTAINER === "true";
const devHost = process.env.VITE_DEV_HOST || "0.0.0.0";
const devPort = Number.parseInt(process.env.VITE_PORT || "5174", 10);
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://api:5050"; //NOSONAR

// https://vitejs.dev/config/
export default defineConfig({
  cacheDir: ".vite",
  plugins: isContainerMode
    ? [tailwindcss(), react()]
    : [
        tailwindcss(),
        react(),
        electron({
          main: {
            // Shortcut of `build.lib.entry`.
            entry: "electron/main.ts",
            vite: {
              build: {
                rollupOptions: {
                  external: ["regedit-rs"],
                },
              },
            },
          },
          preload: {
            // Shortcut of `build.rollupOptions.input`.
            // Preload scripts may contain Web assets, so use the `build.rollupOptions.input` instead `build.lib.entry`.
            input: path.join(__dirname, "electron/preload.ts"),
            vite: {
              build: {
                rollupOptions: {
                  external: ["regedit-rs"],
                  output: {
                    format: "cjs",
                    entryFileNames: "preload.cjs",
                  },
                },
              },
            },
          },
          // Ployfill the Electron and Node.js API for Renderer process.
          // If you want use Node.js in Renderer process, the `nodeIntegration` needs to be enabled in the Main process.
          // See 👉 https://github.com/electron-vite/vite-plugin-electron-renderer
          renderer:
            process.env.NODE_ENV === "test"
              ? // https://github.com/electron-vite/vite-plugin-electron-renderer/issues/78#issuecomment-2053600808
                undefined
              : {},
        }),
      ],
  server: {
    host: devHost,
    port: devPort,
    strictPort: true,
    watch: {
      usePolling: true,
      interval: 1000,
    },
    hmr: {
      overlay: true,
    },
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
        rewrite: (p) => p,
      },
    },
  },
});