import { ColumnStructure, TableStructure } from "../../sqljs-worker/DatabaseTools.js";
import { SQLType, SQLBaseType, SQLDerivedType, SQLTextEnumType, SQLNumberEnumType } from "./SQLTypes.js";


export class Column {

    references: Column;
    fromColumnStructure?: ColumnStructure;
    notNull: boolean;

    constructor(public identifier: string, public type: SQLType, public table: Table, public isPrimaryKey: boolean, public isNullable: boolean, public defaultValue: string, public isAutoIncrement){

    }

    static fromColumnStructure(cs: ColumnStructure, table: Table): Column {

        let regex1 = /^(\w*) *(?:\((.*)\))?.*$/;

        let typeMatch1 = cs.completeTypeSQL.match(regex1);
        let baseTypeIdentifier: string = typeMatch1[1];
        let commaSeparatedParameters: string = typeMatch1[2];

        let parameterValues: number[] = [];
        if(commaSeparatedParameters != null){
            parameterValues = commaSeparatedParameters.split(',').map(v => parseInt(v.trim()));           
        }

        let type: SQLType;
        
        if(baseTypeIdentifier.indexOf('Enum') >= 0){
            switch(baseTypeIdentifier){
                case "textEnum":
                    type = new SQLTextEnumType(cs.enumValues);
                    break;
                case "realEnum":
                    type = new SQLNumberEnumType(cs.enumValues.map(v => Number.parseFloat(v)));
                    break;
                case "integerEnum":
                    type = new SQLNumberEnumType(cs.enumValues.map(v => Number.parseInt(v)));
                    break;
            }
        } else {
            type = SQLBaseType.getBaseType(baseTypeIdentifier);
        }
        
        if(parameterValues.length > 0 && type != null){
            type = new SQLDerivedType(<SQLBaseType>type, parameterValues);
        }

        let column = new Column(cs.name, type, table, cs.isPrimaryKey, !cs.isPrimaryKey, cs.defaultValue, cs.isAutoIncrement);
        column.notNull = cs.notNull;
        
        column.fromColumnStructure = cs;

        return column;
    }

}

export class Table {
    
    public columns: Column[] = [];

    public size: number;
    type: ("table"|"view");

    constructor(public identifier: string){

    }

    private static fromTableStructure(ts: TableStructure): Table {
        let table: Table = new Table(ts.name);
        table.columns = ts.columns.map( column => Column.fromColumnStructure(column, table));
        table.size = ts.size;
        table.type = ts.type;
        return table;
    }

    static fromTableStructureList(tsList: TableStructure[]): Table[]{

        if(tsList == null) tsList = [];

        let tables: Table[] = tsList.map(ts => Table.fromTableStructure(ts));

        let columnStructureToColumnMap: Map<ColumnStructure, Column> = new Map();
        for(let table of tables){
            for(let column of table.columns){
                columnStructureToColumnMap.set(column.fromColumnStructure, column);
            }
        }

        for(let table of tables){
            for(let column of table.columns){
                let referencedCs = column.fromColumnStructure.references;
                if(referencedCs != null){
                    let referencedColumn = columnStructureToColumnMap.get(referencedCs);
                    column.references = referencedColumn;
                }
            }
        }

        return tables;
    }

}