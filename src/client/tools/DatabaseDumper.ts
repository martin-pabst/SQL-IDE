import { MainBase } from "../main/MainBase.js";
import { ColumnStructure, DatabaseStructure, DatabaseTool, TableStructure } from "./DatabaseTools.js";

type TableData = {
    table: TableStructure;
    values: any[][];
}

type ColumnTypeInfo = {
    type: string,
    notNull: boolean,
    referencesTable: string,
    referencesColumn: string,
    defaultValue: string,
    isPrimaryKey: boolean,
    isAutoIncrement: boolean
}

export class DatabaseDumper {
    dbStructure: DatabaseStructure;
    tableDataList: TableData[] = [];
    MaxValuesPerInsertStatement: number = 400;

    newDbTool: DatabaseTool;

    constructor(private dbTool: DatabaseTool, private main: MainBase){

    }

    getTableIndex(tableIdentifier: string){
        return this.dbStructure.tables.findIndex((tstr) => tstr.name.toLocaleLowerCase() == tableIdentifier.toLowerCase());
    }

    getTableStructure(tableIdentifier: string){
        return this.dbStructure.tables[this.getTableIndex(tableIdentifier)];
    }

    getColumnIndex(columnIdentifier: string, tableStructure: TableStructure){
        return tableStructure.columns.findIndex((cstr) => cstr.name.toLocaleLowerCase() == columnIdentifier.toLocaleLowerCase());
    }

    deleteColumn(tableIdentifier: string, columnIdentifier: string){
        let tableIndex = this.getTableIndex(tableIdentifier);
        if(tableIndex < 0){
            console.log("DatabaseDumper.deleteColumn: tableIndex < 0");
            return;
        }
        let tableStructure = this.dbStructure.tables[tableIndex];
        let columnIndex = this.getColumnIndex(columnIdentifier, tableStructure);
        if(columnIndex < 0){
            console.log("DatabaseDumper.deleteColumn: columnIndex < 0");
            return;
        }

        tableStructure.columns.splice(columnIndex, 1);
        for(let row of this.tableDataList[tableIndex].values){
            row.splice(columnIndex, 1);
        }
    }

    columnTypeInfoToColumnStructure(cti: ColumnTypeInfo, columnIdentifier: string, tableIdentifier: string){
        let type = `${cti.type}${cti.notNull ? " not null" : ""}${cti.isPrimaryKey ? " primary key":""}`;
        if(cti.referencesTable != null){
            type += ` references ${cti.referencesTable}(${cti.referencesColumn})`;
        }
        if(cti.defaultValue != null){
            type += ` default ${this.getDumpValueFunction(type)(cti.defaultValue)}`;
        }

        let cs: ColumnStructure = {
            name: columnIdentifier,
            completeTypeSQL: type,
            enumValues: [],
            defaultValue: cti.defaultValue,
            isPrimaryKey: cti.isPrimaryKey,
            isAutoIncrement: cti.isAutoIncrement,
            notNull: cti.notNull,
            table: this.getTableStructure(tableIdentifier),
            dumpValueFunction: this.getDumpValueFunction(type)
        }

        return cs;
    }

    addColumn(tableIdentifier: string, columnIdentifier: string, index: number, columnTypeInfo: ColumnTypeInfo){
        let tableIndex = this.getTableIndex(tableIdentifier);
        let tableStructure = this.dbStructure.tables[tableIndex];
        if(index == null) index = tableStructure.columns.length;
        
        let columnStructure = this.columnTypeInfoToColumnStructure(columnTypeInfo, columnIdentifier, tableIdentifier);

        tableStructure.columns.splice(index, 0, columnStructure);

        for(let row of this.tableDataList[tableIndex].values){
            row.splice(index, 0, columnStructure.dumpValueFunction(columnStructure.defaultValue));
        }
    }

    alterColumn(tableIdentifier: string, columnIdentifier: string, cti: ColumnTypeInfo){
        let tableIndex = this.getTableIndex(tableIdentifier);
        let tableStructure = this.dbStructure.tables[tableIndex];

        let columnIndex = this.getColumnIndex(columnIdentifier, tableStructure);
        if(columnIndex < 0) return;

        tableStructure.columns[columnIndex] = this.columnTypeInfoToColumnStructure(cti, columnIdentifier, tableIdentifier);

    }

    renameColumn(tableIdentifier: string, oldColumnIdentifier: string, newColumnIdentifier: string){
        let tableIndex = this.getTableIndex(tableIdentifier);
        let tableStructure = this.dbStructure.tables[tableIndex];

        let columnIndex = this.getColumnIndex(oldColumnIdentifier, tableStructure);
        if(columnIndex < 0) return;

        tableStructure.columns[columnIndex].name = newColumnIdentifier;

    }

    writeDatabase(callback: (error: string, dbTool: DatabaseTool) => void){
        this.newDbTool = new DatabaseTool(this.main);
        let statements = this.dump();
        let errors: string[];
        
        this.newDbTool.initializeWorker(null, statements, (errors1) => {

            errors = errors1;

        }, () => {
            if(errors.length > 0){
                callback(errors[0], this.newDbTool);
            } else {
                callback(null, null);
            }
        });
    }

    readDatabase(callback: () => void){
        let that = this;
        this.dbTool.retrieveDatabaseStructure((dbStructure) => {
            that.dbStructure = dbStructure;
            that.tableDataList = [];
            that.readTables(dbStructure.tables, callback)
        })
    }

    readTables(tables: TableStructure[], callback: () => void){
        let that = this;
        if(tables.length > 0){
            let table = tables.shift();
            let sql = `select * from ${table}`;
            this.dbTool.executeQuery(sql, (results)=> {
                if(results.length > 0){
                    let result = results[0];
                    let tableData: TableData = {
                        table: table,
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
            this.dumpTableData(tableData, statements);
        }

        return statements;
    }

    dumpTableData(tableData: TableData, statements: string[]) {

        this.initDumpValueFunctions(tableData.table.columns);

        let insertIntoStatement = `insert into ${tableData.table} (${tableData.table.columns.map(c => c.name ).join(",")}) values \n`;

        let i = 0;
        while(i < tableData.values.length){
            let st = insertIntoStatement;
            let count = Math.max(this.MaxValuesPerInsertStatement, tableData.values.length - i);

            for(let j = 0; j < count; j++){
                st += this.dumpRow(tableData.values[i + j], tableData.table.columns);
                if(j < count - 1){
                    st += ",\n";
                } else {
                    st += ";\n";
                }
            }

            i += count;
            statements.push(st);
        }

    }

    getDumpValueFunction(sqlType: string): (value: any) => string {
        let type = sqlType.toLocaleLowerCase();
        if(type.indexOf('char') >= 0 || type.indexOf('text') >= 0){
            return (value) => `'${value}'`;
        }
        if(type.indexOf('timestamp') >= 0 || type.indexOf('date') >= 0){
            return (value) => `'${value}'`;
        }
        if(type.indexOf('boolean') >= 0){
            return (value) => value > 0 ? 'true' : 'false';
        }

        return (value) => "" + value;

    }

    initDumpValueFunctions(columns: ColumnStructure[]) {
        for(let column of columns){

            column.dumpValueFunction = this.getDumpValueFunction(column.completeTypeSQL);

        }
    }

    dumpRow(values: any[], columns: ColumnStructure[]): string {
        let st = "(";
        for(let i = 0; i < columns.length; i++){
            st += columns[i].dumpValueFunction(values[i]);
            if(i < columns.length - 1){
                st += ",";
            }
        }
        return st + ")";
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