import { Main } from "../main/Main.js";
import { ajax, ajaxAsync, csrfToken, PerformanceCollector } from "./AjaxHelper.js";
import { WorkspaceData, FileData, SendUpdatesRequest, SendUpdatesResponse, CreateOrDeleteFileOrWorkspaceRequest, CRUDResponse, UpdateGuiStateRequest, UpdateGuiStateResponse, DuplicateWorkspaceRequest, DuplicateWorkspaceResponse, ClassData, DistributeWorkspaceRequest, DistributeWorkspaceResponse, GetDatabaseRequest, getDatabaseResponse, GetNewStatementsRequest, GetNewStatementsResponse, AddDatabaseStatementsRequest, AddDatabaseStatementsResponse, TemplateListEntry, GetTemplateListRequest, GetTemplateListResponse, GetDatabaseSettingsResponse, GetDatabaseSettingsRequest, setDatabaseSecretRequest as SetDatabaseSecretRequest, SetDatabaseSecretResponse, SetPublishedToRequest, SetPublishedToResponse, GetTemplateRequest, RollbackRequest, RollbackResponse, type UpdateFileOrderRequest, type BaseResponse, type UpdateWorkspaceOrderRequest, type CreateWorkspaceData, type MoveFileRequest, type CheckIfPruefungIsRunningResponse } from "./Data.js";
import { Workspace } from "../workspace/Workspace.js";
import { Module } from "../compiler/parser/Module.js";
import { WDatabase } from "../workspace/WDatabase.js";
import { AccordionElement } from "../main/gui/Accordion.js";
import { CacheManager } from "./CacheManager.js";
import { TemplateUploader } from "../tools/TemplateUploader.js";
import { FileTool } from "../tools/FileTool.js";
import { PushClientManager } from "./pushclient/PushClientManager.js";
import pako from 'pako'
import jQuery from "jquery";
import type { GUIFile } from "../compiler/parser/GUIFile.js";
import { FileTypeManager } from "../compiler/parser/FileTypeManager.js";

export class NetworkManager {

    timerhandle: any;

    ownUpdateFrequencyInSeconds: number = 25;
    teacherUpdateFrequencyInSeconds: number = 5;

    updateFrequencyInSeconds: number = 25;
    forcedUpdateEvery: number = 25;
    forcedUpdatesInARow: number = 0;

    secondsTillNextUpdate: number = this.updateFrequencyInSeconds;
    errorHappened: boolean = false;

    interval: any;

    counterTillForcedUpdate: number;

    constructor(private main: Main, private $updateTimerDiv: JQuery<HTMLElement>) {

    }

    async initializeTimer() {

        let that = this;
        this.$updateTimerDiv.find('svg').attr('width', that.updateFrequencyInSeconds);

        if (this.interval != null) clearInterval(this.interval);

        this.counterTillForcedUpdate = this.forcedUpdateEvery;

        this.interval = setInterval(() => {

            if (that.main.user == null) return; // don't call server if no user is logged in

            that.secondsTillNextUpdate--;

            if (that.secondsTillNextUpdate < 0) {
                that.secondsTillNextUpdate = that.updateFrequencyInSeconds;
                that.counterTillForcedUpdate--;
                let doForceUpdate = that.counterTillForcedUpdate == 0;
                if (doForceUpdate) {
                    this.forcedUpdatesInARow++;
                    that.counterTillForcedUpdate = this.forcedUpdateEvery;
                    if (this.forcedUpdatesInARow > 50) {
                        that.counterTillForcedUpdate = this.forcedUpdateEvery * 10;
                    }
                }

                that.sendUpdatesAsync(doForceUpdate, false);

            }

            let $rect = this.$updateTimerDiv.find('.jo_updateTimerRect');

            $rect.attr('width', that.secondsTillNextUpdate + "px");

            if (that.errorHappened) {
                $rect.css('fill', '#c00000');
                this.$updateTimerDiv.attr('title', "Fehler beim letzten Speichervorgang -> Werd's wieder versuchen");
            } else {
                $rect.css('fill', '#008000');
                this.$updateTimerDiv.attr('title', that.secondsTillNextUpdate + " Sekunden bis zum nächsten Speichern");
            }

            PerformanceCollector.sendDataToServer();

        }, 1000);

    }


