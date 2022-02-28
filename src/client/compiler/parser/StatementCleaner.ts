import { TokenType } from "../lexer/Token.js";
import { ASTNode, ConstantNode, CreateTableColumnNode, CreateTableNode, ForeignKeyInfo, InsertNode } from "./AST.js";
import { SQLStatement } from "./Parser.js";

export class StatementCleaner {

    clean(statement: SQLStatement): string {
        switch(statement.ast.type){
            case TokenType.keywordCreate:   // Create Table statement
                statement.sqlCleaned = this.cleanCreateTableStatement(statement.ast);
                return statement.sqlCleaned;
            case TokenType.keywordInsert:
                statement.sqlCleaned = this.cleanInsertStatement(statement.ast);
                return statement.sqlCleaned;
            default:
                return statement.sql;
                break;
        }
    }

    cleanInsertStatement(ast: InsertNode): string {
        let st: string = `insert into ${ast.table.identifier}`;

        if(ast.columnList != null && ast.columnList.length > 0){
            st += `(${ast.columnList.map(c => c.identifier).join(", ")})`;
        }

        if(ast.values != null && ast.values.length > 0){
            st += '\nvalues';
            let lines: string[] = [];
            for(let vline of ast.values){
                lines.push(`\n(${vline.map(v => this.cleanValue(v)).join(", ")})`);
            }
            st += lines.join(", ");
        }

        return st + ";";
    }

    cleanValue(v: ConstantNode){
        if(v.constantType == TokenType.stringConstant){
            let s: string = v.constant;
            s = s.replace(/'/g, "''");
            return `'${s}'`;
        }else {
            return v.constant;
        }
    }

    cleanCreateTableStatement(ast: CreateTableNode): string {
        let st: string = `create table ${ast.identifier}(\n   `;

        st += ast.columnList.map( column => this.cleanColumnDef(column)).join(",\n   ");
        if(ast.foreignKeyInfoList != null && ast.foreignKeyInfoList.length > 0){
            st += ",\n" + ast.foreignKeyInfoList.map(fki => this.cleanForeignKeyInfo(fki)).join(",\n   ");
        }
        if(ast.combinedPrimaryKeyColumns!= null && ast.combinedPrimaryKeyColumns.length > 0){
            st += `,\nprimary key(${ast.combinedPrimaryKeyColumns.join(", ")})`;
        }
        st += '\n);';

        return st;
    }

    cleanForeignKeyInfo(fki: ForeignKeyInfo): string {
        return `${fki.column} references ${fki.referencesTable}(${fki.referencesColumn})`;
    }

    cleanColumnDef(column: CreateTableColumnNode):string {

        let type = column.baseType.toString();
        if(type == "int" && column.isAutoIncrement){
            type = "integer";
        }

        let st: string = `${column.identifier} ${type}`;
        if(column.parameters != null && column.parameters.length > 0){
            st += `(${column.parameters.join(", ")})`;
        }
        if(column.notNull){
            st += " not null";
        }
        if(column.defaultValue != null){
            st += " default " + column.defaultValue;
        }
        if(column.isPrimary){
            st += " primary key";
        }
        if(column.isAutoIncrement){
            st += " autoincrement";
        }
        if(column.referencesColumn != null){
            let c: string = column.referencesColumn;
            if(column.referencesTable) c = column.referencesTable + "(" + c + ")";
            st += " references " + c;
        }
        if(column.collate != null){
            let collate = column.collate.toLocaleLowerCase();
            if(["binary", "nocase", "rtrim"].indexOf(collate) >= 0){
                st += " collate " + collate;
            }
        }
        let parameters = column.parameters? column.parameters : [0, 0];
        let checkFunction = column.baseType.checkFunction(column.identifier, parameters);
        if(checkFunction != ""){
            st += " " + checkFunction;
        }
        return st;
    }

}