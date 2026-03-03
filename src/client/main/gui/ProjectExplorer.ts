import * as monaco from 'monaco-editor';
import { ClassData, CreateWorkspaceData } from "../../communication/Data.js";
import { TextPosition } from "../../compiler/lexer/Token.js";
import { File, Module } from "../../compiler/parser/Module.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Main } from "../Main.js";
import { Accordion, AccordionContextMenuItem, AccordionElement, AccordionPanel } from "./Accordion.js";
import { DistributeToStudentsDialog } from "./DistributeToStudentsDialog.js";
import { Helper } from "./Helper.js";
import { NewDatabaseDialog } from "./NewDatabaseDialog.js";
import jQuery from "jquery";
import { TreeviewAccordion } from '../../tools/components/treeview/TreeviewAccordion.js';
import { Treeview, TreeviewContextMenuItem } from '../../tools/components/treeview/Treeview.js';
import { AccordionMessages, ProjectExplorerMessages } from './language/GUILanguage.js';
import { TreeviewNode } from '../../tools/components/treeview/TreeviewNode.js';
import { GuiMessages } from './language/GuiMessages.js';
import { downloadFile } from '../../tools/HtmlTools.js';
import { dateToString } from '../../tools/StringTools.js';


export class ProjectExplorer {

    programPointerModule: Module = null;
    programPointerPosition: TextPosition;
    programPointerDecoration: string[] = [];

    accordion: TreeviewAccordion;
    fileTreeview: Treeview<File, number>;
    workspaceTreeview: Treeview<Workspace, number>;

    constructor(private main: Main, private $projectexplorerDiv: JQuery<HTMLElement>) {

    }

    initGUI() {

        this.accordion = new TreeviewAccordion(this.$projectexplorerDiv[0]);

        this.initFilelistPanel();

        this.initWorkspacelistPanel();

        if (!this.main.user.is_teacher) {
            this.accordion.onResize(true);
        }

        this.workspaceTreeview.addDragDropSource({ treeview: this.workspaceTreeview, dropInsertKind: "asElement", defaultDragKind: "move" })
        this.workspaceTreeview.addDragDropSource({ treeview: this.fileTreeview, dropInsertKind: "intoElement", defaultDragKind: "copy", dragKindWithShift: "move" });
        this.fileTreeview.addDragDropSource({ treeview: this.fileTreeview, dropInsertKind: "asElement", defaultDragKind: "move" })

    }

