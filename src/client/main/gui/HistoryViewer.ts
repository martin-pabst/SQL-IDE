import { MainEmbedded } from "../../embedded/MainEmbedded.js";
import { copyTextToClipboard, openContextMenu } from "../../tools/HtmlTools.js";
import { WDatabase } from "../../workspace/WDatabase.js";
import { Main } from "../Main.js";
import { MainBase } from "../MainBase.js";

type HistoryPanelEntry = {
    statement: string;
    $div: JQuery<HTMLDivElement>;
    $rollbackButton: JQuery<HTMLDivElement>;
}

export class HistoryViewer {

    panelEntries: HistoryPanelEntry[] = [];

    constructor(private main: MainBase, private $historyPanel: JQuery<HTMLElement>) {

    }

    clear() {
        this.$historyPanel.empty();
        this.main.getActionManager().setActive("rollback", false);
        this.panelEntries = [];
    }

    clearAndShowStatements(statements: string[]) {
        this.clear();
        this.appendStatements(statements);
        this.main.getActionManager().setActive("rollback", statements.length > 0);
    }

    appendStatements(statements: string[]) {
        statements.forEach(stmt => {
            let panelEntry = this.makePanelEntry(stmt, this.panelEntries.length + 1);
            this.$historyPanel.prepend(panelEntry.$div);
            this.panelEntries.unshift(panelEntry);
        })

        if(statements.length > 0){
            this.main.getActionManager().setActive("rollback", true);
        }

        this.makeLastButtonActive();
    }

    makeLastButtonActive() {
        this.panelEntries.forEach(pe => pe.$rollbackButton.removeClass('jo_active'));

        if (this.panelEntries.length > 0) {
            this.panelEntries[0].$rollbackButton.addClass('jo_active');
        }
    }

    makePanelEntry(statement: string, index: number): HistoryPanelEntry {
        let $div = <JQuery<HTMLDivElement>>jQuery(`<div class="jo_panelEntry"></div>`);
        let $index = jQuery(`<div class="jo_panelEntryIndex">${index}.</div>`);
        let $text = jQuery(`<div class="jo_panelEntryText"></div>`);
        let t: string = statement.substring(0, Math.min(400, statement.length));
        if (statement.length > 400) {
            t += "...";
        }
        $text.text(t);
        let $copybutton = <JQuery<HTMLDivElement>>jQuery(`<div class="img_copy jo_panelEntryCopyButton jo_active jo_button" title="In die Zwischenablage kopieren"></div>`)
        let $rollbackbutton = <JQuery<HTMLDivElement>>jQuery(`<div class="img_undo jo_panelEntryRollbackButton jo_button" title="Rollback"></div>`)
        let that = this;

        $copybutton.on('click', () => {
            copyTextToClipboard(statement);
        })

        let mousePointer = window.PointerEvent ? "pointer" : "mouse";

        $rollbackbutton.on(mousePointer + 'up', (ev) => {
            ev.preventDefault();
            openContextMenu([{
                caption: "Abbrechen",
                callback: () => {
                }
            }, {
                caption: "Ich bin mir sicher: rollback!",
                color: "#ff6060",
                callback: () => {
                    this.rollback();
                }
            }], ev.pageX + 2, ev.pageY + 2);
            ev.stopPropagation();
        })

        $div.append($index, $text, $copybutton, $rollbackbutton);
        return {
            $div: $div,
            statement: statement,
            $rollbackButton: $rollbackbutton
        }
    }

    rollback() {
        if (this.panelEntries.length == 0) return;

        if (this.main.isEmbedded()) {
            this.rollbackEmbedded();
            this.main.getActionManager().setActive("rollback", this.panelEntries.length > 0);
        } else {
            let main: Main = <Main>this.main;
            main.networkManager.rollback((error: string, rollbackLocalNeeded: boolean) => {
                if (error == null && rollbackLocalNeeded) {
                    this.rollbackLocal();
                }
            });
        }


    }

    rollbackLocal() {
        let database = this.main.getCurrentWorkspace().database;
        database.statements.pop();
        database.version--;
        this.main.getDatabaseTool().initializeWorker(database.templateDump, database.statements, () => {

        }, () => {
            this.main.getDatabaseExplorer().refreshAfterRetrievingDBStructure();
            let lastPanelEntry = this.panelEntries.shift();
            lastPanelEntry.$div.remove();
            this.makeLastButtonActive();
            this.main.getActionManager().setActive("rollback", this.panelEntries.length > 0);
        })
    }

    rollbackEmbedded() {
        let main: MainEmbedded = <MainEmbedded>this.main;
        main.writeQueryManager.rollback();

        this.main.getDatabaseTool().initializeWorker(main.initialTemplateDump,
            main.initialStatements.concat(main.writeQueryManager.writtenStatements), () => { },
            () => {
                this.main.getDatabaseExplorer().refreshAfterRetrievingDBStructure();
                let lastPanelEntry = this.panelEntries.shift();
                lastPanelEntry.$div.remove();
                this.makeLastButtonActive();
            })
    }

}