    /**
     * TODO: Ungeprüft übernommen von der Online-IDE
     */
    async sendUpdatesAsync(sendIfNothingIsDirty: boolean = false, sendBeacon: boolean = false, alertIfNewWorkspacesFound: boolean = false): Promise<boolean> {

        if (this.main.user == null || this.main.user.is_testuser) {
            return true;
        }

        let userSettings = this.main.user.sql_gui_state;

        if (this.main.gui_state_dirty) {

            this.main.gui_state_dirty = false;
            this.sendUpdateGuiState(sendBeacon);
            this.forcedUpdatesInARow = 0;
        }

        let wdList: WorkspaceData[] = [];
        let fdList: FileData[] = [];

        for (let ws of this.main.workspaceList) {

            if (!ws.saved) {
                wdList.push(ws.getWorkspaceData(false));
                ws.saved = true;
                this.forcedUpdatesInARow = 0;
            }

            for (let file of ws.getFiles()) {
                if (!file.isSaved()) {
                    this.forcedUpdatesInARow = 0;
                    fdList.push(file.getFileData(ws));
                    // console.log("Save file " + file.name);
                    file.setSaved(true);
                }
            }
        }

        let request: SendUpdatesRequest = {
            workspacesWithoutFiles: wdList,
            files: fdList,
            owner_id: this.main.workspacesOwnerId,
            userId: this.main.user.id,
            currentWorkspaceId: this.main.currentWorkspace?.pruefung_id == null ? this.main.currentWorkspace?.id : null,
            getModifiedWorkspaces: sendIfNothingIsDirty
        }

        let that = this;
        if (wdList.length > 0 || fdList.length > 0 || sendIfNothingIsDirty || this.errorHappened) {

            if (sendBeacon) {
                // If user closes browser-tab or even browser then only sendBeacon works to send data.
                navigator.sendBeacon("sendUpdates", JSON.stringify(request));
            } else {

                try {
                    let response: SendUpdatesResponse = await ajaxAsync('servlet/sendUpdates', request);
                    that.errorHappened = !response.success;
                    if (!that.errorHappened) {

                        if (response.workspaces != null) {
                            that.updateWorkspaces(request, response, alertIfNewWorkspacesFound);
                        }


                        /**
                         * 13.06.2026: filesToForceUpdate was used to to update student's file if
                         * a teacher was editing them concurrently.
                         */
                        // if (response.filesToForceUpdate != null) {
                        //     that.updateFiles(response.filesToForceUpdate);
                        // }

                        // if(response.activePruefung != null){
                        //     that.main.pruefungManagerForStudents.startPruefung(response.activePruefung);
                        // }

                        return true;

                    } else {
                        let message: string = "Fehler beim Senden der Daten: ";
                        if (response["message"]) message += response["message"];
                        console.log(message);
                        return false;
                    }
                } catch (message) {
                    that.errorHappened = true;
                    console.log("Fehler beim Ajax-call: " + message)
                    return;
                }
            }
        }

        return true;
    }

    initializePushClientManager() {
        PushClientManager.getInstance().subscribe("doFileUpdate", (data) => {
            this.sendUpdatesAsync(true, false, true);
        })
    }

    checkIfTestIsRunning(){
        ajaxAsync("servlet/checkIfPruefungIsRunning", {}).then((resp: CheckIfPruefungIsRunningResponse) => {
            if(resp && resp.runningPruefung){
                this.main.pruefungManagerForStudents.startPruefung(resp.runningPruefung);
            }
        })
    }

    savePruefungWorkspace(pruefungWorkspace: Workspace){

        let request: SendUpdatesRequest = {
            workspacesWithoutFiles: [pruefungWorkspace.getWorkspaceData(false)],
            files: pruefungWorkspace.getFiles().map(file => file.getFileData(pruefungWorkspace)),
            owner_id: this.main.workspacesOwnerId,
            userId: this.main.user.id,
            currentWorkspaceId: this.main.currentWorkspace?.pruefung_id == null ? this.main.currentWorkspace?.id : null,
            getModifiedWorkspaces: false
        }

        ajaxAsync('servlet/sendUpdates', request);

    }

    sendCreateWorkspace(wd: CreateWorkspaceData, owner_id: number, callback: (error: string) => void) {

        if (this.main.user.is_testuser) {
            wd.id = Math.round(Math.random() * 10000000);
            callback(null);
            return;
        }

        let request: CreateOrDeleteFileOrWorkspaceRequest = {
            type: "create",
            entity: "workspace",
            data: wd,
            owner_id: owner_id,
            userId: this.main.user.id
        }

        ajax("createOrDeleteFileOrWorkspace", request, (response: CRUDResponse) => {
            wd.id = response.id;
            callback(null);
        }, callback);

    }


