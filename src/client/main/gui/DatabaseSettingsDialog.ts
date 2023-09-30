import { CreateWorkspaceData, WorkspaceData } from "../../communication/Data.js";
import { copyTextToClipboard, makeTabs } from "../../tools/HtmlTools.js";
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
            <div style="width: 100%; padding-left: 10px; box-sizing: border-box">
                <div class="jo_ds_settings" style="margin-left: 0px">
                <div class="jo_ds_settings_caption">Name der Datenbank:</div><div><input class="dialog-input jo_databasename" value="Neue Datenbank"></input></div>
                </div>

                <div class="jo_ds_settings_caption"> Eigentümer/in: <span class='jo_ds_settings_owner' style='font-weight: normal' ></span></div>
                <div class="jo_ds_settings_caption" style="margin-top: 20px">
                <div class="jo_ds_settings_caption" style="margin-top: 20px">
                    Beschreibung:
                </div>
                <div>
                    <textarea class="jo_ds_settings_description" maxlength="5000"></textarea>
                </div>

                <div id="jo_ds_ownerSettings">
                <div class="jo_ds_settings_caption" style="margin-top: 20px">
                    Zugriffscodes für andere Benutzer:
                    </div>
                                    
                    <div>
                        <table class="jo_ds_secret_table">
                        <tr>
                            <td>Nur Lesen:</td><td class="jo_ds_secret jo_ds_secret_read"></td><td id="copySecretTdread"></td><td><button class="jo_small_button jo_button_code_read">Neuen Code generieren</button></td>
                        <tr>
                            <td>Lesen und schreiben:</td><td class="jo_ds_secret jo_ds_secret_write"></td><td id="copySecretTdwrite"></td><td><button class="jo_small_button jo_button_code_write">Neuen Code generieren</button></td>
                        </tr>
                        <tr>
                            <td>Lesen, schreiben und Struktur verändern:</td><td class="jo_ds_secret jo_ds_secret_ddl"></td><td id="copySecretTdddl"></td><td><button class="jo_small_button jo_button_code_ddl">Neuen Code generieren</button></td>
                        </tr>
                        </table>
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

                    <div class="jo_ds_settings_caption" style="margin-top: 5px">
                    Wichtiger Hinweis:
                    </div>
                    <div style="font-weight: normal">
                    Beim erstmaligen Freigeben wird der aktuelle Zustand der Datenbank als Vorlage für andere Benutzer/innen hochgeladen und bereitgestellt. Änderungen, die danach 
                    in der Datenbank vorgenommen werden, werden nur dann in die Vorlage integriert, wenn explizit "Datenbank -> Aktuellen Zustand als Vorlage hochladen" aufgerufen wird.
                    </div>
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

        if (!this.main.user.is_teacher) {
            jQuery('#b2').next().remove();
            jQuery('#b2').remove();
        }

        if (!this.main.user.is_admin) {
            jQuery('#b3').next().remove();
            jQuery('#b3').remove();
        }

        jQuery('#jo_ds_cancel_button').on('click', () => { this.showMainWindow(); });
        jQuery('#jo_ds_save_button').on('click', () => {
            this.saveNameAndPublishedTo();
        })

        this.setValues();

        ["read", "write", "ddl"].forEach(kind => {
            jQuery('.jo_button_code_' + kind).on('pointerdown', () => {
                that.main.networkManager.setNewSecret(that.workspace.id, kind, (secret) => {
                    jQuery('.jo_ds_secret_' + kind).text(secret);
                })
            })
            let $copyButton = jQuery('<button class="jo_small_button jo_copy_secret_button jo_active">Kopieren</button>')
            jQuery('#copySecretTd' + kind).append($copyButton);
            $copyButton.on('pointerdown', () => {
                copyTextToClipboard(jQuery('.jo_ds_secret_' + kind).text());
            })
        })


    }

    saveNameAndPublishedTo() {
        let published_to = 0;
        jQuery('#jo_ds_publishedTo').find('input').each((n, element) => {
            let $element = jQuery(element);
            //@ts-ignore
            if (<HTMLInputElement>element.checked) {
                published_to = Number.parseInt(<string>$element.attr('value'));
            }
        })

        let newName = <string>jQuery('.jo_databasename').val();
        let newDescription = <string>jQuery('.jo_ds_settings_description').val();

        this.workspace.name = newName;
        this.workspace.panelElement.$htmlFirstLine.find('.jo_filename').text(newName);
        this.workspace.saved = false;

        let database = this.workspace.database;

        this.main.networkManager.setNameAndPublishedTo(this.workspace.id,
            newName, published_to, newDescription,
            () => {
                this.workspace.name = newName;
                if (database.published_to == 0 && published_to > 0) {
                    new TemplateUploader().uploadCurrentDatabase(this.workspace.id, this.main, null, "publishDatabaseAsTemplate");
                }
                database.published_to = published_to;
                database.description = newDescription;
                this.showMainWindow();
            })
    }

    setValues() {
        jQuery('.jo_databasename').val(this.workspace.database.name);
        this.main.networkManager.getDatabaseSettings(this.workspace.id, (response) => {

            let ownerText: string = response.owner;
            if (!response.userIsOwner && response.secrets != null) ownerText += " (hat aber keinen mit der Datenbank verbundenen Workspace)";

            jQuery('.jo_ds_settings_owner').text(ownerText);

            ["read", "write", "ddl"].forEach(kind => {
                let secret: string = "---";
                if (response.secrets != null) secret = response.secrets[kind];
                jQuery('.jo_ds_secret_' + kind).text(secret);
            });
            if (this.main.user.is_admin) {
                jQuery('#b3').css('visibility', 'visible');
                jQuery('#lb3').css('visibility', 'visible');
            }
            if (this.main.user.is_schooladmin) {
                jQuery('#b2').css('visibility', 'visible');
                jQuery('#lb2').css('visibility', 'visible');
            }
            // jQuery('#jo_ds_publishedTo input').attr('checked', '');
            jQuery('#b' + response.publishedTo).prop('checked', true);

            jQuery('#jo_upload_db').prop('checked', response.publishedTo != 0);

            jQuery('.jo_ds_settings_description').val(this.workspace.database.description);

            if (response.secrets == null) {
                this.$dialog.find('input, textarea').attr('readonly', '').css('background-color', '#888');
                this.$dialog.find('#jo_ds_ownerSettings').hide();
                this.$dialog.find('#jo_ds_save_button').hide();
            } else {
                this.$dialog.find('input, textarea').removeAttr('readonly').css('background-color', '#fff');;
                this.$dialog.find('#jo_ds_ownerSettings').show();
                this.$dialog.find('#jo_ds_save_button').show();
            }


        })
    }

    showMainWindow() {
        jQuery('#main').css('visibility', 'visible');
        this.$dialog.css('visibility', 'hidden');
        this.$dialog.empty();
    }



}