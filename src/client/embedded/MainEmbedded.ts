import * as monaco from 'monaco-editor';
import { Compiler, CompilerStatus } from "../compiler/Compiler.js";
import { Module } from "../compiler/parser/Module.js";
import { SemicolonAngel } from "../compiler/parser/SemicolonAngel.js";
import { ActionManager } from "../main/gui/ActionManager.js";
import { BottomDiv } from "../main/gui/BottomDiv.js";
import { DatabaseExplorer } from "../main/gui/DatabaseExplorer.js";
import { Editor } from "../main/gui/Editor.js";
import { HistoryViewer } from "../main/gui/HistoryViewer.js";
import { ProgramControlButtons } from "../main/gui/ProgramControlButtons.js";
import { ResultsetPresenter } from "../main/gui/ResultsetPresenter.js";
import { RightDiv } from "../main/gui/RightDiv.js";
import { WaitOverlay } from "../main/gui/WaitOverlay.js";
import { MainBase } from "../main/MainBase.js";
import { DatabaseImportExport } from "../tools/DatabaseImportExport.js";
import { DatabaseFetcher } from "../tools/DatabaseLoader.js";
import { DatabaseTool } from "../sqljs-worker/DatabaseTools.js";
import { makeTabs, openContextMenu } from "../tools/HtmlTools.js";
import { Workspace } from "../workspace/Workspace.js";
import { EmbeddedFileExplorer } from "./EmbeddedFileExplorer.js";
import { EmbeddedIndexedDB } from "./EmbeddedIndexedDB.js";
import { OnlineIDEAccessImpl } from "./EmbeddedInterface.js";
import { EmbeddedSlider } from "./EmbeddedSlider.js";
import { JOScript } from "./EmbeddedStarter.js";
import { WriteQueryManager } from "./WriteQueryManager.js";

import jQuery from "jquery";

type JavaOnlineConfig = {
    withFileList?: boolean,
    withOutput?: boolean,
    withErrorList?: boolean,
    withBottomPanel?: boolean,
    id?: string,
    databaseURL?: string,
    enableFileAccess?: boolean
}

export class MainEmbedded implements MainBase {
    isEmbedded(): boolean { return true; }

    getCompiler(): Compiler {
        return this.compiler;
    }
    getCurrentWorkspace(): Workspace {
        return this.currentWorkspace;
    }
    getMonacoEditor(): monaco.editor.IStandaloneCodeEditor {
        return this.editor.editor;
    }

    getRightDiv(): RightDiv {
        return this.rightDiv;
    }

    getBottomDiv(): BottomDiv {
        return this.bottomDiv;
    }

    getActionManager(): ActionManager {
        return this.actionManager;
    }

    getCurrentlyEditedModule(): Module {
        if (this.config.withFileList) {
            return this.fileExplorer.currentFile?.module;
        } else {
            return this.currentWorkspace.moduleStore.getFirstModule();
        }
    }

    getDatabaseTool(): DatabaseTool {
        return this.databaseTool;
    }

    getDatabaseExplorer(): DatabaseExplorer {
        return this.databaseExplorer;
    }

    getResultsetPresenter(): ResultsetPresenter {
        return this.resultsetPresenter;
    }

    getWaitOverlay(): WaitOverlay {
        return this.waitOverlay;
    }

    getHistoryViewer(): HistoryViewer {
        return this.historyViewer;
    }

    config: JavaOnlineConfig;

    editor: Editor;
    programPointerDecoration: string[] = [];
    programPointerModule: Module;

    currentWorkspace: Workspace;
    actionManager: ActionManager;

    compiler: Compiler;

    $dbTreeDiv: JQuery<HTMLElement>;

    $debuggerDiv: JQuery<HTMLElement>;

    bottomDiv: BottomDiv;
    $filesListDiv: JQuery<HTMLElement>;

    $hintDiv: JQuery<HTMLElement>;
    $monacoDiv: JQuery<HTMLElement>;
    $codeResetButton: JQuery<HTMLElement>;
    $databaseResetButton: JQuery<HTMLElement>;

