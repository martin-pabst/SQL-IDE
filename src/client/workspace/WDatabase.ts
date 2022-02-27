import { DatabaseData } from "../communication/Data.js";

export class WDatabase {

    id: number;
    name: string;

    templateDump: Uint8Array;
    templateId: number;
    templateName: string;

    statements: string[];
    published_to: number;
    version: number;
    description: string;

    static fromDatabaseData(data: DatabaseData): WDatabase {

        let db = new WDatabase();

        db.id = data.id;
        db.name = data.name;
        db.statements = data.statements;
        db.published_to = data.published_to;
        db.version = data.version;
        db.description = data.description;
        db.templateDump = null;
        db.templateId = data.template_id;

        return db;
    }



}

