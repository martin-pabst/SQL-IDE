
import { mergeConfig, type UserConfig } from 'vite'
import commonConfig from './vite.config-common.ts'

// mergeConfig merges deeply, so the `build` options from vite.config-common.ts are kept
export default mergeConfig(commonConfig, {
  base: '',
  build: {
    rolldownOptions: {
      input: {
        embedded: './embedded.html'
      },
      output: {
        entryFileNames: _assetInfo => {
          return 'sql-ide-embedded.js'; // im Hauptverzeichnis
        },
        assetFileNames: assetInfo => assetInfo.names.some(name => name.endsWith('css')) ? 'sql-ide-embedded.css' : 'assets/[name]-[hash][extname]',
        codeSplitting: {
          groups: [{
            debugName: 'css / npm packages / own sourcecode',
            name: (id: string) => {
              if (id.endsWith('.css')) {
                return 'css';
              }
              if (id.includes('node_modules')) return id.toString().split('node_modules/')[1].split('/')[0].toString().replace("@", "");
              // 'everything' - jetzt entstehen nur 1 CSS Asset, 1 JS Assert, plus 1 Worker JS Assets.
              return 'own_sourcecode';
            },
          }],
        },
      }
    },
    outDir: './dist-embedded',
  }
} satisfies UserConfig);