import * as monaco from 'monaco-editor';
import { TokenType } from "../../compiler/lexer/Token.js";
import { CompletionHint, Module } from "../../compiler/parser/Module.js";
import { Symbol, SymbolTable } from "../../compiler/parser/SymbolTable.js";
import { MainBase } from "../MainBase.js";

export class MyCompletionItemProvider implements monaco.languages.CompletionItemProvider {

    isConsole: boolean;

    public triggerCharacters: string[] = ['.', 'abcdefghijklmnopqrstuvwxyzäöüß_ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', ' ', ',', '('];

    public keywordCompletionItems: Map<string, monaco.languages.CompletionItem> = new Map();

    constructor(private main: MainBase) {
        this.setupKeywordCompletionItems();
    }

    first: boolean = true;
    provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext, 
        token: monaco.CancellationToken): monaco.languages.ProviderResult<monaco.languages.CompletionList> {


        let module: Module =
            this.main.getCurrentWorkspace().getModuleByMonacoModel(model);

        if (module == null || module.mainSymbolTable == null) {
            return null;
        }

        return new Promise((resolve, reject) => {
            let that = this;

            let wfc = function waitForCompiler(){
                if(module.file.dirty){
                    setTimeout(() => {
                        wfc();
                    }, 100);
                } else {
                    resolve(that.provideCompletionItemsIntern(model, position, context, token));
                }
            }
        
            wfc();

        })

        // Promise.resolve({
        //     suggestions: completionItems
        // });
    }

    provideCompletionItemsIntern(model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext, 
        token: monaco.CancellationToken): monaco.languages.CompletionList {

        // setTimeout(() => {
        //     //@ts-ignore
        //     let sw = this.main.getMonacoEditor()._contentWidgets["editor.widget.suggestWidget"].widget;
        //     if (this.first) {
        //         sw.toggleDetails();
        //         this.first = false;
        //     }
        // }, 500);

        let module: Module =
            this.main.getCurrentWorkspace().getModuleByMonacoModel(model);

        if (module == null || module.mainSymbolTable == null) {
            return null;
        }

        if (this.isStringLiteral(module, position)) return null;

        let textUntilPosition = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
        let textAfterPosition = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber + 5, endColumn: 1 });

        let symbolTable = module.mainSymbolTable.findTableAtPosition(position.lineNumber, position.column);
        let completionHint: CompletionHint = module.getCompletionHint(position.lineNumber, position.column);
        if (completionHint == null) {
            completionHint = {
                fromColumn: 0,
                toColumn: 0,
                fromLine: 0,
                toLine: 0,
                hintColumns: false,
                hintTables: false,
                hintKeywords: []
            }
        }

        let completionItems: monaco.languages.CompletionItem[] = [];
        this.addKeywordCompletionItems(completionHint, completionItems);

        let dotMatch = textUntilPosition.match(/.*\s([\wöäüÖÄÜß]*)(\.)([\wöäüÖÄÜß]*)$/);

        let ibMatch = textAfterPosition.match(/^([\wöäüÖÄÜß]*)/);
        let identifierAndBracketAfterCursor = "";
        if (ibMatch != null && ibMatch.length > 0) {
            identifierAndBracketAfterCursor = ibMatch[0];
        }

        if (dotMatch == null) {
            this.addIdentifierCompletionItems(completionHint, symbolTable, completionItems);
        } else {
            this.addDotCompletionItems(position, dotMatch, identifierAndBracketAfterCursor, symbolTable, completionItems);
        }

        let word = model.getWordUntilPosition(position);
        let replaceWordRange = { startColumn: word.startColumn, startLineNumber: position.lineNumber, endColumn: word.endColumn, endLineNumber: position.lineNumber };
        let insertAfterCursorRange = { startColumn: position.column, startLineNumber: position.lineNumber, endColumn: position.column, endLineNumber: position.lineNumber }

        for (let item of completionItems) {
            if (item.range == null) {
                if (item.insertText.startsWith(",")) {
                    item.range = insertAfterCursorRange;
                } else {
                    item.range = replaceWordRange;
                }
            }
        }

        if (completionHint.dontHint != null) {
            completionItems = completionItems.filter(item => completionHint.dontHint.indexOf(item.insertText) < 0);
        }

        return {
            suggestions: completionItems
        };
    }


    addDotCompletionItems(position: monaco.Position, dotMatch: RegExpMatchArray, identifierAndBracketAfterCursor: string,
        symbolTable: SymbolTable, completionItems: monaco.languages.CompletionItem[]) {
        let textAfterDot = dotMatch[3];
        let textBeforeDot = dotMatch[1];
        let dotColumn = position.column - textAfterDot.length - 1;
        let rangeToReplace: monaco.IRange =
        {
            startLineNumber: position.lineNumber, startColumn: position.column - textAfterDot.length,
            endLineNumber: position.lineNumber, endColumn: position.column + identifierAndBracketAfterCursor.length
        }

        for (let symbol of symbolTable.symbolList) {
            if (symbol.table != null) {
                let identifier: string = symbol.table.identifier;
                if (symbol.tableAlias != null) identifier = symbol.tableAlias;
                if (identifier.toLowerCase() == textBeforeDot) {
                    for (let column of symbol.table.columns) {
                        completionItems.push({
                            label: column.identifier,
                            detail: "Spalte " + column.identifier + " der Tabelle " + symbol.table.identifier,
                            filterText: column.identifier,
                            insertText: column.identifier,
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.KeepWhitespace,
                            kind: monaco.languages.CompletionItemKind.Field,
                            range: rangeToReplace
                        })

                    }
                }
            }
        }

    }

    addIdentifierCompletionItems(completionHint: CompletionHint, symbolTable: SymbolTable, completionItems: monaco.languages.CompletionItem[]) {
        let praefix: string = completionHint.praefix == null ? "" : completionHint.praefix;
        let suffix: string = completionHint.suffix == null ? "" : completionHint.suffix;

        if (!(completionHint.hintTables || completionHint.hintColumns)) {
            return;
        }

        let tableIdentifiers: { [identifier: string]: boolean } = {};

        let st: SymbolTable = symbolTable;
        let columns: { [identifier: string]: Symbol[] } = {};
        let columnIdentifiers: string[] = [];

        while (st != null) {
            for (let symbol of st.symbolList) {
                if (symbol.column != null) {
                    let columnIdentifier = symbol.column.identifier;
                    if (columns[columnIdentifier] == null) {
                        columns[columnIdentifier] = [symbol];
                        columnIdentifiers.push(columnIdentifier);
                    } else {
                        columns[columnIdentifier].push(symbol);
                    }
                } else if (symbol.table != null && completionHint.hintTables) {
                    if (!tableIdentifiers[symbol.identifier]) {
                        let insertText = praefix + symbol.identifier + suffix;
                        completionItems.push({
                            label: symbol.identifier,
                            detail: "Tabelle " + symbol.table.identifier,
                            filterText: symbol.identifier,
                            insertText: insertText,
                            insertTextRules: insertText.indexOf("$") >= 0 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : monaco.languages.CompletionItemInsertTextRule.KeepWhitespace,
                            kind: insertText.indexOf("$") >= 0 ? monaco.languages.CompletionItemKind.Snippet : monaco.languages.CompletionItemKind.Class,
                            range: undefined,
                            sortText: "aa" + symbol.identifier
                        });
                        tableIdentifiers[symbol.identifier] = true;
                    }
                }
            }
            st = st.parent;
        }

        if (completionHint.hintColumns) {
            for (let ci of columnIdentifiers) {
                let columList = columns[ci];
                let withTable = columList.length > 1 && completionHint.hintColumnsOfTable == null;
                for (let cs of columList) {
                    let text = cs.identifier;
                    if (withTable && cs.identifier == cs.column.identifier.toLowerCase()) {
                        text = (cs.tableAlias == null ? cs.column.table.identifier : cs.tableAlias) + "." + text;
                    }
                    if (completionHint.hintColumnsOfTable == null || cs.column?.table?.identifier == completionHint.hintColumnsOfTable) {
                        let insertText = praefix + text + suffix;
                        completionItems.push({
                            label: text,
                            detail: "Die Spalte " + cs.column.identifier + " der Tabelle " + cs.column.table.identifier,
                            filterText: text,
                            insertText: insertText,
                            insertTextRules: insertText.indexOf("$") >= 0 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : monaco.languages.CompletionItemInsertTextRule.KeepWhitespace,
                            kind: insertText.indexOf("$") >= 0 ? monaco.languages.CompletionItemKind.Snippet : monaco.languages.CompletionItemKind.Field,
                            range: undefined
                        })
                    }

                }
            }
        }
    }

    keywordToSnippetMap: { [keyword: string]: string } = {
        "(": "(\n\t$0\n)",
        "varchar": "varchar($1) $0",
        "decimal": "decimal($1, $2) $0"
    }

    addKeywordCompletionItems(completionHint: CompletionHint, completionItems: monaco.languages.CompletionItem[]) {
        let praefix: string = completionHint.praefix == null ? "" : completionHint.praefix;
        let suffix: string = completionHint.suffix == null ? "" : completionHint.suffix;


        for (let text of completionHint.hintKeywords) {
            let insertText = praefix + text + suffix;
            let snippet = this.keywordToSnippetMap[text];

            let ci = this.keywordCompletionItems.get(text);
            if (ci != null) {
                completionItems.push(ci);
            } else if (snippet != null) {
                let label = snippet.replace("$0", "").replace("$1", "").replace("$2", "").replace(/ /g, "").replace(/\n/g, "").replace(/\t/g, "");
                completionItems.push({
                    label: label,
                    detail: "",
                    filterText: text,
                    insertText: snippet,
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                })
            } else {
                completionItems.push({
                    label: text,
                    detail: "",
                    filterText: text,
                    insertText: text,
                    insertTextRules: insertText.indexOf("$") >= 0 ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : monaco.languages.CompletionItemInsertTextRule.KeepWhitespace,
                    kind: insertText.indexOf("$") >= 0 ? monaco.languages.CompletionItemKind.Snippet : monaco.languages.CompletionItemKind.Keyword,
                    range: undefined,
                    sortText: text == "from" ? "*" : undefined
                })
            }

        }

    }



    isStringLiteral(module: Module, position: monaco.Position) {

        let tokenList = module.tokenList;
        if (tokenList == null || tokenList.length == 0) return false;

        let posMin = 0;
        let posMax = tokenList.length - 1;
        let pos: number;

        let watchDog = 1000;

        while (true) {
            let posOld = pos;
            pos = Math.round((posMax + posMin) / 2);

            if (posOld == pos) return false;

            watchDog--;
            if (watchDog == 0) return false;

            let t = tokenList[pos];
            let p = t.position;

            if (p.line < position.lineNumber || p.line == position.lineNumber && p.column + p.length < position.column) {
                posMin = pos;
                continue;
            }

            if (p.line > position.lineNumber || p.line == position.lineNumber && p.column > position.column) {
                posMax = pos;
                continue;
            }

            return t.tt == TokenType.stringConstant;

        }

    }


    setupKeywordCompletionItems() {
        this.keywordCompletionItems.set("delete from",
            {
                label: "delete from <Tabelle> where <Bedingung>",
                detail: "Anweisung zum Löschen von Datensätzen",
                filterText: `delete from`,
                // insertText: "while(${1:Bedingung}){\n\t$0\n}",
                insertText: `delete from `,
                command: {
                    id: "editor.action.triggerSuggest",
                    title: '123',
                    arguments: []
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined
            });

        this.keywordCompletionItems.set("drop table",
            {
                label: "drop table <Tabelle>",
                detail: "Anweisung zum Löschen einer Tabelle",
                filterText: 'drop table',
                // insertText: "while(${1:Bedingung}){\n\t$0\n}",
                insertText: `drop table `,
                command: {
                    id: "editor.action.triggerSuggest",
                    title: '123',
                    arguments: []
                },
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined
            });

        this.keywordCompletionItems.set("alter",
            {
                label: "alter table <Tabelle> <rename to, rename column, add column, drop column>",
                detail: "Anweisung zum Ändern des Schemas (alter table <Tabelle> <rename to, rename column, add column, drop column>)",
                filterText: 'alter',
                // insertText: "while(${1:Bedingung}){\n\t$0\n}",
                insertText: `alter table `,
                command: {
                    id: "editor.action.triggerSuggest",
                    title: '123',
                    arguments: []
                },
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined
            });

        this.keywordCompletionItems.set("select",
            {
                label: "select <Spalten> from <Tabellen> where <Bedingung>",
                detail: "Select-Anweisung",
                filterText: 'select',
                // insertText: "while(${1:Bedingung}){\n\t$0\n}",
                insertText: `select * from $1\nwhere $0\n`,
                command: {
                    id: "editor.action.triggerSuggest",
                    title: '123',
                    arguments: []
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined
            });

        this.keywordCompletionItems.set("create table",
            {
                label: "create table <Tabellenbezeichner> (<Spaltendefinitionen>)",
                detail: "Create table-Anweisung (Erstellt eine neue Tabelle)",
                filterText: 'create',
                // insertText: "while(${1:Bedingung}){\n\t$0\n}",
                insertText: `create table $1 (\n\t$0\n);`,
                command: {
                    id: "editor.action.triggerSuggest",
                    title: '123',
                    arguments: []
                },
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                kind: monaco.languages.CompletionItemKind.Snippet,
                range: undefined
            });

        // this.keywordCompletionItems.set("from",
        //     {
        //         label: "from <Tabellen> where <Bedingung>",
        //         detail: "from-Teil der select-Anweisung",
        //         filterText: 'from',
        //         // insertText: "while(${1:Bedingung}){\n\t$0\n}",
        //         insertText: `from $1\nwhere $0\n`,
        //         command: {
        //             id: "editor.action.triggerSuggest",
        //             title: '123',
        //             arguments: []
        //         },
        //         insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        //         kind: monaco.languages.CompletionItemKind.Snippet,
        //         range: undefined
        //     });

    }


}