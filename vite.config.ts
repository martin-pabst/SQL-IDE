import { mergeConfig, type UserConfig } from 'vite'
import commonConfig from './vite.config-common.ts'

// mergeConfig merges deeply, so the `build` options from vite.config-common.ts are kept
export default mergeConfig(commonConfig, {
  build: {
    rolldownOptions: {
      input: {
        main: ('./index.html'),
        // 'sqljs-worker': './src/client/sqljs-worker/sqljsWorker.ts'
      },
      output: {
        codeSplitting: {
          groups: [{
            debugName: 'one chunk per npm package',
            name: (id: string) => {
              if (id.includes('node_modules')) {
                let moduleName: string = id.toString().split('node_modules/')[1].split('/')[0].toString().replace("@", "");
                if (id.endsWith('.css')) {
                  return moduleName + '_css';
                }
                return moduleName;
              }

              return null;
            },
          }],
        },
      },

      // output: {
      //   entryFileNames: assetInfo => {
      //     if(assetInfo.name.indexOf('worker') >= 0){
      //       return 'worker/[name].js';
      //     }
      //     return '[name]-[hash].js';
      //   },
      //   assetFileNames: assetInfo => assetInfo.name.endsWith('css') ? '[name]-[hash][extname]' : 'assets/[name]-[hash][extname]',
      //   chunkFileNames: 'assets/js/[name]-[hash].js',
      //   manualChunks: {}
      // }
    },
    outDir: './dist',
  },
  server: {
    proxy: {
      '/servlet': 'http://localhost:5500',
      '/servlet/pushWebsocket': { target: 'ws://localhost:5500', ws: true },
      // '/worker': {
      //   rewrite: (path) => path.replace('/worker', '/dist/worker'),
      //   target: "http://localhost:4000"
      // }
    },
    port: 4000,
    strictPort: true
  },

} satisfies UserConfig);