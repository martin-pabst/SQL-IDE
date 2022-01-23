import { CreateWorkspaceData, WorkspaceData } from "../../communication/Data.js";
import { makeTabs } from "../../tools/HtmlTools.js";
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
                        <td>Nur Lesen:</td><td class="jo_ds_secret jo_ds_secret_read">123#sdkfierj</td><td><button class="jo_small_button jo_button_code_read">Neuen Code generieren</button></td>
                    <tr>
                        <td>Lesen und schreiben:</td><td class="jo_ds_secret jo_ds_secret_write">123/sdkfierj</td><td><button class="jo_small_button jo_button_code_write">Neuen Code generieren</button></td>
                    </tr>
                    <tr>
                        <td>Lesen, schreiben und Struktur verändern:</td><td class="jo_ds_secret jo_ds_secret_read">123/sdkfierj</td><td><button class="jo_small_button jo_button_code_ddl">Neuen Code generieren</button></td>
                    </tr>
                    </table>
                </div>

                <div class="jo_ds_settings_caption" style="margin-top: 20px">
                Datenbank freigeben als Vorlage für andere Benutzer:
                </div>

                <fieldset>
                    <input type="radio" id="d0" name="publishedFilter" value="0" checked=""><label for="b0">Keine Freigabe</label>
                    <input type="radio" id="b1" name="publishedFilter" value="1"><label for="b1">Freigabe für meine Klasse(n)</label>
                    <input type="radio" id="b2" name="publishedFilter" value="2"><label for="b2">Freigabe für meine Schule</label>
                </fieldset>
            </div>


             <div class="dialog-buttonRow jo_ds_buttonRow">
                <button id="jo_ds_cancel_button">Abbrechen</button>
                <button id="jo_ds_save_button">Speichern</button>
             </div>
            `
        ));


        this.$dialog.css('visibility', 'visible');

        jQuery('#jo_ds_cancel_button').on('click', () => { this.showMainWindow(); });
        jQuery('#jo_ds_save_button').on('click', () => { alert("Hier!") })




    }

    showMainWindow() {
        jQuery('#main').css('visibility', 'visible');
        this.$dialog.css('visibility', 'hidden');
        this.$dialog.empty();
    }



}