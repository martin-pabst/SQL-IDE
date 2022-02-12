import { Main } from "../main/Main.js";
import { ajax } from "./AjaxHelper.js";
import { WorkspaceData, FileData, SendUpdatesRequest, SendUpdatesResponse, CreateOrDeleteFileOrWorkspaceRequest, CRUDResponse, UpdateUserSettingsRequest, UpdateUserSettingsResponse, DuplicateWorkspaceRequest, DuplicateWorkspaceResponse, ClassData, DistributeWorkspaceRequest, DistributeWorkspaceResponse, GetDatabaseRequest, getDatabaseResponse, GetNewStatementsRequest, GetNewStatementsResponse, AddDatabaseStatementsRequest, AddDatabaseStatementsResponse, TemplateListEntry, GetTemplateListRequest, GetTemplateListResponse, CreateWorkspaceData, GetDatabaseSettingsResponse, GetDatabaseSettingsRequest, setDatabaseSecretRequest as SetDatabaseSecretRequest, SetDatabaseSecretResponse, SetPublishedToRequest, SetPublishedToResponse } from "./Data.js";
import { Workspace } from "../workspace/Workspace.js";
import { Module } from "../compiler/parser/Module.js";
import { WDatabase } from "../workspace/WDatabase.js";
import { AccordionElement } from "../main/gui/Accordion.js";
import { CacheManager } from "./CacheManager.js";

export class NetworkManager {
    
    timerhandle: any;

    ownUpdateFrequencyInSeconds: number = 20;
    teacherUpdateFrequencyInSeconds: number = 5;

    updateFrequencyInSeconds: number = 20;
    forcedUpdateEvery: number = 2;
    secondsTillNextUpdate: number = this.updateFrequencyInSeconds;
    errorHappened: boolean = false;

    interval: any;

    constructor(private main: Main, private $updateTimerDiv: JQuery<HTMLElement>){        
        
    }

    initializeTimer() {

        let that = this;
        this.$updateTimerDiv.find('svg').attr('width', that.updateFrequencyInSeconds);

        if(this.interval != null) clearInterval(this.interval);

        let counterTillForcedUpdate: number = this.forcedUpdateEvery;

        this.interval = setInterval(()=>{
            
            if(that.main.user == null) return; // don't call server if no user is logged in

            that.secondsTillNextUpdate--;

            if(that.secondsTillNextUpdate < 0 ){
                that.secondsTillNextUpdate = that.updateFrequencyInSeconds;
                counterTillForcedUpdate--;
                let forceUpdate = counterTillForcedUpdate == 0;
                if(forceUpdate) counterTillForcedUpdate = this.forcedUpdateEvery;
                that.sendUpdates(() => {}, forceUpdate);
            }

            let $rect = this.$updateTimerDiv.find('.jo_updateTimerRect');

            $rect.attr('width', that.secondsTillNextUpdate + "px");
            
            if(that.errorHappened){
                $rect.css('fill', '#c00000');                
                this.$updateTimerDiv.attr('title',"Fehler beim letzten Speichervorgang -> Werd's wieder versuchen");
            } else {
                $rect.css('fill', '#008000');                
                this.$updateTimerDiv.attr('title',that.secondsTillNextUpdate + " Sekunden bis zum nächsten Speichern");
            }

        }, 1000);
        
    }
    
