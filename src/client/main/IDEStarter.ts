import { Main } from "./Main.js";

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'


import '/assets/css/editor.css';
import '/assets/css/editorStatic.css';
import '/assets/css/bottomdiv.css';
import '/assets/css/run.css';
import '/assets/css/helper.css';
import '/assets/css/icons.css';
import '/assets/css/databaseExplorer.css';
import '/assets/css/dialog.css';
import '/assets/css/databasedialogs.css';

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

    if (window.location.href.indexOf('silent') < 0) {
        let silentElements = document.getElementsByClassName('silent');
        for (let i = 0; i < silentElements.length; i++) {
            (silentElements[i] as HTMLElement).style.display = '';
        }
    }

    initMonacoEditor();
    let main = new Main();
    main.initGUI();
    main.initEditor();
    main.getMonacoEditor().updateOptions({ readOnly: true });

    main.bottomDiv.initGUI();

}


