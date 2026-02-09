import { MainBase } from "../main/MainBase.js";
import jQuery from "jquery";
import workerUrl from "./sqljsWorker?worker&url";
import { WorkerSim } from "./sqljsWorkerSim.js";

export type DatabaseDumpType = "binaryUncompressed" | "binaryCompressed" | "other";

export type DatabaseDirectoryEntry = {
    name: string,
    description: string,
    filename: string
}

export type QueryResult = {
    columns: string[],
    values: any[][],
    buffer?: Uint8Array<ArrayBuffer>
}

export type QuerySuccessCallback = (results: QueryResult[]) => void;
export type QueryErrorCallback = (error: string) => void;

export type ColumnStructure = {
    name: string;
    table: TableStructure;

    typeLengths?: number[]; // for varchar(5), ...
    completeTypeSQL: string;
    enumValues: string[];

    references?: ColumnStructure;
    referencesRawData?: any[];
    isPrimaryKey: boolean;
    isAutoIncrement: boolean;

    notNull: boolean;
    defaultValue: string;

    dumpValueFunction?: (any) => string
}

export type TableStructure = {
    name: string;
    size: number;
    columns: ColumnStructure[];
    completeSQL: string;
    type: ("table" | "view");
}

export type DatabaseStructure = {
    tables: TableStructure[]
}


export class DatabaseTool {

    databaseDirectoryEntries: DatabaseDirectoryEntry[] = null;

    worker: Worker;

    queryId: number = 0;

    querySuccessCallbacksMap: Map<number, QuerySuccessCallback> = new Map();
    queryErrorCallbackMap: Map<number, QueryErrorCallback> = new Map();

    databaseStructure: DatabaseStructure;

    constructor(private main: MainBase) {

    }

    initializeWorker(template: Uint8Array, queries: string[], callbackAfterInitializing?: (errors: string[]) => void,
        callbackAfterRetrievingStructure?: () => void) {

        this.main.getWaitOverlay().show('Bitte warten, die Datenbank wird initialisiert...');

        if (this.worker != null) {
            this.worker.terminate();
        }

        let t = performance.now();

        // @ts-ignore
        if (window.jo_doc) {
            // In embedded mode inside iframe the calling domain is different, so web workers are not supported
            // because of browser security policy.
            // Use simulated worker instead.
            //@ts-ignore
            this.worker = new WorkerSim();
        } else {
            // see https://v3.vitejs.dev/guide/features.html#web-workers
            // see https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
            this.worker = new Worker(new URL("sqljsWorker.ts", import.meta.url), { type: 'module' });
            this.worker = new Worker(workerUrl, { type: 'module' });
        }
        let that = this;

        let errors: string[] = [];

        this.worker.onmessage = () => {
            // console.log("Database opened (" + (performance.now() - t)/1000 + " s)");
            that.worker.onmessage = event => {

                // console.log(event.data);

                let id = event.data.id;
                if (event.data.error == null) {
                    let querySuccessCallback = that.querySuccessCallbacksMap.get(id);
                    if (querySuccessCallback != null) {
                        querySuccessCallback(event.data.results);
                    }
                } else {
                    let queryErrorCallback = that.queryErrorCallbackMap.get(id);
                    if (queryErrorCallback != null) {
                        queryErrorCallback(event.data.error);
                    }
                }

                // if(event.data.buffer){
                //     console.log(event.data.buffer);
                // }


                this.queryErrorCallbackMap.delete(id);
                this.querySuccessCallbacksMap.delete(id);

            };

            if (queries == null) queries = [];
            queries = queries.slice();
            queries.unshift("PRAGMA foreign_keys = OFF;")
            queries.push("PRAGMA foreign_keys = ON;")
            let queryCount = queries.length;

            let execQuery = () => {
                if (queries.length > 0) {
                    this.main.getWaitOverlay().setProgress(`${Math.round((1 - queries.length / queryCount) * 100) + " %"}`)
                    let query = queries.shift();
                    that.executeQuery(query, (result) => {
                        execQuery();
                    }, (error) => {
                        errors.push("Error while setting up database: " + error + ", query: " + query);
                        console.log({ "error": "Error while setting up database: " + error, "query": query });
                        console.log()
                        execQuery();
                    })
                } else {
                    if (callbackAfterInitializing != null) callbackAfterInitializing(errors);
                    that.retrieveDatabaseStructure(() => {
                        // console.log("Database structure retrieved (" + (performance.now() - t)/1000 + " s)");
                        if (callbackAfterRetrievingStructure) callbackAfterRetrievingStructure();
                        this.main.getWaitOverlay().hide();

                    });
                }
            }

            execQuery();

            // that.executeQuery(sql, (result) => {
            //     // console.log("Template written (" + (performance.now() - t)/1000 + " s)");

            //     if (callbackAfterInitializing != null) callbackAfterInitializing();
            //     that.retrieveDatabaseStructure(() => {
            //         // console.log("Database structure retrieved (" + (performance.now() - t)/1000 + " s)");
            //         if (callbackAfterRetrievingStructure) callbackAfterRetrievingStructure();
            //         jQuery('#bitteWarten').css('display', 'none');

            //     });
            //     // that.executeQuery("select * from test", (results: QueryResult[]) => {console.log(results)}, (error) => {console.log("Error:" + error)});
            // },
            //     (error) => {
            //         console.log("Error while setting up database: " + error);
            //     });

            // that.worker.postMessage({
            //     action: "export"
            // })

        };

        this.worker.onerror = (e) => {
            errors.push("Worker error: " + e.error);
            console.log("Worker error: " + e.error);
        }

        this.worker.postMessage({
            id: that.queryId++,
            action: "open",
            buffer: template, /*Optional. An ArrayBuffer representing an SQLite Database file*/
        });

    }

