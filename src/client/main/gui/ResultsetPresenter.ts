import * as monaco from 'monaco-editor';
import { TokenType } from "../../compiler/lexer/Token.js";
import { SQLStatement } from "../../compiler/parser/Parser.js";
import { Table } from "../../compiler/parser/SQLTable.js";
import { SQLType } from "../../compiler/parser/SQLTypes.js";
import { StatementCleaner } from "../../compiler/parser/StatementCleaner.js";
import { QueryResult } from "../../sqljs-worker/DatabaseTools.js";
import { downloadFile } from "../../tools/HtmlTools.js";
import { WDatabase } from "../../workspace/WDatabase.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Main } from "../Main.js";
import { MainBase } from "../MainBase.js";
import jQuery from "jquery";

type RuntimeError = {
    statement: SQLStatement,
    message: string
}

export interface WriteQueryListener {
    notify(statements: SQLStatement[]): void;
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
    resultColumnTypes: SQLType[];

    writeQueryListeners: WriteQueryListener[] = [];

    public static StatementDelimiter: string = ";\n\n"

    constructor(private main: MainBase, private $bottomDiv: JQuery<HTMLElement>) {

        this.$paginationDiv = <any>$bottomDiv.find('.jo_pagination');
        const $exportCsvButton = jQuery('<div class="jo_button jo_active img_export-csv-dark"></div>')
        this.$arrowLeft = jQuery('<div class="jo_button img_arrow-left-dark jo_active"></div>');
        this.$infoDiv = jQuery('<div class="jo_pagination_info"><span class="jo_pagination_fromto"></span>/<span class="jo_pagination_all"></span></div>');
        this.$arrowRight = jQuery('<div class="jo_button img_arrow-right-dark jo_active"></div>');

        this.$paginationDiv.empty();
        this.$paginationDiv.append($exportCsvButton, this.$arrowLeft, this.$infoDiv, this.$arrowRight);

        this.$paginationDiv.hide();

        const resultTab =  <any>$bottomDiv.find('.jo_resultTab');
        resultTab.on('myshow', (e) => {
            this.$paginationDiv.show();
        })

        resultTab.on('myhide', (e) => {
            this.$paginationDiv.hide();
        })

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

        $exportCsvButton.on('click', () => {
            this.exportCSV();
        })

    }

    public addWriteQueryListener(listener: WriteQueryListener) {
        this.writeQueryListeners.push(listener);
    }

    private activateButtons() {
        this.$arrowLeft.toggleClass('jo_active', this.paginationFrom > 1);
        this.$arrowRight.toggleClass('jo_active', this.paginationFrom < this.paginationAll - this.paginationSize + 1);
    }

    exportCSV(){
        let file: string = "";
        // file += table.columns.map(c => c.identifier).join("; ") + "\n";
        if(this.result){
            file += this.result.columns.map(c => `"${c}"`).join(",") + "\n";
            file += this.result.values.map(line => line.map(c => `"${c}"`).join(",")).join("\n");
        }
        downloadFile("\ufeff" + file, "results.csv", false);

    }

    executeSelectedStatements() {

        let statements = this.fetchSelectedStatements().filter(st => st.ast.type != TokenType.omittedeStatement);

        if (statements.length == 0) return;

        let hasDDLStatements: boolean = statements.some(st => this.isDDLStatement(st));
        let hasWriteStatements: boolean = statements.some(st => this.isWriteStatement(st));
        let workspace = this.main.getCurrentWorkspace();
        let database = workspace.database;

        if (hasDDLStatements && workspace.permissions <= 1) {
            alert("Der Benutzer hat keine Berechtigung zum Ändern der Tabellenstruktur.");
            return;
        }

        if (hasWriteStatements && workspace.permissions == 0) {
            alert("Der Benutzer hat keine Berechtigung zum Einfügen/Löschen/Ändern von Datensätzen.");
            return;
        }

        if (hasDDLStatements || hasWriteStatements) {
            if (this.main.isEmbedded()) {
                this.executeDDLWriteStatementsEmbedded(workspace, statements, database);

            } else {
                this.executeDDLWriteStatementsInOnlineIDE(workspace, statements, database);
            }

        } else {
            this.executeStatements(statements, 0, [], () => { });
        }

    }

    executeDDLWriteStatementsEmbedded(workspace: Workspace, statements: SQLStatement[], database: WDatabase) {
        let sucessfullyExecutedModifyingStatements: SQLStatement[] = [];
        this.executeStatements(statements, 0, sucessfullyExecutedModifyingStatements, () => {

            if (sucessfullyExecutedModifyingStatements.length == 0)
                return;

            this.main.getDatabaseExplorer().refresh();

            this.writeQueryListeners.forEach(listener => listener.notify(sucessfullyExecutedModifyingStatements))
        })
    }

