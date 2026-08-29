import { ClassData, UserData, Workspaces, type GuiState, type WorkspaceData } from "../communication/Data.js";
import { NetworkManager } from "../communication/NetworkManager.js";
import { Compiler, CompilerStatus } from "../compiler/Compiler.js";
import { Module } from "../compiler/parser/Module.js";
import { SemicolonAngel } from "../compiler/parser/SemicolonAngel.js";
import { DatabaseTool } from "../sqljs-worker/DatabaseTools.js";
import { checkIfMousePresent, findGetParameter, getCookieValue } from "../../tools/HtmlTools.js";
import { Workspace } from "../workspace/Workspace.js";
import { ActionManager } from "./gui/ActionManager.js";
import { BottomDiv } from "./gui/BottomDiv.js";
import { DatabaseExplorer } from "./gui/DatabaseExplorer.js";
import { Editor } from "./gui/Editor.js";
import { Formatter } from "./gui/Formatter.js";
import { Helper } from "./gui/Helper.js";
import { HistoryViewer } from "./gui/HistoryViewer.js";
import { MainMenu } from "./gui/MainMenu.js";
import { ProgramControlButtons } from "./gui/ProgramControlButtons.js";
import { ProjectExplorer } from "./gui/ProjectExplorer.js";
import { ResultsetPresenter } from "./gui/ResultsetPresenter.js";
import { RightDiv } from "./gui/RightDiv.js";
import { Sliders } from "./gui/Sliders.js";
import { TeacherExplorer } from "./gui/TeacherExplorer.js";
import { ThemeManager } from "./gui/ThemeManager.js";
import { ViewModeController } from "./gui/ViewModeController.js";
import { WaitOverlay } from "./gui/WaitOverlay.js";
import { Login } from "./Login.js";
import { MainBase } from "./MainBase.js";

import * as monaco from 'monaco-editor';
import { NewNotifier } from "../communication/NewNotifier.js";
import { setCookie } from "../../tools/HttpTools.js";
import jQuery from "jquery";
import type { PruefungManagerForStudents } from "./pruefung/PruefungManagerForStudents.js";
import { PushClientManager } from "../communication/pushclient/PushClientManager.js";
import type { GUIFile } from "../compiler/parser/GUIFile.js";
import type { Settings } from "../settings/Settings.js";
import { WindowStateManager } from "./gui/WindowStateManager.js";

export class Main implements MainBase {

    workspaceList: Workspace[] = [];
    workspacesOwnerId: number;

    // monaco_editor: monaco.editor.IStandaloneCodeEditor;
    editor: Editor;
    currentWorkspace: Workspace;
    projectExplorer: ProjectExplorer;
    teacherExplorer: TeacherExplorer;
    networkManager: NetworkManager;
    actionManager: ActionManager;
    mainMenu: MainMenu;

    pruefungManagerForStudents: PruefungManagerForStudents;

    login: Login;

    compiler: Compiler;

    semicolonAngel: SemicolonAngel;

    bottomDiv: BottomDiv;

    startupComplete = 2;
    waitForGUICallback: () => void;

    version: number = 0;

    timerHandle: any;

    user: UserData;
    gui_state_dirty: boolean = false;

    themeManager: ThemeManager;

    rightDiv: RightDiv;

    viewModeController: ViewModeController;

    databaseTool: DatabaseTool;

    databaseExplorer: DatabaseExplorer;

    // resultsetPresenter: ResultsetPresenter;

    notifier: NewNotifier;

    waitOverlay: WaitOverlay = new WaitOverlay(jQuery('.bitteWarten'));

    settings: Settings;

    windowStateManager: WindowStateManager = new WindowStateManager(this);

    guiState: GuiState;

    initGUI() {

        checkIfMousePresent();

        this.login = new Login(this);

        let singleUseToken = findGetParameter("singleUseToken");


        if (singleUseToken) {
            this.login.initGUI();
            this.login.loginWithVidis(singleUseToken);
        } else {
            this.login.initGUI();
        }


        this.databaseTool = new DatabaseTool(this);
        this.databaseExplorer = new DatabaseExplorer(this, jQuery(".jo_db_tree"));

        this.actionManager = new ActionManager(null, this);
        this.actionManager.init();

        this.bottomDiv = new BottomDiv(this, jQuery('#bottomdiv-outer>.jo_bottomdiv-inner'), jQuery('body'), true, false);
        this.networkManager = new NetworkManager(this, this.bottomDiv.$updateTimer);

        let sliders = new Sliders(this);
        sliders.initSliders();
        this.mainMenu = new MainMenu(this);
        this.projectExplorer = new ProjectExplorer(this, jQuery('#leftpanel>.jo_projectexplorer'));
        this.projectExplorer.initGUI();

        this.rightDiv = new RightDiv(this, jQuery('#rightdiv-inner'));
        this.rightDiv.initGUI();

        this.checkStartupComplete();

        this.themeManager = new ThemeManager();

        this.viewModeController = new ViewModeController(jQuery("#view-mode"), this);

        this.semicolonAngel = new SemicolonAngel(this);

        new ProgramControlButtons(this, jQuery('#controls'));

        // this.resultsetPresenter = new ResultsetPresenter(this, jQuery('.jo_bottomdiv-inner'));

        this.notifier = new NewNotifier(this);

    }