    executeQuery(query: string, successCallback: QuerySuccessCallback, errorCallback: QueryErrorCallback) {

        let id = this.queryId++;

        this.querySuccessCallbacksMap.set(id, successCallback);
        this.queryErrorCallbackMap.set(id, errorCallback);

        this.worker.postMessage({
            id: id,
            action: "exec",
            sql: query,
            params: {}
        });

    }

    export(successCallback: (buffer: Uint8Array<ArrayBuffer>) => void, errorCallback: QueryErrorCallback) {

        let id = this.queryId++;

        this.querySuccessCallbacksMap.set(id, (results) => { successCallback(results[0].buffer) });
        this.queryErrorCallbackMap.set(id, errorCallback);

        this.worker.postMessage({
            id: id,
            action: "export",
            params: {}
        });

    }



    getDirectoryEntries(callback: (entries: DatabaseDirectoryEntry[]) => void) {
        if (this.databaseDirectoryEntries != null) {
            callback(this.databaseDirectoryEntries);
        } else {
            jQuery.getJSON("assets/databases/directory.json", function (entries: DatabaseDirectoryEntry[]) {
                callback(entries);
            });
        }
    }

    retrieveDatabaseStructure(callback: (dbStructure: DatabaseStructure) => void) {

        /*
            @see https://stackoverflow.com/questions/6460671/sqlite-schema-information-metadata
        */
        let sql = `SELECT name, sql, type FROM sqlite_master WHERE type='table' or type='view';`
        let that = this;

        this.executeQuery(sql, (result) => {
            let sql1 = "";
            let values = result[0]?.values;
            let types: ("table" | "view")[] = values?.map(value => value[2]);

            values?.forEach(value => sql1 += `PRAGMA table_info("${value[0]}");\nPRAGMA foreign_key_list("${value[0]}");\nselect count(*) from "${value[0]}";\n\n`)

            if (sql1 != "") {
                this.executeQuery(sql1, (result1) => {
                    // console.log("DB structure: ");
                    // console.log(result1);

                    that.databaseStructure = that.parseDatabaseStructure(result, result1, types)

                    callback(that.databaseStructure);

                }, (error) => {
                    console.log(error);
                    that.databaseStructure = { tables: [] };
                    callback(that.databaseStructure);
                });
            } else {
                that.databaseStructure = { tables: [] };
                callback(that.databaseStructure);
            }

        }, (error) => {
            console.log(error);
            alert("Error retrieving database structure: " + error);
            that.databaseStructure = { tables: [] };
            callback(that.databaseStructure);
        });


    }

