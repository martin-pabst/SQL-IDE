import { Main } from "./Main.js";
import jQuery from "jquery";

import '/include/css/editor.css';
import '/include/css/editorStatic.css';
import '/include/css/bottomdiv.css';
import '/include/css/run.css';
import '/include/css/helper.css';
import '/include/css/icons.css';
import '/include/css/databaseExplorer.css';
import '/include/css/dialog.css';
import '/include/css/databasedialogs.css';


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