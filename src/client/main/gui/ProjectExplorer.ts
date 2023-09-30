import { NetworkManager } from "../../communication/NetworkManager.js";
import { TextPosition } from "../../compiler/lexer/Token.js";
import { File, Module } from "../../compiler/parser/Module.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Main } from "../Main.js";
import { AccordionPanel, Accordion, AccordionElement, AccordionContextMenuItem } from "./Accordion.js";
import { Helper } from "./Helper.js";
import { WorkspaceData, Workspaces, ClassData, CreateWorkspaceData } from "../../communication/Data.js";
import { dateToString } from "../../tools/StringTools.js";
import { DistributeToStudentsDialog } from "./DistributeToStudentsDialog.js";
import { NewDatabaseDialog } from "./NewDatabaseDialog.js";



export class ProjectExplorer {

    programPointerModule: Module = null;
    programPointerPosition: TextPosition;
    programPointerDecoration: string[] = [];

    accordion: Accordion;
    fileListPanel: AccordionPanel;
    workspaceListPanel: AccordionPanel;

    $homeAction: JQuery<HTMLElement>;

    constructor(private main: Main, private $projectexplorerDiv: JQuery<HTMLElement>) {

    }

    initGUI() {

        this.accordion = new Accordion(this.main, this.$projectexplorerDiv);

        this.initFilelistPanel();

        this.initWorkspacelistPanel();

    }

    initFilelistPanel() {

        let that = this;

        this.fileListPanel = new AccordionPanel(this.accordion, "Kein Workspace gewählt", "1",
            "img_add-file-dark", "Neue Datei...", "java", true, false, "file", true, []);

        this.fileListPanel.newFilesElementCallback =

            (accordionElement, successfulNetworkCommunicationCallback) => {

                if (that.main.currentWorkspace == null) {
                    alert('Bitte wählen Sie zuerst einen Workspace aus.');
                    return null;
                }

                let f: File = {
                    name: accordionElement.name,
                    dirty: false,
                    saved: true,
                    text: "",
                    text_before_revision: null,
                    submitted_date: null,
                    student_edited_after_revision: false,
                    version: 1,
                    panelElement: accordionElement
                };
                let m = new Module(f, that.main);
                let modulStore = that.main.currentWorkspace.moduleStore;
                modulStore.putModule(m);
                that.setModuleActive(m);
                that.main.networkManager.sendCreateFile(m, that.main.currentWorkspace, that.main.workspacesOwnerId,
                    (error: string) => {
                        if (error == null) {
                            successfulNetworkCommunicationCallback(m);
                        } else {
                            alert('Der Server ist nicht erreichbar!');

                        }
                    });

            };

        this.fileListPanel.renameCallback =
            (module: Module, newName: string) => {
                newName = newName.substr(0, 80);
                let file = module.file;

                file.name = newName;
                file.saved = false;
                that.main.networkManager.sendUpdates();
                return newName;
            }

        this.fileListPanel.deleteCallback =
            (module: Module, callbackIfSuccessful: () => void) => {
                that.main.networkManager.sendDeleteWorkspaceOrFile("file", module.file.id, (error: string) => {
                    if (error == null) {
                        that.main.currentWorkspace.moduleStore.removeModule(module);
                        callbackIfSuccessful();
                    } else {
                        alert('Der Server ist nicht erreichbar!');

                    }
                });
            }

        this.fileListPanel.contextMenuProvider = (accordionElement: AccordionElement) => {

            let cmiList: AccordionContextMenuItem[] = [];

            if (!(that.main.user.is_teacher || that.main.user.is_admin || that.main.user.is_schooladmin)) {
                let module: Module = <Module>accordionElement.externalElement;
                let file = module.file;

                // if (file.submitted_date == null) {
                //     cmiList.push({
                //         caption: "Als Hausaufgabe markieren",
                //         callback: (element: AccordionElement) => {

                //             let file = (<Module>element.externalElement).file;
                //             file.submitted_date = dateToString(new Date());
                //             file.saved = false;
                //             that.main.networkManager.sendUpdates(null, true);
                //             that.renderHomeworkButton(file);
                //         }
                //     });
                // } else {
                //     cmiList.push({
                //         caption: "Hausaufgabenmarkierung entfernen",
                //         callback: (element: AccordionElement) => {

                //             let file = (<Module>element.externalElement).file;
                //             file.submitted_date = null;
                //             file.saved = false;
                //             that.main.networkManager.sendUpdates(null, true);
                //             that.renderHomeworkButton(file);

                //         }
                //     });
                // }

            }

            return cmiList;
        }



        this.fileListPanel.selectCallback =
            (module: Module) => {
                that.setModuleActive(module);
            }



    }