    initFilelistPanel() {

        this.fileTreeview = new Treeview(this.accordion, {
            captionLine: {
                enabled: true
            },
            withSelection: true,
            selectMultiple: true,
            selectWholeFolders: true,
            withFolders: true,
            isDragAndDropSource: true,
            buttonAddElements: true,
            buttonAddFolders: true,
            withDeleteButtons: true,
            confirmDelete: true,
            defaultIconClass: "img_file-dark",
            buttonAddElementsCaption: ProjectExplorerMessages.newFile(),
            comparator: (a, b) => {
                return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
            },
            contextMenu: {
                messageNewNode: ProjectExplorerMessages.newFile(),
                messageRename: AccordionMessages.rename()
            },
            minHeight: 150,
            flexWeight: "1",
            keyExtractor: (file) => file.id,
            parentKeyExtractor: (file) => file.parent_folder_id,

            orderExtractor: (file) => file?.sorting_order || 0,
            orderSetter(file, order) {
                file.sorting_order = order;
            },
            orderBy: "user-defined"
        })

        this.fileTreeview.newNodeCallback = async (name: string, node: TreeviewNode<File, number>) => {

            if (this.main.currentWorkspace == null) {
                alert(ProjectExplorerMessages.firstChooseWorkspace());
                return null;
            }

            let parentNode = node.getParent();

            let f: File = {
                name: name,
                dirty: false,
                saved: true,
                text: "",
                text_before_revision: null,
                submitted_date: null,
                student_edited_after_revision: false,
                version: 1,
                sorting_order: 0,
                is_folder: node.isFolder,
                parent_folder_id: parentNode.isRootNode() ? null : parentNode.externalObject.id
            };


            let success = await this.main.networkManager.sendCreateFile(f, this.main.currentWorkspace, this.main.workspacesOwnerId);

            if (!success) {
                this.fileTreeview.removeNodeAndItsFolderContents(node);
                this.setModuleActive(null);
                return null;
            }

            if (!node.isFolder) {
                let m = new Module(f, this.main);
                let modulStore = this.main.currentWorkspace.moduleStore;
                modulStore.putModule(m);
                this.setModuleActive(m);
            }

            return f;

        }

        this.fileTreeview.renameCallback = async (file, newName, node) => {

            if (newName.length > 80) {
                alert(GuiMessages.FilenameHasBeenTruncated(80));
                newName = newName.substring(0, 80);
            }

            file.name = newName;
            file.dirty = true;

            let resp: boolean = await this.main.networkManager.sendUpdatesAsync();

            return { correctedName: newName, success: resp }
        }

        this.fileTreeview.deleteCallback = async (file, node) => {

            let filesToDelete: File[] = [file];
            if (file.is_folder) {
                filesToDelete = filesToDelete.concat(this.getFolderContentsRecursively(file, this.fileTreeview.getAllExternalObjects()));
                if (filesToDelete.length > 1) {
                    if (!confirm(ProjectExplorerMessages.confirmDeleteFileFolderRecursively(filesToDelete.length)))
                        return false;
                }
            }


            let success = this.main.user.is_testuser || await this.main.networkManager.sendDeleteWorkspaceOrFileAsync("file", filesToDelete.map(f => f.id));

            if (success) {
                for (let f of filesToDelete) {
                    this.main.getCurrentWorkspace().moduleStore.removeModuleWithFile(f);
                }

                if (node.hasFocus) {
                    let firstModule = this.main.getCurrentWorkspace().moduleStore.getFirstModule();
                    this.setModuleActive(firstModule);
                }
            }

            return success;

        }

        this.fileTreeview.contextMenuProvider = (file, node) => {
            let cmiList: TreeviewContextMenuItem<File, number>[] = [];

            cmiList.push(
                {
                    caption: ProjectExplorerMessages.duplicate(),
                    callback: async (file, treeviewNode) => {

                        let oldFile: File = file;
                        let newFile: File = {
                            name: oldFile.name + " - " + ProjectExplorerMessages.copy(),
                            dirty: true,
                            saved: false,
                            text: oldFile.text,
                            text_before_revision: null,
                            submitted_date: null,
                            student_edited_after_revision: false,
                            version: 1,
                            sorting_order: oldFile.sorting_order,
                            parent_folder_id: oldFile.parent_folder_id,
                            is_folder: oldFile.is_folder
                        }

                        let workspace = this.main.getCurrentWorkspace();

                        let success = await this.main.networkManager.sendCreateFile(newFile, workspace, this.main.workspacesOwnerId);

                        if (success) {
                            let newNode = this.fileTreeview.addNode(false, newFile.name, undefined,
                                newFile, treeviewNode.parentKey);
                            if (!file.is_folder) {
                                if (!file.is_folder) {
                                    let m = new Module(newFile, this.main);
                                    workspace.moduleStore.putModule(m);
                                    this.setModuleActive(m);
                                }
                            }
                            newNode.renameNode();
                        }
                    }
                },
                {
                    caption: ProjectExplorerMessages.exportAsFile(),
                    callback: async (file, treeviewNode) => {

                        downloadFile(file.text, file.name.endsWith(".sql") ? file.name : file.name + ".sql");

                    }
                },
            );


            if (!(this.main.user.is_teacher || this.main.user.is_admin || this.main.user.is_schooladmin)) {

                if (file.submitted_date == null) {
                    cmiList.push({
                        caption: ProjectExplorerMessages.markAsAssignment(),
                        callback: (file1, treeviewNode) => {
                            file.submitted_date = dateToString(new Date());
                            file.saved = false;
                            this.main.networkManager.sendUpdatesAsync(true);
                            this.renderHomeworkButton(file);
                        }
                    });
                } else {
                    cmiList.push({
                        caption: ProjectExplorerMessages.removeAssignmentLabel(),
                        callback: (file1, treevewNode) => {
                            file.submitted_date = null;
                            file.saved = false;
                            this.main.networkManager.sendUpdatesAsync(true);
                            this.renderHomeworkButton(file);
                        }
                    });
                }

            }

            return cmiList;

        }

        this.fileTreeview.nodeClickedCallback =
            (file: File) => {
                let module = this.main.getCurrentWorkspace().moduleStore.findModuleByFile(file);
                this.setModuleActive(module);
            }

        this.fileTreeview.dropEventCallback =
            async (sourceTreeview, destinationNode, destinationChildIndex, dragKind) => {
                if (sourceTreeview != this.fileTreeview || !destinationNode.isFolder) return;
                let sourceNodes = sourceTreeview.getCurrentlySelectedNodes();
                switch (dragKind) {
                    case "move":
                        let new_parent_folder_id = destinationNode.ownKey;
                        sourceNodes = this.fileTreeview.reduceNodesToMove(sourceNodes);
                        for (let node of sourceNodes) {
                            let file = node.externalObject;
                            if (file) file.parent_folder_id = new_parent_folder_id;
                            file.dirty = true;
                        }
                        if (await this.main.networkManager.sendUpdatesAsync(true)) {
                            destinationNode.insertNodes(destinationChildIndex, sourceNodes);
                            destinationNode.reorder();
                        }
                        break;
                    case "copy":
                        // Not yet implemented!
                        break;
                }

            }

        this.fileTreeview.orderChangedCallback = async (nodesWithNewOrder) => {
            // we don't await response to increase gui repsonsiveness
            // damage due to failed request would be low
            this.main.networkManager.sendUpdateFileOrder(nodesWithNewOrder.map(node => node.externalObject));
            return true;
        }




    }

