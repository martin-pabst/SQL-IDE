import { QueryResult } from "../../tools/DatabaseTools.js";
import { Main } from "../Main.js";

export class ResultsetPresenter {
    
    $paginationDiv: JQuery<HTMLDivElement>;
    $infoDiv: JQuery<HTMLDivElement>;
    $arrowLeft: JQuery<HTMLDivElement>;
    $arrowRight: JQuery<HTMLDivElement>;

    paginationFrom: number;
    paginationAll: number;

    paginationSize: number = 1000;

    result: QueryResult;

    constructor(private main: Main) {
        this.$paginationDiv = jQuery('.jo_pagination');
        this.$arrowLeft = jQuery('<div class="jo_button img_arrow-left-dark jo_active"></div>');
        this.$infoDiv = jQuery('<div class="jo_pagination_info">Datensätze <span class="jo_pagination_fromto">0001 - 1000</span> von <span class="jo_pagination_all">5000</span></div>');
        this.$arrowRight = jQuery('<div class="jo_button img_arrow-right-dark jo_active"></div>');

        this.$paginationDiv.append(this.$arrowLeft, this.$infoDiv, this.$arrowRight);

        this.$paginationDiv.hide();

        let mousePointer = (window.PointerEvent ? "pointer" : "mouse") + 'up';

        let that = this;
        this.$arrowLeft.on(mousePointer, (e) => {
            if(that.paginationFrom > 1){
                that.paginationFrom = Math.max(that.paginationFrom - that.paginationSize, 1);
                that.showResults();
                that.activateButtons();
            }
        })

        this.$arrowRight.on(mousePointer, (e) => {
            if(that.paginationFrom < this.paginationAll - that.paginationSize + 1){
                that.paginationFrom = Math.min(that.paginationFrom + 1000, this.paginationAll - that.paginationSize);
                that.showResults();
                that.activateButtons();
            }
        })

    }

    private activateButtons(){
        this.$arrowLeft.toggleClass('jo_active', this.paginationFrom > 1);
        this.$arrowRight.toggleClass('jo_active', this.paginationFrom < this.paginationAll - this.paginationSize + 1);
    }

    presentResultset() {

        let query = this.fetchQuery();
        if (query == null) return;

        console.log("Executing " + query);
        this.main.databaseTool.executeQuery(query, (results) => { this.presentResultsIntern(query, results) }, (error) => { console.log("Error: " + error) });



    }

    private presentResultsIntern(query: string, results: QueryResult[]) {

        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        jQuery('.jo_resultTabheading').trigger(mousePointer + "down");
        this.result = results.pop();

        let headerDiv = jQuery('.jo_result-header');

        query = query.replace(/\n/g," ");
        query = query.replace(/\s\s+/g, ' ');

        monaco.editor.colorize(query, "vscSQL", {}).then(
            (html) => { headerDiv.html(html) });

        this.paginationAll = this.result.values.length;
        this.$infoDiv.find('.jo_pagination_all').html(`${this.paginationAll}`);
        this.paginationFrom = 1;
        this.$paginationDiv.show();
        this.activateButtons();

        this.showResults();

    }

    private showResults(){
        let bodyDiv = jQuery('.jo_result-body');

        let $table = jQuery('<table></table>');
        let $header = jQuery('<tr></tr>');
        $table.append($header);

        this.result.columns.forEach((column)=>{$header.append(jQuery(`<th><div>${column}</div></th>`))});

        let rows = this.result.values.slice(this.paginationFrom - 1, this.paginationFrom + this.paginationSize - 1);

        rows.forEach((row) => {
            let $row = jQuery('<tr></tr>');
            $table.append($row);
            row.forEach((cell) => {$row.append(jQuery(`<td>${cell}</td>`))});
        });

        bodyDiv.empty().append($table);

        this.$infoDiv.find('.jo_pagination_fromto').html(`${this.paginationFrom} - ${this.paginationFrom + rows.length - 1}`)
    }


    fetchQuery(): string {
        let module = this.main.getCurrentlyEditedModule();
        if (module == null) return null;

        let monacoEditor = this.main.getMonacoEditor();
        let sqlStatement = module.getSQLStatementAtPosition(monacoEditor.getPosition());
        if (sqlStatement == null) return null;

        let sql: string = monacoEditor.getModel().getValueInRange({
            startColumn: sqlStatement.from.column,
            startLineNumber: sqlStatement.from.line, endColumn: sqlStatement.to.column, endLineNumber: sqlStatement.to.line
        });

        return sql;

    }



}