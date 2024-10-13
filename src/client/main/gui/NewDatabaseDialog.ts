import { CreateWorkspaceData, WorkspaceData } from "../../communication/Data.js";
import { DatabaseImportExport } from "../../tools/DatabaseImportExport.js";
import { LoadableDatabase } from "../../tools/DatabaseLoader.js";
import { DatabaseTool } from "../../tools/DatabaseTools.js";
import { makeTabs } from "../../tools/HtmlTools.js";
import { TemplateUploader } from "../../tools/TemplateUploader.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Main } from "../Main.js";
import { AccordionElement } from "./Accordion.js";


type CreateMode = "emptyDatabase" | "fromTemplate" | "useExistingDatabase" | "useDumpFile";

export class NewDatabaseDialog {

    $dialog: JQuery<HTMLElement>;
    database: LoadableDatabase;

    constructor(private main: Main, private owner_id: number, private path: string[]) {
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
             <div class="jo_tabheading" data-target="jo_createEmptyDatabaseTab">Leere Datenbank</div>
             <div class="jo_tabheading jo_active" data-target="jo_createDatabaseFromTemplateTab">Von Vorlage kopieren</div>
             <div class="jo_tabheading" data-target="jo_createDatabaseUseExistingTab">Bestehende Datenbank mitnutzen</div>
             <div class="jo_tabheading" data-target="jo_createDatabaseUseDumpFile">Import aus Dumpfile (SQLite- oder MySQL-Format)</div>
             </div>
             <div class="jo_tabs" style="width: 100%; margin-top: 10px">
                 <div class="jo_createEmptyDatabaseTab">
                    <div class="jo_createDatabaseDescription">
                        Erstellt wird eine leere Datenbank.
                    </div>
                 </div>
                 <div class="jo_createDatabaseFromTemplateTab jo_active">
                    <div class="jo_ds_settings">
                       <div class="jo_ds_settings_caption">Vorlage suchen:</div><div><input class="dialog-input jo_templatename"></input></div>
                    </div>
                    <div class="jo_templateListDiv">
                        <div class="jo_templateListOuter">
                            <div class="jo_templateListCaption">Vorlagen anderer Nutzer:</div> 
                            <div class="jo_scrollable jo_templatelist jo_templatelist_others"></div>
                        </div>
                        <div class="jo_templateListOuter">
                            <div class="jo_templateListCaption">Eigene Datenbank als Vorlage:</div> 
                            <div class="jo_scrollable jo_templatelist jo_templatelist_mine"></div>
                        </div>
                    </div>
                </div>
                <div class="jo_createDatabaseUseExistingTab">
                    <div class="jo_createDatabaseDescription">Wenn Du die Datenbank einer anderen Nutzerin/eines anderen Nutzers mitnutzen möchtest, brauchst Du einen Zugriffscode von ihr/ihm. Er ist unter Datenbank->Einstellungen zu finden.            
                    </div>
                    <div class="jo_ds_settings">
                       <div class="jo_ds_settings_caption">Zugriffscode:</div><div><input class="dialog-input jo_databasecodeinput"></input></div>
                    </div>
                 </div>
                <div class="jo_createDatabaseUseDumpFile">
                    <div class="jo_createDatabaseDescription">Wähle hier die Datei mit dem Datenbank-Dump aus (Endung .sqLite (SQLite-Datenbankdatei) oder .zip (gepackter MySql-Dump) oder .sql (MySql-Dump)):</div>
                    <input type="file" class="jo_dumpfile" name="dumpfile" style="padding: 10px"/>
                    <div class="jo_databaseimport_dropzone" style="width: 70vw; margin-left: 10px">Alternativ: Datei in dieses Feld ziehen</div>
                    <div class="jo_databaseimport_ok"></div>
                 </div>
             </div>

             <div class="dialog-buttonRow jo_ds_buttonRow">
                <button id="jo_ds_cancel_button">Abbrechen</button>
                <button id="jo_ds_create_database_button">Datenbank anlegen</button>
             </div>
            `
        ));

        makeTabs(this.$dialog);

        let $templatelist_others = jQuery('.jo_templatelist_others');
        let $templatelist_mine = jQuery('.jo_templatelist_mine');

        let myUserId = this.main.user.id;

        this.main.networkManager.fetchTemplateList((templatelist) => {
            templatelist.sort((t1, t2) => {
                return t1.name.localeCompare(t2.name);
            })
            
            templatelist.forEach(tle => {

                let $tle = jQuery('<div class="jo_templateListEntry"></div>')
                $tle.append(jQuery(`<div class="jo_tle_firstline">${tle.name} <span class="jo_tle_ownername"> (von ${tle.ownerName})</span></div>`))
                $tle.append(jQuery(`<div class="jo_tle_secondline">${tle.description}</div>`))
                $tle.data('templateId', tle.id);
                $tle.data('name', tle.name);

                if(tle.ownerId == myUserId){
                    $templatelist_mine.append($tle);
                } else {
                    $templatelist_others.append($tle);
                }
                tle.$tle = <JQuery<HTMLDivElement>>$tle;

                $tle.on('pointerdown', () => {
                    $templatelist_others.find('.jo_templateListEntry').removeClass('jo_active');
                    $templatelist_mine.find('.jo_templateListEntry').removeClass('jo_active');
                    $tle.addClass('jo_active');
                })

            })

            let $templateName = <JQuery<HTMLInputElement>>jQuery('.jo_templatename');
            $templateName.on('input', () => {
                let s = <string>$templateName.val();
                $templatelist_others.find('.jo_templateListEntry').hide();
                $templatelist_mine.find('.jo_templateListEntry').hide();
                templatelist.forEach(tle => {
                    let tleString = tle.name + tle.ownerName + (tle.description ? tle.description : "");
                    if (tleString.indexOf(s) >= 0) tle.$tle.show();
                })
            })
        })

        let $dropZone = jQuery('.jo_databaseimport_dropzone');

        $dropZone.on('dragover', (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            evt.originalEvent.dataTransfer.dropEffect = 'copy';
        })
        $dropZone.on('drop', (evt) => {
            evt.stopPropagation();
            evt.preventDefault();

            var files = evt.originalEvent.dataTransfer.files;
            this.importFile(files);
        })

        let $dumpFileInput = jQuery('.jo_dumpfile');
        $dumpFileInput.on('change', (event) => {
            //@ts-ignore
            var files: FileList = event.originalEvent.target.files;
            this.importFile(files).then(() => {
                $dumpFileInput.val(null);
            });

        })

        this.$dialog.css('visibility', 'visible');

        jQuery('#jo_ds_cancel_button').on('click', () => { this.showMainWindow(); });
        jQuery('#jo_ds_create_database_button').on('click', () => {
            let createMode: CreateMode = "emptyDatabase";
            if (jQuery('.jo_createDatabaseFromTemplateTab').hasClass('jo_active')) createMode = "fromTemplate";
            if (jQuery('.jo_createDatabaseUseExistingTab').hasClass('jo_active')) createMode = "useExistingDatabase";
            if (jQuery('.jo_createDatabaseUseDumpFile').hasClass('jo_active')) createMode = "useDumpFile";

            let workspaceData: CreateWorkspaceData = {
                id: null,
                isFolder: false,
                name: <string>jQuery('.dialog-input.jo_databasename').val(),
                path: this.path.join("/"),
            }

            switch (createMode) {
                case "emptyDatabase":
                    this.createWorkspace(workspaceData);
                    break;
                case "fromTemplate":
                    let $template = jQuery('.jo_templateListEntry.jo_active');
                    if ($template.length != 1) {
                        alert('Bitte wählen Sie genau eine Vorlage aus.');
                        return;
                    } else {
                        workspaceData.template_database_id = $template.data('templateId');
                        if (workspaceData.name == "Neue Datenbank") workspaceData.name = $template.data('name');
                        this.createWorkspace(workspaceData);
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
                    this.createWorkspace(workspaceData);
                    break;
                case "useDumpFile":
                    if (this.database != null) {
                        new TemplateUploader().uploadCurrentDatabase(-1, this.main, this.database.binDump,
                            "uploadBaseTemplateForWorkspace",
                            (response) => {
                            workspaceData.template_id = response.newTemplateId;
                            this.createWorkspace(workspaceData);
                        });

                    } else {
                        alert('Bitte laden Sie zuerst den Binärdump einer Datenbank hoch.')
                        return;
                    }
                    break;
            }

        });

    }

    private createWorkspace(workspaceData: CreateWorkspaceData) {
        this.main.networkManager.sendCreateWorkspace(workspaceData, this.owner_id, (error?: string) => {
            if (error != null) { alert(error); return; }

            let w = this.main.createNewWorkspace(workspaceData.name, this.owner_id);
            w.path = workspaceData.path;
            w.id = workspaceData.id;
            w.sql_history = "";

            let projectExplorer = this.main.projectExplorer;

            this.main.workspaceList.push(w);
            let accordionElement: AccordionElement = {
                name: workspaceData.name,
                externalElement: w,
                iconClass: "workspace",
                isFolder: false,
                path: this.path
            };

            projectExplorer.workspaceListPanel.addElement(accordionElement, true);

            w.panelElement = accordionElement;
            w.renderSettingsButton(accordionElement);

            projectExplorer.workspaceListPanel.sortElements();
            projectExplorer.fileListPanel.sortElements();

            projectExplorer.setWorkspaceActive(w);

            this.showMainWindow();

        });
    }

    async importFile(files: FileList) {
        let that = this;
        let importer = new DatabaseImportExport();
        let db: LoadableDatabase = await importer.loadFromFile(files[0], this.main)
        let isDatabase: boolean = false;
        let dumpFileType = DatabaseTool.getDumpType(db.binDump);
        if (dumpFileType == "binaryCompressed") {
            // @ts-ignore
            let dbUncompressed = pako.inflate(db.binDump);
            if (DatabaseTool.getDumpType(dbUncompressed) == "binaryUncompressed") {
                isDatabase = true;
            }
        } else if (DatabaseTool.getDumpType(db.binDump) == "binaryUncompressed") {
            //@ts-ignore
            db.binDump = pako.deflate(db.binDump);
            isDatabase = true;
        }

        if (isDatabase) {
            that.database = db;
            jQuery('.jo_databaseimport_ok').html("Die Datenbankdatei wurde erfolgreich von Datei eingelesen. Sie können die Datenbank jetzt durch Klick auf den Button unten erstellen.");
        } else {
            alert("In der Datei befindet sich kein Binärdump einer Datenbank.");
        }
    }

    showMainWindow() {
        jQuery('#main').css('visibility', 'visible');
        this.$dialog.css('visibility', 'hidden');
        this.$dialog.empty();
    }



}