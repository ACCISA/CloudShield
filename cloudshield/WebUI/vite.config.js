import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev server will be available at http://localhost:5173
// Calls to /api/* are proxied to the URL in VITE_API_PROXY_TARGET (default: http://api:5050)
const devHost = process.env.VITE_DEV_HOST || "0.0.0.0";
const devPort = Number.parseInt(process.env.VITE_PORT || "5173", 10);
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://api:5050";

export default defineConfig({
  plugins: [react()],
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
        rewrite: (p) => p, // keep /api prefix; remove if your API doesn't use it
      },
    },
  },
  css: {
    devSourcemap: true,
  },
});