import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server will be available at http://localhost:5173
// Calls to /api/* are proxied to the api container (http://api:5050)
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://api:5050',
        changeOrigin: true,
        rewrite: p => p, // keep /api prefix; remove if your API doesn't use it
      },
    },
  },
})
