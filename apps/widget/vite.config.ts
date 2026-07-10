import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: 'src/main.tsx',
      name: 'WenzaPay',
      formats: ['iife'],
      fileName: () => 'widget.js'
    },
    rollupOptions: {
      // Intentionally not externalizing anything so everything is bundled
      external: [],
      output: {
        globals: {}
      }
    },
    sourcemap: true,
    emptyOutDir: true
  }
})
