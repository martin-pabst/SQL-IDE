import { DatabaseData } from "../communication/Data.js";

export class WDatabase {

    id: number;
    name: string;

    templateDump: Uint8Array;
    based_on_template_id: number;
    templateName: string;

    statements: string[];
    published_to: number;
    version: number;
    description: string;
    owner_id: number;

    static fromDatabaseData(data: DatabaseData, version: number): WDatabase {

        let db = new WDatabase();

        db.id = data.id;
        db.name = data.name;
        db.statements = data.statements;
        db.published_to = data.published_to;
        db.version = version;
        db.description = data.description;
        db.templateDump = null;
        db.based_on_template_id = data.based_on_template_id;
        db.owner_id = data.owner_id;
        return db;
    }



}

