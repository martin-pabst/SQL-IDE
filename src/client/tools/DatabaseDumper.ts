import { ColumnStructure, DatabaseStructure, DatabaseTool, TableStructure } from "./DatabaseTools.js";

type TableData = {
    table: string;
    columns: string[];
    values: any[][];
}

export class DatabaseDumper {
    dbStructure: DatabaseStructure;
    tableDataList: TableData[] = [];

    constructor(private dbTool: DatabaseTool){

    }

    readDatabase(callback: () => void){
        let that = this;
        this.dbTool.retrieveDatabaseStructure((dbStructure) => {
            that.dbStructure = dbStructure;

            let tables: string[] = dbStructure.tables.map( t => t.name);
            that.tableDataList = [];
            that.readTables(tables, callback)
        })
    }

    readTables(tables: string[], callback: () => void){
        let that = this;
        if(tables.length > 0){
            let table = tables.shift();
            let sql = `select * from ${table}`;
            this.dbTool.executeQuery(sql, (results)=> {
                if(results.length > 0){
                    let result = results[0];
                    let tableData: TableData = {
                        table: table,
                        columns: result.columns,
                        values: result.values
                    }
                    that.tableDataList.push(tableData);
                }
                that.readTables(tables, callback);
            }, () => {
                that.readTables(tables, callback);
            })
        } else callback();
    }

    dump(): string[] {
        let statements: string[] = [];

        for(let table of this.dbStructure.tables){
            this.dumpCreateTable(table, statements);
        }

        for(let tableData of this.tableDataList){
            this.dumpTableData(tableData, statements, 1000);
        }

        return statements;
    }

    dumpTableData(tableData: TableData, statements: string[], maxRecordsPerInsertStatement: number) {

        let insertIntoStatement = `insert into ${}`

        let i = 0;
        while(i < tableData.values.length){

            let st = this.getInsertIntoStatement(tableData);

        }

    }

    dumpCreateTable(table: TableStructure, statements: string[]) {
        let st: string = `create table ${table.name} (`;
            st += table.columns.map(c => this.dumpColumnDefinition(c)).join(",\n");
        st += "\n);";

        statements.push(st);
    }

    dumpColumnDefinition(c: ColumnStructure): string {
        let s = `${c.name} ${c.completeTypeSQL}`;
        if(c.notNull) s += " not null";
        if(c.defaultValue) s += " default " + c.defaultValue;
        if(c.isPrimaryKey) s += " primary key";
        if(c.references != null){
            s += ` references ${c.references.table.name}(${c.references.name})`
        }

        return s;
    }

}