    private executeDDLWriteStatementsInOnlineIDE(workspace: Workspace, statements: SQLStatement[], database: WDatabase) {
        let main: Main = <Main>this.main;
        // Step 1: Update Database to newest version to avoid potential database reset
        main.networkManager.getNewStatements(workspace, (new_statements, firstStatementIndex) => {

            main.notifier.executeNewStatements(new_statements, firstStatementIndex, () => { },
                () => {
                    // Step 2: Execute new statements to see which are successful
                    let sucessfullyExecutedModifyingStatements: SQLStatement[] = [];
                    this.executeStatements(statements, 0, sucessfullyExecutedModifyingStatements, () => {

                        if (sucessfullyExecutedModifyingStatements.length == 0)
                            return;

                        let modifyingStatements = sucessfullyExecutedModifyingStatements.map(st => st.sqlCleaned == null ? st.sql : st.sqlCleaned)
                        database.statements = database.statements.concat(modifyingStatements);
                        this.main.getHistoryViewer().appendStatements(modifyingStatements);
                        database.version += modifyingStatements.length;

                        // Step 3: Send successful statements to server in order to retrieve new db-version-number
                        main.networkManager.AddDatabaseStatements(workspace, sucessfullyExecutedModifyingStatements.map(st => st.sqlCleaned == null ? st.sql : st.sqlCleaned), (statements_before, new_version) => {

                            // Step 5 (worst case): statements before is not empty, so the should be executed before the statements executed in step 2
                            // => clear whole database and execute all statements in the right order, beginning with a empty database.
                            if (statements_before.length > 0) {
    
                                workspace.database.version = 0;
                                workspace.database.statements = [];
                                main.networkManager.getNewStatements(workspace, () => {
                                    this.resetDatabase(database);
                                })


                            } else {

                                main.getDatabaseExplorer().refresh();

                            }

                        });
                    });
                }, false);
        });
    }

    resetDatabase(database: WDatabase) {
        this.main.getDatabaseTool().initializeWorker(database.templateDump, database.statements, () => {
            this.main.getDatabaseExplorer().refresh();
        })
    }

    executeStatementsString(statements: string[], fromIndex: number, callback: () => void) {
        if (statements.length == 0) {
            callback();
            return;
        }

        if (fromIndex < statements.length) {
            this.main.getDatabaseTool().executeQuery(statements[fromIndex],
                (results) => { this.executeStatementsString(statements, fromIndex + 1, callback) },
                (error) => { console.log("Error when executing statement " + statements[fromIndex] + "\nError : " + error); this.executeStatementsString(statements, fromIndex + 1, callback) });
        } else {
            callback();
        }
    }


