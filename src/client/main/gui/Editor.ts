import { Module } from "../../compiler/parser/Module.js";
import { Main } from "../Main.js";
import { MyCompletionItemProvider } from "./MyCompletionItemProvider.js";
import { defineMyJava } from "./MyJava.js";
import { MySignatureHelpProvider } from "./MySignatureHelpProvider.js";
import { MyHoverProvider } from "./MyHoverProvider.js";
import { MyCodeActionProvider } from "./MyCodeActionProvider.js";
import { MyReferenceProvider } from "./MyReferenceProvider.js";
import { Workspace } from "../../workspace/Workspace.js";
import { defineVscSQL } from "./VSCSql.js";
import { MainBase } from "../MainBase.js";
import { Helper } from "./Helper.js";


export class Editor {

    editor: monaco.editor.IStandaloneCodeEditor;

    cw: monaco.editor.IContentWidget = null;

    dontPushNextCursorMove: number = 0;

    constructor(public main: MainBase, private showMinimap: boolean, private isEmbedded: boolean) {
    }

    initGUI($element: JQuery<HTMLElement>) {



        defineVscSQL();

        monaco.editor.defineTheme('myCustomThemeDark', {
            base: 'vs-dark', // can also be vs-dark or hc-black
            inherit: true, // can also be false to completely replace the builtin rules
            rules: [
                { token: 'functions', foreground: 'dcdcaa', fontStyle: 'italic' },
                { token: 'string.sql', foreground: '3DC9B0' },
                { token: 'number', foreground: '7bef3f' },
                { token: 'type', foreground: '499cd6' },
                { token: 'identifier', foreground: 'effefe' },
                { token: 'statement', foreground: '9cdcfe', fontStyle: 'bold' },
                { token: 'keyword', foreground: '619ceb', fontStyle: 'bold' },
                { token: 'table', foreground: 'ff0000', fontStyle: 'bold' },
                { token: 'delimiter', foreground: 'e8eb38' }
                // { token: 'comment.js', foreground: '008800', fontStyle: 'bold italic underline' },
            ],
            colors: {
                "editor.background": "#1e1e1e",
                "jo_highlightStatementGreen": "#004000",
                "jo_highlightStatementYellow": "#404000",
                "jo_highlightStatementRed": "#402020"
            }
        });

        monaco.editor.defineTheme('myCustomThemeLight', {
            base: 'vs', // can also be vs-dark or hc-black
            inherit: true, // can also be false to completely replace the builtin rules
            rules: [
                { token: 'functions', foreground: '694E16', fontStyle: 'italic bold' },
                { token: 'string.sql', foreground: 'a03030' },
                { token: 'number', foreground: '404040' },
                { token: 'type', foreground: '0000ff', fontStyle: 'bold' },
                { token: 'identifier', foreground: '8000e0' },
                { token: 'statement', foreground: '001080', fontStyle: 'bold' },
                { token: 'keyword', foreground: '00a000', fontStyle: 'bold' },
                { token: 'comment', foreground: '808080', fontStyle: 'italic' },
            ],
            colors: {
                "editor.background": "#FFFFFF",
                "editor.foreground": "#000000",
                "editor.inactiveSelectionBackground": "#E5EBF1",
                "editorIndentGuide.background": "#D3D3D3",
                "editorIndentGuide.activeBackground": "#939393",
                "editor.selectionHighlightBackground": "#ADD6FF80",
                "editorSuggestWidget.background": "#F3F3F3",
                "activityBarBadge.background": "#007ACC",
                "sideBarTitle.foreground": "#6F6F6F",
                "list.hoverBackground": "#E8E8E8",
                "input.placeholderForeground": "#767676",
                "searchEditor.textInputBorder": "#CECECE",
                "settings.textInputBorder": "#CECECE",
                "settings.numberInputBorder": "#CECECE",
                "statusBarItem.remoteForeground": "#FFF",
                "statusBarItem.remoteBackground": "#16825D",
                "jo_highlightStatementGreen": "#004000",
                "jo_highlightStatementYellow": "#404000",
                "jo_highlightStatementRed": "#400000"
            }
        });


        this.editor = monaco.editor.create($element[0], {
            // value: [
            //     'function x() {',
            //     '\tconsole.log("Hello world!");',
            //     '}'
            // ].join('\n'),
            // language: 'myJava',
            language: 'vscSQL',
            lightbulb: {
                enabled: true
            },
            // gotoLocation: {
            //     multipleReferences: "gotoAndPeek"
            // },
            lineDecorationsWidth: 0,
            peekWidgetDefaultFocus: "tree",
            fixedOverflowWidgets: true,
            quickSuggestions: true,
            quickSuggestionsDelay: 10,
            fontSize: 14,
            fontFamily: "Consolas, Roboto Mono",
            fontWeight: "500",
            roundedSelection: true,
            selectOnLineNumbers: false,
            // selectionHighlight: false,
            automaticLayout: true,
            scrollBeyondLastLine: false,
            occurrencesHighlight: false,
            autoIndent: "full",
            dragAndDrop: true,
            formatOnType: true,
            formatOnPaste: true,
            suggestFontSize: 16,
            suggestLineHeight: 22,
            suggest: {
                localityBonus: true,
                insertMode: "replace"
                // snippetsPreventQuickSuggestions: false
            },
            parameterHints: { enabled: true, cycle: true },
            // //@ts-ignore
            // contribInfo: {
            //     suggestSelection: 'recentlyUsedByPrefix',
            // },

            mouseWheelZoom: this.isEmbedded,

            minimap: {
                enabled: this.showMinimap
            },
            scrollbar: {
                vertical: 'auto',
                horizontal: 'auto'
            },
            theme: "myCustomThemeDark",
            // automaticLayout: true


        }
        );

        let that = this;

        let mouseWheelListener = (event: WheelEvent) => {
            if (event.ctrlKey === true) {

                that.changeEditorFontSize(Math.sign(event.deltaY), true);

                event.preventDefault();
            }
        };


        this.editor.onDidChangeConfiguration((event) => {
            if (event.hasChanged(monaco.editor.EditorOption.fontInfo) && this.isEmbedded) {

                this.main.getBottomDiv().errorManager.registerLightbulbOnClickFunctions();

            }
        });

        this.editor.onDidChangeCursorPosition((event) => {

            that.onDidChangeCursorPosition(event.position);

        });

        // We need this to set our model after user uses Strg+click on identifier
        this.editor.onDidChangeModel((event) => {

            let element: HTMLDivElement = <any>$element.find('.monaco-editor')[0];
            if(element != null){
                element.removeEventListener("wheel", mouseWheelListener);
                element.addEventListener("wheel", mouseWheelListener, { passive: false });
            }

            if (this.main.getCurrentWorkspace() == null) return;

            let module = this.main.getCurrentWorkspace().getModuleByMonacoModel(this.editor.getModel());
            if (this.main instanceof Main && module != null) {

                this.main.projectExplorer.setActiveAfterExternalModelSet(module);
            }
        });

        monaco.languages.registerHoverProvider('vscSQL', new MyHoverProvider(this));

        monaco.languages.registerCompletionItemProvider('vscSQL', new MyCompletionItemProvider(this.main));
        monaco.languages.registerCodeActionProvider('vscSQL', new MyCodeActionProvider(this.main));
        monaco.languages.registerReferenceProvider('vscSQL', new MyReferenceProvider(this.main));


        monaco.languages.registerSignatureHelpProvider('vscSQL', new MySignatureHelpProvider(this.main));

        this.editor.onMouseDown((e: monaco.editor.IEditorMouseEvent) => {
            const data = e.target.detail;
            if (e.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
                e.target.type !== monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS || data.isAfterLines) {
                return;
            }
            that.onMarginMouseDown(e.target.position.lineNumber);
            return;
        });


        // If editor is instantiated before fonts are loaded then indentation-lines
        // are misplaced, see https://github.com/Microsoft/monaco-editor/issues/392
        // so:
        setTimeout(() => {
            monaco.editor.remeasureFonts();
        }, 2000);

        this.addActions();

        //@ts-ignore
        this.editor.onDidType((text) => { that.onDidType(text) });

        return this.editor;
    }


