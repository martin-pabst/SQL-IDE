import { WorkspaceData } from "../communication/Data.js";
import { Module, ModuleStore } from "../compiler/parser/Module.js";
import { AccordionElement } from "../main/gui/Accordion.js";
import { Main } from "../main/Main.js";
import { MainBase } from "../main/MainBase.js";
import { WDatabase } from "./WDatabase.js";

export class Workspace {
    
    name: string;
    path: string;
    isFolder: boolean;
    id: number;
    owner_id: number;

    version: number;
    
    moduleStore: ModuleStore;
    panelElement: AccordionElement;
    currentlyOpenModule: Module;
    saved: boolean = true;

    compilerMessage: string;

    database: WDatabase;

    sql_history: string;

    permissions: number;

    constructor(name: string, private main: MainBase, owner_id: number){
        this.name = name;
        this.owner_id = owner_id;
        this.moduleStore = new ModuleStore(main);
        this.sql_history = "";
    }
    
    getWorkspaceData(withFiles: boolean): WorkspaceData {
        let wd: WorkspaceData = {
            name: this.name,
            id: this.id,
            owner_id: this.owner_id,
            currentFileId: this.currentlyOpenModule == null ? null : this.currentlyOpenModule.file.id,
            files: [],
            sql_history: this.sql_history,
            path: "",
            isFolder: false,  
            permissions: this.permissions 
        }

        if(withFiles){
            for(let m of this.moduleStore.getModules(false)){
    
                wd.files.push(m.getFileData(this));
    
            }
        }

        return wd;
    }


    static restoreFromData(ws: WorkspaceData, main: Main): Workspace {

        let w = new Workspace(ws.name, main, ws.owner_id);
        w.id = ws.id;
        w.path = ws.path;
        w.isFolder = ws.isFolder;
        w.owner_id = ws.owner_id;
        w.sql_history = ws.sql_history;
        w.permissions = ws.permissions;

        for(let f of ws.files){

            let m: Module = Module.restoreFromData(f, main);
            w.moduleStore.putModule(m);

            if(f.id == ws.currentFileId){
                w.currentlyOpenModule = m;
            }

        }

        return w;

    }

    hasErrors(): boolean {
        
        return this.moduleStore.hasErrors();
        
    }

    getModuleByMonacoModel(model: monaco.editor.ITextModel): Module {
        for(let m of this.moduleStore.getModules(false)){
            if(m.model == model){
                return m;
            }
        }
        
        return null;
    }
}