    programIsExecutable = false;
    version: number = 0;

    timerHandle: any;

    rightDiv: RightDiv;
    $rightDivInner: JQuery<HTMLElement>;

    fileExplorer: EmbeddedFileExplorer;

    debounceDiagramDrawing: any;

    indexedDB: EmbeddedIndexedDB;

    compileRunsAfterCodeReset: number = 0;

    semicolonAngel: SemicolonAngel;

    databaseTool: DatabaseTool;

    databaseExplorer: DatabaseExplorer;

    waitOverlay: WaitOverlay;

    resultsetPresenter: ResultsetPresenter;

    writeQueryManager: WriteQueryManager;

    historyViewer: HistoryViewer;

    initialTemplateDump: Uint8Array;
    initialStatements: string[];

    constructor($div: JQuery<HTMLElement>, private scriptList: JOScript[]) {

        this.readConfig($div);

        this.writeQueryManager = new WriteQueryManager(this, (this.config.databaseURL == null ? "Empty database" : this.config.databaseURL) + this.config.id);

        this.initGUI($div);


        this.databaseExplorer = new DatabaseExplorer(this, this.$dbTreeDiv);
        this.databaseTool = new DatabaseTool(this);
        if (this.config.databaseURL != null) {
            new DatabaseFetcher(this).load(this.config.databaseURL).then((loadableDb) => {
                this.initialTemplateDump = loadableDb.binDump;
                this.initialStatements = loadableDb.statements == null ? [] : loadableDb.statements;
                this.initDatabase();
            }).catch((error: string) => {
                alert('Fehler beim Laden der Datenbank: ' + error)
            })
        } else {
            this.initDatabase();
        }

        this.semicolonAngel = new SemicolonAngel(this);

        if (this.config.enableFileAccess) {
            //@ts-ignore
            window.sql_ide_access = new OnlineIDEAccessImpl();
            OnlineIDEAccessImpl.registerIDE(this);
        }


    }

    initDatabase() {
        this.resetDatabase(() => {
            this.initScripts();

            this.indexedDB = new EmbeddedIndexedDB("SQL-IDE");
            this.indexedDB.open(() => {

                if (this.config.id != null) {
                    this.writeQueryManager.indexedDBReady(this.indexedDB);
                    this.readScripts();
                }

            });

        });
    }

    resetDatabase(callback: () => void) {
        this.databaseTool.initializeWorker(this.initialTemplateDump, this.initialStatements, () => { }, () => {
            this.writeQueryManager.databaseReady(this.databaseTool);
            this.databaseExplorer.refreshAfterRetrievingDBStructure();
            callback();
        })
    }

    initScripts() {

        this.fileExplorer?.removeAllFiles();

        this.initWorkspace(this.scriptList);

        if (this.config.withFileList) {
            this.fileExplorer = new EmbeddedFileExplorer(this.currentWorkspace.moduleStore, this.$filesListDiv, this);
            this.fileExplorer.setFirstFileActive();
            this.scriptList.filter((script) => script.type == "hint").forEach((script) => this.fileExplorer.addHint(script));
        } else {
            this.setModuleActive(this.currentWorkspace.moduleStore.getFirstModule());
        }

    }


    readConfig($div: JQuery<HTMLElement>) {
        let configJson: string | object = $div.data("sql-online");
        if (configJson != null && typeof configJson == "string") {
            this.config = JSON.parse(configJson.split("'").join('"'));
        } else {
            this.config = {}
        }

        if (this.config.withFileList == null) this.config.withFileList = false;
        if (this.config.withOutput == null) this.config.withOutput = true;
        if (this.config.withErrorList == null) this.config.withErrorList = true;
        if (this.config.withBottomPanel == null) this.config.withBottomPanel = true;

        if (!(this.config.withOutput || this.config.withFileList || this.config.withErrorList)) {
            this.config.withBottomPanel = false;
        }

        if (!this.config.withBottomPanel) {
            this.config.withFileList = false;
            this.config.withOutput = false;
            this.config.withErrorList = false;
        }

        if (this.config.databaseURL != null) {
            ['http:', 'https:'].forEach(protocol => {
                if (this.config.databaseURL.startsWith(protocol) && !this.config.databaseURL.startsWith(protocol + "://")) {
                    this.config.databaseURL = this.config.databaseURL.replace(protocol, protocol + "//");
                }
            })
        }

    }

