import * as monaco from 'monaco-editor';
import { ClassData, type DuplicateWorkspaceResponse, type FileData, type GetWorkspacesRequest, type GetWorkspacesResponse, type Pruefung, type UserData } from "../../communication/Data.js";
import { TextPosition } from "../../compiler/lexer/Token.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Main } from "../Main.js";
import { DistributeToStudentsDialog } from "./DistributeToStudentsDialog.js";
import { Helper } from "./Helper.js";
import jQuery from "jquery";
import { ProjectExplorerMessages } from './language/ProjectExplorerMessages.js';
import { AccordionMessages } from './language/AccordionMessages.js';
import { GUIFile } from '../../compiler/parser/GUIFile.js';
import { FileTypeManager } from '../../compiler/parser/FileTypeManager.js';
import { downloadFile } from '../../tools/HtmlTools.js';
import { dateToString } from '../../tools/StringTools.js';
import { TreeviewAccordion } from '../../tools/treeview/TreeviewAccordion.js';
import { Treeview, TreeviewContextMenuItem, DragKind } from '../../tools/treeview/Treeview.js';
import type { TreeviewNode } from '../../tools/treeview/TreeviewNode.js';
import { NewDatabaseDialog } from './NewDatabaseDialog.js';
import type { TeacherExplorer } from './TeacherExplorer.js';
import { ajaxAsync } from '../../communication/AjaxHelper.js';
import '/assets/css/icons.css';
import '/assets/css/projectexplorer.css';
import type { IconButtonComponent } from '../../tools/IconButtonComponent.js';


export class ProjectExplorer {

    programPointerFile: GUIFile = null;
    programPointerPosition: TextPosition;
    programPointerDecoration: string[] = [];

    accordion: TreeviewAccordion;
    fileTreeview: Treeview<GUIFile, number>;
    workspaceTreeview: Treeview<Workspace, number>;
    addDatabaseButton: IconButtonComponent;


    constructor(private main: Main, private $projectexplorerDiv: JQuery<HTMLElement>) {

    }

