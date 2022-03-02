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
    database: WDatabase;

    constructor(private main: MainBase, private $historyPanel: JQuery<HTMLElement>){

    }

    clear(){
        this.$historyPanel.empty();
        this.panelEntries = [];
    }
 
    showHistory(database: WDatabase){
        this.clear();
        this.database = database;
        if(database == null) return;

        this.appendStatements(database.statements);

    }

    appendStatements(statements: string[]) {
        statements.forEach(stmt => {
            let panelEntry = this.makePanelEntry(stmt, this.panelEntries.length + 1);
            this.$historyPanel.prepend(panelEntry.$div);
            this.panelEntries.unshift(panelEntry);
        })
        
        this.makeLastButtonActive();        
    }

    makeLastButtonActive(){
        this.panelEntries.forEach(pe => pe.$rollbackButton.removeClass('jo_active'));

        if(this.panelEntries.length > 0){
            this.panelEntries[0].$rollbackButton.addClass('jo_active');
        }       
    }

    makePanelEntry(statement: string, index: number):HistoryPanelEntry{
        let $div = <JQuery<HTMLDivElement>>jQuery(`<div class="jo_panelEntry"></div>`);
        let $index = jQuery(`<div class="jo_panelEntryIndex">${index}.</div>`);
        let $text = jQuery(`<div class="jo_panelEntryText"></div>`);
        let t: string = statement.substring(0, Math.min(400, statement.length));
        if(statement.length > 400){
            t += "...";
        }
        $text.text(t);
        let $button = <JQuery<HTMLDivElement>>jQuery(`<div class="img_undo jo_panelEntryRollbackButton jo_button" title="Rollback"></div>`)
        let that = this;
        $button.on('click', () => {
            this.rollback();
        })
        $div.append($index, $text, $button);
        return {
            $div: $div,
            statement: statement,
            $rollbackButton: $button
        }
    }

    rollback(){
        if(this.panelEntries.length == 0) return;

        if(this.main.isEmbedded()){
            this.rollbackLocal();
        } else {
            let main: Main = <Main>this.main;
            main.networkManager.rollback((error: string, rollbackLocalNeeded: boolean) => {
                if(error == null && rollbackLocalNeeded){
                    this.rollbackLocal();
                }
            });
        }
    }

    rollbackLocal(){
        this.database.statements.pop();
        this.database.version--;
        this.main.getDatabaseTool().initializeWorker(this.database.templateDump, this.database.statements, () => {

        }, () => {
            this.main.getDatabaseExplorer().refreshAfterRetrievingDBStructure();
            let lastPanelEntry = this.panelEntries.shift();
            lastPanelEntry.$div.remove();
            this.makeLastButtonActive();
        })
    }

}