    renderHomeworkButton(file: File) {
        let $buttonDiv = file?.panelElement?.$htmlFirstLine?.find('.jo_additionalButtonHomework');
        if ($buttonDiv == null) return;

        $buttonDiv.find('.jo_homeworkButton').remove();

        let klass: string = null;
        let title: string = "";
        if (file.submitted_date != null) {
            klass = "img_homework";
            title = "Wurde als Hausaufgabe abgegeben: " + file.submitted_date
            if (file.text_before_revision) {
                klass = "img_homework-corrected";
                title = "Korrektur liegt vor."
            }
        }

        if (klass != null) {
            let $homeworkButtonDiv = jQuery(`<div class="jo_homeworkButton ${klass}" title="${title}"></div>`);
            $buttonDiv.prepend($homeworkButtonDiv);
            if (klass.indexOf("jo_active") >= 0) {
                $homeworkButtonDiv.on('mousedown', (e) => e.stopPropagation());
                $homeworkButtonDiv.on('click', (e) => {
                    e.stopPropagation();
                    // TODO
                });
            }

        }
    }



    initWorkspacelistPanel() {

        let that = this;

        this.workspaceListPanel = new AccordionPanel(this.accordion, "Datenbanken", "3",
            null, "Neue Datenbank...", "workspace", true, true, "workspace", false, ["file"]);

        let $newWorkspaceAction = jQuery('<div class="img_add-database-dark jo_button jo_active" style="margin-right: 4px"' +
            ' title="Neue Datenbank auf oberster Ordnerebene anlegen">');

        let mousePointer = window.PointerEvent ? "pointer" : "mouse";

        $newWorkspaceAction.on(mousePointer + 'down', (e) => {
            e.stopPropagation();

            let owner_id: number = that.main.user.id;
            if (that.main.workspacesOwnerId != null) {
                owner_id = that.main.workspacesOwnerId;
            }

            new NewDatabaseDialog(that.main, owner_id, this.workspaceListPanel.getCurrentlySelectedPath());

        })

        this.workspaceListPanel.addAction($newWorkspaceAction);
        if(this.workspaceListPanel.$buttonNew != null){
            this.workspaceListPanel.$buttonNew.hide();
        }

        this.workspaceListPanel.newDatabaseElementCallback = (path: string[]) => {
            let owner_id: number = that.main.user.id;
            if (that.main.workspacesOwnerId != null) {
                owner_id = that.main.workspacesOwnerId;
            }

            new NewDatabaseDialog(that.main, owner_id, path);

        }


        this.workspaceListPanel.renameCallback =
            (workspace: Workspace, newName: string) => {
                newName = newName.substring(0, 80);
                workspace.name = newName;
                workspace.saved = false;
                that.main.networkManager.sendUpdates();

                // if user owns databaes: rename it, too
                if(workspace.database.owner_id == workspace.owner_id){
                    workspace.database.name = newName;
                    that.main.networkManager.setNameAndPublishedTo(workspace.id, newName, workspace.database.published_to, workspace.database.description, () => {})
                }
                return newName;
            }

        this.workspaceListPanel.deleteCallback =
            (workspace: Workspace, successfulNetworkCommunicationCallback: () => void) => {
                that.main.networkManager.sendDeleteWorkspaceOrFile("workspace", workspace.id, (error: string) => {
                    if (error == null) {
                        that.main.removeWorkspace(workspace);
                        if(!workspace.isFolder){
                            that.fileListPanel.clear();
                            that.main.databaseExplorer.clear();
                            that.main.getResultsetPresenter().clear();
                            that.fileListPanel.enableNewButton(false);
                            that.main.getMonacoEditor().setModel(null);
                        }
                        successfulNetworkCommunicationCallback();
                    } else {
                        alert('Fehler: ' + error);
                    }
                });
            }

        this.workspaceListPanel.selectCallback =
            (workspace: Workspace) => {
                if(workspace?.isFolder) return;
                if (workspace != this.main.currentWorkspace) {
                    that.main.networkManager.sendUpdates(() => {
                        that.setWorkspaceActive(workspace);
                    });
                }
            }

        this.workspaceListPanel.newFolderCallback = (newElement: AccordionElement, successCallback) => {
            let owner_id: number = that.main.user.id;
            if (that.main.workspacesOwnerId != null) {
                owner_id = that.main.workspacesOwnerId;
            }

            let folder: Workspace = new Workspace(newElement.name, that.main, owner_id);
            folder.isFolder = true;

            folder.path = newElement.path.join("/");
            folder.panelElement = newElement;
            newElement.externalElement = folder;
            that.main.workspaceList.push(folder);

            let wd: CreateWorkspaceData = {
                id: -1,
                isFolder: true,
                name: folder.name,
                path: folder.path
            }

            that.main.networkManager.sendCreateWorkspace(wd, that.main.workspacesOwnerId, (error: string) => {
                if (error == null) {
                    folder.id = wd.id;
                    successCallback(folder);

                } else {
                    alert("Fehler: " + error);
                    that.workspaceListPanel.removeElement(newElement);
                }
            });

        }

        this.workspaceListPanel.moveCallback = (ae: AccordionElement | AccordionElement[]) => {
            if (!Array.isArray(ae)) ae = [ae];
            for (let a of ae) {
                let ws: Workspace = a.externalElement;
                ws.path = a.path.join("/");
                ws.saved = false;
            }
            this.main.networkManager.sendUpdates();
        }

        this.workspaceListPanel.dropElementCallback = (dest: AccordionElement, droppedElement: AccordionElement, dropEffekt: "copy" | "move") => {
            let workspace: Workspace = dest.externalElement;
            let module: Module = droppedElement.externalElement;

            if (workspace.moduleStore.getModules(false).indexOf(module) >= 0) return; // module is already in destination workspace

            let f: File = {
                name: module.file.name,
                dirty: true,
                saved: false,
                text: module.file.text,
                text_before_revision: null,
                submitted_date: null,
                student_edited_after_revision: false,
                version: module.file.version,
                panelElement: null
            };

            if (dropEffekt == "move") {
                // move file
                let oldWorkspace = that.main.currentWorkspace;
                oldWorkspace.moduleStore.removeModule(module);
                that.fileListPanel.removeElement(module);
                that.main.networkManager.sendDeleteWorkspaceOrFile("file", module.file.id, () => { });
            }

            let m = new Module(f, that.main);
            let modulStore = workspace.moduleStore;
            modulStore.putModule(m);
            that.main.networkManager.sendCreateFile(m, workspace, that.main.workspacesOwnerId,
                (error: string) => {
                    if (error == null) {
                    } else {
                        alert('Der Server ist nicht erreichbar!');

                    }
                });

        }



        this.$homeAction = jQuery('<div class="img_home-dark jo_button jo_active" style="margin-right: 4px"' +
            ' title="Meine eigenen Workspaces anzeigen">');

        this.$homeAction.on(mousePointer +'down', (e) => {
            e.stopPropagation();

            that.main.networkManager.sendUpdates(() => {
                that.onHomeButtonClicked();
            });

            that.main.bottomDiv.hideHomeworkTab();

        })

        this.workspaceListPanel.addAction(this.$homeAction);
        this.$homeAction.hide();

        this.workspaceListPanel.contextMenuProvider = (workspaceAccordionElement: AccordionElement) => {

            let cmiList: AccordionContextMenuItem[] = [];

            if (this.main.user.is_teacher && this.main.teacherExplorer.classPanel.elements.length > 0) {
                cmiList.push({
                    caption: "An Klasse austeilen...",
                    callback: (element: AccordionElement) => { },
                    subMenu: this.main.teacherExplorer.classPanel.elements.map((ae) => {
                        return {
                            caption: ae.name,
                            callback: (element: AccordionElement) => {
                                let klasse = <any>ae.externalElement;

                                let workspace: Workspace = element.externalElement;

                                this.main.networkManager.sendDistributeWorkspace(workspace, klasse, null, (error: string) => {
                                    if (error == null) {
                                        let networkManager = this.main.networkManager;
                                        let dt = networkManager.updateFrequencyInSeconds * networkManager.forcedUpdateEvery;
                                        alert("Der Workspace " + workspace.name + " wurde an die Klasse " + klasse.name + " ausgeteilt. Er wird in maximal " +
                                            dt + " s bei jedem Schüler ankommen.");
                                    } else {
                                        alert(error);
                                    }
                                });

                            }
                        }
                    })
                },
                    {
                        caption: "An einzelne Schüler/innen austeilen...",
                        callback: (element: AccordionElement) => {
                            let classes: ClassData[] = this.main.teacherExplorer.classPanel.elements.map(ae => ae.externalElement);
                            let workspace: Workspace = element.externalElement;
                            new DistributeToStudentsDialog(classes, workspace, this.main);
                        }
                    }
                );
            }

            return cmiList;
        }

    }