    initGUI() {

        this.accordion = new TreeviewAccordion(this.$projectexplorerDiv[0]);

        this.initFilelistPanel();

        this.initWorkspacelistPanel();


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
            defaultIconClass: "img_file-dark-java",
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
            orderBy: "comparator"
        })

        this.fileTreeview.newNodeCallback = async (name: string, node: TreeviewNode<GUIFile, number>) => {

            if (this.main.currentWorkspace == null) {
                if (this.fileTreeview.getCurrentlySelectedNodes().length > 0 && this.fileTreeview.getCurrentlySelectedNodes()[0].isFolder) {
                    alert(ProjectExplorerMessages.firstChooseWorkspaceBecauseFolderIsSelected());
                } else {
                    alert(ProjectExplorerMessages.firstChooseWorkspace());
                }
                return null;
            }

            let file = new GUIFile(this.main, name);
            file.isFolder = node.isFolder;
            let parentNode = node.getParent();
            if (!parentNode.isRootNode()) {
                file.parent_folder_id = parentNode.externalObject.id;
            }

            if (!node.isFolder) node.iconClass = FileTypeManager.filenameToFileType(name).iconclass;

            this.main.getCurrentWorkspace().addFile(file);

            if (!file.isFolder) this.setFileActive(file);


            let success = this.main.user.is_testuser || await this.main.networkManager.sendCreateFile(file, this.main.currentWorkspace, this.main.workspacesOwnerId);
            if (!success) {
                this.fileTreeview.removeNodeAndItsFolderContents(node);
                this.setFileActive(null);
                return null;
            }

            return file;
        }

        this.fileTreeview.renameCallback = async (file, newName, node) => {

            if (newName.length > 80) {
                alert(ProjectExplorerMessages.FilenameHasBeenTruncated(80));
                newName = newName.substring(0, 80);
            }

            file.name = newName;
            file.setSaved(false);
            if (!file.isFolder) {
                let fileType = file.isFolder ? undefined : FileTypeManager.filenameToFileType(newName);
                node.iconClass = fileType.iconclass;
                monaco.editor.setModelLanguage(file.getMonacoModel(), fileType.language);
            }

            if (this.main.user.is_testuser) return { correctedName: newName, success: true };

            let resp: boolean = await this.main.networkManager.sendUpdatesAsync(true);

            return { correctedName: newName, success: resp }
        }

        this.fileTreeview.deleteCallback = async (file, node) => {

            let filesToDelete: GUIFile[] = [file];
            if (file.isFolder) {
                filesToDelete = filesToDelete.concat(file.getFolderContentsRecursively(this.fileTreeview.getAllExternalObjects()));
                if (filesToDelete.length > 1) {
                    if (!confirm(ProjectExplorerMessages.confirmDeleteFileFolderRecursively(filesToDelete.length)))
                        return false;
                }
            }


            let success = this.main.user.is_testuser || await this.main.networkManager.sendDeleteWorkspaceOrFileAsync("file", filesToDelete.map(f => f.id));

            if (success) {
                for (let f of filesToDelete) {
                    this.main.getCurrentWorkspace().removeFile(f);
                }

                if (node.hasFocus) {
                    let files = this.main.getCurrentWorkspace().getFiles();
                    if (files.length == 0) {
                        this.fileTreeview.setCaption(ProjectExplorerMessages.noFile());
                        this.setFileActive(null);
                    } else {
                        this.setFileActive(files[0]);
                    }
                }
            }

            return success;

        }

        this.fileTreeview.contextMenuProvider = (file, node) => {
            let cmiList: TreeviewContextMenuItem<GUIFile, number>[] = [];

            cmiList.push(
                {
                    caption: ProjectExplorerMessages.duplicate(),
                    callback: async (file, treeviewNode) => {

                        let oldFile: GUIFile = file;
                        let newFile: GUIFile = new GUIFile(this.main, oldFile.name + " - " + ProjectExplorerMessages.copy(), oldFile.getText());
                        newFile.remote_version = oldFile.remote_version;

                        let workspace = this.main.getCurrentWorkspace();
                        workspace.addFile(newFile);

                        let success = await this.main.networkManager.sendCreateFile(newFile, workspace, this.main.workspacesOwnerId);

                        if (success) {
                            let newNode = this.fileTreeview.addNode(false, newFile.name, FileTypeManager.filenameToFileType(newFile.name).iconclass,
                                newFile, treeviewNode.parentKey);
                            this.setFileActive(newFile);
                            newNode.renameNode();
                        }
                    }
                },
                {
                    caption: ProjectExplorerMessages.exportAsFile(),
                    callback: async (file, treeviewNode) => {

                        downloadFile(file.getText(), file.name);

                    }
                },
            );


            if (!(this.main.user.is_teacher || this.main.user.is_admin || this.main.user.is_schooladmin)) {

                if (file.submitted_date == null) {
                    cmiList.push({
                        caption: ProjectExplorerMessages.markAsAssignment(),
                        callback: (file1, treeviewNode) => {
                            file.submitted_date = dateToString(new Date());
                            file.setSaved(false);
                            this.main.networkManager.sendUpdatesAsync(true);
                            this.renderHomeworkButton(file);
                        }
                    });
                } else {
                    cmiList.push({
                        caption: ProjectExplorerMessages.removeAssignmentLabel(),
                        callback: (file1, treevewNode) => {
                            file.submitted_date = null;
                            file.setSaved(false);
                            this.main.networkManager.sendUpdatesAsync(true);
                            this.renderHomeworkButton(file);
                        }
                    });
                }

            }

            return cmiList;

        }


        this.fileTreeview.nodeClickedCallback =
            (file: GUIFile) => {
                if (!file.isFolder) {
                    this.setFileActive(file);
                }
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
                            file.setSaved(false);
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
            // we don't await response to increase gui responsiveness
            // damage due to failed request would be low
            this.main.networkManager.sendUpdateFileOrder(nodesWithNewOrder.map(node => node.externalObject));
            return true;
        }



    }

    renderHomeworkButton(file: GUIFile) {

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

    /**
     * Initializes the workspace treeview in the project explorer.
     */
    initWorkspacelistPanel() {

        this.workspaceTreeview = new Treeview(this.accordion, {
            captionLine: {
                enabled: true,
                text: ProjectExplorerMessages.WORKSPACES()
            },
            withSelection: true,
            withFolders: true,
            selectMultiple: true,
            isDragAndDropSource: true,
            withDeleteButtons: true,
            confirmDelete: true,
            buttonAddElements: false,
            buttonAddFolders: true,
            minHeight: 150,
            flexWeight: "1",
            defaultIconClass: "img_workspace-dark",
            comparator: (a, b) => {
                return a.name > b.name ? 1 : a.name < b.name ? -1 : 0;
            },
            keyExtractor: workspace => workspace.id,
            parentKeyExtractor: workspace => workspace.parent_folder_id,
            readOnlyExtractor: (workspace) => workspace.readonly || workspace.pruefung_id != null,

            orderBy: "comparator",
            orderExtractor: workspace => workspace.sorting_order,
            orderSetter: (workspace, order) => workspace.sorting_order = order
        })

        this.addDatabaseButton =this.workspaceTreeview.captionLineAddIconButton("img_add-database-dark", "right", () => {
            let owner_id: number = this.main.user.id;
            if (this.main.workspacesOwnerId != null) {
                owner_id = this.main.workspacesOwnerId;
            }

            let currentlySelectedNodes = this.workspaceTreeview.getCurrentlySelectedNodes();
            let currentlySelectedFolder = currentlySelectedNodes.find(node => node.isFolder);
            if (!currentlySelectedFolder) currentlySelectedFolder = this.workspaceTreeview.rootNode;

            new NewDatabaseDialog(this.main, owner_id, currentlySelectedFolder)

        }, ProjectExplorerMessages.newDatabase());

        this.workspaceTreeview.renameCallback = async (workspace, newName, node) => {
            newName = newName.substring(0, 80);
            workspace.name = newName;
            workspace.saved = false;

            if (this.main.user.is_testuser) return { correctedName: newName, success: true };

            let success = await this.main.networkManager.sendUpdatesAsync();
            return { correctedName: newName, success: success }
        }

        this.workspaceTreeview.deleteCallback = async (workspace) => {

            let workspacesToDelete: Workspace[] = [workspace];
            if (workspace.isFolder) {
                workspacesToDelete = workspacesToDelete.concat(workspace.getFolderContentsRecursively(this.workspaceTreeview.getAllExternalObjects()));
                if (workspacesToDelete.length > 1) {
                    if (!confirm(ProjectExplorerMessages.confirmDeleteWorkspaceFolderRecursively(workspacesToDelete.length)))
                        return false;
                }
            }

            let success = this.main.user.is_testuser || await this.main.networkManager
                .sendDeleteWorkspaceOrFileAsync("workspace", workspacesToDelete.map(w => w.id));
            if (success) {
                for (let ws of workspacesToDelete) {
                    this.main.removeWorkspace(ws);
                }

                if (this.main.workspaceList.indexOf(this.main.currentWorkspace) < 0) {
                    this.setWorkspaceActive(null);
                }

            }
            return success;
        }

        this.workspaceTreeview.nodeClickedCallback = async (workspace) => {
            if (workspace != null && !workspace.isFolder) {
                this.setWorkspaceActive(workspace, false, false);
                this.fileTreeview.addElementsButton.setVisible(true);
                this.fileTreeview.addFolderButton.setVisible(true);
            }
        }

        this.workspaceTreeview.dropEventCallback = (sourceTreeview, destinationNode, destinationChildIndex, dragKind) => {
            if (sourceTreeview == this.workspaceTreeview) {
                this.moveOrCopyWorkspaces(this.workspaceTreeview.getOrderedListOfCurrentlySelectedNodes(), destinationNode, destinationChildIndex, dragKind);
            } else if (sourceTreeview == this.fileTreeview) {
                this.moveOrCopyFilesToOtherWorkspaces(this.fileTreeview.getOrderedListOfCurrentlySelectedNodes(), destinationNode, dragKind);
            }
        }

        this.workspaceTreeview.contextMenuProvider =
            (workspace, node) => {

                let mousePointer = window.PointerEvent ? "pointer" : "mouse";

                let cmiList: TreeviewContextMenuItem<Workspace, number>[] = [];

                if (workspace.readonly) return cmiList;

                cmiList.push(
                    {
                        caption: ProjectExplorerMessages.newDatabase() + "...",
                        callback: () => {
                            while (!node.isFolder && !node.isRootNode && node != null) {
                                node = node.getParent();
                            }
                            this.workspaceTreeview.selectNodeAndSetFocus(node, false);

                            let owner_id: number = this.main.user.id;
                            if (this.main.workspacesOwnerId != null) {
                                owner_id = this.main.workspacesOwnerId;
                            }

                            new NewDatabaseDialog(this.main, owner_id, node)

                        }
                    });

                if (!node.isFolder) {
                    if (this.main.user.is_teacher && this.main.teacherExplorer.classPanel.size(true) > 0) {
                        cmiList.push({ caption: '-', callback: () => { } });

                        cmiList.push(
                            {
                                caption: ProjectExplorerMessages.distributeToClass() + "...",
                                callback: () => { },
                                subMenu: this.main.teacherExplorer.classPanel.nodes
                                    .filter(node => !node.isRootNode()).map((classNode) => {
                                        let classData = <ClassData>classNode.externalObject;
                                        return {
                                            caption: classData.name,
                                            callback: () => {

                                                this.main.networkManager.sendDistributeWorkspace(workspace, classData, null, (error: string) => {
                                                    if (error == null) {
                                                        let networkManager = this.main.networkManager;
                                                        let dt = networkManager.updateFrequencyInSeconds * networkManager.forcedUpdateEvery;
                                                        alert(ProjectExplorerMessages.workspaceDistributed(workspace.name, classData.name));
                                                    } else {
                                                        alert(error);
                                                    }
                                                });

                                            }
                                        }
                                    })
                            },
                            {
                                caption: ProjectExplorerMessages.distributeToStudents(),
                                callback: () => {
                                    let classes: ClassData[] = <any>this.main.teacherExplorer.classPanel.getAllExternalObjects();
                                    new DistributeToStudentsDialog(classes, workspace, this.main);
                                }
                            }
                        );
                    }

                }

                return cmiList;
            }

        this.workspaceTreeview.orderChangedCallback = async (nodesWithNewOrder) => {
            // we don't await response to increase gui responsiveness
            // damage due to failed request would be low.
            this.main.networkManager.sendUpdateWorkspaceOrder(nodesWithNewOrder.map(node => node.externalObject));
            return true;
        }

    }

    async moveOrCopyFilesToOtherWorkspaces(filesToMoveOrCopy: TreeviewNode<GUIFile, number>[], destinationWorkspaceNode: TreeviewNode<Workspace, number>, dragKind: DragKind) {
        if (destinationWorkspaceNode.isFolder) {
            alert(ProjectExplorerMessages.cantMoveFilesToDatabaseFolder());
            return;
        }

        let destinationWorkspace = destinationWorkspaceNode.externalObject;
        let sourceWorkspace = this.main.getCurrentWorkspace();

        if (sourceWorkspace == destinationWorkspace) return;

        switch (dragKind) {
            case "move":
                let fileIds = filesToMoveOrCopy.map(node => node.externalObject.id);

                for (let fileNode of filesToMoveOrCopy) {
                    let file = fileNode.externalObject;

                    if (fileIds.indexOf(file.parent_folder_id) < 0) {
                        file.parent_folder_id = null;
                    }

                    file.sorting_order = 10000;

                    let success = this.main.user.is_testuser || await this.main.networkManager.moveFile(file.id, destinationWorkspace.id);
                    if (success) {
                        sourceWorkspace.removeFile(file);
                        destinationWorkspace.addFile(file);
                        this.fileTreeview.removeNodeAndItsFolderContents(fileNode);
                    }
                }
                break;
            case "copy":
                // filesToMoveOrCopy are already ordered "parents first"
                let oldIdToNewIdMap: Map<number, number> = new Map();

                for (let fileNode of filesToMoveOrCopy) {
                    let file = fileNode.externalObject;
                    let oldFileId = file.id;

                    let newParentId = oldIdToNewIdMap.get(file.parent_folder_id) || null;
                    let newFile = new GUIFile(this.main, file.name, file.getText());
                    newFile.parent_folder_id = newParentId;
                    newFile.isFolder = file.isFolder;
                    newFile.sorting_order = 10000;

                    let success = this.main.user.is_testuser || await this.main.networkManager.sendCreateFile(newFile, destinationWorkspace, destinationWorkspace.owner_id);
                    if (success) destinationWorkspace.addFile(newFile);

                    oldIdToNewIdMap.set(oldFileId, newFile.id);
                }
                break;
        }

    }

    async moveOrCopyWorkspaces(nodesToCopyOrMove: TreeviewNode<Workspace, number>[], destinationFolderNode: TreeviewNode<Workspace, number>, destinationChildIndex: number, dragKind: DragKind) {
        switch (dragKind) {
            case "move":
                let new_parent_folder_id = destinationFolderNode.ownKey;
                nodesToCopyOrMove = this.workspaceTreeview.reduceNodesToMove(nodesToCopyOrMove);
                for (let node of nodesToCopyOrMove) {
                    let ws = node.externalObject;
                    if (ws) ws.parent_folder_id = new_parent_folder_id;
                    ws.saved = false;
                }

                if (this.main.user.is_testuser || await this.main.networkManager.sendUpdatesAsync(true)) {
                    destinationFolderNode.insertNodes(destinationChildIndex, nodesToCopyOrMove);
                    destinationFolderNode.reorder();
                }
                break;
            case "copy":
                // Not yet implemented!
                break;
        }

    }



    renderFiles(workspace: Workspace) {

        let name = workspace == null ? ProjectExplorerMessages.noWorkspace() : workspace.name;

        this.fileTreeview.setCaption(name);
        this.fileTreeview.clear();

        if (workspace != null) {
            let files: GUIFile[] = workspace.getFiles().slice();

            // Todo: necessary?
            // files.sort((a, b) => { return a.name > b.name ? 1 : a.name < b.name ? -1 : 0 });

            for (let file of files) {

                this.fileTreeview.addNode(file.isFolder, file.name,
                    file.isFolder ? undefined : FileTypeManager.filenameToFileType(file.name).iconclass, file);

                this.renderHomeworkButton(file);
            }

            this.fileTreeview.sort();

            workspace.createMonacoModels();

            if (workspace.currentlyOpenFile != null) {
                this.setFileActive(workspace.currentlyOpenFile);
            } else if (files.length > 0) {
                this.setFileActive(files[0]);
            } else {
                this.setFileActive(null);
            }

            if (files.length == 0 && !this.main.user.sql_gui_state.helperHistory.newFileHelperDone) {

                Helper.showHelper("newSQLFileHelper", this.main, jQuery(this.fileTreeview.addElementsButton.parent));

            }

        }
    }

    renderWorkspaces(workspaceList: Workspace[]) {

        this.fileTreeview.clear();
        this.workspaceTreeview.clear();

        for (let ws of workspaceList) {
            let iconClass = "img_database-dark";
            if (ws.isFolder) iconClass = undefined;
            let node = this.workspaceTreeview.addNode(ws.isFolder, ws.name, iconClass, ws)

            if (ws.name == '_Prüfungen' && ws.readonly) {
                node.renderCaptionAsHtml = true;
                node.caption = '<span class="jo_explorer_pruefungCaption">Prüfungen</span>'
                node.readOnly = true;
            }

            if (ws.pruefung_id) {
                node.readOnly = true;
            }

        }

        this.workspaceTreeview.sort();
        this.workspaceTreeview.collapseAllButRootnode();
    }

    renderErrorCount(workspace: Workspace, errorCountMap: Map<GUIFile, number>) {
        if (errorCountMap == null) return;
        for (let f of workspace.getFiles()) {
            let errorCount: number = errorCountMap.get(f);
            let errorCountS: string = ((errorCount == null || errorCount == 0) ? "" : "(" + errorCount + ")");
            this.fileTreeview.findNodeByElement(f)?.setRightPartOfCaptionErrors(errorCountS);
        }
    }

    setWorkspaceActive(w: Workspace, scrollIntoView: boolean = false,
         selectElement: boolean = true, callback: () => void = null) {

        /*
        * monaco editor counts LanguageChangedListeners and issues ugly warnings in console if more than
        * 200, 300, ... are created. Unfortunately it creates one each time a monaco.editor.ITextModel is created.
        * To keep monaco.editor.ITextModel instance count low we instantiate it only when needed and dispose of it
        * when switching to another workspace.
        */
        this.main.editor.editor.setModel(null); // detach current model from editor
        this.main.getCurrentWorkspace()?.disposeMonacoModels();

        this.main.currentWorkspace = w;

        if (w == null) {
            this.fileTreeview.addElementsButton.setVisible(false);
            this.fileTreeview.addFolderButton.setVisible(false);
            this.main.getMonacoEditor().setModel(null);
            this.fileTreeview.setCaption(ProjectExplorerMessages.selectDatabase());
            this.setFileActive(null);
            this.renderFiles(w);
            return;
        }

        if (selectElement) this.workspaceTreeview.selectElement(w, false);

        let callbackAfterDatabaseFetched = (error: string) => {
            if (error != null) {
                alert(error);
                this.main.waitOverlay.hide();
                if(callback) callback();
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

                this.main.notifier.connect(w);
            },
            () => {
                this.main.databaseExplorer.refreshAfterRetrievingDBStructure();
                this.main.getHistoryViewer().clearAndShowStatements(w.database.statements);
                if (callback != null) callback();
            });

    }


    lastOpenFile: GUIFile = null;
    dontScrollIntoViewOnNextSetActive: boolean = false;
    setFileActive(file: GUIFile) {

        this.main.bottomDiv.homeworkManager.hideRevision();

        if (this.lastOpenFile != null) {
            this.lastOpenFile.saveViewState(this.main.getMonacoEditor());
        }

        if (file == null) {
            this.main.getMonacoEditor().setModel(monaco.editor.createModel(ProjectExplorerMessages.noFile(), "text"));
            this.main.getMonacoEditor().updateOptions({ readOnly: true });
        } else {
            this.main.getMonacoEditor().updateOptions({ readOnly: false });
            this.main.getMonacoEditor().setModel(file.getMonacoModel());

            if (file.text_before_revision != null) {
                this.main.bottomDiv.homeworkManager.showHomeWorkRevisionButton();
            } else {
                this.main.bottomDiv.homeworkManager.hideHomeworkRevisionButton();
            }
        }

    }

    setActiveAfterExternalModelSet(f: GUIFile) {   // MP Aug. 24: Ändern zu file: File!
        if (this.dontScrollIntoViewOnNextSetActive) {
            this.dontScrollIntoViewOnNextSetActive = false;
        } else {
            this.fileTreeview.selectElement(f, false);
        }

        this.lastOpenFile = f;

        this.main.editor.dontPushNextCursorMove++;
        f.restoreViewState(this.main.getMonacoEditor());
        this.main.editor.dontPushNextCursorMove--;

        this.setCurrentlyEditedFile(f);

        setTimeout(() => {
            if (!this.main.getMonacoEditor().getOptions().get(monaco.editor.EditorOption.readOnly)) {
                this.main.getMonacoEditor().focus();
            }
        }, 300);

    }


    private showProgramPointer() {

        if (this.programPointerFile == this.getCurrentlyEditedFile() && this.getCurrentlyEditedFile() != null) {
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

    showProgramPointerPosition(file: GUIFile, position: TextPosition) {

        // console statement execution:
        if (file == null) {
            return;
        }

        this.programPointerFile = file;
        this.programPointerPosition = position;

        if (file != this.getCurrentlyEditedFile()) {
            this.setFileActive(file);
        } else {
            this.showProgramPointer();
        }

    }

    hideProgramPointerPosition() {
        if (this.getCurrentlyEditedFile() == this.programPointerFile) {
            this.main.getMonacoEditor().deltaDecorations(this.programPointerDecoration, []);
        }
        this.programPointerFile = null;
        this.programPointerDecoration = [];
    }

    getCurrentlyEditedFile(): GUIFile {
        let ws = this.main.currentWorkspace;
        if (ws == null) return null;

        return ws.currentlyOpenFile;
    }

    setCurrentlyEditedFile(file: GUIFile) {
        if (file == null) return;
        let ws = this.main.currentWorkspace;
        if (ws.currentlyOpenFile != file) {
            ws.currentlyOpenFile = file;
            ws.saved = false;
        }
    }

    setExplorerColor(color: string, usersFullName?: string) {
        let caption: string;

        if (color == null) {
            color = "transparent";
            caption = ProjectExplorerMessages.myWorkspaces();
        } else {
            caption = usersFullName;
        }

        this.fileTreeview.getNodeDiv().style.backgroundColor = color;
        this.workspaceTreeview.getNodeDiv().style.backgroundColor = color;

        this.workspaceTreeview.setCaption(caption);
    }

    async fetchAndRenderOwnWorkspaces() {
        await this.fetchAndRenderWorkspaces(this.main.user);
    }

    async fetchAndRenderWorkspaces(ae: UserData, teacherExplorer?: TeacherExplorer, pruefung: Pruefung = null) {


        await this.main.networkManager.sendUpdatesAsync();

        let request: GetWorkspacesRequest = {
            ws_userId: ae.id,
            userId: this.main.user.id
        }

        let response: GetWorkspacesResponse = await ajaxAsync("/servlet/getWorkspaces", request);

        if (response.success == true) {

            if (this.main.workspacesOwnerId == this.main.user.id && teacherExplorer != null) {
                teacherExplorer.ownWorkspaces = this.main.workspaceList.slice();
                teacherExplorer.currentOwnWorkspace = this.main.currentWorkspace;
            }

            let isTeacherAndInPruefungMode = teacherExplorer?.classPanelMode == "tests";

            if (ae.id != this.main.user.id) {

                if (isTeacherAndInPruefungMode) {
                    response.workspaces.workspaces = response.workspaces.workspaces.filter(w => w.pruefung_id == pruefung.id);
                }

            }

            this.main.workspacesOwnerId = ae.id;
            this.main.restoreWorkspaces(response.workspaces);

            if (ae.id != this.main.user.id) {
                this.main.projectExplorer.setExplorerColor("rgba(255, 0, 0, 0.2", ae.familienname + ", " + ae.rufname);
                this.main.teacherExplorer.homeButton.setVisible(true);
                Helper.showHelper("homeButtonHelperNew", this.main, jQuery(this.main.teacherExplorer.homeButton.divElement));
                this.main.networkManager.updateFrequencyInSeconds = this.main.networkManager.teacherUpdateFrequencyInSeconds;
                this.main.networkManager.secondsTillNextUpdate = this.main.networkManager.teacherUpdateFrequencyInSeconds;

                if (!isTeacherAndInPruefungMode) {
                    this.main.bottomDiv.homeworkManager.attachToWorkspaces(this.main.workspaceList);
                    this.main.bottomDiv.showHomeworkTab();
                }
            }

            if (pruefung != null) {
                this.addDatabaseButton.setVisible(false);
                this.workspaceTreeview.addFolderButton.setVisible(false);
            } else {
                this.addDatabaseButton.setVisible(true);
                this.workspaceTreeview.addFolderButton.setVisible(true);
            }
        }

    }

    getNewFile(fileData: FileData): GUIFile {
        return GUIFile.restoreFromData(this.main, fileData);
    }


}