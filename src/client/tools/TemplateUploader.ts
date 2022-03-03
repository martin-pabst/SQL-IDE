import { UploadTemplateResponse } from "../communication/Data.js";
import { Main } from "../main/Main.js";
import { Workspace } from "../workspace/Workspace.js";

export class TemplateUploader {

    uploadCurrentDatabase(workspace_id: number, main: Main, dump?: Uint8Array, callback: (response: UploadTemplateResponse) => void = () => {}){
        main.waitOverlay.show('Bitte warten, lade Vorlage auf den Server hoch ...');
        if(workspace_id >= 0){
            let dbTool = main.getDatabaseTool();
            dbTool.export((buffer) => {
                // @ts-ignore
                buffer = pako.deflate(buffer);
                this.uploadIntern(buffer, workspace_id, main, callback);        
            }, (error)=>{
                alert("Fehler beim Exportieren der Datenbank: " + error)
                main.waitOverlay.hide();
            })
        } else {
            this.uploadIntern(dump, -1, main, callback);
        }

    }


    private uploadIntern(buffer: Uint8Array, workspace_id: number, main: Main, callback: (response: UploadTemplateResponse) => void) {
        
        $.ajax({
            type: 'POST',
            async: true,
            contentType: 'application/octet-stream',
            data: buffer,
            processData: false,
            headers: { 'x-workspaceid': "" + workspace_id },
            url: "servlet/uploadTemplate",
            success: function (response: UploadTemplateResponse) {
                main.waitOverlay.hide();
                callback(response);
                return;

            },
            error: function (jqXHR, message) {
                alert('message');
                main.waitOverlay.hide();
            }
        }
        );
        return buffer;
    }
}