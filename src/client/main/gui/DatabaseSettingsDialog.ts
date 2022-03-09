import { CreateWorkspaceData, WorkspaceData } from "../../communication/Data.js";
import { makeTabs } from "../../tools/HtmlTools.js";
import { TemplateUploader } from "../../tools/TemplateUploader.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Main } from "../Main.js";

export class DatabaseSettingsDialog {

    $dialog: JQuery<HTMLElement>;

    constructor(private main: Main, private workspace: Workspace) {
        this.init();
    }

    init() {
        this.$dialog = jQuery('#dialog');
        jQuery('#main').css('visibility', 'hidden');

        this.$dialog.append(jQuery(
            `<div class="jo_ds_heading">Datenbank-Einstellungen</div>
            <div style="width: 100%; margin-left: 10px">
                <div class="jo_ds_settings" style="margin-left: 0px">
                <div class="jo_ds_settings_caption">Name der Datenbank:</div><div><input class="dialog-input jo_databasename" value="Neue Datenbank"></input></div>
                </div>

                <div class="jo_ds_settings_caption" style="margin-top: 20px">
                Zugriffscodes für andere Benutzer:
                </div>
                                
                <div>
                    <table class="jo_ds_secret_table">
                    <tr>
                        <td>Nur Lesen:</td><td class="jo_ds_secret jo_ds_secret_read"></td><td><button class="jo_small_button jo_button_code_read">Neuen Code generieren</button></td>
                    <tr>
                        <td>Lesen und schreiben:</td><td class="jo_ds_secret jo_ds_secret_write"></td><td><button class="jo_small_button jo_button_code_write">Neuen Code generieren</button></td>
                    </tr>
                    <tr>
                        <td>Lesen, schreiben und Struktur verändern:</td><td class="jo_ds_secret jo_ds_secret_ddl"></td><td><button class="jo_small_button jo_button_code_ddl">Neuen Code generieren</button></td>
                    </tr>
                    </table>
                </div>

                <div class="jo_ds_settings_caption" style="margin-top: 20px">
                Beschreibung:
                </div>
                <div>
                <textarea class="jo_ds_settings_description" maxlength="5000"></textarea>
                </div>

                <div class="jo_ds_settings_caption" style="margin-top: 20px">
                Datenbank freigeben als Vorlage für andere Benutzer:
                </div>

                <fieldset id="jo_ds_publishedTo">
                    <input type="radio" id="b0" name="publishedFilter" value="0" checked="checked"><label for="b0">Keine Freigabe</label>
                    <input type="radio" id="b1" name="publishedFilter" value="1"><label for="b1">Freigabe für meine Klasse(n)</label>
                    <input type="radio" id="b2" name="publishedFilter" value="2" style="visibility: none"><label id="lb2" for="b2" style="visibility: none">Freigabe für meine Schule</label>
                    <input type="radio" id="b3" name="publishedFilter" value="3" style="visibility: none"><label id="lb3" for="b3" style="visibility: none">Freigabe für alle Schulen</label>
                </fieldset>

                <div>
                    <input type="checkbox" id="jo_upload_db" name="jo_upload_db">
                    <label for="jo_upload_db">Aktuellen Zustand der Datenbank als Vorlage hochladen</label>
                </div>
            </div>


             <div class="dialog-buttonRow jo_ds_buttonRow">
                <button id="jo_ds_cancel_button">Abbrechen</button>
                <button id="jo_ds_save_button">Speichern</button>
             </div>
            `
        ));


        let that = this;
        this.$dialog.css('visibility', 'visible');

        jQuery('#jo_ds_cancel_button').on('click', () => { this.showMainWindow(); });
        jQuery('#jo_ds_save_button').on('click', () => { 
            this.saveNameAndPublishedTo();
         })

        this.setValues();

        ["read", "write", "ddl"].forEach(kind => {
            jQuery('.jo_button_code_' + kind).on('pointerdown', () => {
                that.main.networkManager.setNewSecret(that.workspace.id, kind, (secret) => {
                    jQuery('.jo_ds_secret_'+kind).text(secret);
                })
            })
        })

        jQuery('#jo_ds_publishedTo>input').on('change', (e) => {$('#jo_upload_db').prop('checked', !((<HTMLInputElement>jQuery('#b0')[0]).checked))});

    }

    saveNameAndPublishedTo(){
        let published_to = 0;
        jQuery('#jo_ds_publishedTo').find('input').each( (n, element) => {
            let $element = jQuery(element);
            //@ts-ignore
            if(<HTMLInputElement>element.checked){
                published_to = Number.parseInt(<string>$element.attr('value'));
            }
        })

        this.main.networkManager.setNameAndPublishedTo(this.workspace.id, 
            <string>jQuery('.jo_databasename').val(), published_to, <string>jQuery('.jo_ds_settings_description').val(),
             () => {
                 if($('#jo_upload_db').prop('checked')){
                    new TemplateUploader().uploadCurrentDatabase(this.workspace.id, this.main);                    
                 }
                 this.showMainWindow(); 
                })
    }

    setValues(){
        jQuery('.jo_databasename').val(this.workspace.name);
        this.main.networkManager.getDatabaseSettings(this.workspace.id, (response) => {
            ["read", "write", "ddl"].forEach(kind => {
                jQuery('.jo_ds_secret_' + kind).text(response.secrets[kind]);
            });
            if(this.main.user.is_admin){
                jQuery('#b3').css('visibility', 'visible');
                jQuery('#lb3').css('visibility', 'visible');
            }
            if(this.main.user.is_schooladmin){
                jQuery('#b2').css('visibility', 'visible');
                jQuery('#lb2').css('visibility', 'visible');
            }
            // jQuery('#jo_ds_publishedTo input').attr('checked', '');
            jQuery('#b'+response.publishedTo).prop('checked', true);

            jQuery('#jo_upload_db').prop('checked', response.publishedTo != 0);

            jQuery('.jo_ds_settings_description').val(this.workspace.database.description);
        })
    }

    showMainWindow() {
        jQuery('#main').css('visibility', 'visible');
        this.$dialog.css('visibility', 'hidden');
        this.$dialog.empty();
    }



}