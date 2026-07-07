import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import commonjs from 'vite-plugin-commonjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const targetUrl = env.VITE_BACKEND_URL || 'http://apps.bbhegdecollege.com:9000'

  return {
    plugins: [
      react(),
      tailwindcss(),
      commonjs({
        filter(id) {
          // Apply to xlsx-js-style
          if (id.includes('xlsx-js-style')) {
            return true
          }
          return false
        }
      })
    ],
    server: {
      host: '0.0.0.0',
      port: 5173,
      allowedHosts: true,
      hmr: true,
      proxy: {
        '/api': {
          target: targetUrl,
          changeOrigin: true
        },
        '/socket.io': {
          target: targetUrl,
          ws: true,
          configure: (proxy) => {
            proxy.on('error', (err) => {
              // Suppress ECONNABORTED errors from client disconnects
              if (err.code === 'ECONNABORTED') return
              console.error('[vite] ws proxy error:', err)
            })
            proxy.on('proxyReqWs', (proxyReq, req, socket) => {
              socket.on('error', (err) => {
                if (err.code === 'ECONNABORTED') return
                console.error('[vite] ws proxy socket error:', err)
              })
            })
          }
        },
        '/static': {
          target: targetUrl,
          changeOrigin: true
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        // Polyfill for stream module used by xlsx-js-style
        stream: path.resolve(__dirname, 'src/utils/stream-polyfill.js'),
      },
    },
    optimizeDeps: {
      include: ['xlsx-js-style'],
    },
    build: {
      commonjsOptions: {
        include: [/xlsx-js-style/, /node_modules/],
        transformMixedEsModules: true,
      },
    },
  }
})
