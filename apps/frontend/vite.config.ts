import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res) => {
            // Backend not ready yet — return clean JSON 503 instead of crashing the proxy log
            if ('writeHead' in res) {
              (res as import('http').ServerResponse).writeHead(503, { 'Content-Type': 'application/json' })
              ;(res as import('http').ServerResponse).end(
                JSON.stringify({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend no disponible' } })
              )
            }
          })
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