    onHomeButtonClicked() {
        this.main.teacherExplorer.restoreOwnWorkspaces();
        this.main.networkManager.updateFrequencyInSeconds = this.main.networkManager.ownUpdateFrequencyInSeconds;
        this.$homeAction.hide();
        this.fileListPanel.enableNewButton(this.main.workspaceList.length > 0);
    }

    renderFiles(workspace: Workspace) {

        let name = workspace == null ? "Kein Workspace vorhanden" : workspace.name;

        this.fileListPanel.setCaption(name);
        this.fileListPanel.clear();

        if (this.main.getCurrentWorkspace() != null) {
            for (let module of this.main.getCurrentWorkspace().moduleStore.getModules(false)) {
                module.file.panelElement = null;
            }
        }

        if (workspace != null) {
            let moduleList: Module[] = [];

            for (let m of workspace.moduleStore.getModules(false)) {
                moduleList.push(m);
            }

            moduleList.sort((a, b) => { return a.file.name > b.file.name ? 1 : a.file.name < b.file.name ? -1 : 0 });

            for (let m of moduleList) {

                m.file.panelElement = {
                    name: m.file.name,
                    externalElement: m,
                    isFolder: false,
                    path: []
                };

                this.fileListPanel.addElement(m.file.panelElement, true);
                this.renderHomeworkButton(m.file);
            }

            this.fileListPanel.sortElements();

        }
    }

