import { Formatter } from "../main/gui/Formatter.js";
import { ThemeManager } from "../main/gui/ThemeManager.js";
import { MainEmbedded } from "./MainEmbedded.js";
import jQuery from "jquery";

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
                if($script.data('type') != null) type = <ScriptType>($script.data('type'));
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

    let prefix = "";
    let editorPath = "lib/monaco-editor/dev/vs"
    //@ts-ignore
    if(window.javaOnlineDir != null){
        //@ts-ignore
        prefix = window.javaOnlineDir;
    }

    //@ts-ignore
    if(window.monacoEditorPath != null){
        //@ts-ignore
        editorPath = window.monacoEditorPath;
    }

    //@ts-ignore
    window.require.config({ paths: { 'vs': prefix + editorPath } });
    //@ts-ignore
    window.require.config({
        'vs/nls': {
            availableLanguages: {
                '*': 'de'
            }
        },
        ignoreDuplicateModules: ["vs/editor/editor.main"]
    });
    //@ts-ignore
    window.require(['vs/editor/editor.main'], function () {

        embeddedStarter.initEditor();
        embeddedStarter.initGUI();

    });

});
