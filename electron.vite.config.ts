import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const r = (p: string): string => resolve(p).replace(/\\/g, '/')

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron/main'
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@electron': r('src/main')
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist-electron/preload'
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      outDir: 'dist'
    },
    resolve: {
      alias: {
        '@': r('src/renderer'),
        '@renderer': r('src/renderer')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