    renderWorkspaces(workspaceList: Workspace[]) {

        this.fileListPanel.clear();
        this.workspaceListPanel.clear();

        for (let w of workspaceList) {
            let path = w.path.split("/");
            if (path.length == 1 && path[0] == "") path = [];
            w.panelElement = {
                name: w.name,
                externalElement: w,
                iconClass: 'workspace',
                isFolder: w.isFolder,
                path: path
            };

            this.workspaceListPanel.addElement(w.panelElement, false);
            w.renderSettingsButton(w.panelElement);
        }

        this.workspaceListPanel.sortElements();
        this.fileListPanel.enableNewButton(workspaceList.length > 0);



    }

    renderErrorCount(workspace: Workspace, errorCountMap: Map<Module, number>) {
        if (errorCountMap == null) return;
        for (let m of workspace.moduleStore.getModules(false)) {
            let errorCount: number = errorCountMap.get(m);
            let errorCountS: string = ((errorCount == null || errorCount == 0) ? "" : "(" + errorCount + ")");

            this.fileListPanel.setTextAfterFilename(m.file.panelElement, errorCountS, 'jo_errorcount');
        }
    }

    setWorkspaceActive(w: Workspace, callback?: () => void, scrollIntoView: boolean = false) {

        if(callback == null) callback = () => {}

        if(w == this.main.getCurrentWorkspace()){
            if(callback != null) callback();
            return;
        }

        if (w != null) {
            if(w.isFolder){
                this.main.currentWorkspace = null;
                this.main.databaseTool.initializeWorker(null, [], null, () => {
                    this.main.databaseExplorer.refreshAfterRetrievingDBStructure();
                });
                this.setModuleActive(null);
                return;
            } else {
                this.fileListPanel.$buttonNew.show();
            }
        }

        this.workspaceListPanel.select(w, false, scrollIntoView);

        let callbackAfterDatabaseFetched = (error: string) => {
            this.main.waitOverlay.show("Bitte warten, initialisiere Datenbank ...");
            if (error != null) {
                alert(error);
            }    
            this.initializeDatabaseTool(w, callback)
        };

        if (w.database == null) {
            this.main.waitOverlay.show("Bitte warten, hole Datenbank vom Server ...");

            this.main.networkManager.fetchDatabase(w, callbackAfterDatabaseFetched);
        } else {
            callbackAfterDatabaseFetched(null);
        }

    }

