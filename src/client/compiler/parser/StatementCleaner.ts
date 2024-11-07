import { TokenType } from "../lexer/Token.js";
import { ASTNode, ConstantNode, CreateTableColumnNode, CreateTableNode, ForeignKeyInfo, InsertNode } from "./AST.js";
import { SQLStatement } from "./Parser.js";

export class StatementCleaner {

    MaxRowsPerInsert: number = 300;

    clean(statement: SQLStatement): string {
        switch (statement.ast.type) {
            case TokenType.keywordCreate:   // Create Table statement
                statement.sqlCleaned = this.cleanCreateTableStatement(statement.ast);
                return statement.sqlCleaned;
            case TokenType.keywordInsert:
                if(statement.ast.select != null){
                    return statement.sql;
                } else {
                    statement.sqlCleaned = this.cleanInsertStatement(statement.ast);
                    return statement.sqlCleaned;
                }
            default:
                return statement.sql;
                break;
        }
    }


    cleanInsertStatement(ast: InsertNode): string {
        let statementHeader: string = `insert into ${ast.table.identifier}`;

        if (ast.columnList != null && ast.columnList.length > 0) {
            statementHeader += `(${ast.columnList.map(c => this.escapeIdentifier(c.identifier)).join(", ")})`;
        }

        statementHeader += '\nvalues';

        let st = "";

        let lines: string[] = [];
        if (ast.values != null && ast.values.length > 0) {
            for (let vline of ast.values) {
                lines.push(`\n(${vline.map(v => this.cleanValue(v)).join(", ")})`);
            }
            //st += lines.join(",\n");
        }

        while (lines.length > 0) {
            st += statementHeader;
            st += lines.splice(0, Math.max(this.MaxRowsPerInsert, lines.length)).join(",\n");
            st += ";\n";
        }

        return st;

    }

    cleanValue(v: ConstantNode) {
        if (v.constantType == TokenType.stringConstant) {
            let s: string = v.constant;
            s = s.replace(/'/g, "''");
            return `'${s}'`;
        } else {
            return v.constant;
        }
    }

    cleanCreateTableStatement(ast: CreateTableNode): string {
        let st: string = `create table ${ast.ifNotExists ? " if not exists" : ""} ${this.escapeIdentifier(ast.identifier)}(\n   `;

        st += ast.columnList.map(column => this.cleanColumnDef(column)).join(",\n   ");
        if (ast.foreignKeyInfoList != null && ast.foreignKeyInfoList.length > 0) {
            st += ",\n   " + ast.foreignKeyInfoList.map(fki => this.cleanForeignKeyInfo(fki)).join(",\n   ");
        }

        let pkc = ast.combinedPrimaryKeyColumns.slice(); //.map(s => s.toLocaleLowerCase());
        for (let column of ast.columnList) {
            let c = column.identifier;
            if (column.isAutoIncrement && pkc.indexOf(c) >= 0) {
                pkc.splice(pkc.indexOf(c), 1);
            }
        }

        if (pkc.length > 0) {
            st += `,\n   primary key(${this.escapeIdentifiers(pkc).join(", ")})`;
        }

        if (ast.uniqueConstraints.length > 0) {
            st += ",\n   " + ast.uniqueConstraints.map(uk => 'unique(' + this.escapeIdentifiers(uk).join(", ") + ")").join(",\n   ");
        }

        st += '\n);';

        return st;
    }

    cleanForeignKeyInfo(fki: ForeignKeyInfo): string {
        let fkiString = `foreign key (${this.escapeIdentifier(fki.column)}) references ${this.escapeIdentifier(fki.referencesTable)}(${this.escapeIdentifier(fki.referencesColumn)})`;
        if (fki.onDelete) {
            fkiString += ` on delete ` + fki.onDelete;
        }
        if (fki.onUpdate) {
            fkiString += ` on update ` + fki.onUpdate;
        }
        return fkiString;
    }

    cleanColumnDef(column: CreateTableColumnNode): string {

        let type = column.baseType.getSQLiteType();
        if (type == "int" && column.isAutoIncrement) {
            type = "integer";
        }

        let st: string = `${this.escapeIdentifier(column.identifier)} ${type}`;
        if (column.parameters != null && column.parameters.length > 0 && !column.isAutoIncrement) {
            st += `(${column.parameters.join(", ")})`;
        }
        if (column.notNull) {
            st += " not null";
        }
        if (column.defaultValue != null) {
            st += " default " + column.defaultValue;
        }
        if (column.isPrimary || column.isAutoIncrement) {
            st += " primary key";
        }
        if (column.isAutoIncrement) {
            st += " autoincrement";
        }
        if (column.foreignKeyInfo != null) {
            let fki = column.foreignKeyInfo;
            let c: string = fki.referencesColumn;
            if (fki.referencesTable) c = this.escapeIdentifier(fki.referencesTable) + "(" + this.escapeIdentifier(c) + ")";
            st += " references " + c;
            if(fki.onDelete){
                st += " on delete " + fki.onDelete;
            }
            if(fki.onUpdate){
                st += " on update " + fki.onUpdate;
            }
        }
        if (column.collate != null) {
            let collate = column.collate.toLocaleLowerCase();
            if (["binary", "nocase", "rtrim"].indexOf(collate) >= 0) {
                st += " collate " + collate;
            }
        }
        let parameters = column.parameters ? column.parameters : [0, 0];
        let checkFunction = column.baseType.checkFunction(this.escapeIdentifier(column.identifier), parameters);
        if (checkFunction != "") {
            st += " " + checkFunction;
        }
        return st;
    }

    escapeIdentifier(id: string){
        return '"' + id + '"';
    }

    escapeIdentifiers(list: string[]):string[] {
        return list.map(this.escapeIdentifier);
    }

}