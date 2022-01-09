import { NetworkManager } from "../../communication/NetworkManager.js";
import { TokenType } from "../../compiler/lexer/Token.js";
import { SQLStatement } from "../../compiler/parser/Parser.js";
import { QueryResult } from "../../tools/DatabaseTools.js";
import { WDatabase } from "../../workspace/WDatabase.js";
import { Main } from "../Main.js";

type RuntimeError = {
    statement: SQLStatement,
    message: string
}

export class ResultsetPresenter {

    $paginationDiv: JQuery<HTMLDivElement>;
    $infoDiv: JQuery<HTMLDivElement>;
    $arrowLeft: JQuery<HTMLDivElement>;
    $arrowRight: JQuery<HTMLDivElement>;

    paginationFrom: number;
    paginationAll: number;

    paginationSize: number = 1000;

    result: QueryResult;

    public static StatementDelimiter: string = ";\n\n"

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
            if (that.paginationFrom > 1) {
                that.paginationFrom = Math.max(that.paginationFrom - that.paginationSize, 1);
                if (that.paginationFrom % 1000 != 1) {
                    that.paginationFrom = (Math.floor(that.paginationFrom / that.paginationSize) + 1) * that.paginationSize + 1;
                }
                that.showResults();
                that.activateButtons();
            }
        })

        this.$arrowRight.on(mousePointer, (e) => {
            if (that.paginationFrom < this.paginationAll - that.paginationSize + 1) {
                that.paginationFrom = Math.min(that.paginationFrom + that.paginationSize, that.paginationAll - that.paginationSize + 1);
                that.showResults();
                that.activateButtons();
            }
        })

    }

    private activateButtons() {
        this.$arrowLeft.toggleClass('jo_active', this.paginationFrom > 1);
        this.$arrowRight.toggleClass('jo_active', this.paginationFrom < this.paginationAll - this.paginationSize + 1);
    }

    executeSelectedStatements() {

        let statements = this.fetchSelectedStatements();
        if (statements.length == 0) return;

        let hasDDLStatements: boolean = statements.some(st => this.isDDLStatement(st));
        let workspace = this.main.currentWorkspace;
        let database = workspace.database;

        if (hasDDLStatements) {
            // Step 1: Update Database to newest version to avoid potential database reset
            this.main.networkManager.getNewStatements(workspace, (new_statements, firstStatementIndex) => {

                this.main.notifier.executeNewStatements(new_statements, firstStatementIndex, () => {}, 
                () => {
                    // Step 2: Execute new statements to see which are successful
                    let sucessfullyExecutedDDLStatements: SQLStatement[] = [];
                    this.executeStatements(statements, 0, sucessfullyExecutedDDLStatements, () => {

                        if (sucessfullyExecutedDDLStatements.length == 0) return;

                        // Step 3: Send successful statements to server in order to retrieve new db-version-number
                        this.main.networkManager.AddDatabaseStatements(workspace, sucessfullyExecutedDDLStatements.map(st => st.sql), (statements_before, new_version) => {

                            // Step 4: If another user sent statements between steps 1 and 3 then they are in array statements_before.
                            // Add all new statements to local statement list
                            statements_before.forEach(st => database.statements += ResultsetPresenter.StatementDelimiter + st);
                            sucessfullyExecutedDDLStatements.forEach(st => database.statements += ResultsetPresenter.StatementDelimiter + st.sql);
                            database.version = new_version;

                            // Step 5 (worst case): statements before is not empty, so the should be executed before the statements executed in step 2
                            // => clear whole database and execute all statements in the right order, beginning with a empty database.
                            if (statements_before.length > 0) {

                                this.resetDatabase(database);

                            } else {

                                this.main.getDatabaseExplorer().refresh();

                            }

                        })
                    });
                }, false)
            })

        } else {
            this.executeStatements(statements, 0, [], () => { });
        }

    }

    resetDatabase(database: WDatabase) {
        this.main.databaseTool.initializeWorker(database.templateStatements, () => {
            this.main.databaseTool.executeQuery(database.statements, () => {
                this.main.getDatabaseExplorer().refresh();
            }, (error) => { })
        })
    }

    executeStatementsString(statements: string[], fromIndex: number, callback: () => void) {
        if (statements.length == 0) {
            callback();
            return;
        }

        if (fromIndex < statements.length) {
            this.main.databaseTool.executeQuery(statements[fromIndex],
                (results) => { this.executeStatementsString(statements, fromIndex + 1, callback) },
                (error) => { console.log("Error when executing statement " + statements[fromIndex] + "\nError : " + error); this.executeStatementsString(statements, fromIndex + 1, callback) });
        } else {
            callback();
        }
    }


    executeStatements(statements: SQLStatement[], index: number, successfullyExecutedDDLStatements: SQLStatement[], callback: () => void, errors: RuntimeError[] = []) {

        if (index >= statements.length) {
            this.showErrors(errors);
            callback();
            return;
        }

        let statement = statements[index];


        let callback1 = () => {
            this.executeStatements(statements, index + 1, successfullyExecutedDDLStatements, callback, errors);
        }

        if (statement.ast == null) {
            callback1();
            return;
        }

        if (statement.ast.type == TokenType.keywordSelect) {
            let laterSelectExists: boolean = false;
            for (let j = index + 1; j < statements.length; j++) laterSelectExists = laterSelectExists || this.isSelectStatement(statements[j]);
            if (laterSelectExists) {
                callback1();
            } else {
                if(statement.ast.limitNode == null){
                    statement.sql.trimRight();
                    while(statement.sql.endsWith(";") || statement.sql.endsWith("\n") || statement.sql.endsWith("\r")){
                        statement.sql = statement.sql.substring(0, statement.sql.length - 1);
                        statement.sql.trimRight();
                    }
                    statement.sql += " limit 100000";
                }
                this.main.databaseTool.executeQuery(statement.sql,
                    (results) => { this.presentResultsIntern(statement.sql, results); callback1(); },
                    (error) => { errors.push({ statement: statement, message: error }); callback1(); });
            }
        } else {
            this.main.databaseTool.executeQuery(statement.sql, (results) => { successfullyExecutedDDLStatements.push(statement); callback1(); }, (error) => { errors.push({ statement: statement, message: error }); callback1(); });
        }

    }

    oldErrorDecorations: string[] = [];
    showErrorDecorations(errors: RuntimeError[]) {

        let minimapColors = {
            "error": "#bc1616",
            "warning": "#cca700",
            "info": "#75beff"
        }

        let editor: monaco.editor.IStandaloneCodeEditor = this.main.getMonacoEditor();

        let markers: monaco.editor.IMarkerData[] = [];
        let decorations: monaco.editor.IModelDeltaDecoration[] = [];
        for (let error of errors) {
            let errorlevel = "error";

            let linesDecorationsClassName: string;
            let borderLeftClass: string;
            let minimapColor: string = minimapColors[errorlevel];

            switch (errorlevel) {
                case "error": linesDecorationsClassName = 'jo_revealErrorLine'; borderLeftClass = "jo_borderLeftError"; break;
                case "warning": linesDecorationsClassName = 'jo_revealWarningLine'; borderLeftClass = "jo_borderLeftWarning"; break;
                case "info": linesDecorationsClassName = 'jo_revealInfoLine'; borderLeftClass = "jo_borderLeftInfo"; break;
            }

            let severity: monaco.MarkerSeverity;
            switch (errorlevel) {
                case "error": severity = monaco.MarkerSeverity.Error; break;
                case "warning": severity = monaco.MarkerSeverity.Warning; break;
                case "info": severity = monaco.MarkerSeverity.Info; break;
            }

            markers.push({
                startLineNumber: error.statement.from.line,
                startColumn: error.statement.from.column,
                endLineNumber: error.statement.to.line,
                endColumn: error.statement.to.column,
                message: error.message,
                severity: severity
            });

            decorations.push({
                range: {
                    startLineNumber: error.statement.from.line,
                    startColumn: error.statement.from.column,
                    endLineNumber: error.statement.to.line,
                    endColumn: error.statement.to.column,
                },
                options: {
                    linesDecorationsClassName: linesDecorationsClassName,
                    minimap: {
                        position: monaco.editor.MinimapPosition.Inline,
                        color: minimapColor
                    }
                }

            });


        }

        let model = this.main.getCurrentlyEditedModule().model;
        monaco.editor.setModelMarkers(model, 'test', markers);
        this.oldErrorDecorations = model.deltaDecorations(this.oldErrorDecorations, decorations);

    }




    showErrors(errors: RuntimeError[]) {

        $('.jo_runtimeerrorsTab').empty();
        this.showErrorDecorations(errors);

        if (errors.length == 0) return;

        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        jQuery('.jo_runtimeerrorsTabheading').trigger(mousePointer + "down");

        let $errorList = jQuery('<div class="jo_errorlist"></div>');
        jQuery('.jo_runtimeerrorsTab').append($errorList);

        for (let error of errors) {
            let query = error.statement.sql;
            query = query.replace(/\n/g, " ");
            query = query.replace(/\s\s+/g, ' ');

            let $errorLine = $('<div class="jo_error-line" style="flex-direction:column; width: fit-content"></div>')
            $errorList.append($errorLine);

            $errorLine.on(mousePointer + 'down', ()=>{
                let range = {
                    startColumn: error.statement.from.column, startLineNumber: error.statement.from.line,
                    endColumn: error.statement.to.column, endLineNumber: error.statement.to.line
                };
        
                this.main.getMonacoEditor().revealRangeInCenter(range);
                $errorList.find('.jo_error-line').removeClass('jo_active');
                $errorLine.addClass('jo_active');
        
            })


            let $sqlDiv = $('<div class="jo_sqlErrorStatement"></div>');
            $errorLine.append($sqlDiv);

            monaco.editor.colorize(query, "vscSQL", {}).then(
                (html) => { $sqlDiv.html(html) });

            let $messageDiv = $('<div class="jo_sqlErrorMessage">' + error.message + '</div>');
            $errorLine.append($messageDiv);

        }

    }

    isSelectStatement(statement: SQLStatement): boolean {
        return statement.ast != null && statement.ast.type == TokenType.keywordSelect;
    }

    isDDLStatement(statement: SQLStatement): boolean {
        return statement.ast != null && statement.ast.type != TokenType.keywordSelect;
    }

    private presentResultsIntern(query: string, results: QueryResult[]) {

        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        jQuery('.jo_resultTabheading').trigger(mousePointer + "down");
        this.result = results.pop();

        let headerDiv = jQuery('.jo_result-header');

        query = query.replace(/\n/g, " ");
        query = query.replace(/\s\s+/g, ' ');
        query = query.replace(/limit 100000/g, '');

        monaco.editor.colorize(query, "vscSQL", {}).then(
            (html) => { headerDiv.html(html) });

        this.paginationAll = this.result ? this.result.values.length : 0;
        this.$infoDiv.find('.jo_pagination_all').html(`${this.paginationAll}`);
        this.paginationFrom = 1;
        this.$paginationDiv.show();
        this.activateButtons();

        this.showResults();

    }

    private showResultsBusy: boolean = false;
    private showResultPending: boolean = false;

    private showResults() {
        let $bodyDiv = jQuery('.jo_result-body');

        if(this.result == null){
            this.$infoDiv.find('.jo_pagination_fromto').html('---');
            $bodyDiv.html('Die Datenbank lieferte eine leere Ergebnistabelle.');
            return;
        }

        let that = this;
        let from = this.paginationAll == 0 ? 0 : this.paginationFrom;
        let to = this.paginationAll == 0 ? 0 : Math.min(this.paginationFrom + this.paginationSize - 1, this.paginationAll);
        this.$infoDiv.find('.jo_pagination_fromto').html(`${from} - ${to}`)

        if (this.showResultsBusy) {
            if (this.showResultPending) {
                return;
            }
            this.showResultPending = true;
            let waitFunction = () => {
                if (that.showResultsBusy) {
                    setTimeout(() => {
                        waitFunction();
                    }, 200);
                } else {
                    that.showResultPending = false;
                    that.showResults();
                }
            }
            setTimeout(waitFunction, 200);
            return;
        }

        this.showResultsBusy = true;

        let $table = jQuery('<table></table>');
        let $header = jQuery('<tr></tr>');
        $table.append($header);

        this.result.columns.forEach((column) => { $header.append(jQuery(`<th><div>${column}</div></th>`)) });

        let rows = this.result.values.slice(this.paginationFrom - 1, this.paginationFrom + this.paginationSize - 1);

        let i = 0;
        let f = () => {
            if (i < rows.length) {
                for (let j = i; j < Math.min(i + 200, rows.length); j++) {
                    let row = rows[j];
                    let $row = jQuery('<tr></tr>');
                    $table.append($row);
                    row.forEach((cell) => { $row.append(jQuery(`<td>${cell}</td>`)) });
                }
                i = Math.min(i + 200, rows.length);
                if (i < rows.length) {
                    setTimeout(f, 30);
                } else {
                    $bodyDiv.empty().append($table);
                    this.showResultsBusy = false;
                }
            }
        }

        f();

        // rows.forEach((row) => {
        //     let $row = jQuery('<tr></tr>');
        //     $table.append($row);
        //     row.forEach((cell) => {$row.append(jQuery(`<td>${cell}</td>`))});
        // });

        // bodyDiv.empty().append($table);

    }


    fetchSelectedStatements(): SQLStatement[] {
        let module = this.main.getCurrentlyEditedModule();
        if (module == null) return null;

        let monacoEditor = this.main.getMonacoEditor();
        // console.log(monacoEditor.getSelection());
        // console.log(monacoEditor.getPosition());

        let statements: SQLStatement[] = module.getSQLSTatementsAtSelection(monacoEditor.getSelection());
        for (let statement of statements) {
            statement.sql = monacoEditor.getModel().getValueInRange({
                startColumn: statement.from.column,
                startLineNumber: statement.from.line, endColumn: statement.to.column, endLineNumber: statement.to.line
            });
        }

        // let sqlStatement = module.getSQLStatementAtPosition(monacoEditor.getPosition());

        return statements;

    }



}