    executeStatements(statements: SQLStatement[], index: number, successfullyExecutedModifyingStatements: SQLStatement[], callback: () => void, errors: RuntimeError[] = []) {

        if (index >= statements.length) {
            this.showErrors(errors);

            callback();
            return;
        }

        let statement = statements[index];


        let callback1 = () => {
            this.executeStatements(statements, index + 1, successfullyExecutedModifyingStatements, callback, errors);
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
                if (statement.ast.limitNode == null) {
                    statement.sql.trimRight();
                    while (statement.sql.endsWith(";") || statement.sql.endsWith("\n") || statement.sql.endsWith("\r")) {
                        statement.sql = statement.sql.substring(0, statement.sql.length - 1);
                        statement.sql.trimRight();
                    }
                    statement.sql += " limit 100000";
                }
                this.main.getDatabaseTool().executeQuery(statement.sql,
                    (results) => { this.presentResultsIntern(statement.sql, results, statement.resultTypes); callback1(); },
                    (error) => { errors.push({ statement: statement, message: error }); callback1(); });
            }
        } else {
            let sql = new StatementCleaner().clean(statement);
            console.log(sql);
            this.main.getDatabaseTool().executeQuery(sql, (results) => { successfullyExecutedModifyingStatements.push(statement); callback1(); }, (error) => { errors.push({ statement: statement, message: error }); callback1(); });
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

    showTable(table: Table) {
        let statement = "select * from " + table.identifier + ";";
        this.main.getDatabaseTool().executeQuery(statement,
            (results) => {
                this.presentResultsIntern(statement, results, table.columns.map(c => c.type));
            },
            (error) => { });
    }



    showErrors(errors: RuntimeError[]) {
        let $runtimeErrorsTab = this.$bottomDiv.find('.jo_errorsTab');
        let $runtimeErrorsTabHeading = this.$bottomDiv.find('.jo_errorsTabheading');

        $runtimeErrorsTab.empty();
        this.showErrorDecorations(errors);

        if (errors.length == 0) return;

        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        $runtimeErrorsTabHeading.trigger(mousePointer + "down");

        let $errorList = jQuery('<div class="jo_errorlist"></div>');
        $runtimeErrorsTab.append($errorList);

        for (let error of errors) {
            let query = error.statement.sql;
            query = query.replace(/\n/g, " ");
            query = query.replace(/\s\s+/g, ' ');

            let $errorLine = jQuery('<div class="jo_error-line" style="flex-direction:column; width: fit-content"></div>')
            $errorList.append($errorLine);

            $errorLine.on(mousePointer + 'down', () => {
                let range = {
                    startColumn: error.statement.from.column, startLineNumber: error.statement.from.line,
                    endColumn: error.statement.to.column, endLineNumber: error.statement.to.line
                };

                this.main.getMonacoEditor().revealRangeInCenter(range);
                $errorList.find('.jo_error-line').removeClass('jo_active');
                $errorLine.addClass('jo_active');

            })


            let $sqlDiv = jQuery('<div class="jo_sqlErrorStatement"></div>');
            $errorLine.append($sqlDiv);

            monaco.editor.colorize(query, "vscSQL", {}).then(
                (html) => { $sqlDiv.html(html) });

            let $messageDiv = jQuery('<div class="jo_sqlErrorMessage">' + error.message + '</div>');
            $errorLine.append($messageDiv);

        }

        this.$bottomDiv.find('.jo_tabheading').removeClass('jo_active');
        $runtimeErrorsTabHeading.addClass('jo_active');
        $runtimeErrorsTab.addClass('jo_active');

    }

    isSelectStatement(statement: SQLStatement): boolean {
        return statement.ast != null && statement.ast.type == TokenType.keywordSelect;
    }

    isDDLStatement(statement: SQLStatement): boolean {
        return statement.ast != null && [TokenType.keywordCreate, TokenType.keywordDrop, TokenType.keywordAlter, TokenType.keywordView].indexOf(statement.ast.type) >= 0;
    }

    isWriteStatement(statement: SQLStatement): boolean {
        return statement.ast != null && [TokenType.keywordInsert, TokenType.keywordDelete, TokenType.keywordUpdate].indexOf(statement.ast.type) >= 0;
    }

    private presentResultsIntern(query: string, results: QueryResult[], columnTypes: SQLType[]) {
        let $resultTabheading = this.$bottomDiv.find('.jo_resultTabheading');
        let $resultHeader = this.$bottomDiv.find('.jo_result-header');

        let mousePointer = window.PointerEvent ? "pointer" : "mouse";
        $resultTabheading.trigger(mousePointer + "down");
        this.result = results.pop();
        this.resultColumnTypes = columnTypes;

        let headerDiv = $resultHeader;

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

    public clear() {
        let $bodyDiv = this.$bottomDiv.find('.jo_result-body');
        $bodyDiv.empty();
        this.$paginationDiv.hide();
    }

    private showResultsBusy: boolean = false;
    private showResultPending: boolean = false;

    private showResults() {
        let $bodyDiv = this.$bottomDiv.find('.jo_result-body');

        if (this.result == null) {
            this.$infoDiv.find('.jo_pagination_fromto').html('---');
            $bodyDiv.html('Die Datenbank lieferte eine leere Ergebnistabelle.');
            return;
        }

        let that = this;
        let from = this.paginationAll == 0 ? 0 : this.paginationFrom;
        let to = this.paginationAll == 0 ? 0 : Math.min(this.paginationFrom + this.paginationSize - 1, this.paginationAll);
        this.$infoDiv.find('.jo_pagination_fromto').html(`${from}-${to}`)

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

        let typeIsBoolean: boolean[] = this.resultColumnTypes.map(t => {
            return ['boolean', 'tinyint(1)'].indexOf(t.toString()) >= 0
        })


        let f = () => {
            if (i < rows.length) {
                for (let j = i; j < Math.min(i + 200, rows.length); j++) {
                    let row = rows[j];
                    let $row = jQuery('<tr></tr>');
                    $table.append($row);
                    row.forEach((cell, index) => {
                        let stringValue = cell;
                        if (typeIsBoolean[index]) {
                            stringValue = cell == 1 ? 'true' : 'false';
                        }
                        $row.append(jQuery(`<td>${stringValue}</td>`))
                    });
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