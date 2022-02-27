import { Main } from "../main/Main.js";
import { Workspace } from "../workspace/Workspace.js";

export class TemplateUploader {

    upload(workspace: Workspace, main: Main){
        jQuery('#bitteWartenText').html('Bitte warten, lade Vorlage auf den Server hoch ...');
        jQuery('#bitteWarten').css('display', 'flex');

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
        
                    jQuery('#bitteWarten').css('display', 'none');
                    return;
        
                },
                error: function (jqXHR, message) {
                    alert('message');
                    jQuery('#bitteWarten').css('display', 'none');
                }
            }
            )        


        }, (error)=>{
            alert("Fehler beim Hochladen: " + error)
            jQuery('#bitteWarten').css('display', 'none');
        })

    }




}