import { Main } from "../main/Main.js";
import { Workspace } from "../workspace/Workspace.js";

export class TemplateUploader {

    upload(workspace: Workspace, main: Main){
        main.waitOverlay.show('Bitte warten, lade Vorlage auf den Server hoch ...');

        let dbTool = main.getDatabaseTool();
        dbTool.export((buffer) => {
            // @ts-ignore
            buffer = pako.deflate(buffer);
            console.log(buffer);

            $.ajax({
                type: 'POST',
                async: true,
                contentType: 'application/octet-stream',  
                data: buffer,
                processData: false,
                headers: {'x-workspaceid': "" + workspace.id},
                url: "servlet/uploadTemplate",
                success: function (response: any) {
        
                    main.waitOverlay.hide();
                    return;
        
                },
                error: function (jqXHR, message) {
                    alert('message');
                    main.waitOverlay.hide();
                }
            }
            )        


        }, (error)=>{
            alert("Fehler beim Hochladen: " + error)
            main.waitOverlay.hide();
        })

    }




}