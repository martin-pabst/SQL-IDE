import { Lexer } from "../compiler/lexer/Lexer.js";
import { TokenType } from "../compiler/lexer/Token.js";
import { AlterTableNode, CreateTableNode, InsertNode } from "../compiler/parser/AST.js";
import { Module } from "../compiler/parser/Module.js";
import { Parser, SQLStatement } from "../compiler/parser/Parser.js";
import { StatementCleaner } from "../compiler/parser/StatementCleaner.js";
import { MainBase } from "../main/MainBase.js";
import { LoadableDatabase } from "./DatabaseLoader.js";
import { DatabaseTool } from "./DatabaseTools.js";

export class MySqlImporter {

    private createTableNodes: CreateTableNode[];
    private insertNodes: InsertNode[];
    private tableModifyingNodes: AlterTableNode[];

    constructor(private main: MainBase) {

    }

    async loadFromUrl(url: string): Promise<LoadableDatabase> {
        if (url == null) return;

        let text = null;
        if (url.endsWith(".zip")) {
            text = await this.unzipURL(url);
        } else {
            text = await (await fetch(url)).text();
        }

        return this.importFromText(text);
    }

    async loadFromFile(file: globalThis.File): Promise<LoadableDatabase> {
        if (file == null) return;

        if (file.name.endsWith(".zip")) {
            let text = await this.unzipFile(file);
            return this.importFromText(text);
        } else {

            return new Promise<LoadableDatabase>(
                (resolve, reject) => {
                    var reader = new FileReader();
                    reader.onload = (event) => {
                        let text = <string>event.target.result;
                        resolve(this.importFromText(text));
                    };
                    reader.readAsText(file);
                }
            )


        }
    }

    async unzipURL(url: string): Promise<string> {
        //@ts-ignore
        const reader = new zip.ZipReader(new zip.HttpReader(url));
        return this.unzipIntern(reader);
    }

    async unzipFile(file: globalThis.File): Promise<string> {
        // create a BlobReader to read with a ZipReader the zip from a Blob object
        //@ts-ignore
        const reader = new zip.ZipReader(new zip.BlobReader(file));
        return this.unzipIntern(reader);
    }

    async unzipIntern(reader: any): Promise<string> {
        // get all entries from the zip
        let entries = await reader.getEntries();
        entries = entries.filter(entry => entry.filename.endsWith(".sql"))
        let text: string = null;
        if (entries.length) {

            // get first entry content as text by using a TextWriter
            text = await entries[0].getData(
                // writer
                //@ts-ignore
                new zip.TextWriter(),
                // options
                {
                    onprogress: (index, max) => {
                        // onprogress callback
                    }
                }
            );
        }

        // close the ZipReader
        await reader.close();

        return text;
    }

    private async importFromText(text: string): Promise<LoadableDatabase> {
        if (text == null) return null;

        let lexer: Lexer = new Lexer();
        let lexOutput = lexer.lex(text);

        let parser: Parser = new Parser();
        let m: Module = new Module({
            dirty: false,
            name: "",
            saved: true,
            student_edited_after_revision: false,
            submitted_date: null,
            text: text,
            text_before_revision: null,
            version: 0
        }, this.main);
        m.tokenList = lexOutput.tokens;

        parser.parse(m);

        this.createTableNodes = m.sqlStatements.filter(st => st.ast.type == TokenType.keywordCreate).map(st => <CreateTableNode>st.ast);
        this.insertNodes = m.sqlStatements.filter(st => st.ast.type == TokenType.keywordInsert).map(st => <InsertNode>st.ast);
        this.tableModifyingNodes = m.sqlStatements.filter(st => st.ast.type == TokenType.keywordAlter &&
            (<AlterTableNode>st.ast).kind == "omittedKind").map(st => <AlterTableNode>st.ast);

        for (let tmn of this.tableModifyingNodes) {
            let createTableNode = this.findCreateTableNode(tmn.tableIdentifier);
            if (createTableNode == null) continue;

            if (tmn.primaryKeys != null) {
                createTableNode.combinedPrimaryKeyColumns = tmn.primaryKeys;
                createTableNode.columnList.forEach(c => c.isPrimary = false);
            }

            if (tmn.autoIncrementColumn != null) {
                let pcn = this.findCreateTableColumnNode(createTableNode, tmn.autoIncrementColumn);
                if (pcn != null) pcn.isPrimary = true;
            }

            if (tmn.modifyColumnInfo != null) {
                for (let mci of tmn.modifyColumnInfo) {
                    let mcn = this.findCreateTableColumnNode(createTableNode, mci.identifier);
                    let index = createTableNode.columnList.indexOf(mcn);
                    createTableNode.columnList.splice(index, 1, mci);
                }
            }

            if (tmn.foreignKeys != null) {
                for (let fk of tmn.foreignKeys) {
                    createTableNode.foreignKeyInfoList.push(fk);
                }
            }

            if (tmn.indices != null) {
                for (let index of tmn.indices) {
                    m.sqlStatements.push({
                        acceptedBySQLite: true,
                        from: null, to: null, hasErrors: false,
                        ast: {
                            type: TokenType.keywordIndex,
                            columnIdentifier: index.column,
                            indexIdentifier: index.index_name,
                            tableIdentifier: tmn.tableIdentifier,
                            unique: index.unique,
                            position: null, endPosition: null, symbolTable: null
                        },
                        sql: `create ${index.unique ? 'unique ' : ''} index ${index.index_name} on ${tmn.tableIdentifier}(${index.column});`
                    })
                }
            }
        }

        return this.makeDatabase(m.sqlStatements);
    }

    private findCreateTableNode(tableIdentifier: string): CreateTableNode {
        tableIdentifier = tableIdentifier.toLocaleLowerCase();
        return this.createTableNodes.find(node => node.identifier.toLocaleLowerCase() == tableIdentifier);
    }

    private findCreateTableColumnNode(tableNode: CreateTableNode, columnIdentifier: string) {
        columnIdentifier = columnIdentifier.toLocaleLowerCase();
        return tableNode.columnList.find(columnNode => columnNode.identifier.toLocaleLowerCase() == columnIdentifier)
    }

    private async makeDatabase(statements: SQLStatement[]): Promise<LoadableDatabase> {

        let statementCleaner: StatementCleaner = new StatementCleaner();

        let sqlStatements: string[] = statements.filter(st => st.ast.type != TokenType.omittedeStatement)
            .map(st => statementCleaner.clean(st));
        sqlStatements.unshift("PRAGMA foreign_keys = OFF;");
        sqlStatements.push("PRAGMA foreign_keys = ON;")

        let dbTool = new DatabaseTool(this.main);

        let promise = new Promise<LoadableDatabase>((resolve, reject) => {
            dbTool.initializeWorker(null, sqlStatements, () => {
                dbTool.export((buffer) => {
                    resolve({
                        binDump: buffer
                    })
                }, (error) => {
                    reject(error);
                })
            });

        })

        return promise;

    }


}