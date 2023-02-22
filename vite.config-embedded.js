
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    build: {
      sourcemap: true,
      rollupOptions: {
        input: {
          embedded: resolve(__dirname, 'embedded.html')
        },
        output: {
          entryFileNames: assetInfo => 'sql-ide-embedded.js',
          assetFileNames: assetInfo => assetInfo.name.endsWith('css') ? 'sql-ide-embedded.css' : 'assets/[name]-[hash][extname]',
          manualChunks: {}
        }
      },
      chunkSizeWarningLimit: 4912,
      emptyOutDir: false
    }
  });