    setModuleActive(module: Module) {

        if (this.config.withFileList && this.fileExplorer.currentFile != null) {
            this.fileExplorer.currentFile.module.editorState = this.getMonacoEditor().saveViewState();
        }

        if (this.config.withFileList) {
            this.fileExplorer.markFile(module);
        }

        /**
         * WICHTIG: Die Reihenfolge der beiden Operationen ist extrem wichtig.
         * Falls das Model im readonly-Zustand gesetzt wird, funktioniert <Strg + .> 
         * nicht und die Lightbulbs werden nicht angezeigt, selbst dann, wenn
         * später readonly = false gesetzt wird.
         */
        this.getMonacoEditor().updateOptions({
            readOnly: false,
            lineNumbersMinChars: 4
        });
        this.editor.editor.setModel(module.model);


        if (module.editorState != null) {
            this.getMonacoEditor().restoreViewState(module.editorState);
        }

    }



    readScripts() {

        let modules = this.currentWorkspace.moduleStore.getModules(false);

        let that = this;

        this.indexedDB.getScript(this.config.id, (scriptListJSon) => {
            if (scriptListJSon == null) {
                setInterval(() => {
                    that.saveScripts();
                }, 1000);
            } else {

                let scriptList: string[] = JSON.parse(scriptListJSon);
                let countDown = scriptList.length;

                for (let module of modules) {
                    that.fileExplorer?.removeModule(module);
                    that.removeModule(module);
                }

                for (let name of scriptList) {

                    let scriptId = this.config.id + name;
                    this.indexedDB.getScript(scriptId, (script) => {
                        if (script != null) {

                            let module = that.addModule({
                                title: name,
                                text: script,
                                type: "sql"
                            });

                            that.fileExplorer?.addModule(module);
                            that.$codeResetButton.fadeIn(1000);

                            // console.log("Retrieving script " + scriptId);
                        }
                        countDown--;
                        if (countDown == 0) {
                            setInterval(() => {
                                that.saveScripts();
                            }, 1000);
                            that.fileExplorer?.setFirstFileActive();
                            if (that.fileExplorer == null) {
                                let modules = that.currentWorkspace.moduleStore.getModules(false);
                                if (modules.length > 0) that.setModuleActive(modules[0]);
                            }
                        }
                    })

                }

            }


        });


    }

    saveScripts() {

        let modules = this.currentWorkspace.moduleStore.getModules(false);

        let scriptList: string[] = [];
        let oneNotSaved: boolean = false;

        modules.forEach(m => oneNotSaved = oneNotSaved || !m.file.saved);

        if (oneNotSaved) {

            for (let module of modules) {
                scriptList.push(module.file.name);
                let scriptId = this.config.id + module.file.name;
                this.indexedDB.writeScript(scriptId, module.getProgramTextFromMonacoModel());
                module.file.saved = true;
                // console.log("Saving script " + scriptId);
            }

            this.indexedDB.writeScript(this.config.id, JSON.stringify(scriptList));
        }

    }

    deleteScriptsInDB() {
        this.indexedDB.getScript(this.config.id, (scriptListJSon) => {
            if (scriptListJSon == null) {
                return;
            } else {

                let scriptList: string[] = JSON.parse(scriptListJSon);

                for (let name of scriptList) {

                    let scriptId = this.config.id + name;
                    this.indexedDB.removeScript(scriptId);
                }

                this.indexedDB.removeScript(this.config.id);

            }


        });

    }

    initWorkspace(scriptList: JOScript[]) {
        this.currentWorkspace = new Workspace("Embedded-Workspace", this, 0);

        let i = 0;
        for (let script of scriptList) {
            if (script.type == "sql") {
                this.addModule(script);
            }

        }

    }

