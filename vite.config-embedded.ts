
import type { UserConfig } from 'vite'
import commonConfig from './vite.config-common.ts'

export default {
  ...commonConfig,
  base: '',
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        embedded: './embedded.html'
      },
      output: {
        entryFileNames: _assetInfo => {
          return 'sql-ide-embedded.js'; // im Hauptverzeichnis
        },
        assetFileNames: assetInfo => assetInfo.name?.endsWith('css') ? 'sql-ide-embedded.css' : 'assets/[name]-[hash][extname]',
        manualChunks: (id: string, { getModuleInfo, getModuleIds }) => {
          if (id.endsWith('.css')) {
            return 'css';
          }
          if (id.includes('node_modules')) return id.toString().split('node_modules/')[1].split('/')[0].toString().replace("@", "");
          // 'everything' - jetzt entstehen nur 1 CSS Asset, 1 JS Assert, plus 1 Worker JS Assets.
          return 'own_sourcecode';
        },
      }
    },
    outDir: './dist-embedded',
    chunkSizeWarningLimit: 4912,
  }
} satisfies UserConfig;