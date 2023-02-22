import { Main } from "./Main.js";
import jQuery from "jquery";

import '/css/editor.css';
import '/css/editorStatic.css';
import '/css/bottomdiv.css';
import '/css/run.css';
import '/css/helper.css';
import '/css/icons.css';
import '/css/databaseExplorer.css';
import '/css/dialog.css';
import '/css/databasedialogs.css';


jQuery(function () {

    let main = new Main();

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

        main.initEditor();
        main.getMonacoEditor().updateOptions({ readOnly: true });

        main.bottomDiv.initGUI();

        // main.loadWorkspace();


    });

    main.initGUI();

});