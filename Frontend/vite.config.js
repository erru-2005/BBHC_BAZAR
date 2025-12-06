import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'
import commonjs from 'vite-plugin-commonjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
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
    },
    resolve: {
      alias: {
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
})
