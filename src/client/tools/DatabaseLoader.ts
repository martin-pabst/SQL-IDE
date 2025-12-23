import { MainBase } from "../main/MainBase.js";
import { DatabaseTool } from "../sqljs-worker/DatabaseTools.js";
import { MySqlImporter } from "./MySqlImporter.js";
import jQuery from "jquery";
import pako from 'pako'
import { WaitOverlay } from "../main/gui/WaitOverlay.js";

export type LoadableDatabase = {
    binDump?: Uint8Array<ArrayBuffer>,
    statements?: string[]
}

export class DatabaseFetcher {

    constructor(private main: MainBase){

    }

    public async load(url: string, waitOverlay: WaitOverlay): Promise<LoadableDatabase> {
        let urlWithoutProtocol = url.replace("https://", "")
            .replace("http://", "").toLocaleLowerCase();

        let urlLowerCase = urlWithoutProtocol.toLocaleLowerCase();

        let templateDump: Uint8Array<ArrayBuffer> = await this.fetchTemplateFromCache(urlWithoutProtocol);
        if (templateDump != null) {
            if (DatabaseTool.getDumpType(templateDump) == "binaryCompressed") {
                waitOverlay.show("Datenbank aus Cache wird entpackt...");
                templateDump = pako.inflate(templateDump);
                waitOverlay.hide();
            }
            return { binDump: templateDump }
        }

        let db: LoadableDatabase;
        if (urlLowerCase.endsWith(".sqlite") || urlLowerCase.endsWith(".zz")) {
            db = await this.loadSqLiteDump(url, waitOverlay);
        } else if (urlLowerCase.endsWith(".zip") || urlLowerCase.endsWith(".sql")) {
            db = await this.loadMySql(url, urlWithoutProtocol);
        }

        this.saveDatabaseToCache(urlWithoutProtocol, db.binDump);

        return db;

    }

    loadMySql(url: string, urlWithoutProtocol: string): LoadableDatabase | PromiseLike<LoadableDatabase> {
        let mySqlImporter = new MySqlImporter(this.main);
        return mySqlImporter.loadFromUrl(url);
    }

    async loadSqLiteDump(url: string, waitOverlay: WaitOverlay): Promise<LoadableDatabase> {
        waitOverlay.show("Datenbank wird geladen...");
        return new Promise((resolve, reject) => {

            jQuery.ajax({
                type: 'GET',
                async: true,
                url: url,
                xhrFields: { responseType: 'arraybuffer' },
                success: function (response: any) {
                    let db = new Uint8Array(response);
                    // @ts-ignore
                    if (DatabaseTool.getDumpType(db) == "binaryCompressed") {
                        waitOverlay.show("Datenbank wird entpackt...");
                        db = pako.inflate(db);
                    }
                    waitOverlay.hide();
                    resolve({ binDump: db });
                },
                error: function (jqXHR, message) {
                    waitOverlay.hide();
                    reject(message);
                }
            });

        })

    }

    cutSqlToStatements(sql: string): string[] {
        sql = sql.replace(/\r\n/g, "\n");

        let statements: string[] = [];
        if (sql.indexOf("~@~") >= 0) {
            statements = sql.split("~@~");
        } else {
            statements = sql.split(";\n");
        }
        return statements;
    }


    async fetchTemplateFromCache(databaseIdentifier: string): Promise<Uint8Array<ArrayBuffer>> {
        if (databaseIdentifier == null) { return null; }

        if (!this.cacheAvailable()) return (null);

        let cache = await caches.open('my-cache');

        let value = await cache.match(databaseIdentifier);

        if(value == null) return null;

        let buffer = await value.arrayBuffer();

        return new Uint8Array(buffer);

    }

    async saveDatabaseToCache(databaseIdentifier: string, templateDump: Uint8Array<ArrayBuffer> | string) {
        if (!this.cacheAvailable()) return;

        let cache = await caches.open('my-cache');

        cache.put(databaseIdentifier, new Response(templateDump));
    }

    cacheAvailable(): boolean {
        return 'caches' in self;
    }

}