    addModule(script: JOScript): Module {
        let module: Module = Module.restoreFromData({
            id: this.currentWorkspace.moduleStore.getModules(true).length,
            name: script.title,
            text: script.text,
            text_before_revision: null,
            submitted_date: null,
            student_edited_after_revision: false,
            version: 1,
            workspace_id: 0,
            forceUpdate: false,
            file_type: 11
        }, this);

        this.currentWorkspace.moduleStore.putModule(module);

        let that = this;

        module.model.onDidChangeContent(() => {
            that.considerShowingCodeResetButton();
        });

        return module;
    }

    removeModule(module: Module) {
        this.currentWorkspace.moduleStore.removeModule(module);
    }


    initGUI($div: JQuery<HTMLElement>) {

        // let $leftDiv = jQuery('<div class="joe_leftDiv"></div>');

        $div.css({
            "background-image": "none",
            "background-size": "100%"
        })

        let $centerDiv = jQuery('<div class="joe_centerDiv"></div>');

        // let $topDiv = jQuery('<div class="joe_topDiv"></div>');
        // $div.append($topDiv);
        $div.append($centerDiv);

        let $waitDiv = this.makeWaitDiv();
        $div.append($waitDiv);
        this.waitOverlay = new WaitOverlay($waitDiv);

        let $codeResetModalWindow = this.makeCodeResetModalWindow($div);
        let $databaseResetModalWindow = this.makeDatabaseResetModalWindow($div);

        let $rightDiv = this.makeRightDiv();

        let $editorDiv = jQuery('<div class="joe_editorDiv"></div>');
        this.$monacoDiv = jQuery('<div class="joe_monacoDiv"></div>');
        this.$hintDiv = jQuery('<div class="joe_hintDiv jo_scrollable"></div>');
        this.$codeResetButton = jQuery('<div class="joe_codeResetButton jo_button jo_active" title="Code auf Ausgangszustand zurücksetzen">Code Reset</div>');
        this.$databaseResetButton = jQuery('<div class="joe_databaseResetButton jo_button jo_active" title="Datenbank auf Ausgangszustand zurücksetzen">Datenbank Reset</div>');

        $editorDiv.append(this.$monacoDiv, this.$hintDiv, this.$databaseResetButton);
        this.$monacoDiv.append(this.$codeResetButton);

        // $topDiv.append($editorDiv);

        this.$codeResetButton.hide();

        this.$codeResetButton.on("click", () => { $codeResetModalWindow.show(); })

        this.$databaseResetButton.hide();

        this.$databaseResetButton.on("click", () => { $databaseResetModalWindow.show(); })

        this.$hintDiv.hide();

        let $controlsDiv = jQuery('<div class="joe_controlsDiv"></div>');
        let $bottomDivInner = jQuery('<div class="joe_bottomDivInner"></div>');


        let $bottomDiv = jQuery('<div class="joe_bottomDiv"></div>');
        this.makeBottomDiv($bottomDivInner, $controlsDiv);
        $bottomDiv.append($bottomDivInner);
        if (this.config.withFileList) {
            let $filesDiv = this.makeFilesDiv();
            $bottomDiv.prepend($filesDiv);
            new EmbeddedSlider($filesDiv, false, false, () => { });
        }
        // makeTabs($bottomDivInner);
        $div.append($bottomDiv);

        $div.addClass('joe_javaOnlineDiv');

        this.editor = new Editor(this, false, true);
        this.editor.initGUI(this.$monacoDiv);
        this.$monacoDiv.find('.monaco-editor').css('z-index', '10');

        if ($div.attr('tabindex') == null) $div.attr('tabindex', "0");
        this.actionManager = new ActionManager($div, this);
        this.actionManager.init();

        this.bottomDiv = new BottomDiv(this, $bottomDivInner, $div);
        this.bottomDiv.initGUI();

        this.rightDiv = new RightDiv(this, this.$rightDivInner);
        this.rightDiv.initGUI();

        $centerDiv.append($editorDiv, $bottomDiv)
        $div.append($rightDiv);

        let $rightSideContainer = jQuery('<div class="jo_rightdiv-rightside-container"></div>');
        let $infoButton = jQuery('<div class="jo_button jo_active img_ellipsis-dark" style="margin-right: 10px"></div>');

        $controlsDiv.append($infoButton);

        this.$rightDivInner.append($rightSideContainer);

        new EmbeddedSlider($rightDiv, true, false, () => {
            this.editor.editor.layout();
        }, $centerDiv);

        new EmbeddedSlider($bottomDiv, true, true, () => { this.editor.editor.layout(); });

        $infoButton.on('mouseup', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            openContextMenu([{
                caption: "Über die Online-IDE ...",
                link: "https://learnj.de",
                callback: () => {
                    // nothing to do.
                }
            }], ev.pageX + 2, ev.pageY + 2);
        });


