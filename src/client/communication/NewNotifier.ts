import { Module } from "../compiler/parser/Module.js";
import { ResultsetPresenter } from "../main/gui/ResultsetPresenter.js";
import { Main } from "../main/Main.js";
import { WDatabase } from "../workspace/WDatabase.js";
import { Workspace } from "../workspace/Workspace.js";
import { ajax, ajaxAsync, csrfToken } from "./AjaxHelper.js";
import { DatabaseChangedSSEMessage, GetNewStatementsRequest, GetNewStatementsResponse, RegisterDatabaseSSEListenerRequest } from "./Data.js";
import jQuery from "jquery";
import { SSEManager } from "./SSEManager.js";

export class NewNotifier {

    workspace: Workspace;
    database: WDatabase;

    constructor(public main: Main) {

    }

    async connect(workspace: Workspace) {

        if(this.workspace != null){
            let unregisterRequest: RegisterDatabaseSSEListenerRequest = { workspaceId: this.workspace.id, registerOrUnregister: "unregister" }
            await ajaxAsync("servlet/registerDatabaseSSEListener", unregisterRequest);
        }

        this.workspace = workspace;
        
        if(workspace == null){
            SSEManager.unsubscribe("onOpen");
            return;
        } 
        
        this.database = workspace.database;

        let request: RegisterDatabaseSSEListenerRequest = { workspaceId: workspace.id, registerOrUnregister: "register" }
        ajaxAsync("servlet/registerDatabaseSSEListener", request);

        SSEManager.subscribe("broadcastDatabaseChange", (data: DatabaseChangedSSEMessage) => {
            if(data.databaseId == this.workspace.databaseId){
                if (data.rollbackToVersion != null) {
                    this.main.getHistoryViewer().rollbackLocal(data.rollbackToVersion);
                } else {
                    this.executeNewStatements(data.newStatements, data.firstNewStatementIndex, () => {
                        this.getNewStatementsHttp();
                    })
                }
            } else {
                request.registerOrUnregister = "unregister";
                ajaxAsync("servlet/registerDatabaseSSEListener", request);
                SSEManager.unsubscribe("onOpen");
            }
        })

        SSEManager.subscribe("onOpen", () => {            
            request.registerOrUnregister = "register";
            ajaxAsync("servlet/registerDatabaseSSEListener", request);
        })
        

    }

    executeNewStatements(newStatements: string[], firstNewStatementIndex: number, callbackIfTooFewStatements: () => void, callbackIfDone: () => void = () => { }, doRefreshDatabaseExplorer: boolean = true) {
        if (this.database == null) return;
        let that = this;
        let delta = firstNewStatementIndex - (this.database.version + 1);
        if (delta > 0) {
            callbackIfTooFewStatements();
            callbackIfDone();
            return;
        } else {
            if (delta < 0) {
                newStatements.splice(0, -delta);
                firstNewStatementIndex -= delta;
            }
            let statements = newStatements;
            if (statements.length > 0) {
                this.main.resultsetPresenter.executeStatementsString(statements, 0, () => {
                    that.main.getHistoryViewer().appendStatements(statements);
                    that.database.statements = that.database.statements.concat(statements)
                    that.database.version = firstNewStatementIndex + newStatements.length - 1;
                    if (doRefreshDatabaseExplorer) {
                        that.main.databaseExplorer.refresh();
                    }
                    callbackIfDone();
                })
            } else {
                callbackIfDone();
            }
        }

    }

    getNewStatementsHttp() {
        let that = this;
        if (this.workspace == null || this.database == null) return;

        let request: GetNewStatementsRequest = {
            workspaceId: this.workspace.id,
            version_before: this.workspace.database.version
        }

        ajax('getNewStatements', request, (response: GetNewStatementsResponse) => {

            if(response.rollbackToVersion != null){
                that.main.getHistoryViewer().rollbackLocal(response.rollbackToVersion);
            } else {
                that.executeNewStatements(response.newStatements, response.firstNewStatementIndex, () => {
                    that.getNewStatementsHttp();
                })
            }

        });

    }

}