    getDatabaseSettings(workspace_id: number, callback: (response: GetDatabaseSettingsResponse) => void) {
        let request: GetDatabaseSettingsRequest = {
            workspaceId: workspace_id
        };
        ajax("getDatabaseSettings", request, (response: GetDatabaseSettingsResponse) => {
            callback(response);
        }, (message) => { alert(message) })
    }

    setNewSecret(workspace_id: number, kind: string, callback: (secret: string) => void) {
        let request: SetDatabaseSecretRequest = {
            workspaceId: workspace_id,
            secretKind: kind
        };
        ajax("setNewSecret", request, (response: SetDatabaseSecretResponse) => {
            callback(response.secret);
        }, (message) => { alert(message) })
    }

    setNameAndPublishedTo(workspace_id: number, name: string, published_to: number, description: string, callback: () => void) {
        let request: SetPublishedToRequest = {
            workspaceId: workspace_id,
            databaseName: name,
            publishedTo: published_to,
            description: description
        };

        ajax("setPublishedTo", request, (response: SetPublishedToResponse) => {
            callback();
        }, (message) => { alert(message) })
    }



    async sendCreateFile(f: GUIFile, ws: Workspace, owner_id: number): Promise<boolean> {

        if (this.main.user.is_testuser) {
            f.id = Math.round(Math.random() * 10000000);
            return false;
        }


        let fd: FileData = f.getFileData(ws);
        let request: CreateOrDeleteFileOrWorkspaceRequest = {
            type: "create",
            entity: "file",
            data: fd,
            owner_id: owner_id,
            userId: this.main.user.id
        }

        let response: CRUDResponse = await ajaxAsync("servlet/createOrDeleteFileOrWorkspace", request);
        if (response.success) {
            f.id = response.id;
            f.setSaved(true);
        }

        return response.success;

    }

    async sendDuplicateWorkspace(ws: Workspace): Promise<DuplicateWorkspaceResponse> {

        if (this.main.user.is_testuser) {
            return { message: "Diese Aktion ist für den Testuser nicht möglich.", workspace: null };
        }


        let request: DuplicateWorkspaceRequest = {
            workspace_id: ws.id
        }

        return await ajaxAsync("/servlet/duplicateWorkspace", request);

    }

    sendDistributeWorkspace(ws: Workspace, klasse: ClassData, student_ids: number[], callback: (error: string) => void) {

        let callbackAfterSettingWorkspaceActive = () => {

            new TemplateUploader().uploadCurrentDatabase(ws.id, this.main, null,
                "distributeWorkspace",
                (response) => {

                    this.sendUpdatesAsync(false).then(() => {

                        let request: DistributeWorkspaceRequest = {
                            workspace_id: ws.id,
                            database_as_template_id: response.newTemplateId,
                            class_id: klasse?.id,
                            student_ids: student_ids
                        }

                        ajax("distributeWorkspace", request, (response: DistributeWorkspaceResponse) => {
                            callback(response.message)
                        }, callback);

                    });
                });

        }

        this.main.projectExplorer.setWorkspaceActive(ws, false, false, callbackAfterSettingWorkspaceActive);

    }


    async sendDeleteWorkspaceOrFileAsync(type: "workspace" | "file", ids: number[]): Promise<boolean> {

        if (this.main.user.is_testuser) {
            return true;
        }

        let request: CreateOrDeleteFileOrWorkspaceRequest = {
            type: "delete",
            entity: type,
            ids: ids,
            userId: this.main.user.id
        }

        let response: CRUDResponse =
            await ajaxAsync("/servlet/createOrDeleteFileOrWorkspace", request);

        return response.success;
    }

    async sendUpdateGuiState(sendBeacon: boolean = false): Promise<string> {

        if (this.main.user.is_testuser) {
            return;
        }

        let request: UpdateGuiStateRequest = {
            gui_state: this.main.user.sql_gui_state,
            userId: this.main.user.id
        }

        if (sendBeacon) {
            navigator.sendBeacon("servlet/updateGuiState", JSON.stringify(request));
        } else {
            let response: UpdateGuiStateResponse = await ajaxAsync("servlet/updateGuiState", request);
            if (response.success) {
                return null;
            } else {
                return "Netzwerkfehler!";
            }

        }

    }

    async sendUpdateFileOrder(files: GUIFile[]): Promise<boolean> {
        let request: UpdateFileOrderRequest = {
            fileOrderList: files.map(f => ({ fileId: f.id, order: f.sorting_order }))
        }

        let response: BaseResponse = await ajaxAsync('servlet/updateFileOrder', request);

        return response.success;
    }

