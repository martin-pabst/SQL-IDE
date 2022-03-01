import { SQLStatement } from "../compiler/parser/Parser.js";
import { WriteQueryListener } from "../main/gui/ResultsetPresenter.js";
import { DatabaseTool } from "../tools/DatabaseTools.js";
import { EmbeddedIndexedDB } from "./EmbeddedIndexedDB.js";
import { MainEmbedded } from "./MainEmbedded.js";


export class WriteQueryManager implements WriteQueryListener {
  
    indexedDB: EmbeddedIndexedDB;
    databaseTool: DatabaseTool;

    statementsToExecute: string[] = [];
    statementsToWrite: string[] = [];
    writtenStatements: string[] = [];

    constructor(private main: MainEmbedded, private databaseIdentifier: string){

    }

    indexedDBReady(indexedDB: EmbeddedIndexedDB){
        this.indexedDB = indexedDB;
        this.indexedDB.getDatabase(this.databaseIdentifier, (db: string) => {
            if(db != null){
                this.writtenStatements = JSON.parse(db);
                this.statementsToExecute = this.writtenStatements.slice();
                this.executeStatements();
                this.writeStatements();
            }
        })
    }

    writeStatements(){
        if(this.indexedDB != null && this.statementsToWrite.length > 0){
            this.writtenStatements = this.writtenStatements.concat(this.statementsToWrite);
            this.statementsToWrite = [];
            this.indexedDB.writeDatabase(this.databaseIdentifier, JSON.stringify(this.writtenStatements));
        }
    }

    atLeastOneExecuted: boolean = false;
    count: number;
    executeStatements(){
        if(this.databaseTool != null && this.statementsToExecute.length > 0){
            if(!this.atLeastOneExecuted){
                this.count = this.statementsToExecute.length;
                this.main.waitOverlay.show("Schreibe lokale Datenbankänderungen ...");
            } 
            this.main.waitOverlay.setProgress(Math.round(100*(1 - this.statementsToExecute.length/this.count)) + " %")
            let statement = this.statementsToExecute.shift();
            this.databaseTool.executeQuery(statement, () => {this.executeStatements()}, ()=>{this.executeStatements});
            this.atLeastOneExecuted = true;
        } else {
            if(this.atLeastOneExecuted){
                this.main.databaseExplorer.refresh();
                this.atLeastOneExecuted = false;
            }
        }
    }

    notify(statements: SQLStatement[]): void {
        this.statementsToWrite = this.statementsToWrite.concat(statements.map(stmt => stmt.sqlCleaned == null ? stmt.sql : stmt.sqlCleaned))       
        this.writeStatements();
    }
    
    databaseReady(dbTool: DatabaseTool) {
        this.databaseTool = dbTool;
        this.executeStatements();
    }





}