import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    // Proxy all /api calls to the nginx gateway.
    // This avoids CORS issues when running `npm run dev` locally.
    // The gateway (port 3000) routes to each microservice internally.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        // No rewrite needed — gateway expects /api/v1/... paths as-is
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV !== 'production',
  },
})