    sendUpdates(callback?: ()=>void, sendIfNothingIsDirty: boolean = false){
        
        if(this.main.user == null) return;

        this.main.projectExplorer.writeEditorTextToFile();

        let userSettings = this.main.user.settings;

        let wdList: WorkspaceData[] = [];
        let fdList: FileData[] = [];

        for(let ws of this.main.workspaceList){

            if(!ws.saved){
                wdList.push(ws.getWorkspaceData(false));
                ws.saved = true;
            }
            
            for(let m of ws.moduleStore.getModules(false)){
                if(!m.file.saved){
                    m.file.text = m.getProgramTextFromMonacoModel();
                    fdList.push(m.getFileData(ws));
                    // console.log("Save file " + m.file.name);
                    m.file.saved = true;
                }
            }
        }
        
        let request: SendUpdatesRequest = {
            workspacesWithoutFiles: wdList,
            files: fdList, 
            owner_id: this.main.workspacesOwnerId,
            userId: this.main.user.id,
            language: 1,
            currentWorkspaceId: this.main.getCurrentWorkspace()?.id,
            getModifiedWorkspaces: false
        }

        let that = this;
        if(wdList.length > 0 || fdList.length > 0 || sendIfNothingIsDirty){
            ajax('sendUpdates', request, (response: SendUpdatesResponse) => {
                that.errorHappened = !response.success;
                if(!that.errorHappened){

                    that.updateWorkspaces(request, response);

                    if(callback != null){
                        callback();
                        return;
                    }
                }
            }, () => {
                that.errorHappened = true;
            } );
        } else {
            if(callback != null){
                callback();
                return;
            }
        }
        
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


    getDatabaseSettings(workspace_id: number, callback: (response: GetDatabaseSettingsResponse)=> void){
        let request: GetDatabaseSettingsRequest = {
            workspaceId: workspace_id
        };
        ajax("getDatabaseSettings", request, (response: GetDatabaseSettingsResponse) => {
            callback(response);
        }, (message) => {alert(message)})
    }

    setNewSecret(workspace_id: number, kind: string, callback: (secret: string)=> void){
        let request: SetDatabaseSecretRequest = {
            workspaceId: workspace_id,
            secretKind: kind
        };
        ajax("setNewSecret", request, (response: SetDatabaseSecretResponse) => {
            callback(response.secret);
        }, (message) => {alert(message)})
    }

    setNameAndPublishedTo(workspace_id: number, name: string, published_to: number, callback: ()=> void){
        let request: SetPublishedToRequest = {
            workspaceId: workspace_id,
            databaseName: name,
            publishedTo: published_to
        };

        ajax("setPublishedTo", request, (response: SetPublishedToResponse) => {
            callback();
        }, (message) => {alert(message)})
    }



    sendCreateFile(m: Module, ws: Workspace, owner_id: number, callback: (error: string) => void) {

        let fd: FileData = m.getFileData(ws);
        let request: CreateOrDeleteFileOrWorkspaceRequest = {
            type: "create",
            entity: "file",
            data: fd,
            owner_id: owner_id,
            userId: this.main.user.id
        }

        ajax("createOrDeleteFileOrWorkspace", request, (response: CRUDResponse) => {
            m.file.id = response.id;
            callback(null);
        }, callback);

    }

    sendDuplicateWorkspace(ws: Workspace, callback: (error: string, workspaceData?: WorkspaceData) => void) {

        let request: DuplicateWorkspaceRequest = {
            workspace_id: ws.id,
            language: 1
        }

        ajax("duplicateWorkspace", request, (response: DuplicateWorkspaceResponse) => {
            callback(response.message, response.workspace)
        }, callback);

    }

    sendDistributeWorkspace(ws: Workspace, klasse: ClassData, student_ids: number[], callback: (error: string) => void) {

        this.sendUpdates(() => {

            let request: DistributeWorkspaceRequest = {
                workspace_id: ws.id,
                class_id: klasse?.id,
                student_ids: student_ids, 
                language: 1
            }
    
            ajax("distributeWorkspace", request, (response: DistributeWorkspaceResponse) => {
                callback(response.message)
            }, callback);
    
        }, false);

    }


    sendDeleteWorkspaceOrFile(type: "workspace" | "file", id: number, callback: (error: string) => void) {

        let request: CreateOrDeleteFileOrWorkspaceRequest = {
            type: "delete",
            entity: type,
            id: id,
            userId: this.main.user.id
        }

        ajax("createOrDeleteFileOrWorkspace", request, (response: CRUDResponse) => {
            if(response.success){
                callback(null);
            } else {
                callback("Netzwerkfehler!");
            }
        }, callback);

    }

    sendUpdateUserSettings(callback: (error: string) => void){

        let request: UpdateUserSettingsRequest = {
            settings: this.main.user.settings,
            userId: this.main.user.id,
            current_workspace_id: this.main.getCurrentWorkspace()?.id
        }

        ajax("updateUserSettings", request, (response: UpdateUserSettingsResponse) => {
            if(response.success){
                callback(null);
            } else {
                callback("Netzwerkfehler!");
            }
        }, callback);

    }


    getNewStatements(workspace: Workspace, callback: (statements: string[], firstNewStatementIndex: number) => void){
        let request: GetNewStatementsRequest = {
            workspaceId: workspace.id,
            version_before: workspace.database.version
        }

        ajax("getNewStatements", request, (response: GetNewStatementsResponse) => {
            if(response.success){
                callback(response.newStatements, response.firstNewStatementIndex);
            }
        });
    }

    AddDatabaseStatements(workspace: Workspace, statements: string[], callback: (statements_before: string[], new_version: number) => void){
        let request: AddDatabaseStatementsRequest = {
            workspaceId: workspace.id,
            version_before: workspace.database.version,
            statements: statements
        }

        ajax("addDatabaseStatements", request, (response: AddDatabaseStatementsResponse) => {
            if(response.success){
                callback(response.statements_before, response.new_version);
            }
        });
    }

    fetchDatabase(workspace: Workspace, callback: (error: string) => void){

        let cacheManager: CacheManager = new CacheManager();

        cacheManager.fetchTemplateFromCache(workspace.databaseId, (templateStatements: string) => {
            let request: GetDatabaseRequest = {
                workspaceId: workspace.id,
                templateNeeded: templateStatements == null
            }
    
            ajax("getDatabase", request, (response: getDatabaseResponse)=> {
                if(response.success){
                    workspace.database = WDatabase.fromDatabaseData(response.database)
                    if(templateStatements != null){
                        workspace.database.templateStatements = templateStatements
                    } else {
                        if(workspace.database.templateStatements != null){
                            cacheManager.saveTemplateToCache(workspace.databaseId, workspace.database.templateStatements);
                        }
                    }
                    callback(null);
                } else {
                    callback("Netzwerkfehler!");
                }
            }, callback )
        });


    }

    fetchTemplateList(callback: (templateList: TemplateListEntry[]) => void){
        let request: GetTemplateListRequest = {user_id: this.main.user.id}

        ajax("getTemplateList", request, (response: GetTemplateListResponse)=> {
            if(response.success){
                callback(response.templateList);
            } else {
                callback([]);
            }
        }, (message) => {
            alert(message);
            callback([]);
        } )

    }

    updateWorkspaces(sendUpdatesRequest: SendUpdatesRequest, sendUpdatesResponse: SendUpdatesResponse){

        let idToRemoteWorkspaceDataMap: Map<number, WorkspaceData> = new Map();

        let fileIdsSended = [];
        sendUpdatesRequest.files.forEach(file => fileIdsSended.push(file.id));

        sendUpdatesResponse.workspaces.workspaces.forEach(wd => idToRemoteWorkspaceDataMap.set(wd.id, wd));

        let newWorkspaceNames: string[] = [];

        for (let remoteWorkspace of sendUpdatesResponse.workspaces.workspaces) {

            let localWorkspaces = this.main.workspaceList.filter(ws => ws.id == remoteWorkspace.id);

            // Did student get a workspace from his/her teacher?
            if (localWorkspaces.length == 0) {
                newWorkspaceNames.push(remoteWorkspace.name);
                this.createNewWorkspaceFromWorkspaceData(remoteWorkspace);
            }

        }



        for(let workspace of this.main.workspaceList){
            let remoteWorkspace: WorkspaceData = idToRemoteWorkspaceDataMap.get(workspace.id);
            if(remoteWorkspace != null){
                let idToRemoteFileDataMap: Map<number, FileData> = new Map();
                remoteWorkspace.files.forEach(fd => idToRemoteFileDataMap.set(fd.id, fd));
                
                let idToModuleMap: Map<number, Module> = new Map();
                // update/delete files if necessary
                for(let module of workspace.moduleStore.getModules(false)){
                    let fileId = module.file.id;
                    idToModuleMap.set(fileId, module);
                    let remoteFileData = idToRemoteFileDataMap.get(fileId);
                    if(remoteFileData == null){
                        this.main.projectExplorer.fileListPanel.removeElement(module);
                        this.main.currentWorkspace.moduleStore.removeModule(module);
                    } else if(remoteFileData.version > module.file.version){
                        if(fileIdsSended.indexOf(fileId) < 0 || remoteFileData.forceUpdate){
                            module.file.text = remoteFileData.text;
                            module.model.setValue(remoteFileData.text);

                            module.file.saved = true;
                            module.lastSavedVersionId = module.model.getAlternativeVersionId()
                        }
                        module.file.version = remoteFileData.version;
                    }
                }

                // add files if necessary
                for(let remoteFile of remoteWorkspace.files){
                    if(idToModuleMap.get(remoteFile.id) == null){
                        this.createFile(workspace, remoteFile);
                    }
                }
            }
        }        

        if(newWorkspaceNames.length > 0){
            let message: string = newWorkspaceNames.length > 1 ? "Folgende Workspaces hat Deine Lehrkraft Dir gesendet: " : "Folgenden Workspace hat Deine Lehrkraft Dir gesendet: ";
            message += newWorkspaceNames.join(", ");
            alert(message);
        }

        this.main.projectExplorer.workspaceListPanel.sortElements();
        this.main.projectExplorer.fileListPanel.sortElements();

    }

    public createNewWorkspaceFromWorkspaceData(remoteWorkspace: WorkspaceData, withSort: boolean = false) {
        let w = this.main.createNewWorkspace(remoteWorkspace.name, remoteWorkspace.owner_id);
        w.id = remoteWorkspace.id;
        w.sql_history = "";
        w.path = remoteWorkspace.path;
        w.isFolder = remoteWorkspace.isFolder;

        this.main.workspaceList.push(w);
        let path = remoteWorkspace.path.split("/");
        if (path.length == 1 && path[0] == "") path = [];

        let panelElement: AccordionElement = {
            name: remoteWorkspace.name,
            externalElement: w,
            iconClass: "workspace",
            isFolder: remoteWorkspace.isFolder,
            path: path
        };

        this.main.projectExplorer.workspaceListPanel.addElement(panelElement, true);
        w.panelElement = panelElement;

        for (let fileData of remoteWorkspace.files) {
            this.createFile(w, fileData);
        }

        if(withSort){
            this.main.projectExplorer.workspaceListPanel.sortElements();
            this.main.projectExplorer.fileListPanel.sortElements();
        }
    }

    createFile(workspace: Workspace, remoteFile: FileData) {
        let ae: any = null; //AccordionElement
        if (workspace == this.main.currentWorkspace) {
            ae = {
                name: remoteFile.name,
                externalElement: null
            }

            this.main.projectExplorer.fileListPanel.addElement(ae, true);
        }

        let f: any = { // File
            id: remoteFile.id,
            name: remoteFile.name,
            dirty: false,
            saved: true,
            text: remoteFile.text,
            version: remoteFile.version,
            identical_to_repository_version: true,
            workspace_id: workspace.id,
            panelElement: ae
        };
        let m = this.main.projectExplorer.getNewModule(f); //new Module(f, this.main);
        if (ae != null) ae.externalElement = m;
        let modulStore = workspace.moduleStore;
        modulStore.putModule(m);

    }



}