    async sendUpdateWorkspaceOrder(workspaces: Workspace[]): Promise<boolean> {
        let request: UpdateWorkspaceOrderRequest = {
            workspaceOrderList: workspaces.map(ws => ({ workspaceId: ws.id, order: ws.sorting_order }))
        }

        let response: BaseResponse = await ajaxAsync('servlet/updateWorkspaceOrder', request);

        return response.success;
    }



    getNewStatements(workspace: Workspace, callback: (statements: string[], firstNewStatementIndex: number) => void) {
        let request: GetNewStatementsRequest = {
            workspaceId: workspace.id,
            version_before: workspace.database.version
        }

        ajax("getNewStatements", request, (response: GetNewStatementsResponse) => {
            if (response.success) {
                callback(response.newStatements, response.firstNewStatementIndex);
            }
        });
    }

    AddDatabaseStatements(workspace: Workspace, statements: string[], callback: (statements_before: string[], new_version: number) => void) {
        let request: AddDatabaseStatementsRequest = {
            workspaceId: workspace.id,
            version_before: workspace.database.version,
            statements: statements
        }

        ajax("addDatabaseStatements", request, (response: AddDatabaseStatementsResponse) => {
            if (response.success) {
                callback(response.statements_before, response.new_version);
            }
        });
    }

    fetchDatabase(workspace: Workspace, callback: (error: string) => void) {

        let cacheManager: CacheManager = new CacheManager();

        let request: GetDatabaseRequest = {
            workspaceId: workspace.id
        }

        ajax("getDatabase", request, (response: getDatabaseResponse) => {
            if (response.success) {

                workspace.database = WDatabase.fromDatabaseData(response.database, response.version)
                workspace.databaseId = workspace.database.id;

                if (workspace.database.based_on_template_id == null) {
                    callback(null);
                    return
                }

                cacheManager.fetchTemplateFromCache(workspace.database.based_on_template_id, (templateDump: Uint8Array) => {

                    if (FileTool.isZipfile(templateDump)) {
                        try {
                            workspace.database.templateDump = pako.inflate(templateDump);
                        } catch (err) {
                            console.log(err);
                            console.log("Dump seems not to be compressed...");
                            workspace.database.templateDump = templateDump;
                        }
                    } else {
                        workspace.database.templateDump = templateDump;
                    }

                    if (FileTool.isSqLiteFile(workspace.database.templateDump)) {
                        callback(null);
                        return;
                    } else {
                        this.fetchTemplate(workspace.id, (template, error) => {
                            if (template != null) {
                                cacheManager.saveTemplateToCache(workspace.database.based_on_template_id, template);
                                workspace.database.templateDump = pako.inflate(template);
                                callback(null);
                                return;
                            } else {
                                workspace.database.templateDump = null;
                                callback(error);
                                return;
                            }
                        })
                    }
                })
            } else {
                callback("Netzwerkfehler!");
            }
        }, (errormessage: string) => {
            callback("Netzwerkfehler: " + errormessage);
        });


    }


    fetchTemplate(workspaceId: number, callback: (template: Uint8Array<ArrayBuffer>, error?: string) => void) {
        let request: GetTemplateRequest = {
            workspaceId: workspaceId
        }

        let headers: { [key: string]: string; } = {};
        if (csrfToken != null) headers = { "x-token-pm": csrfToken };

        jQuery.ajax({
            type: 'POST',
            async: true,
            data: JSON.stringify(request),
            contentType: 'application/json',
            url: "servlet/getTemplate",
            headers: headers,
            xhrFields: { responseType: 'arraybuffer' },
            success: function (response: any) {
                callback(new Uint8Array(response));
            },
            error: function (jqXHR, message) {
                callback(null, "Konnte das Template nicht laden.");
            }
        });

    }

    fetchTemplateList(callback: (templateList: TemplateListEntry[]) => void) {
        let request: GetTemplateListRequest = { user_id: this.main.user.id }

        ajax("getTemplateList", request, (response: GetTemplateListResponse) => {
            if (response.success) {
                callback(response.templateList);
            } else {
                callback([]);
            }
        }, (message) => {
            alert(message);
            callback([]);
        })

    }

