import { EmbeddedStarter } from "./EmbeddedStarter.js";

import "../css/embedded.css";

// declare const require: any;


jQuery(function () {

    let embeddedStarter = new EmbeddedStarter();

    //@ts-ignore
    window.require.config({ paths: { 'vs': 'lib/monaco-editor/dev/vs' } });
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