        let $buttonOpen = jQuery('<label type="file" class="img_open-file jo_button jo_active"' +
            'style="margin-right: 8px;" title="Datenbank-Dump aus Datei laden"><input type="file" style="display:none"></label>');

        let that = this;

        let $openInputButton = $buttonOpen.find('input');

        $openInputButton.on('change', (event) => {
            //@ts-ignore
            var files: FileList = event.originalEvent.target.files;
            that.loadDatabaseFromFile(files[0]).then(() => {
                $openInputButton.val(null)
            })
        })

        let $buttonSave = jQuery('<div class="img_save-dark jo_button jo_active"' +
            'style="margin-right: 8px;" title="Datenbank-Dump in Datei speichern"></div>');


        $buttonSave.on('click', () => { that.saveDatabaseToFile() });

        $controlsDiv.append($buttonOpen, $buttonSave);

        this.resultsetPresenter = new ResultsetPresenter(this, $bottomDivInner);
        this.resultsetPresenter.addWriteQueryListener(this.writeQueryManager);


        new ProgramControlButtons(this, $controlsDiv);

        this.historyViewer = new HistoryViewer(this, $div.find('.jo_historyTab'));

        setTimeout(() => {
            this.editor.editor.layout();
            this.compiler = new Compiler(this);
            this.startTimer();
        }, 200);


    }

    saveDatabaseToFile() {
        new DatabaseImportExport().saveToFile(this.databaseTool);
    }

    async loadDatabaseFromFile(file: globalThis.File) {
        let dbImportExport = new DatabaseImportExport();
        let db = await dbImportExport.loadFromFile(file, this);
        if (db == null) {
            alert('Es ist ein Fehler beim Import aufgetreten.');
            return;
        } else {
            this.databaseTool.initializeWorker(db.binDump, [], (errors) => {
                if (errors.length > 0) {
                    alert('Es sind Fehler beim Import aufgetreten. Ausführliche Fehlermeldungen sehen Sie in der Konsole (F12).')
                    console.log(errors)
                }
            }, () => {
                this.databaseExplorer.refreshAfterRetrievingDBStructure()
            })
        }
        return;
    }

    makeWaitDiv(): JQuery<HTMLElement> {

        //@ts-ignore
        let url = (window.javaOnlineDir == null ? '' : window.javaOnlineDir) + 'assets/graphics/grid.svg';

        let waitHtml = `
        <div class="bitteWarten">
        <div style="margin-bottom: 30px">
            <div class="bitteWartenText" style="font-size: 20px"></div>
        </div>
        <div>
            <img src="${url}" alt="" style="height: 40px">
        </div>
        <div class="bitteWartenProgress" style="font-size: 20px"></div>
        </div>
        `;
        return jQuery(waitHtml);
    }


    makeCodeResetModalWindow($parent: JQuery<HTMLElement>): JQuery<HTMLElement> {
        let $window = jQuery(
            `
            <div class="joe_codeResetModal">
            <div style="flex: 1"></div>
            <div style="display: flex">
                <div style="flex: 1"></div>
                <div style="padding-left: 30px;">
                <div style="color: red; margin-bottom: 10px; font-weight: bold">Warnung:</div>
                <div>Soll der Code wirklich auf den Ausgangszustand zurückgesetzt werden?</div>
                <div>Alle von Dir gemachten Änderungen werden damit verworfen.</div>
                </div>
                <div style="flex: 1"></div>
            </div>
            <div class="joe_codeResetModalButtons">
            <div class="joe_codeResetModalCancel jo_button jo_active">Abbrechen</div>
            <div class="joe_codeResetModalOK jo_button jo_active">OK</div>
            </div>
            <div style="flex: 2"></div>
            </div>
        `
        );

        $window.hide();

        $parent.append($window);

        $parent.find(".joe_codeResetModalCancel").on("click", () => {
            $window.hide();
        });

        $parent.find(".joe_codeResetModalOK").on("click", () => {

            this.initScripts();
            this.deleteScriptsInDB();

            $window.hide();
            this.$codeResetButton.hide();
            this.compileRunsAfterCodeReset = 1;

        });

        return $window;
    }

    makeDatabaseResetModalWindow($parent: JQuery<HTMLElement>): JQuery<HTMLElement> {
        let $window = jQuery(
            `
            <div class="joe_databaseResetModal">
            <div style="flex: 1"></div>
            <div style="display: flex">
                <div style="flex: 1"></div>
                <div style="padding-left: 30px;">
                <div style="color: red; margin-bottom: 10px; font-weight: bold">Warnung:</div>
                <div>Soll die Datenbank wirklich auf den Ausgangszustand zurückgesetzt werden?</div>
                <div>Alle bisher ausgeführten Anweisungen (siehe Tab Write History) werden dann rückgängig gemacht.</div>
                </div>
                <div style="flex: 1"></div>
            </div>
            <div class="joe_databaseResetModalButtons">
            <div class="joe_databaseResetModalCancel jo_button jo_active">Abbrechen</div>
            <div class="joe_databaseResetModalOK jo_button jo_active">OK</div>
            </div>
            <div style="flex: 2"></div>
            </div>
        `
        );

        $window.hide();

        $parent.append($window);

        $parent.find(".joe_databaseResetModalCancel").on("click", () => {
            $window.hide();
        });

        $parent.find(".joe_databaseResetModalOK").on("click", () => {

            $window.hide();
            this.resetDatabase(() => {
                this.writeQueryManager.reset();
            });

            this.$databaseResetButton.hide();
            this.compileRunsAfterCodeReset = 1;

        });

        return $window;
    }

    makeFilesDiv(): JQuery<HTMLElement> {


        let $filesDiv = jQuery('<div class="joe_bottomDivFiles jo_scrollable"></div>');

        let $filesHeader = jQuery('<div class="joe_filesHeader jo_tabheading jo_active"  style="line-height: 24px">Dateien</div>');

        this.$filesListDiv = jQuery('<div class="joe_filesList jo_scrollable"></div>');

        $filesDiv.append($filesHeader, this.$filesListDiv);

        return $filesDiv;
    }

    startTimer() {
        if (this.timerHandle != null) {
            clearInterval(this.timerHandle);
        }

        let that = this;
        this.timerHandle = setInterval(() => {

            that.compileIfDirty();

        }, 500);


    }

    compileIfDirty() {

        if (this.currentWorkspace == null) return;

        if (this.currentWorkspace.moduleStore.isDirty() &&
            this.compiler.compilerStatus != CompilerStatus.compiling && this.getDatabaseTool().databaseStructure != null) {
            try {

                this.compiler.compile(this.currentWorkspace.moduleStore);

                let errors = this.
                    bottomDiv?.errorManager?.showErrors(this.currentWorkspace);

                this.editor.onDidChangeCursorPosition(null); // mark occurrencies of symbol under cursor

                this.version++;

            } catch (e) {
                console.error(e);
                this.compiler.compilerStatus = CompilerStatus.error;
            }

        }

    }
    considerShowingCodeResetButton() {
        this.compileRunsAfterCodeReset++;
        if (this.compileRunsAfterCodeReset == 3) {
            this.$codeResetButton.fadeIn(1000);
        }
    }

    makeBottomDiv($bottomDiv: JQuery<HTMLElement>, $buttonDiv: JQuery<HTMLElement>) {

        let $tabheadings = jQuery('<div class="jo_tabheadings"></div>');
        $tabheadings.css('position', 'relative');
        let $thLeftSide = jQuery('<div class="joe_tabheading-right jo_noHeading joe_controlsTabheading"></div>');

        $thLeftSide.append($buttonDiv);
        $tabheadings.append($thLeftSide);

        if (this.config.withErrorList) {
            let $thErrors = jQuery('<div class="jo_tabheading jo_active" data-target="jo_errorsTab" style="line-height: 24px">Fehler</div>');
            $tabheadings.append($thErrors);
        }

        if (this.config.withOutput) {
            let $thPCode = jQuery('<div class="jo_tabheading jo_resultTabheading" data-target="jo_resultTab" style="line-height: 24px">Ausgabe</div>');
            $tabheadings.append($thPCode);
        }

        // let $thRuntimeError = jQuery('<div class="jo_tabheading jo_runtimeerrorsTabheading" data-target="jo_runtimeerrorsTab" style="line-height: 24px">DB-Fehler</div>');
        // $tabheadings.append($thRuntimeError);

        let $thHistory = jQuery('<div class="jo_tabheading jo_historyTabheading" data-target="jo_historyTab" style="line-height: 24px">History</div>');
        $tabheadings.append($thHistory);

        let $thRightSide = jQuery('<div class="joe_tabheading-right jo_noHeading joe_paginationHeading"><div class="jo_pagination"></div></div>');
        $tabheadings.append($thRightSide);

        $bottomDiv.append($tabheadings);

        let $tabs = jQuery('<div class="jo_tabs jo_scrollable"></div>');

        if (this.config.withErrorList) {
            let $tabError = jQuery('<div class="jo_active jo_scrollable jo_errorsTab"></div>');
            $tabs.append($tabError);
        }

        if (this.config.withOutput) {
            let $tabPCode = jQuery(`<div class="jo_editorFontSize jo_resultTab">
            <div class="jo_result-inner">
                <div class="jo_result-header"></div>
                <div class="jo_scrollable jo_result-body"></div>
            </div>
            </div>
    `);
            $tabs.append($tabPCode);
        }

        // let $tabRtErrors = jQuery('<div class="jo_scrollable jo_runtimeerrorsTab"></div>');
        // $tabs.append($tabRtErrors);

        let $tabHistory = jQuery('<div class="jo_scrollable jo_historyTab"></div>');
        $tabs.append($tabHistory);


        $bottomDiv.append($tabs);

    }

    makeRightDiv(): JQuery<HTMLElement> {

        let $rightDiv = jQuery('<div class="joe_rightDiv"></div>');
        this.$rightDivInner = jQuery('<div class="joe_rightDivInner"></div>');
        $rightDiv.append(this.$rightDivInner);


        let $tabheadings = jQuery('<div class="jo_tabheadings"></div>');
        $tabheadings.css('position', 'relative');
        let $thRun = jQuery('<div class="jo_tabheading jo_active" data-target="jo_db_tree" style="line-height: 24px">DB (Baum)</div>');
        // let $thVariables = jQuery('<div class="jo_tabheading jo_console-tab" data-target="jo_db_list" style="line-height: 24px">DB (Liste)</div>');
        $tabheadings.append($thRun, //$thVariables
        );
        this.$rightDivInner.append($tabheadings);

        let $tabs = jQuery('<div class="jo_tabs jo_scrollable"></div>');
        // let $vd = jQuery('<div class="jo_tab jo_scrollable jo_editorFontSize jo_db_list">DB-Liste</div>');

        this.$dbTreeDiv = jQuery(`<div class="jo_tab jo_scrollable jo_editorFontSize jo_active jo_db_tree">DB-Baum</div>`);

        $tabs.append(this.$dbTreeDiv //, $vd
        );
        this.$rightDivInner.append($tabs);

        makeTabs($rightDiv);

        return $rightDiv;
    }

    getSemicolonAngel(): SemicolonAngel {
        return this.semicolonAngel;
    }

}