    initializeDatabaseTool(w: Workspace, callback?: () => void) {

        let dbTool = this.main.getDatabaseTool();

        let statements: string[] = w.database.statements;
        if (statements == null) statements = [];

        dbTool.initializeWorker(w.database.templateDump, statements,
            () => {
                this.main.currentWorkspace = w;

                if (this.main.user?.id == w.owner_id) {
                    this.main.user.currentWorkspace_id = w.id;
                }

                this.renderFiles(w);

                if (w != null) {
                    let nonSystemModules = w.moduleStore.getModules(false);

                    if (w.currentlyOpenModule != null) {
                        this.setModuleActive(w.currentlyOpenModule);
                    } else if (nonSystemModules.length > 0) {
                        this.setModuleActive(nonSystemModules[0]);
                    } else {
                        this.setModuleActive(null);
                    }

                    for (let m of nonSystemModules) {
                        m.file.dirty = true;
                    }

                    if (nonSystemModules.length == 0) {

                        Helper.showHelper("newSQLFileHelper", this.main, this.fileListPanel.$captionElement);

                    }

                    
                } else {
                    this.setModuleActive(null);
                }
                
                this.main.notifier.connect(w);
            },
            () => {
                this.main.databaseExplorer.refreshAfterRetrievingDBStructure();
                this.main.getHistoryViewer().clearAndShowStatements(w.database.statements);
                if(callback != null) callback();
            });

    }

    writeEditorTextToFile() {
        let cem = this.getCurrentlyEditedModule();
        if (cem != null)
            cem.file.text = cem.getProgramTextFromMonacoModel(); // 29.03. this.main.monaco.getValue();
    }


    lastOpenModule: Module = null;
    setModuleActive(m: Module) {

        this.main.bottomDiv.homeworkManager.hideRevision();

        if (this.lastOpenModule != null) {
            this.lastOpenModule.file.text = this.lastOpenModule.getProgramTextFromMonacoModel(); // this.main.monaco.getValue();
            this.lastOpenModule.editorState = this.main.getMonacoEditor().saveViewState();
        }

        if (m == null) {
            this.main.getMonacoEditor().setModel(monaco.editor.createModel("Keine Datei vorhanden.", "text"));
            this.main.getMonacoEditor().updateOptions({ readOnly: true });
        } else {
            this.main.getMonacoEditor().updateOptions({ readOnly: false });
            this.main.getMonacoEditor().setModel(m.model);
            if (this.main.getBottomDiv() != null) this.main.getBottomDiv().errorManager.showParenthesisWarning(m.bracketError);

            if (m.file.text_before_revision != null) {
                this.main.bottomDiv.homeworkManager.showHomeWorkRevisionButton();
            } else {
                this.main.bottomDiv.homeworkManager.hideHomeworkRevisionButton();
            }
        }


    }