    onDidType(text: string) {
        //        const endOfCommentText = " * \n */";

        const insertEndOfComment = (pos, insertText: string, newLine: number, newColumn: number) => {
            const range = new monaco.Range(
                pos.lineNumber,
                pos.column,
                pos.lineNumber,
                pos.column
            );
            this.editor.executeEdits("new-bullets", [
                { range, text: insertText }
            ]);

            // Set position after bulletText
            this.editor.setPosition({
                lineNumber: newLine,
                column: newColumn
            });
        };

        if (text === "\n") {
            const model = this.editor.getModel();
            const position = this.editor.getPosition();
            const prevLine = model.getLineContent(position.lineNumber - 1);
            if (prevLine.trim().indexOf("/*") === 0 && !prevLine.trimRight().endsWith("*/")) {
                const nextLine = position.lineNumber < model.getLineCount() ? model.getLineContent(position.lineNumber + 1) : "";
                if (!nextLine.trim().startsWith("*")) {
                    let spacesAtBeginningOfLine: string = prevLine.substr(0, prevLine.length - prevLine.trimLeft().length);
                    if (prevLine.trim().indexOf("/**") === 0) {
                        insertEndOfComment(position, "\n" + spacesAtBeginningOfLine + " */", position.lineNumber, position.column + 3 + spacesAtBeginningOfLine.length);
                    } else {
                        insertEndOfComment(position, " * \n" + spacesAtBeginningOfLine + " */", position.lineNumber, position.column + 3 + spacesAtBeginningOfLine.length);
                    }
                }
            }
        }
    }



