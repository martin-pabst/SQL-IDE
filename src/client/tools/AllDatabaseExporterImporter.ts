import JSZip from "jszip";
import type { Main } from "../main/Main";
import type { Workspace } from "../workspace/Workspace";

export class AllDatabaseExporterImporter {
    async saveAllWorkspacesToZipFile(main: Main): Promise<JSZip>{
        let jsZip = new JSZip();   
        for(let workspace of main.workspaceList){
            await this.saveWorkspaceToZipFile(workspace, jsZip, main);    
        }
        return jsZip;
    }

    async saveWorkspaceToZipFile(workspace: Workspace, jsZip: JSZip, main: Main): Promise<void>{
        let folder = jsZip.folder(workspace.name);

        for(let module of workspace.moduleStore.getModules(false)){
            let content = module.file.text;
            let filename = module.file.name;
            folder.file(filename, content);
        }

        let returnPromise = new Promise<void>((resolve, reject) => {
            let dbTool = main.getDatabaseTool();
    
            main.networkManager.fetchDatabase(workspace, () => {
                let statements: string[] = workspace.database.statements;
                if (statements == null) statements = [];
                dbTool.initializeWorker(workspace.database.templateDump, statements,
                    () => {
                    },
                    () => {
                        dbTool.export((db) => {
                            let filename: string = workspace.name + ".sqLite";
                            folder.file(filename, new Blob([<ArrayBuffer>db.buffer]));
                            resolve();
                        }, () => {});
                    }
                );
            });

        });

        return returnPromise;

    }

}