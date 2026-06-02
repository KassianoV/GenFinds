import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      outDir: 'dist-electron/main'
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@electron': resolve('src/main')
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
      outDir: 'dist',
      rollupOptions: {
        input: resolve('src/renderer/index.html')
      }
    },
    server: {
      fs: { allow: ['..'] }
    },
    resolve: {
      alias: {
        '@': resolve('src'),
        '@renderer': resolve('src')
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
