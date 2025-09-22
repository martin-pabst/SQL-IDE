import { csrfToken } from "../communication/AjaxHelper.js";
import { UploadTemplateResponse } from "../communication/Data.js";
import { Main } from "../main/Main.js";
import pako from 'pako';
import jQuery from "jquery";

export class TemplateUploader {

    uploadCurrentDatabase(workspace_id: number, main: Main, dump: Uint8Array | null, 
        reason: "publishDatabaseAsTemplate" | "uploadBaseTemplateForWorkspace" | "distributeWorkspace", 
        callback: (response: UploadTemplateResponse) => void = () => { }) {
            
        main.waitOverlay.show('Bitte warten, lade Vorlage auf den Server hoch ...');
        if (workspace_id >= 0) {
            let dbTool = main.getDatabaseTool();
            dbTool.export((buffer) => {
                buffer = pako.deflate(buffer);
                this.uploadIntern(buffer, workspace_id, reason, main, callback);
            }, (error) => {
                alert("Fehler beim Exportieren der Datenbank: " + error)
                main.waitOverlay.hide();
            })
        } else {
            this.uploadIntern(dump, -1, reason, main, callback);
        }

    }


    private uploadIntern(buffer: Uint8Array, workspace_id: number,
        reason: "publishDatabaseAsTemplate" | "uploadBaseTemplateForWorkspace"| "distributeWorkspace",
        main: Main, callback: (response: UploadTemplateResponse) => void) {

        let headers: {[key: string]: string;} = { 'x-workspaceid': "" + workspace_id, "x-reason": reason };
        if(csrfToken != null) headers["x-token-pm"] = csrfToken;
        
        jQuery.ajax({
            type: 'POST',
            async: true,
            contentType: 'application/octet-stream',
            data: buffer,
            processData: false,
            headers: headers,
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