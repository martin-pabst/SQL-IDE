import { MainBase } from "../main/MainBase.js";
import { LoadableDatabase } from "./DatabaseLoader.js";
import { DatabaseTool } from "./DatabaseTools.js";
import { downloadFile } from "./HtmlTools.js";
import { MySqlImporter } from "./MySqlImporter.js";

export class DatabaseImportExport {

    async loadFromFile(file: globalThis.File, main: MainBase): Promise<LoadableDatabase>{
        let that = this;
        if (file == null) return;
        main.getWaitOverlay().show("Lese Datei ein...");
        if(file.name.endsWith(".sql") || file.name.endsWith(".zip")){
            let ld = await new MySqlImporter(main).loadFromFile(file);
            main.getWaitOverlay().hide();
            return ld;
        } else {
            var reader = new FileReader();
            return new Promise<LoadableDatabase>((resolve, reject) => {
                reader.onload = (event) => {
                    let ab: ArrayBuffer = <ArrayBuffer>event.target.result;
                    let db: Uint8Array = new Uint8Array(ab);
        
                    //@ts-ignore
                    if(DatabaseTool.getDumpType(db) == "binaryCompressed") db = pako.inflate(db);
                    
                    main.getWaitOverlay().hide();
                    resolve({binDump: db});
                };
                reader.readAsArrayBuffer(file);
    
            })
        }


    }

    saveToFile(dbTool: DatabaseTool){
        dbTool.export((db) => {
            let filename: string = prompt("Bitte geben Sie den Dateinamen ein", "datenbank.sqLite");
            if (filename == null) {
                alert("Der Dateiname ist leer, daher wird nichts gespeichert.");
                return;
            }
            if (!filename.endsWith(".sqLite")) filename = filename + ".sqLite";
            downloadFile(new Blob([db.buffer]), filename, true);
        }, () => {});
    }





}