import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