    renderHomeworkButton(file: File) {
        let node = this.fileTreeview.findNodeByElement(file);
        if (!node) return;

        let homeworkButton = node.getIconButtonByTag("Homework");
        if (!homeworkButton) {
            homeworkButton = node.addIconButton("img_homework", undefined, "", true);
            homeworkButton.tag = "Homework";
        }

        let klass: string = null;
        let title: string = "";
        if (file.submitted_date != null) {
            klass = "img_homework";
            title = ProjectExplorerMessages.labeledAsAssignment() + ": " + file.submitted_date
            if (file.text_before_revision) {
                klass = "img_homework-corrected";
                title = ProjectExplorerMessages.assignmentIsCorrected();
            }
        }

        if (klass) {
            homeworkButton.iconClass = klass;
            homeworkButton.title = title;
            homeworkButton.setVisible(true);
        } else {
            homeworkButton.setVisible(false);
        }


    }



    initWorkspacelistPanel() {

        let that = this;

        this.workspaceTreeview = new AccordionPanel(this.accordion, "Datenbanken", "3",
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

            new NewDatabaseDialog(that.main, owner_id, this.workspaceTreeview.getCurrentlySelectedPath());

        })

        this.workspaceTreeview.addAction($newWorkspaceAction);
        if (this.workspaceTreeview.$buttonNew != null) {
            this.workspaceTreeview.$buttonNew.hide();
        }

        this.workspaceTreeview.newDatabaseElementCallback = (path: string[]) => {
            let owner_id: number = that.main.user.id;
            if (that.main.workspacesOwnerId != null) {
                owner_id = that.main.workspacesOwnerId;
            }

            new NewDatabaseDialog(that.main, owner_id, path);

        }


        this.workspaceTreeview.renameCallback =
            (workspace: Workspace, newName: string) => {
                newName = newName.substring(0, 80);
                workspace.name = newName;
                workspace.saved = false;
                that.main.networkManager.sendUpdates();

                // if user owns database: rename it, too
                if (workspace.database?.owner_id == workspace.owner_id) {
                    workspace.database.name = newName;
                    that.main.networkManager.setNameAndPublishedTo(workspace.id, newName, workspace.database.published_to, workspace.database.description, () => { })
                }
                return newName;
            }

        this.workspaceTreeview.deleteCallback =
            (workspace: Workspace, successfulNetworkCommunicationCallback: () => void) => {
                that.main.networkManager.sendDeleteWorkspaceOrFile("workspace", workspace.id, (error: string) => {
                    if (error == null) {
                        that.main.removeWorkspace(workspace);
                        if (!workspace.isFolder) {
                            that.fileTreeview.clear();
                            that.main.databaseExplorer.clear();
                            that.main.getResultsetPresenter().clear();
                            that.fileTreeview.enableNewButton(false);
                            that.main.getMonacoEditor().setModel(null);
                        }
                        successfulNetworkCommunicationCallback();
                    } else {
                        alert('Fehler: ' + error);
                    }
                });
            }

        this.workspaceTreeview.selectCallback =
            (workspace: Workspace) => {
                if (workspace?.isFolder) return;
                if (workspace != this.main.currentWorkspace) {
                    that.main.networkManager.sendUpdates(() => {
                        that.setWorkspaceActive(workspace);
                    });
                }
            }

