import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const r = (p: string): string => resolve(p).replace(/\\/g, '/')

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        input: r('electron/main.ts'),
        output: { entryFileNames: 'index.js' }
      }
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@electron': r('electron')
      }
    }
  },
  preload: {
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: r('electron/preload.ts'),
        output: { entryFileNames: 'index.js' }
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    root: r('src/renderer'),
    build: {
      outDir: r('dist'),
      rollupOptions: {
        input: r('src/renderer/index.html')
      }
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
