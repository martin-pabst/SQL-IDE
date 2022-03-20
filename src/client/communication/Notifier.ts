import { Module } from "../compiler/parser/Module.js";
import { ResultsetPresenter } from "../main/gui/ResultsetPresenter.js";
import { Main } from "../main/Main.js";
import { WDatabase } from "../workspace/WDatabase.js";
import { Workspace } from "../workspace/Workspace.js";
import { ajax } from "./AjaxHelper.js";
import { GetNewStatementsRequest, GetNewStatementsResponse, GetWebSocketTokenResponse, LongPollingListenerResponse, RegisterLongPollingListenerRequest, WebSocketRequestConnect, WebSocketRequestDisconnect, WebSocketRequestGetNewStatements, WebSocketResponse } from "./Data.js";

export class Notifier {

    connection: WebSocket;
    isOpen: boolean = false;
    workspace: Workspace;
    database: WDatabase;

    constructor(public main: Main) {
        // Polling is not used. 
        // We try long polling (see below!)

        // this.startPolling();
    }

    connect(workspace: Workspace) {

        let that = this;
        this.workspace = workspace;
        this.database = workspace.database;

        if (this.isOpen) {
            this.connection.close();
        }

        ajax('getWebSocketToken', {}, (response: GetWebSocketTokenResponse) => {

            let url: string = (window.location.protocol.startsWith("https") ? "wss://" : "ws://") + window.location.host + "/servlet/websocket";
            this.connection = new WebSocket(url);

            this.connection.onerror = (error: Event) => { this.onError(error); }
            this.connection.onclose = (event: CloseEvent) => { this.onClose(event); }
            this.connection.onmessage = (event: MessageEvent) => { this.onMessage(event); }

            this.connection.onopen = (event: Event) => {
                let request: WebSocketRequestConnect = {
                    command: 1,
                    token: response.token,
                    workspaceId: workspace.id,
                    databaseId: workspace.database.id,
                    databaseVersion: workspace.database.version
                }

                this.isOpen = true;
                this.sendIntern(JSON.stringify(request));
                this.onOpen();

            }

            setTimeout(() => {
                that.startLongPolling()
            }, 2000);

        });

    }

    unsentMessages: string[] = [];
    sendIntern(message: string) {

        if (!this.isOpen) {
            this.unsentMessages.push(message);
        } else {
            try {
                this.connection.send(message);
            } catch (exception) {
                console.log(exception);
            }
        }
    }

    onClose(event: CloseEvent) {
        this.isOpen = false;
    }


    disconnect() {
        let message: WebSocketRequestDisconnect = {
            command: 4
        };
        this.sendIntern(JSON.stringify(message));
        this.connection.close();
        this.workspace = null;
    }

    onMessage(event: MessageEvent) {

        let that = this;
        let response: WebSocketResponse = JSON.parse(event.data);
        if (response.command == undefined) return;

        switch (response.command) {
            case 2: // SendStatements
                that.executeNewStatements(response.newStatements, response.firstNewStatementIndex, () => {
                    let request: WebSocketRequestGetNewStatements = { command: 2, databaseVersion: that.database.version };
                    that.sendIntern(JSON.stringify(request));
                })
                break;
            case 3: // server initiated disconnect
                this.isOpen = false;
                this.database = null;
                this.workspace = null;
                break;
            case 4: // keep alive
                break;
            case 5: // rollback
                if (this.database.version > response.new_version) {
                    this.main.getHistoryViewer().rollbackLocal();
                }
                break;
        }
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


    onError(error: Event) {
    }

    onOpen() {
        this.isOpen = true;
        if (this.unsentMessages.length > 0) {
            this.unsentMessages.forEach(m => this.sendIntern(m));
            this.unsentMessages = [];
        }
    }

    /**
     * Polling is not used. 
     * We try long polling!
     * (see below)
     */
    isPolling: boolean = false;
    startPolling() {
        if (this.isPolling) return;
        this.isPolling = true;

        this.poll();

    }

    /**
     * Polling is not used.
     * We try long polling!
     * (see below)
     */
    counter: number = 0;
    poll() {
        let that = this;
        setTimeout(() => {
            that.poll();
        }, 6000);

        if (!that.isOpen && that.workspace != null) {
            this.getNewStatementsHttp();

            // retry connecting:
            that.counter++;
            if (that.counter == 10) {
                that.counter = 0;
                that.connect(that.workspace);
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

            that.executeNewStatements(response.newStatements, response.firstNewStatementIndex, () => {
                that.getNewStatementsHttp();
            })

        });

    }

    isLongPolling: boolean = false;
    startLongPolling() {
        if (this.isLongPolling) return;
        this.isLongPolling = true;

        this.longPoll();

    }

    longPollCounter: number = 0;
    longPoll() {
        let that = this;

        if (!that.isOpen && that.workspace != null) {
            let request: RegisterLongPollingListenerRequest = {
                workspaceId: that.workspace.id
            }

            $.ajax({
                type: 'POST',
                async: true,
                data: JSON.stringify(request),
                contentType: 'application/json',
                url: "servlet/registerLongPollingListener",
                success: function (resp: string) {
                    let response: LongPollingListenerResponse = JSON.parse(resp);
                    if (!that.isOpen && that.workspace?.id == request.workspaceId && response.success) {
                        that.executeNewStatements(response.newStatements, response.firstNewStatementIndex, () => {
                            that.getNewStatementsHttp();
                        })

                        let timeout: number = 1000;
                        // retry connecting:
                        that.longPollCounter++;
                        if (that.longPollCounter == 10) {
                            that.longPollCounter = 0;
                            that.connect(that.workspace);
                            timeout = 2000;
                        }

                        setTimeout(() => {
                            that.longPoll();
                        }, 2000);
                    }
                },
                error: function (jqXHR, message) {
                    if (!that.isOpen && that.workspace?.id == request.workspaceId) {
                        setTimeout(() => {
                            that.longPoll();
                        }, 2000);
                    }
                }
            });

        } else {
            setTimeout(() => {
                that.longPoll();
            }, 5000);
        }

    }

}