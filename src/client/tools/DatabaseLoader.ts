export type LoadableDatabase = {
    binDump?: Uint8Array,
    statements?: string[]
}

export class Databaseloader {

    public load(url: string, callback: (db: LoadableDatabase) => void){
        let urlWithoutProtocol = url.replace("https://", "")
           .replace("http://", "").toLocaleLowerCase();

        let isBinary = urlWithoutProtocol.endsWith(".dbdump");

        if(isBinary){
            this.loadBinary(url, urlWithoutProtocol, callback);            
        } else {
            this.loadSql(url, urlWithoutProtocol, callback);
        }

    }

    loadBinary(url: string, urlWithoutProtocol: string, callback: (db: LoadableDatabase) => void) {

        this.fetchTemplateFromCache(urlWithoutProtocol, true, (templateDump) => {
            // @ts-ignore
            if(templateDump != null) callback({binDump: pako.inflate(templateDump)})
            let that = this;

            jQuery.ajax({
                type: 'GET',
                async: true,
                url: url,
                xhrFields: { responseType: 'arraybuffer' },
                success: function (response: any) {
                    let db = new Uint8Array(response);
                    that.saveDatabaseToCache(urlWithoutProtocol, db);
                    //@ts-ignore
                    callback({binDump: pako.inflate(db)});
                },
                error: function (jqXHR, message) {
                    callback(null);
                }
            });
    

        })

    }

    loadSql(url: string, urlWithoutProtocol: string, callback: (db: LoadableDatabase) => void) {

        this.fetchTemplateFromCache(urlWithoutProtocol, false, (sql: string) => {
            let that = this;
            if(sql != null) callback({statements: that.cutSqlToStatements(sql)})

            jQuery.get(url, (sql: string) => {
                    that.saveDatabaseToCache(urlWithoutProtocol, sql);
                    callback({statements: that.cutSqlToStatements(sql)});
                }, "text")
        });

    }

    cutSqlToStatements(sql: string): string[] {
        sql = sql.replace(/\r\n/g, "\n");
                
        let statements: string[] = [];
        if(sql.indexOf("~@~") >= 0){
            statements = sql.split("~@~");
        } else {
            statements = sql.split(";\n");
        }
        return statements;
    }


    fetchTemplateFromCache(databaseIdentifier: string, isBinary: boolean, callback: (templateDump: Uint8Array|string) => void) {
        if(databaseIdentifier == null){callback(null); return;}
        let that = this;
        if(!this.cacheAvailable()) callback(null);
        this.getCache((cache) => {
            cache.match(databaseIdentifier).then(
                (value)=>{
                    if(isBinary){
                        value.arrayBuffer().then((buffer) => callback(new Uint8Array(buffer)));
                    } else {
                        value.text().then((text) => callback(text));
                    }
                })
                .catch(() => callback(null));
        })        
    }

    saveDatabaseToCache(databaseIdentifier: string, templateDump: Uint8Array|string) {
        if(!this.cacheAvailable()) return;
        let that = this;
        this.getCache((cache) => {
            cache.put(databaseIdentifier, new Response(templateDump));
        })        
    }

    cacheAvailable(): boolean {
        return 'caches' in self;
    }

    getCache(callback: (cache: Cache) => void) {
        caches.open('my-cache').then(callback);
    }
    




}