    private updateWorkspaces(sendUpdatesRequest: SendUpdatesRequest, sendUpdatesResponse: SendUpdatesResponse, alertIfNewWorkspacesFound: boolean = false) {

        let idToRemoteWorkspaceDataMap: Map<number, WorkspaceData> = new Map();

        let fileIdsSended = [];
        sendUpdatesRequest.files.forEach(file => fileIdsSended.push(file.id));

        sendUpdatesResponse.workspaces.workspaces.forEach(wd => idToRemoteWorkspaceDataMap.set(wd.id, wd));

        let newWorkspaceNames: string[] = [];

        for (let remoteWorkspace of sendUpdatesResponse.workspaces.workspaces) {

            let localWorkspaces = this.main.workspaceList.filter(ws => ws.id == remoteWorkspace.id);

            // Did student get a workspace from his/her teacher?
            if (localWorkspaces.length == 0) {
                if (remoteWorkspace.pruefung_id == null) {
                    newWorkspaceNames.push(remoteWorkspace.name);
                }
                this.createNewWorkspaceFromWorkspaceData(remoteWorkspace);
            }

        }

        for (let workspace of this.main.workspaceList) {
            let remoteWorkspace: WorkspaceData = idToRemoteWorkspaceDataMap.get(workspace.id);
            if (remoteWorkspace != null) {
                let idToRemoteFileDataMap: Map<number, FileData> = new Map();
                remoteWorkspace.files.forEach(fd => idToRemoteFileDataMap.set(fd.id, fd));

                let idToFileMap: Map<number, GUIFile> = new Map();
                // update/delete files if necessary
                for (let file of workspace.getFiles()) {
                    let fileId = file.id;
                    idToFileMap.set(fileId, file);
                    let remoteFileData = idToRemoteFileDataMap.get(fileId);
                    if (remoteFileData == null) {
                        this.main.projectExplorer.fileTreeview.removeElementAndItsFolderContents(file);
                        this.main.getCurrentWorkspace()?.removeFile(file);
                    } else {
                        if (fileIdsSended.indexOf(fileId) < 0 && file.getText() != remoteFileData.text) {
                            file.setText(remoteFileData.text);
                            file.setSaved(true);
                        }
                        file.remote_version = remoteFileData.version;
                    }
                }


                // add files if necessary
                for (let remoteFile of remoteWorkspace.files) {
                    if (idToFileMap.get(remoteFile.id) == null) {
                        this.createFile(workspace, remoteFile);
                    }
                }
            }
        }

        if (newWorkspaceNames.length > 0 && alertIfNewWorkspacesFound) {
            let message: string = newWorkspaceNames.length > 1 ? "Folgende Workspaces hat Deine Lehrkraft Dir gesendet: " : "Folgenden Workspace hat Deine Lehrkraft Dir gesendet: ";
            message += newWorkspaceNames.join(", ");
            alert(message);
        }

        this.main.projectExplorer.workspaceTreeview.sort();
        this.main.projectExplorer.fileTreeview.sort();

    }

    public createNewWorkspaceFromWorkspaceData(remoteWorkspace: WorkspaceData, withSort: boolean = false): Workspace {

        let w = this.main.restoreWorkspaceFromData(remoteWorkspace);

        this.main.workspaceList.push(w);

        let iconClass = "img_database-dark";
        let node = this.main.projectExplorer.workspaceTreeview.addNode(w.isFolder,w.name,
            iconClass, w
         )
         // TODO: node.readonly = w.readonly

        if (withSort) {
            this.main.projectExplorer.workspaceTreeview.sort();
        }
        return w;
    }

    private createFile(workspace: Workspace, remoteFile: FileData) {
        let f = this.main.projectExplorer.getNewFile(remoteFile); //new Module(f, this.main);

        let ae: any = null; //AccordionElement
        if (workspace == this.main.getCurrentWorkspace()) {

            let iconClass = FileTypeManager.filenameToFileType(f.name).iconclass;
            
            this.main.projectExplorer.fileTreeview.addNode(false, f.name, iconClass, f)

        }

        workspace.addFile(f);

    }

    rollback(callback: (error: string, rollbackLocalNeeded: boolean) => void) {
        let workspace = this.main.currentWorkspace;
        let request: RollbackRequest = { workspaceId: workspace.id, version: workspace.database.version }

        ajax("rollback", request, (response: RollbackResponse) => {
            if (response.success) {

                callback(null, workspace.database.version > response.new_version);
            } else {
                alert(response.message);
                callback(response.message, false);
            }
        }, (message) => {
            alert(message);
            callback(message, false);
        })

    }

    async moveFile(file_id: number, destination_workspace_id: number) {
        let request: MoveFileRequest = {
            file_id: file_id,
            destination_workspace_id: destination_workspace_id
        }
        let response = await ajaxAsync("servlet/moveFile", request);
        return response.success;
    }



}