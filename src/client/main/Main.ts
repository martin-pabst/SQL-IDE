import { ClassData, UserData, Workspaces } from "../communication/Data.js";
import { NetworkManager } from "../communication/NetworkManager.js";
import { Compiler, CompilerStatus } from "../compiler/Compiler.js";
import { Workspace } from "../workspace/Workspace.js";
import { ActionManager } from "./gui/ActionManager.js";
import { BottomDiv } from "./gui/BottomDiv.js";
import { Editor } from "./gui/Editor.js";
import { Formatter } from "./gui/Formatter.js";
import { Helper } from "./gui/Helper.js";
import { MainMenu } from "./gui/MainMenu.js";
import { ProjectExplorer } from "./gui/ProjectExplorer.js";
import { RightDiv } from "./gui/RightDiv.js";
import { Sliders } from "./gui/Sliders.js";
import { TeacherExplorer } from "./gui/TeacherExplorer.js";
import { ThemeManager } from "./gui/ThemeManager.js";
import { Login } from "./Login.js";
import { Module, File } from "../compiler/parser/Module.js";
import { ViewModeController } from "./gui/ViewModeController.js";
import { ErrorManager } from "./gui/ErrorManager.js";
import { SemicolonAngel } from "../compiler/parser/SemicolonAngel.js";
import { DatabaseTool } from "../tools/DatabaseTools.js";
import { MainBase } from "./MainBase.js";
import { TextPosition } from "../compiler/lexer/Token.js";
import { DatabaseExplorer } from "./gui/DatabaseExplorer.js";
import { ProgramControlButtons } from "./gui/ProgramControlButtons.js";
import { ResultsetPresenter } from "./gui/ResultsetPresenter.js";
import { Notifier } from "../communication/Notifier.js";
import { checkIfMousePresent } from "../tools/HtmlTools.js";
import { WaitOverlay } from "./gui/WaitOverlay.js";
import { HistoryViewer } from "./gui/HistoryViewer.js";
import jQuery from "jquery";

export class Main implements MainBase {
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

    // VORSICHT: ggf. Module -> any
    getCurrentlyEditedModule(): Module {
        return this.projectExplorer.getCurrentlyEditedModule();
    }

    getActionManager(): ActionManager {
        return this.actionManager;
    }

    getCompiler(): Compiler {
        return this.compiler;
    }

    setModuleActive(module: Module) {
        this.projectExplorer.setModuleActive(module);
    }

    getSemicolonAngel(): SemicolonAngel {
        return this.semicolonAngel;
    }

    getDatabaseTool(): DatabaseTool {
        return this.databaseTool;
    }

    getDatabaseExplorer():DatabaseExplorer {
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

    login: Login;

    compiler: Compiler;

    semicolonAngel: SemicolonAngel;

    bottomDiv: BottomDiv;

    startupComplete = 2;
    waitForGUICallback: () => void;

    version: number = 0;

    timerHandle: any;

    user: UserData;
    userDataDirty: boolean = false;

    themeManager: ThemeManager;

    rightDiv: RightDiv;

    viewModeController: ViewModeController;

    databaseTool: DatabaseTool;

    databaseExplorer: DatabaseExplorer;

    resultsetPresenter: ResultsetPresenter;

    notifier: Notifier;

    waitOverlay: WaitOverlay = new WaitOverlay(jQuery('.bitteWarten'));
    historyViewer: HistoryViewer = new HistoryViewer(this, jQuery('.jo_historyTab'));

    initGUI() {

        checkIfMousePresent();

        this.login = new Login(this);
        this.login.initGUI();

        this.databaseTool = new DatabaseTool(this);
        this.databaseExplorer = new DatabaseExplorer(this, jQuery(".jo_db_tree"));

        this.actionManager = new ActionManager(null, this);
        this.actionManager.init();

        this.networkManager = new NetworkManager(this, jQuery('#bottomdiv-outer .jo_updateTimerDiv'));

        let sliders = new Sliders(this);
        sliders.initSliders();
        this.mainMenu = new MainMenu(this);
        this.projectExplorer = new ProjectExplorer(this, jQuery('#leftpanel>.jo_projectexplorer'));
        this.projectExplorer.initGUI();

        this.bottomDiv = new BottomDiv(this, jQuery('#bottomdiv-outer>.jo_bottomdiv-inner'), jQuery('body'));

        this.rightDiv = new RightDiv(this, jQuery('#rightdiv-inner'));
        this.rightDiv.initGUI();

        this.checkStartupComplete();

        this.themeManager = new ThemeManager();

        this.viewModeController = new ViewModeController(jQuery("#view-mode"), this);

        this.semicolonAngel = new SemicolonAngel(this);

        new ProgramControlButtons(this, jQuery('#controls'));

        this.resultsetPresenter = new ResultsetPresenter(this, jQuery('.jo_bottomdiv-inner'));

        this.notifier = new Notifier(this);

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

        $(window).on('unload', function() {
            
            if(navigator.sendBeacon && that.user != null){
                that.networkManager.sendUpdates(null, false);
                that.networkManager.sendUpdateUserSettings(() => {});
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

                this.editor.onDidChangeCursorPosition(null); // mark occurrencies of symbol under cursor

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
            for(let ws of this.workspaceList){
                if(!ws.isFolder){
                    currentWorkspace = this.workspaceList[0];
                    
                    break;
                }
            }
        }

        if (currentWorkspace != null) {
            this.projectExplorer.setWorkspaceActive(currentWorkspace, null, true);
        }

        if (this.workspaceList.length == 0) {

            Helper.showHelper("newDatabaseHelper", this, this.projectExplorer.workspaceListPanel.$captionElement);

        }


    }

    createNewWorkspace(name: string, owner_id: number): Workspace {
        return new Workspace(name, this, owner_id);
    }


}

