import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, '..')
const idlPath = path.join(repoRoot, 'target/idl/carbon_credit_tokenizer.json')

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
    'process.env': {},
    'process.browser': true,
    'process.version': '""',
  },
  resolve: {
    alias: {
      '@carbon-token/idl': idlPath,
      buffer: 'buffer',
      process: 'process',
      util: 'util',
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      path: 'path-browserify',
      os: 'os-browserify/browser',
      assert: 'assert',
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
  },
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'util',
      'crypto-browserify',
      'stream-browserify',
      'path-browserify',
      'os-browserify/browser',
      'assert',
    ],
  },
})
