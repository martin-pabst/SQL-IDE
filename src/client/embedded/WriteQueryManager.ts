import { SQLStatement } from "../compiler/parser/Parser.js";
import { WriteQueryListener } from "../main/gui/ResultsetPresenter.js";
import { DatabaseTool } from "../sqljs-worker/DatabaseTools.js";
import { EmbeddedIndexedDB } from "./EmbeddedIndexedDB.js";
import { MainEmbedded } from "./MainEmbedded.js";


export class WriteQueryManager implements WriteQueryListener {

    indexedDB: EmbeddedIndexedDB;
    databaseTool: DatabaseTool;

    statementsToExecute: string[] = [];

    writtenStatements: string[] = [];

    statementsToWrite: string[] = [];


    constructor(private main: MainEmbedded, private databaseIdentifier: string) {

    }

    indexedDBReady(indexedDB: EmbeddedIndexedDB) {
        this.indexedDB = indexedDB;
        this.indexedDB.getDatabase(this.databaseIdentifier, (db: string) => {
            if (db != null) {
                this.writtenStatements = JSON.parse(db);
                this.statementsToExecute = this.writtenStatements.slice();

                this.main.historyViewer.clear();
                this.main.historyViewer.appendStatements(this.statementsToExecute);

                this.executeStatements();
                this.writeStatementsIfNecessary();
            }
        })
    }

    reset() {
        this.statementsToWrite = [];
        this.writtenStatements = [];
        this.statementsToExecute = [];
        this.main.historyViewer.clear();
        this.forceWriteStatements();
    }

    writeStatementsIfNecessary() {
        if (this.indexedDB != null && this.statementsToWrite.length > 0) {
            this.forceWriteStatements();
        }
    }

    forceWriteStatements() {
        this.writtenStatements = this.writtenStatements.concat(this.statementsToWrite);
        this.statementsToWrite = [];
        this.indexedDB.writeDatabase(this.databaseIdentifier, JSON.stringify(this.writtenStatements));
    }

    atLeastOneExecuted: boolean = false;
    count: number;
    executeStatements() {
        if (this.databaseTool != null && this.statementsToExecute.length > 0) {
            if (!this.atLeastOneExecuted) {
                this.main.$databaseResetButton.fadeIn(200);
                this.count = this.statementsToExecute.length;
                this.main.waitOverlay.show("Schreibe lokale Datenbankänderungen ...");
            }
            this.main.waitOverlay.setProgress(Math.round(100 * (1 - this.statementsToExecute.length / this.count)) + " %")
            let statement = this.statementsToExecute.shift();
            this.atLeastOneExecuted = true;
            this.databaseTool.executeQuery(statement, () => { this.executeStatements() }, () => { this.executeStatements() });
        } else {
            if (this.atLeastOneExecuted) {
                this.main.databaseExplorer.refresh();
                this.atLeastOneExecuted = false;
                this.main.waitOverlay.hide();
            }
        }
    }

    notify(statements: SQLStatement[]): void {
        this.main.$databaseResetButton.fadeIn(200);
        let statementsSql = statements.map(stmt => stmt.sqlCleaned == null ? stmt.sql : stmt.sqlCleaned);
        this.statementsToWrite = this.statementsToWrite.concat(statementsSql);
        this.main.historyViewer.appendStatements(statementsSql);
        this.writeStatementsIfNecessary();
    }

    databaseReady(dbTool: DatabaseTool) {
        this.databaseTool = dbTool;
        this.executeStatements();
    }

    rollback() {
        this.writeStatementsIfNecessary();
        this.writtenStatements.pop();
        this.forceWriteStatements();
    }



}