    lastTime: number = 0;
    setFontSize(fontSizePx: number) {

        // console.log("Set font size: " + fontSizePx);
        let time = new Date().getTime();
        if (time - this.lastTime < 150) return;
        this.lastTime = time;

        let editorfs = this.editor.getOptions().get(monaco.editor.EditorOption.fontSize);

        if (this.main instanceof Main) {
            this.main.viewModeController.saveFontSize(fontSizePx);
        }

        if (fontSizePx != editorfs) {
            this.editor.updateOptions({
                fontSize: fontSizePx
            });

            // editor does not set fontSizePx, but fontSizePx * zoomfactor with unknown zoom factor, so 
            // we have to do this dirty workaround:
            let newEditorfs = this.editor.getOptions().get(monaco.editor.EditorOption.fontSize);
            let factor = newEditorfs / fontSizePx;
            this.editor.updateOptions({
                fontSize: fontSizePx / factor
            });

        }

        jQuery('.jo_editorFontSize').css('font-size', fontSizePx + "px");
        jQuery('.jo_editorFontSize').css('line-height', (fontSizePx + 2) + "px");

        document.documentElement.style.setProperty('--breakpoint-size', fontSizePx + 'px');
        document.documentElement.style.setProperty('--breakpoint-radius', fontSizePx / 2 + 'px');


        this.main.getBottomDiv().errorManager.registerLightbulbOnClickFunctions();

    }

    changeEditorFontSize(delta: number, dynamic: boolean = true) {
        let editorfs = this.editor.getOptions().get(monaco.editor.EditorOption.fontSize);

        if (dynamic) {
            if (editorfs < 10) {
                delta *= 1;
            } else if (editorfs < 20) {
                delta *= 2;
            } else {
                delta *= 4;
            }
        }

        let newEditorFs = editorfs + delta;
        if (newEditorFs >= 6 && newEditorFs <= 80) {
            this.setFontSize(newEditorFs);
        }
    }


