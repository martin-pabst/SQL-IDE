import { Main } from "./Main.js";

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'


import '/include/css/editor.css';
import '/include/css/editorStatic.css';
import '/include/css/bottomdiv.css';
import '/include/css/run.css';
import '/include/css/helper.css';
import '/include/css/icons.css';
import '/include/css/databaseExplorer.css';
import '/include/css/dialog.css';
import '/include/css/databasedialogs.css';

import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';


function initMonacoEditor(): void {
    // see https://github.com/microsoft/monaco-editor/blob/main/docs/integrate-esm.md#using-vite
    // https://dev.to/lawrencecchen/monaco-editor-svelte-kit-572
    // https://github.com/microsoft/monaco-editor/issues/4045
    
    self.MonacoEnvironment = {
        getWorker: (_workerId, label) => {
            switch (label) {
                case 'json':
                    return new jsonWorker()
                case 'css':
                case 'scss':
                case 'less':
                    return new cssWorker()
                case 'html':
                case 'handlebars':
                case 'razor':
                    return new htmlWorker()
                case 'typescript':
                case 'javascript':
                    return new tsWorker()
                default:
                    return new editorWorker()
            }
        }
    };

}

window.onload = () => {

    initMonacoEditor();
    let main = new Main();
    main.initGUI();
    main.initEditor();
    main.getMonacoEditor().updateOptions({ readOnly: true });
    
    main.bottomDiv.initGUI();

}


