import { FileData } from "../../communication/Data.js";
import { AccordionElement } from "../../main/gui/Accordion.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Error, ErrorLevel } from "../lexer/Lexer.js";
import { TextPosition, Token, TokenType, TextPositionWithoutLength } from "../lexer/Token.js";
import { SymbolTable } from "./SymbolTable.js";
import { Main } from "../../main/Main.js";
import { ASTNode } from "./AST.js";

export type File = {
    name: string,
    id?: number,
    text: string,

    text_before_revision: string,
    submitted_date: string,
    student_edited_after_revision: boolean,

    is_copy_of_id?: number,
    repository_file_version?: number,
    identical_to_repository_version: boolean,

    dirty: boolean,
    saved: boolean,
    version: number,
    panelElement?: AccordionElement
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
    file: File;
    static maxUriNumber: number = 0;
    uri: monaco.Uri;
    model: monaco.editor.ITextModel;
    oldErrorDecorations: string[] = [];
    lastSavedVersionId: number;
    editorState: monaco.editor.ICodeEditorViewState;

    errors: Error[][] = [[], [], [], []]; // 1st pass, 2nd pass, 3rd pass

    // 1st pass: Lexer
    tokenList: Token[];

    // 2nd pass: ASTParser
    mainProgramAst: ASTNode[];
    mainSymbolTable: SymbolTable;

    identifierPositions: { [line: number]: IdentifierPosition[] } = {};
    methodCallPositions: { [line: number]: MethodCallPosition[] } = {};

    static uriMap: { [name: string]: number } = {};
    bracketError: string;

    constructor(file: File, public main: Main) {
        if (file == null || this.main == null) return; // used by AdhocCompiler and ApiDoc

        this.file = file;
        // this.uri = monaco.Uri.from({ path: '/file' + (Module.maxUriNumber++) + '.learnJava', scheme: 'file' });
        let path = file.name;

        let uriCounter = Module.uriMap[path];
        if (uriCounter == null) {
            uriCounter = 0;
        } else {
            uriCounter++;
        }
        Module.uriMap[path] = uriCounter;

        if (uriCounter > 0) path += " (" + uriCounter + ")";
        this.uri = monaco.Uri.from({ path: path, scheme: 'inmemory' });
        this.model = monaco.editor.createModel(file.text, "myJava", this.uri);
        this.model.updateOptions({ tabSize: 3 });

        this.lastSavedVersionId = this.model.getAlternativeVersionId();

        let that = this;

        this.model.onDidChangeContent(() => {
            let versionId = that.model.getAlternativeVersionId();

            if (versionId != that.lastSavedVersionId) {
                that.file.dirty = true;
                that.file.saved = false;
                that.file.identical_to_repository_version = false;
                that.lastSavedVersionId = versionId;
            }

            // if(!that.main.isEmbedded()){
            if (true) {
                let main1: Main = <Main>main;
                if (main1.workspacesOwnerId != main1.user.id) {
                    if (that.file.text_before_revision == null || that.file.student_edited_after_revision) {
                        that.file.student_edited_after_revision = false;
                        that.file.text_before_revision = that.file.text;
                        that.file.saved = false;
                        main1.networkManager.sendUpdates(null, false);
                        main1.bottomDiv.homeworkManager.showHomeWorkRevisionButton();
                        main1.projectExplorer.renderHomeworkButton(that.file);
                    }
                } else {
                    that.file.student_edited_after_revision = true;
                }
            }
        });

    }



    static restoreFromData(f: FileData, main: Main): Module {

        let f1: File = {
            name: f.name,
            text: f.text,
            text_before_revision: f.text_before_revision,
            submitted_date: f.submitted_date,
            student_edited_after_revision: false,
            dirty: true,
            saved: true,
            version: f.version,
            id: f.id,
            is_copy_of_id: f.is_copy_of_id,
            repository_file_version: f.repository_file_version,
            identical_to_repository_version: f.identical_to_repository_version
        }

        let m: Module = new Module(f1, main);

        return m;

    }

    getFileData(workspace: Workspace): FileData {
        let file = this.file;
        let fd: FileData = {
            id: file.id,
            name: file.name,
            text: file.text,
            text_before_revision: file.text_before_revision,
            submitted_date: file.submitted_date,
            student_edited_after_revision: file.student_edited_after_revision,
            version: file.version,
            is_copy_of_id: file.is_copy_of_id,
            repository_file_version: file.repository_file_version,
            identical_to_repository_version: file.identical_to_repository_version,
            workspace_id: workspace.id,
            forceUpdate: false,
            file_type: 11
        }

        return fd;
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
        return this.model.getValue(monaco.editor.EndOfLinePreference.LF, false);
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

    copy(): Module {
        let m = new Module(this.file, this.main);
        m.model = this.model;
        m.mainSymbolTable = this.mainSymbolTable;
        this.mainSymbolTable = null;

        this.file.dirty = true;

        return m;
    }

    clear() {

        this.identifierPositions = {};

        if (this.file != null && this.file.dirty) {
            // Lexer
            this.tokenList = null;
            this.errors[0] = [];

            // AST Parser
            this.errors[1] = [];


        }

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
            // if (el.length > 0) {
            //     return true;
            // }
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
}


export class ModuleStore {

    private modules: Module[] = [];
    private moduleMap: Map<string, Module> = new Map();

    dirty: boolean = false;

    constructor(private main: Main) {
    }

    findModuleById(module_id: number): Module {
        for (let module of this.modules) {
            if (module.file.id == module_id) return module;
        }
        return null;
    }

    copy(): ModuleStore {
        let ms: ModuleStore = new ModuleStore(this.main);
        for (let m of this.modules) {
            ms.putModule(m.copy());
        }
        return ms;
    }

    findModuleByFile(file: File) {
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
            if (m.file.dirty) {
                dirty = true;
                break;
            }
        }
        return dirty;
    }


    getModules(includeSystemModules: boolean, excludedModuleName?: String): Module[] {
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

    removeModuleWithFile(file: File) {
        for (let m of this.modules) {
            if (m.file == file) {
                this.removeModule(m);
                break;
            }
        }
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