    addActions() {
        let that = this;

        this.editor.addAction({
            // An unique identifier of the contributed action.
            id: 'Find bracket',

            // A label of the action that will be presented to the user.
            label: 'Finde korrespondierende Klammer',

            // An optional array of keybindings for the action.
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_K],

            // A precondition for this action.
            precondition: null,

            // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
            keybindingContext: null,

            contextMenuGroupId: 'navigation',

            contextMenuOrder: 1.5,

            // Method that will be executed when the action is triggered.
            // @param editor The editor instance is passed in as a convinience
            run: function (ed) {
                ed.getAction('editor.action.jumpToBracket').run();
                return null;
            }
        });

        this.editor.addAction({
            // An unique identifier of the contributed action.
            id: 'Execute statement',

            // A label of the action that will be presented to the user.
            label: 'SQL-Anweisung ausführen',

            // An optional array of keybindings for the action.
            keybindings: [
                monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter],

            // A precondition for this action.
            precondition: null,

            // A rule to evaluate on top of the precondition in order to dispatch the keybindings.
            keybindingContext: null,

            contextMenuGroupId: 'navigation',

            contextMenuOrder: 1.0,

            // Method that will be executed when the action is triggered.
            // @param editor The editor instance is passed in as a convinience
            run: function (ed) {
                that.main.getActionManager().trigger('execute');
                return null;
            }
        });

        //console.log(this.editor.getSupportedActions());
    }

    onMarginMouseDown(lineNumber: number) {

    }

    elementDecoration: string[] = [];
    onDidChangeCursorPosition(position: { lineNumber: number, column: number }) {

        if (position == null) position = this.editor.getPosition();

        let module = this.getCurrentlyEditedModule();
        if (module == null) {
            this.elementDecoration = this.editor.deltaDecorations(this.elementDecoration, []);
            return;
        }

        let element = module.getElementAtPosition(position.lineNumber, position.column);

        let decorations: monaco.editor.IModelDeltaDecoration[] = [];

        if (element != null) {
            let usagePositions = element.usagePositions;
            let upInCurrentModule = usagePositions.get(module);
            if (upInCurrentModule != null) {
                for (let up of upInCurrentModule) {
                    decorations.push({
                        range: { startColumn: up.column, startLineNumber: up.line, endColumn: up.column + up.length, endLineNumber: up.line },
                        options: {
                            className: 'jo_revealSyntaxElement', isWholeLine: false, overviewRuler: {
                                color: { id: "editorIndentGuide.background" },
                                darkColor: { id: "editorIndentGuide.activeBackground" },
                                position: monaco.editor.OverviewRulerLane.Left
                            }
                        }
                    });
                }
            }

        }



        let executeActionActive = false;

        for(let sqlStatement of module.getSQLSTatementsAtSelection(this.editor.getSelection())){

            let classname = "jo_highlightStatementGreen";
            if (sqlStatement != null) {
                if (sqlStatement.hasErrors) {
                    classname = "jo_highlightStatementRed";
                    if (sqlStatement.acceptedBySQLite) {
                        classname = "jo_highlightStatementYellow";
                        executeActionActive = true;
                    }
                } else {
                    executeActionActive = true;
                }
    
                decorations.push({
                    range: {
                        startColumn: sqlStatement.from.column, startLineNumber: sqlStatement.from.line,
                        endColumn: sqlStatement.to.column, endLineNumber: sqlStatement.to.line
                    },
                    options: {
                        className: classname, isWholeLine: false, overviewRuler: {
                            color: { id: classname },
                            darkColor: { id: classname },
                            position: monaco.editor.OverviewRulerLane.Left
                        },
                        minimap: {
                            color: { id: classname },
                            position: monaco.editor.MinimapPosition.Inline
                        },
                        zIndex: -100
                    }
                })
    
            }
        }


        this.main.getActionManager().setActive('execute', executeActionActive);

        if(executeActionActive && !this.main.isEmbedded()){
            Helper.showHelper("playButtonHelper", <any>this.main, jQuery('div.img_start-dark'));
        }


        this.elementDecoration = this.editor.deltaDecorations(this.elementDecoration, decorations);

    }

    getCurrentlyEditedModule(): Module {
        return this.main.getCurrentlyEditedModule();
    }


}