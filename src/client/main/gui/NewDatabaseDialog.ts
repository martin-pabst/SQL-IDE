import { CreateWorkspaceData, WorkspaceData } from "../../communication/Data.js";
import { makeTabs } from "../../tools/HtmlTools.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Main } from "../Main.js";

type CreateMode = "emptyDatabase" | "fromTemplate" | "useExistingDatabase";

export class NewDatabaseDialog {

    $dialog: JQuery<HTMLElement>;

    constructor(private main: Main, private owner_id: number) {
        this.init();
    }

    init() {
        this.$dialog = jQuery('#dialog');
        jQuery('#main').css('visibility', 'hidden');

        this.$dialog.append(jQuery(
            `<div class="jo_ds_heading">Neue Datenbank anlegen</div>

            <div class="jo_ds_settings">
               <div class="jo_ds_settings_caption">Name der Datenbank:</div><div><input class="dialog-input jo_databasename" value="Neue Datenbank"></input></div>
            </div>

             <div class="jo_tabheadings jo_cdtabheading">
             <div class="jo_tabheading jo_active" data-target="jo_createEmptyDatabaseTab">Leere Datenbank</div>
             <div class="jo_tabheading" data-target="jo_createDatabaseFromTemplateTab">Von Vorlage kopieren</div>
             <div class="jo_tabheading" data-target="jo_createDatabaseUseExistingTab">Bestehende Datenbank mitnutzen</div>
             </div>
             <div class="jo_tabs" style="width: 100%; margin-top: 10px">
                 <div class="jo_active jo_createEmptyDatabaseTab">
                 <div class="jo_createDatabaseDescription">
                 Erstellt wird eine leere Datenbank.
                 </div>
                 </div>
                 <div class="jo_createDatabaseFromTemplateTab">
                    <div class="jo_ds_settings">
                       <div class="jo_ds_settings_caption">Vorlage suchen:</div><div><input class="dialog-input jo_templatename"></input></div>
                    </div>
                    <div class="jo_scrollable jo_templatelist"></div>
                 </div>
                <div class="jo_createDatabaseUseExistingTab">
                    <div class="jo_createDatabaseDescription">Wenn Du die Datenbank einer anderen Nutzerin/eines anderen Nutzers mitnutzen möchtest, brauchst Du einen Zugriffscode von ihr/ihm. Er ist unter Datenbank->Einstellungen zu finden.            
                    </div>
                    <div class="jo_ds_settings">
                       <div class="jo_ds_settings_caption">Zugriffscode:</div><div><input class="dialog-input jo_databasecodeinput"></input></div>
                    </div>
                 </div>
             </div>

             <div class="dialog-buttonRow jo_ds_buttonRow">
                <button id="jo_ds_cancel_button">Abbrechen</button>
                <button id="jo_ds_create_database_button">Datenbank anlegen</button>
             </div>
            `
        ));

        makeTabs(this.$dialog);

        let $templatelist = jQuery('.jo_templatelist');
        this.main.networkManager.fetchTemplateList((templatelist) => {
            templatelist.forEach(tle => {

                let $tle = jQuery('<div class="jo_templateListEntry"></div>')
                $tle.append(jQuery(`<div class="jo_tle_firstline">${tle.name} <span class="jo_tle_ownername"> (von ${tle.ownerName})</span></div>`))
                $tle.append(jQuery(`<div class="jo_tle_secondline">${tle.description}</div>`))
                $tle.data('templateId', tle.id);

                $templatelist.append($tle);
                tle.$tle = <JQuery<HTMLDivElement>>$tle;

                $tle.on('pointerdown', () => {
                    $templatelist.find('.jo_templateListEntry').removeClass('jo_active');
                    $tle.addClass('jo_active');
                })

            })
            let $templateName = <JQuery<HTMLInputElement>>jQuery('.jo_templatename');
            $templateName.on('input', () => {
                let s = <string>$templateName.val();
                $templatelist.find('.jo_templateListEntry').hide();
                templatelist.forEach(tle => {
                    let tleString = tle.name + tle.ownerName + (tle.description ? tle.description : "");
                    if(tleString.indexOf(s) >= 0) tle.$tle.show();
                })
            })
        })


        this.$dialog.css('visibility', 'visible');

        jQuery('#jo_ds_cancel_button').on('click', () => { this.showMainWindow(); });
        jQuery('#jo_ds_create_database_button').on('click', () => {
            let createMode: CreateMode = "emptyDatabase";
            if (jQuery('.jo_createDatabaseFromTemplateTab').hasClass('jo_active')) createMode = "fromTemplate";
            if (jQuery('.jo_createDatabaseUseExistingTab').hasClass('jo_active')) createMode = "useExistingDatabase";

            let workspaceData: CreateWorkspaceData = {
                id: null,
                isFolder: false,
                name: <string>jQuery('.dialog-input.jo_databasename').val(),
                path: "",
            }

            switch (createMode) {
                case "emptyDatabase":
                    break;
                case "fromTemplate":
                    let $template = jQuery('.jo_templateListEntry').find('.jo_active');
                    if ($template.length != 1) {
                        alert('Bitte wählen Sie genau eine Vorlage aus.');
                        return;
                    } else {
                        workspaceData.template_database_id = $template.data('templateId');
                    }
                    break;
                case "useExistingDatabase":
                    let code = <string>jQuery('.jo_databasecodeinput').val();
                    let tIndex = code.indexOf("T");
                    if (tIndex == -1) {
                        alert("Der Zugriffscode muss das Zeichen T enthalten.");
                        return;
                    }
                    workspaceData.otherDatabaseId = Number.parseInt(code.substring(0, tIndex));
                    workspaceData.secret = code.substring(tIndex + 1);
                    break;
            }


            this.main.networkManager.sendCreateWorkspace(workspaceData, this.owner_id, (error?: string, id?: number) => {
                if (error != null) { alert(error); return; }

                let w = this.main.createNewWorkspace(workspaceData.name, this.owner_id);
                w.id = id;
                w.sql_history = "";

                let projectExplorer = this.main.projectExplorer;

                this.main.workspaceList.push(w);
                projectExplorer.workspaceListPanel.addElement({
                    name: workspaceData.name,
                    externalElement: w,
                    iconClass: "workspace",
                    isFolder: false,
                    path: []
                }, true);

                projectExplorer.workspaceListPanel.sortElements();
                projectExplorer.fileListPanel.sortElements();

                projectExplorer.setWorkspaceActive(w);

                this.showMainWindow();

            })


        });

    }

    showMainWindow() {
        jQuery('#main').css('visibility', 'visible');
        this.$dialog.css('visibility', 'hidden');
        this.$dialog.empty();
    }



}