
import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
    server:{
      proxy:{
        '/servlet': 'http://localhost:6500',
        '/servlet/websocket': {target: 'ws://localhost:6500', ws: true},
        '/servlet/subscriptionwebsocket': {target: 'ws://localhost:6500', ws: true},
        '/worker': {
          rewrite: (path) => path.replace('/worker', '/dist/worker'),
          target: "http://localhost:4000"
        }
      }
    },
    build: {
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          'sqljs-worker': './src/client/sqljs-worker/sqljsWorker.ts'
        },
        output: {
          entryFileNames: assetInfo => {
            if(assetInfo.name.indexOf('worker') >= 0){
              return 'worker/[name].js';
            }
            return '[name]-[hash].js';
          },
          assetFileNames: assetInfo => assetInfo.name.endsWith('css') ? '[name]-[hash][extname]' : 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/js/[name]-[hash].js',
          manualChunks: {}
        }
      },
      chunkSizeWarningLimit: 4912
    }
  });