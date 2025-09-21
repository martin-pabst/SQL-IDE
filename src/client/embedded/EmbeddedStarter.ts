import { Formatter } from "../main/gui/Formatter.js";
import { ThemeManager } from "../main/gui/ThemeManager.js";
import { MainEmbedded } from "./MainEmbedded.js";
import jQuery from "jquery";

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

import '/include/css/editor.css';
import '/include/css/bottomdiv.css';
import '/include/css/run.css';
import '/include/css/icons.css';
import '/include/css/databaseExplorer.css';
import '/include/css/embedded.css';


// declare const require: any;

export type ScriptType = "sql" | "hint";

export type JOScript = {
    type: ScriptType;
    title: string;
    text: string;
}

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

export class EmbeddedStarter {


    startupComplete = 2;

    themeManager: ThemeManager;

    mainEmbeddedList: MainEmbedded[] = [];

    initGUI() {

        this.checkStartupComplete();

        this.themeManager = new ThemeManager();
    }

    initEditor() {
        new Formatter().init();
        this.checkStartupComplete();
    }

    checkStartupComplete() {
        this.startupComplete--;
        if (this.startupComplete == 0) {
            this.start();
        }
    }

    start() {

        this.initJavaOnlineDivs();

    }

    initJavaOnlineDivs() {

        jQuery('.sql-online').each((index: number, element: HTMLElement) => {
            let $div = jQuery(element);
            let scriptList: JOScript[] = [];
            $div.find('script').each((index: number, element: HTMLElement) => {
                let $script = jQuery(element);
                let type: ScriptType = "sql";
                if ($script.data('type') != null) type = <ScriptType>($script.data('type'));
                let script: JOScript = {
                    type: type,
                    title: $script.attr('title'),
                    text: $script.text().trim()
                };
                scriptList.push(script);
            });

            this.initDiv($div, scriptList);

        });

    }

    initDiv($div: JQuery<HTMLElement>, scriptList: JOScript[]) {

        let me: MainEmbedded = new MainEmbedded($div, scriptList);

    }

}

jQuery(function () {

    let embeddedStarter = new EmbeddedStarter();

    initMonacoEditor();

    embeddedStarter.initEditor();
    embeddedStarter.initGUI();

    //@ts-ignore
    console.log("SQL-IDE embedded Version " + APP_VERSION + " vom " + BUILD_DATE);

});