    parseDatabaseStructure(tables: QueryResult[], columns: QueryResult[], types: ("table" | "view")[]): DatabaseStructure {
        this.databaseStructure = {
            tables: []
        };

        let tableNameToStructureMap: Map<string, TableStructure> = new Map();

        let index = 0;
        for (let i = 0; i < tables[0].values.length; i++) {
            let tableName = tables[0].values[i][0];
            let tableSQL = <string>tables[0].values[i][1];

            let tableStructure: TableStructure = {
                name: tableName,
                size: 0,
                completeSQL: tableSQL,
                columns: [],
                type: types[i]
            }

            tableNameToStructureMap.set(tableName.toLocaleLowerCase(), tableStructure);

            this.databaseStructure.tables.push(tableStructure);

            let columnArray = columns[index].values;
            let foreignKeyList: any[][] = null;
            if (columns.length > index + 1 && columns[index + 1].columns[0] == "id") {
                foreignKeyList = columns[index + 1].values;
                index++;
            }
            index++;
            let size: number = columns[index].values[0][0];
            index++;

            tableStructure.size = size;

            columnArray.forEach(columnArray1 => {
                let cid: number = columnArray1[0];
                let name: string = columnArray1[1];
                let type: string = columnArray1[2];
                let notNull: boolean = columnArray1[3] == 1;
                let dflt_value: string = columnArray1[4];
                let isPrimaryKey: boolean = columnArray1[5] != 0;

                let enumValues: string[] = [];

                if (type.indexOf("Enum") >= 0) {
                    let rs = `"${name}" ${type} .* check\\("${name}" in \\((.*)\\)\\)`;
                    let regEx = new RegExp(rs);
                    let match = tableSQL.match(regEx);
                    if (match != null) {
                        enumValues = match[1].split(", ");
                    }
                }

                let columnStructure: ColumnStructure = {
                    name: name,
                    isPrimaryKey: isPrimaryKey,
                    isAutoIncrement: isPrimaryKey && tableSQL.toLowerCase().indexOf("autoincrement") >= 0,
                    completeTypeSQL: type,
                    enumValues: enumValues,
                    table: tableStructure,
                    typeLengths: [],
                    defaultValue: dflt_value,
                    notNull: notNull
                }
                /*
                    columns: (8) ["id", "seq", "table", "from", "to", "on_update", "on_delete", "match"]
                    values: Array(1)
                    0: (8) [0, 0, "land", "LNR", "lnr", "NO ACTION", "NO ACTION", "NONE"]
                */

                if (foreignKeyList != null) {
                    let fkInfo: any[] = foreignKeyList.find(foreignKeyInfo => foreignKeyInfo[3].toLocaleLowerCase() == name.toLocaleLowerCase());
                    if (fkInfo != null) {
                        columnStructure.referencesRawData = fkInfo;
                    }
                }

                tableStructure.columns.push(columnStructure);

            });

        }

        for (let ts of this.databaseStructure.tables) {
            for (let cs of ts.columns) {
                if (cs.referencesRawData != null) {
                    let table = tableNameToStructureMap.get(cs.referencesRawData[2]?.toLocaleLowerCase());
                    // SQlite doesn't remove foreign key references to columns of a dropped table
                    if (table == null) continue;
                    let column = table.columns.find(c => c.name.toLocaleLowerCase() == cs.referencesRawData[4].toLocaleLowerCase());
                    cs.references = column;
                }
            }
        }

        // console.log(this.databaseStructure);

        return this.databaseStructure;

    }

    static getDumpType(dump: Uint8Array): DatabaseDumpType {

        let sqliteMagicBytes: number[] = [0x53, 0x51, 0x4c, 0x69, 0x74, 0x65];
        let zlibMagicByte: number = 0x78;

        let found: boolean = true;
        for (let i = 0; i < sqliteMagicBytes.length; i++) {
            if (sqliteMagicBytes[i] != dump[i]) {
                found = false;
                break;
            }
        }
        if (found) return "binaryUncompressed";

        if (dump[0] == zlibMagicByte) return "binaryCompressed";

        return "other";

    }


}