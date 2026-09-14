import * as monaco from 'monaco-editor';
import { MainBase } from "../../main/MainBase.js";
import { Error, ErrorLevel } from "../lexer/Lexer.js";
import { TextPosition, Token } from "../lexer/Token.js";
import { SQLStatement } from "./Parser.js";
import { SymbolTable } from "./SymbolTable.js";
import type { GUIFile } from './GUIFile.js';


export type CompletionHint = {
    fromLine: number,
    fromColumn: number,
    toLine: number,
    toColumn: number,
    hintColumns: boolean,
    hintColumnsOfTable?: string,
    hintTables: boolean,
    hintKeywords: string[],
    dontHint?: string[],
    praefix?: string,
    suffix?: string
}

export type IdentifierPosition = {
    position: TextPosition,
    element: any;
}

export type MethodCallPosition = {
    identifierPosition: TextPosition,
    possibleMethods: any[] | string, // string for print, println, ...
    commaPositions: TextPosition[],
    rightBracketPosition: TextPosition
}

export class Module {
    file: GUIFile;
    static maxUriNumber: number = 0;
    uri: monaco.Uri;
    oldErrorDecorations: string[] = [];
    lastSavedVersionId: number;
    editorState: monaco.editor.ICodeEditorViewState;

    errors: Error[][] = [[], [], [], []]; // 1st pass, 2nd pass, 3rd pass

    // 1st pass: Lexer
    tokenList: Token[];

    // 2nd pass: ASTParser
    sqlStatements: SQLStatement[];
    mainSymbolTable: SymbolTable;


    identifierPositions: { [line: number]: IdentifierPosition[] } = {};
    methodCallPositions: { [line: number]: MethodCallPosition[] } = {};

    static uriMap: { [name: string]: number } = {};
    bracketError: string;

    completionHints: Map<number, CompletionHint[]> = new Map(); // Map from line numbers to hints

    lastCompiledMonacoVersion: number = -1;

    get name(): string {
        return this.file.name;
    }

    constructor(file: GUIFile, public main: MainBase) {
        if (file == null || this.main == null) return; // used by AdhocCompiler and ApiDoc

        this.file = file;

    }

    addCompletionHint(fromPosition: TextPosition, toPosition: TextPosition, hintColumns: boolean | string, hintTables: boolean,
        hintKeywords: string[], dontHint?: string[], praefix: string = "", suffix: string = "") {
        let ch: CompletionHint = {
            fromColumn: fromPosition.column,
            fromLine: fromPosition.line,
            toColumn: toPosition.column,
            toLine: toPosition.line,
            hintColumns: (typeof hintColumns == "boolean") ? hintColumns : true,
            hintColumnsOfTable: (typeof hintColumns == "string") ? hintColumns : null,
            hintTables: hintTables,
            hintKeywords: hintKeywords == null ? null : hintKeywords.map(s => s.toUpperCase()),
            dontHint: dontHint,
            praefix: praefix,
            suffix: suffix
        }

        for (let i = ch.fromLine; i <= ch.toLine; i++) {
            let chList = this.completionHints.get(i);
            if (chList == null) {
                chList = [];
                this.completionHints.set(i, chList);
            }
            chList.push(ch);
        }
    }

    getSQLSTatementsAtSelection(sel: monaco.Selection): SQLStatement[] {
        let selStart = { line: sel.startLineNumber, column: sel.startColumn };
        let selEnd = { line: sel.endLineNumber, column: sel.endColumn };

        if (this.sqlStatements == null) {
            return [];
        }

        return this.sqlStatements.filter(stmt => {
            return !(this.compare(stmt.to, selStart) < 0 || this.compare(stmt.from, selEnd) > 0);
        })

    }

    /**
     * returns 1 if a > b, 0 if a == b and -1 if a < b
     * @param a 
     * @param b 
     */
    compare(a: { line: number, column: number }, b: { line: number, column: number }): number {
        if (a.line > b.line) return 1;
        if (a.line < b.line) return -1;
        if (a.column > b.column) return 1;
        if (a.column < b.column) return -1;
        return 0;
    }



    getSQLStatementAtPosition(p: { lineNumber: number, column: number }): SQLStatement {

        return this.sqlStatements.find(statement => {
            if (statement.from.line > p.lineNumber) return false;
            if (statement.from.line == p.lineNumber && statement.from.column > p.column) return false;
            if (statement.to.line < p.lineNumber) return false;
            if (statement.to.line == p.lineNumber && statement.to.column < p.column) return false;
            return true;
        });

    }


    getCompletionHint(line: number, column: number) {
        let chList = this.completionHints.get(line);

        if (chList == null || chList.length == 0) {
            return null;
        }

        let pos = line * 1000 + column;
        chList = chList.filter(ch => pos >= ch.fromLine * 1000 + ch.fromColumn && pos <= ch.toLine * 1000 + ch.toColumn);
        if (chList.length == 0) {
            return;
        }

        // take CompletionHint with smallest range:
        let bestCh: CompletionHint = chList[0];
        let bestRangeLength = (bestCh.toLine - bestCh.fromLine) * 1000 + (bestCh.toColumn - bestCh.fromColumn);

        for (let i = 1; i < chList.length; i++) {
            let ch = chList[i];
            let rangeLength = (ch.toLine - ch.fromLine) * 1000 + (ch.toColumn - ch.fromColumn);

            if (rangeLength < bestRangeLength) {
                bestCh = ch;
                bestRangeLength = rangeLength;
            }

        }

        return bestCh;
    }


