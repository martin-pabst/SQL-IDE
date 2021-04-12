import { MainBase } from "../MainBase.js";
import { Table } from "../../compiler/parser/SQLTable.js";

export class DatabaseExplorer {
    
    openTables: string[] = [];

    constructor(private main: MainBase, public $mainDiv: JQuery<HTMLElement>){

    }

    refresh(){

        let dbTool = this.main.getDatabaseTool();
        let tables = Table.fromTableStructureList(dbTool.databaseStructure.tables);

        

    }



}