    initEditor() {
        this.editor = new Editor(this, true, false);
        new Formatter().init();
        // this.monaco_editor = 
        this.editor.initGUI(jQuery('#editor'));

        let that = this;
        jQuery(window).on('resize', (event) => {
            jQuery('#bottomdiv-outer').css('height', '450px');
            jQuery('#editor').css('height', (window.innerHeight - 450 - 30 - 2) + "px");
            that.editor.editor.layout();
            jQuery('#editor').css('height', "");

        });

        jQuery(window).trigger('resize');

        this.checkStartupComplete();
    }

    initTeacherExplorer(classdata: ClassData[]) {
        this.teacherExplorer = new TeacherExplorer(this, classdata);
        this.teacherExplorer.initGUI();
    }


    checkStartupComplete() {
        this.startupComplete--;
        if (this.startupComplete == 0) {
            this.start();
        }
    }

    start() {

        if (this.waitForGUICallback != null) {
            this.waitForGUICallback();
        }

        let that = this;
        setTimeout(() => {
            that.getMonacoEditor().layout();
        }, 200);

        this.compiler = new Compiler(this);

        this.startTimer();

        jQuery(window).on('unload', async function () {

            if (navigator.sendBeacon && that.user != null) {
                await that.networkManager.sendUpdatesAsync(false, true);

                PushClientManager.getInstance().close();
            }

        });


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
            this.compiler.compilerStatus != CompilerStatus.compiling) {
            try {

                this.compiler.compile(this.currentWorkspace.moduleStore);

                let errors = this.bottomDiv?.errorManager?.showErrors(this.currentWorkspace);
                this.projectExplorer.renderErrorCount(this.currentWorkspace, errors);

                this.editor.onDidChangeCursorPosition(null); // mark occurrences of symbol under cursor

                if (this.projectExplorer) {
                    this.version++;
                }

            } catch (e) {
                console.error(e);
                this.compiler.compilerStatus = CompilerStatus.error;
            }

        }

    }

    removeWorkspace(w: Workspace) {
        this.workspaceList.splice(this.workspaceList.indexOf(w), 1);
    }

    restoreWorkspaces(workspaces: Workspaces) {

        this.workspaceList = [];
        this.currentWorkspace = null;
        // this.monaco.setModel(monaco.editor.createModel("Keine Datei vorhanden." , "text"));
        this.getMonacoEditor().updateOptions({ readOnly: true });

        let currentWorkspace: Workspace = null;

        for (let ws of workspaces.workspaces) {

            let workspace: Workspace = Workspace.restoreFromData(ws, this);
            this.workspaceList.push(workspace);
            if (ws.id == this.user.currentWorkspace_id && !ws.isFolder) {
                currentWorkspace = workspace;
            }
        }

        this.projectExplorer.renderWorkspaces(this.workspaceList);

        if (currentWorkspace == null && this.workspaceList.length > 0) {
            for (let ws of this.workspaceList) {
                if (!ws.isFolder) {
                    currentWorkspace = this.workspaceList[0];

                    break;
                }
            }
        }

        if (currentWorkspace != null) {
            this.projectExplorer.setWorkspaceActive(currentWorkspace, null, true);
        }

        if (this.workspaceList.length == 0) {

            Helper.showHelper("newDatabaseHelper", this, jQuery(this.projectExplorer.workspaceTreeview.addFolderButton.parent));

        }


    }

    createNewWorkspace(name: string, owner_id: number): Workspace {
        return new Workspace(name, this, owner_id);
    }

    restoreWorkspaceFromData(workspaceData: WorkspaceData): Workspace {
        return Workspace.restoreFromData(workspaceData, this);
    }

    isEmbedded(): boolean {
        return false;
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

    getCurrentlyEditedFile(): GUIFile {
        return this.currentWorkspace?.getCurrentlyEditedModule()?.file;
    }

    getCurrentlyEditedModule(): Module {
        return this.currentWorkspace?.getCurrentlyEditedModule();
    }

    getActionManager(): ActionManager {
        return this.actionManager;
    }

    getCompiler(): Compiler {
        return this.compiler;
    }

    setFileActive(file: GUIFile) {
        this.projectExplorer.setFileActive(file);
    }

    getSemicolonAngel(): SemicolonAngel {
        return this.semicolonAngel;
    }

    getDatabaseTool(): DatabaseTool {
        return this.databaseTool;
    }

    getDatabaseExplorer(): DatabaseExplorer {
        return this.databaseExplorer;
    }

    getResultsetPresenter(): ResultsetPresenter {
        return this.bottomDiv.resultsetPresenter;
    }

    getWaitOverlay(): WaitOverlay {
        return this.waitOverlay;
    }

    getHistoryViewer(): HistoryViewer {
        return this.bottomDiv.historyViewer;
    }

    getSettings(): Settings {
        return this.settings;
    }
}

