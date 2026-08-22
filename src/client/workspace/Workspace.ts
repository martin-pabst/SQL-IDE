import { WorkspaceData, WorkspaceSettings } from "../communication/Data.js";
import { MainBase } from "../main/MainBase.js";
import type * as monaco from 'monaco-editor'
import { GUIFile } from '../compiler/parser/GUIFile.js';
import type { WDatabase } from './WDatabase.js';
import { Module, ModuleStore } from '../compiler/parser/Module.js';


export class Workspace {

    isFolder: boolean;
    parent_folder_id: number | null;
    sorting_order: number;
    readonly: boolean;
    id: number;

    version: number;
    // published_to 0: none; 1: class; 2: school; 3: all
    published_to: number;

    repository_id: number;    // id of repository-workspace
    has_write_permission_to_repository: boolean; // true if owner of this working copy has write permission to repository workspace

    spritesheetId: number;

    grade?: string;
    points?: string;
    comment?: string;

    private files: GUIFile[] = [];

    currentlyOpenFile: GUIFile;
    saved: boolean = true;

    pruefung_id: number;

    databaseId: number;
    database: WDatabase;
    permissions: number; // 0: read-only, 1: read-write, 2: ddl

    moduleStore: ModuleStore;

    compilerMessage: string;

    settings: WorkspaceSettings = {
    };

    constructor(public name: string, private main: MainBase, public owner_id: number) {
        this.moduleStore = new ModuleStore(main);
    }

    getFiles(): GUIFile[] {
        return this.files;
    }

    getPath(file: GUIFile): string[] {

        let path: string[] = [];
        let parent: GUIFile | undefined;
        while (parent = file.parent_folder_id ? this.files.find(f => f.id == file.parent_folder_id) : undefined) {
            path.unshift(parent.name);
            file = parent;
        }

        return path;

    }

    static pathsEqual(path1: string[], path2: string[]) {
        if (path1.length != path2.length) return false;
        for (let i = 0; i < path1.length; i++) {
            if (path1[i] != path2[i]) return false;
        }
        return true;
    }


    removeAllFiles() {
        for (let file of this.files.filter(f => f.hasMonacoModel())) {
            file.getMonacoModel().dispose();
        }
        this.files = [];
    }

    addFile(file: GUIFile) {
        this.files.push(file);
        if(!file.isFolder){
            this.moduleStore.putModule(new Module(file, this.main));
        }
    }

    removeFile(file: GUIFile) {
        let index = this.files.indexOf(file);
        if (index >= 0) this.files.splice(index, 1);
    }


    getWorkspaceData(withFiles: boolean): WorkspaceData {
        let wd: WorkspaceData = {
            name: this.name,
            isFolder: this.isFolder,
            parent_folder_id: this.parent_folder_id,
            sorting_order: this.sorting_order,
            id: this.id,
            owner_id: this.owner_id,
            current_file_id: this.currentlyOpenFile == null ? null : this.currentlyOpenFile.id,
            files: [],
            version: this.version,
            settings: JSON.stringify(this.settings),

            // Pruefung
            pruefung_id: this.pruefung_id,
            readonly: this.readonly,
            grade: this.grade,
            points: this.points,
            comment: this.comment,

            // Database
            database_id: this.databaseId,
            permissions: this.permissions
        }

        if (withFiles) {
            for (let file of this.files) {
                wd.files.push(file.getFileData(this));
            }
        }

        return wd;
    }

    static restoreFromData(wd: WorkspaceData, main: MainBase): Workspace {

        let settings: WorkspaceSettings = (wd.settings != null && wd.settings.startsWith("{")) ? JSON.parse(wd.settings) : { libraries: [] };

        //@ts-ignore
        if (settings.libaries) {
            //@ts-ignore
            settings.libraries = settings.libaries;
        }

        let w = new Workspace(wd.name, main, wd.owner_id);
        w.id = wd.id;
        w.isFolder = wd.isFolder;
        w.parent_folder_id = wd.parent_folder_id;
        w.sorting_order = wd.sorting_order;
        w.owner_id = wd.owner_id;
        w.version = wd.version;
        w.settings = settings;
        w.pruefung_id = wd.pruefung_id;

        w.readonly = wd.readonly;

        w.grade = wd.grade;
        w.points = wd.points;
        w.comment = wd.comment;

        w.databaseId = wd.database_id;
        w.permissions = wd.permissions;


        for (let f of wd.files) {

            let file = GUIFile.restoreFromData(main, f);
            w.files.push(file);

            w.moduleStore.putModule(new Module(file, main));

            if (f.id == wd.current_file_id) {
                w.currentlyOpenFile = file;
            }

        }

        return w;

    }

    findFileById(id: number): GUIFile {
        return this.files.find(f => f.id == id);
    }

    getFirstFile(): GUIFile | undefined {
        if (this.files.length > 0) return this.files[0];
        return undefined;
    }

    getIdentifier(): string {
        return this.name;
    }

    getModuleForMonacoModel(model: monaco.editor.ITextModel | null): Module | undefined {
        if (model == null) return undefined;

        let compiler = this.main?.getCompiler();
        if (!compiler) return undefined;

        for (let file of this.getFiles()) {
            if (file.getMonacoModel() == model) {
                return this.moduleStore.findModuleByFile(file);
            }
        }

        return undefined;
    }

    // async ensureModuleIsCompiled(module: Module) {
    //     if (module.isReplModule()) {
    //         this.main.getRepl().compile(module.file.getText(), false);
    //     } else {
    //         await this.main.getCompiler().updateSingleModuleForCodeCompletion(module);
    //     }
    // }

    getCurrentlyEditedModule(): Module | undefined {
        let model = this.main.getMonacoEditor().getModel();
        if (!model) return;
        return this.getModuleForMonacoModel(model);
    }

    getFileForMonacoModel(model: monaco.editor.ITextModel | null): GUIFile | undefined {
        if (model == null) return undefined;

        for (let file of this.getFiles()) {
            if (file.getMonacoModel() == model) {
                return file;
            }
        }

        return undefined;
    }

    getCurrentlyEditedFile(): GUIFile | undefined {
        let model = this.main.getMonacoEditor().getModel();
        if (!model) return;
        return this.getFileForMonacoModel(model);
    }

    /*
     * monaco editor counts LanguageChangedListeners and issues ugly warnings in console if more than
     * 200, 300, ... are created. Unfortunately it creates one each time a monaco.editor.ITextModel is created.
     * To keep monaco.editor.ITextModel instance count low we instantiate it only when needed and dispose of it
     * when switching to another workspace.
     */

    disposeMonacoModels() {
        this.getFiles().forEach(file => file.disposeMonacoModel());
    }

    createMonacoModels() {
        this.getFiles().forEach(file => file.getMonacoModel());
    }

    getFolderContentsRecursively(allWorkspaces: Workspace[]): Workspace[] {
        let ret: Workspace[] = allWorkspaces.filter(w => w.parent_folder_id == this.id);
        for (let workspace of ret.slice()) {
            if (workspace.isFolder) {
                ret = ret.concat(workspace.getFolderContentsRecursively(allWorkspaces));
            }
        }
        return ret;
    }

}

