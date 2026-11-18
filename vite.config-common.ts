
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



// Removes `DEBUG: ...` labeled statements from production builds (main bundle and workers).
// (Vite 8 ignores the former `esbuild.dropLabels` option.)
const rolldownTransformOptions = {
    dropLabels: ['DEBUG']
};

const rolldownChecks = {
    bundlerTimings: false   // no "[PLUGIN_TIMINGS] ..." report about slow plugins after each build
};

// vite.config.ts and vite.config-embedded.ts add to this config with mergeConfig (deep merge).
export default {
    appType: 'mpa', // to serve 404 on "not found" (instead of erroneously serving index.html)
    worker: {
        rolldownOptions: {
            transform: rolldownTransformOptions,
            checks: rolldownChecks
        }
    },
    build: {
        // Vite 5's default target, so older browsers keep working. Vite 8's default
        // ('baseline-widely-available') needs Chrome/Edge 111, Firefox 114, Safari 16.4.
        target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
        sourcemap: true,
        emptyOutDir: true,
        chunkSizeWarningLimit: 4912,
        assetsInlineLimit: 10*1024,
        rolldownOptions: {
            transform: rolldownTransformOptions,
            checks: rolldownChecks,
            // Handles the logs of the main bundle and of the worker bundles.
            onLog(level, log, defaultHandler) {
                // sql.js loads the Node.js modules "fs", "path" and "crypto" only when running under Node.js.
                // Vite replaces them with empty modules in the browser build and warns about each one:
                // "[plugin rolldown:vite-resolve] Module "fs" has been externalized for browser compatibility ..."
                if (log.plugin === 'rolldown:vite-resolve' && log.message.includes('has been externalized for browser compatibility')) {
                    return;
                }
                defaultHandler(level, log);
            }
        }
    },
    define: {
        'APP_VERSION': JSON.stringify(pkg.version),
        'BUILD_DATE': JSON.stringify(buildDate)
      }
} satisfies UserConfig