    setActiveAfterExternalModelSet(m: Module) {
        this.fileListPanel.select(m, false);

        this.lastOpenModule = m;

        if (m.editorState != null) {
            this.main.editor.dontPushNextCursorMove++;
            this.main.getMonacoEditor().restoreViewState(m.editorState);
            this.main.editor.dontPushNextCursorMove--;
        }

        this.setCurrentlyEditedModule(m);

        this.showProgramPointer();

        setTimeout(() => {
            if (!this.main.getMonacoEditor().getOptions().get(monaco.editor.EditorOption.readOnly)) {
                this.main.getMonacoEditor().focus();
            }
        }, 300);

    }


    private showProgramPointer() {

        if (this.programPointerModule == this.getCurrentlyEditedModule() && this.getCurrentlyEditedModule() != null) {
            let position = this.programPointerPosition;
            let range = {
                startColumn: position.column, startLineNumber: position.line,
                endColumn: position.column + position.length, endLineNumber: position.line
            };

            this.main.getMonacoEditor().revealRangeInCenterIfOutsideViewport(range);
            this.programPointerDecoration = this.main.getMonacoEditor().deltaDecorations(this.programPointerDecoration, [
                {
                    range: range,
                    options: {
                        className: 'jo_revealProgramPointer', isWholeLine: true,
                        overviewRuler: {
                            color: "#6fd61b",
                            position: monaco.editor.OverviewRulerLane.Center
                        },
                        minimap: {
                            color: "#6fd61b",
                            position: monaco.editor.MinimapPosition.Inline
                        }
                    }
                },
                {
                    range: range,
                    options: { beforeContentClassName: 'jo_revealProgramPointerBefore' }
                }
            ]);

        }
    }

    showProgramPointerPosition(file: File, position: TextPosition) {

        // console statement execution:
        if (file == null) {
            return;
        }

        let module = this.main.currentWorkspace.moduleStore.findModuleByFile(file);
        if (module == null) {
            return;
        }

        this.programPointerModule = module;
        this.programPointerPosition = position;

        if (module != this.getCurrentlyEditedModule()) {
            this.setModuleActive(module);
        } else {
            this.showProgramPointer();
        }

    }

    hideProgramPointerPosition() {
        if (this.getCurrentlyEditedModule() == this.programPointerModule) {
            this.main.getMonacoEditor().deltaDecorations(this.programPointerDecoration, []);
        }
        this.programPointerModule = null;
        this.programPointerDecoration = [];
    }

    getCurrentlyEditedModule(): Module {
        let ws = this.main.currentWorkspace;
        if (ws == null) return null;

        return ws.currentlyOpenModule;
    }

    setCurrentlyEditedModule(m: Module) {
        if (m == null) return;
        let ws = this.main.currentWorkspace;
        if (ws.currentlyOpenModule != m) {
            ws.currentlyOpenModule = m;
            ws.saved = false;
            m.file.dirty = true;
        }
    }

    setExplorerColor(color: string) {
        let caption: string;

        if (color == null) {
            color = "transparent";
            caption = "Meine Datenbanken";
        } else {
            caption = "Schüler-DB";
        }

        this.fileListPanel.$listElement.parent().css('background-color', color);
        this.workspaceListPanel.$listElement.parent().css('background-color', color);

        this.workspaceListPanel.setCaption(caption);
    }

    getNewModule(file: File): Module {
        return new Module(file, this.main);
    }

}