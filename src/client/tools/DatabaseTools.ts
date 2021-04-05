export type DatabaseDirectoryEntry = {
    name: string,
    description: string,
    filename: string
}

export type QueryResult = {
    columns: string[],
    values: any[][]
}

export type QuerySuccessCallback = (result: QueryResult) => void;
export type QueryErrorCallback = (error: string) => void;


export class DatabaseTool {

    databaseDirectoryEntries: DatabaseDirectoryEntry[] = null;

    worker: Worker;

    queryId: number = 0;
    
    querySuccessCallbacksMap: Map<number, QuerySuccessCallback> = new Map();
    queryErrorCallbackMap: Map<number, QueryErrorCallback> = new Map();

    initializeWorker(sql: string){
        if(this.worker != null){
            this.worker.terminate();
        }

        var worker = new Worker("lib/sql.js/worker.sql-wasm.js");
        let that = this;

        worker.onmessage = () => {
            console.log("Database opened");
            worker.onmessage = event => {
                
                console.log(event.data);

                let id = event.data.id;
                if(event.data.error != null){
                    let querySuccessCallback = that.querySuccessCallbacksMap.get(id);
                    if(querySuccessCallback != null){
                        querySuccessCallback(event.data.results[0]);
                    }
                } else {
                    let queryErrorCallback = that.queryErrorCallbackMap.get(id);
                    if(queryErrorCallback != null){
                        queryErrorCallback(event.data.error);
                    }
                }

                this.queryErrorCallbackMap.delete(id);
                this.querySuccessCallbacksMap.delete(id);

            };

            worker.postMessage({
                id: that.queryId++,
                action: "exec",
                sql: sql,
                params: { }
            });

        };

        worker.onerror = e => {
            console.log("Worker error: " + e);
        } 

        worker.postMessage({
            id: that.queryId++,
            action: "open",
            buffer: null, /*Optional. An ArrayBuffer representing an SQLite Database file*/
        });

    }

    executeQuery(query: string, successCallback: QuerySuccessCallback, errorCallback: QueryErrorCallback){
        
        let id = this.queryId++;
        
        this.querySuccessCallbacksMap.set(id, successCallback);
        this.queryErrorCallbackMap.set(id, errorCallback);

        this.worker.postMessage({
            id: id,
            action: "exec",
            sql: query,
            params: { }
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

    getSQLStatements(filename: string, callback: (sql: string) => void){
        jQuery.get('assets/databases/' + filename, function(sql: string) {
            callback(sql);
         }, 'text');
    }

}