    findSymbolTableAtPosition(line: number, column: number) {
        if (this.mainSymbolTable == null) {
            return null;
        }

        if (line > this.mainSymbolTable.positionTo.line ||
            line == this.mainSymbolTable.positionTo.line && column > this.mainSymbolTable.positionTo.column
        ) {
            line = this.mainSymbolTable.positionTo.line;
            column = this.mainSymbolTable.positionTo.column - 1;
        }

        return this.mainSymbolTable.findTableAtPosition(line, column);
    }

    getErrorCount(): number {

        let ec = 0;
        for (let el of this.errors) {
            el.forEach(error => ec += error.level == "error" ? 1 : 0);
            // ec += el.length;
        }

        return ec;
    }

    getProgramTextFromMonacoModel(): string {
        return this.file.getText();
    }


    addIdentifierPosition(position: TextPosition, element: any) {
        let positionList: IdentifierPosition[] = this.identifierPositions[position.line];
        if (positionList == null) {
            positionList = [];
            this.identifierPositions[position.line] = positionList;
        }
        positionList.push({
            position: position,
            element: element
        });
    }

    getElementAtPosition(line: number, column: number): any {

        let positionsOnLine = this.identifierPositions[line];
        if (positionsOnLine == null) return null;

        let bestFoundPosition: IdentifierPosition = null;
        for (let p of positionsOnLine) {
            if (column >= p.position.column && column < p.position.column + p.position.length) {

                if (p.position.length > 0) {
                    if (bestFoundPosition == null) {
                        bestFoundPosition = p;
                    }
                }
            }
        }

        return bestFoundPosition == null ? null : <any>bestFoundPosition.element;
    }

    clear() {

        this.identifierPositions = {};

        // Lexer
        this.tokenList = null;
        this.errors[0] = [];

        // AST Parser
        this.errors[1] = [];



        // type resolver
        this.errors[2] = [];

        // Code generator
        this.errors[3] = [];
        this.mainSymbolTable = new SymbolTable(null, { line: 1, column: 1, length: 1 }, { line: 100000, column: 1, length: 0 });

        this.methodCallPositions = {};

    }

    hasErrors() {

        for (let el of this.errors) {
            if (el.find(error => error.level == "error")) {
                return true;
            }
        }

        return false;

    }

    getSortedAndFilteredErrors(): Error[] {

        let list: Error[] = [];

        for (let el of this.errors) {
            list = list.concat(el);
        }

        list.sort((a, b) => {
            if (a.position.line > b.position.line) {
                return 1;
            }
            if (b.position.line > a.position.line) {
                return -1;
            }
            if (a.position.column >= b.position.column) {
                return 1;
            }
            return -1;
        });

        for (let i = 0; i < list.length - 1; i++) {
            let e1 = list[i];
            let e2 = list[i + 1];
            if (e1.position.line == e2.position.line && e1.position.column + 10 > e2.position.column) {
                if (this.errorLevelCompare(e1.level, e2.level) == 1) {
                    list.splice(i + 1, 1);
                } else {
                    list.splice(i, 1);
                }
                i--;
            }
        }

        return list;
    }

    errorLevelCompare(level1: ErrorLevel, level2: ErrorLevel): number {
        if (level1 == "error") return 1;
        if (level2 == "error") return 2;
        if (level1 == "warning") return 1;
        if (level2 == "warning") return 2;
        return 1;
    }

        /**
     * A module is dirty if it's program code or the program code of other modules
     * it depends on has changed since last compilation run.
     */
    isDirty(): boolean {
        return this.file.getLocalVersion() != this.lastCompiledMonacoVersion;
    }

    /**
     * Set this modules' dirty-status"
     */
    setDirty(dirty: boolean) {
        if (dirty) {
            this.lastCompiledMonacoVersion = this.file.getLocalVersion() - 1;
        } else {
            this.lastCompiledMonacoVersion = this.file.getLocalVersion();
        }
    }
}


export class ModuleStore {

    private modules: Module[] = [];
    private moduleMap: Map<string, Module> = new Map();

    dirty: boolean = false;

    constructor(private main: MainBase) {
    }

    findModuleById(module_id: number): Module {
        for (let module of this.modules) {
            if (module.file.id == module_id) return module;
        }
        return null;
    }

    findModuleByFile(file: GUIFile) {
        for (let m of this.modules) {
            if (m.file == file) {
                return m;
            }
        }
        return null;
    }

    hasErrors(): boolean {
        for (let m of this.modules) {
            if (m.hasErrors()) {
                return true;
            }
        }
        return false;
    }

    getFirstModule(): Module {
        if (this.modules.length > 0) {
            for (let mo of this.modules) {
                return mo;
            }
        }
        return null;
    }

    isDirty(): boolean {

        if (this.dirty) {
            this.dirty = false;
            return true;
        }

        let dirty = false;
        for (let m of this.modules) {
            if (m.isDirty()) {
                dirty = true;
                break;
            }
        }
        return dirty;
    }


    getModules(excludedModuleName?: String): Module[] {
        let ret = [];
        for (let m of this.modules) {
            if (m.file.name != excludedModuleName) {
                ret.push(m);
            }
        }
        return ret;
    }

    putModule(module: Module) {
        this.modules.push(module);
        this.moduleMap[module.file.name] = module;
    }

    removeModuleWithFile(file: GUIFile) {
        for (let m of this.modules) {
            if (m.file == file) {
                this.removeModule(m);
                break;
            }
        }
    }

    clear() {
        this.modules = [];
        this.moduleMap = new Map();
    }

    removeModule(module: Module) {

        if (this.modules.indexOf(module) < 0) return;

        this.modules.splice(this.modules.indexOf(module), 1);
        this.moduleMap[module.file.name] = undefined;
        this.dirty = true;
    }

    getModule(moduleName: string): Module {
        return this.moduleMap[moduleName];
    }


}