        this.workspaceTreeview.newFolderCallback = (newElement: AccordionElement, successCallback) => {
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
                    that.workspaceTreeview.removeElement(newElement);
                }
            });

        }

        this.workspaceTreeview.moveCallback = (ae: AccordionElement | AccordionElement[]) => {
            if (!Array.isArray(ae)) ae = [ae];
            for (let a of ae) {
                let ws: Workspace = a.externalElement;
                ws.path = a.path.join("/");
                ws.saved = false;
            }
            this.main.networkManager.sendUpdates();
        }

        this.workspaceTreeview.dropElementCallback = (dest: AccordionElement, droppedElement: AccordionElement, dropEffekt: "copy" | "move") => {
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
                that.fileTreeview.removeElement(module);
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

        this.$homeAction.on(mousePointer + 'down', (e) => {
            e.stopPropagation();

            that.main.networkManager.sendUpdates(() => {
                that.onHomeButtonClicked();
            });

            that.main.bottomDiv.hideHomeworkTab();

        })

        this.workspaceTreeview.addAction(this.$homeAction);
        this.$homeAction.hide();

        this.workspaceTreeview.contextMenuProvider = (workspaceAccordionElement: AccordionElement) => {

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
        this.fileTreeview.enableNewButton(this.main.workspaceList.length > 0);
    }

    renderFiles(workspace: Workspace) {

        let name = workspace == null ? "Kein Workspace vorhanden" : workspace.name;

        this.fileTreeview.setCaption(name);
        this.fileTreeview.clear();

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

                this.fileTreeview.addElement(m.file.panelElement, true);
                this.renderHomeworkButton(m.file);
            }

            this.fileTreeview.sortElements();

        }
    }

    renderWorkspaces(workspaceList: Workspace[]) {

        this.fileTreeview.clear();
        this.workspaceTreeview.clear();

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

            this.workspaceTreeview.addElement(w.panelElement, false);
            w.renderSettingsButton(w.panelElement);
        }

        this.workspaceTreeview.sortElements();
        this.fileTreeview.enableNewButton(workspaceList.length > 0);



    }

    renderErrorCount(workspace: Workspace, errorCountMap: Map<Module, number>) {
        if (errorCountMap == null) return;
        for (let m of workspace.moduleStore.getModules(false)) {
            let errorCount: number = errorCountMap.get(m);
            let errorCountS: string = ((errorCount == null || errorCount == 0) ? "" : "(" + errorCount + ")");

            this.fileTreeview.setTextAfterFilename(m.file.panelElement, errorCountS, 'jo_errorcount');
        }
    }

    setWorkspaceActive(w: Workspace, callback?: () => void, scrollIntoView: boolean = false) {

        if (callback == null) callback = () => { }

        if (w == this.main.getCurrentWorkspace()) {
            if (callback != null) callback();
            return;
        }

        if (w != null) {
            if (w.isFolder) {
                this.main.currentWorkspace = null;
                this.main.databaseTool.initializeWorker(null, [], null, () => {
                    this.main.databaseExplorer.refreshAfterRetrievingDBStructure();
                });
                this.setModuleActive(null);
                return;
            } else {
                this.fileTreeview.$buttonNew.show();
            }
        }

        this.workspaceTreeview.select(w, false, scrollIntoView);

        let callbackAfterDatabaseFetched = (error: string) => {
            if (error != null) {
                alert(error);
                this.main.waitOverlay.hide();
                if (callback != null) callback();
            } else {
                this.main.waitOverlay.show("Bitte warten, initialisiere Datenbank ...");
                this.initializeDatabaseTool(w, callback)
            }
        };

        if (w == null) return;

        if (w.database == null) {
            this.main.waitOverlay.show("Bitte warten, hole Datenbank vom Server ...");

            this.main.networkManager.fetchDatabase(w, callbackAfterDatabaseFetched);
        } else {
            callbackAfterDatabaseFetched(null);
        }

    }

    initializeDatabaseTool(w: Workspace, callback?: () => void) {

        if (!w.database) {
            if (callback) callback();
            return;
        }

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

                        Helper.showHelper("newSQLFileHelper", this.main, this.fileTreeview.$captionElement);

                    }


                } else {
                    this.setModuleActive(null);
                }

                this.main.notifier.connect(w);
            },
            () => {
                this.main.databaseExplorer.refreshAfterRetrievingDBStructure();
                this.main.getHistoryViewer().clearAndShowStatements(w.database.statements);
                if (callback != null) callback();
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

            if (m.file.text_before_revision != null) {
                this.main.bottomDiv.homeworkManager.showHomeWorkRevisionButton();
            } else {
                this.main.bottomDiv.homeworkManager.hideHomeworkRevisionButton();
            }
        }


    }

    setActiveAfterExternalModelSet(m: Module) {
        this.fileTreeview.select(m, false);

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

        this.fileTreeview.$listElement.parent().css('background-color', color);
        this.workspaceTreeview.$listElement.parent().css('background-color', color);

        this.workspaceTreeview.setCaption(caption);
    }

    getNewModule(file: File): Module {
        return new Module(file, this.main);
    }

    getFolderContentsRecursively(folder: File, allFiles: File[]): File[] {
        let ret: File[] = allFiles.filter(f => f.parent_folder_id == folder.id);
        for (let file of ret.slice()) {
            if (file.is_folder) {
                ret = ret.concat(this.getFolderContentsRecursively(file, allFiles));
            }
        }
        return ret;
    }

}