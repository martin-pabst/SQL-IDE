
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import type { UserConfig } from 'vite'

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);

const d = new Date();
const curr_date = d.getDate();
const curr_month = d.getMonth() + 1; //Months are zero based
const curr_year = d.getFullYear();
let hour = "" + d.getHours();
while(hour.length  < 2) hour = "0" + hour;

let minute = "" + d.getMinutes();
while(minute.length < 2) minute = "0" + minute;

const buildDate = curr_date + "." + curr_month + "." + curr_year + ", " + hour + ":" + minute + " Uhr";



export default {
    appType: 'mpa', // to serve 404 on "not found" (instead of erroneously serving index.html)
    esbuild: {
        logOverride: {
            'unsupported-css-nesting': 'silent',
            'unsupported-@namespace': 'silent',
        },
        dropLabels: ['DEBUG']
    },
    build: {
        sourcemap: true,
        emptyOutDir: true,
        chunkSizeWarningLimit: 4912,
        assetsInlineLimit: 10*1024
    },
    define: {
        'APP_VERSION': JSON.stringify(pkg.version),
        'BUILD_DATE': JSON.stringify(buildDate)
      }
} satisfies UserConfig
