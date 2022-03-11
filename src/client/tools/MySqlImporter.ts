import { Lexer } from "../compiler/lexer/Lexer.js";
import { Module } from "../compiler/parser/Module.js";
import { Parser } from "../compiler/parser/Parser.js";
import { MainBase } from "../main/MainBase.js";
import { LoadableDatabase } from "./DatabaseLoader.js";

export class MySqlImporter {


    loadFromFile(file: globalThis.File, callback: (db: LoadableDatabase) => void, main: MainBase) {
        if (file == null) return;

        if (file.name.endsWith(".zip")) {
            this.unzip(file).then(text => {
                this.importFromText(text, callback, main);
            })
        } else {
            var reader = new FileReader();
            reader.onload = (event) => {
                let text = <string>event.target.result;
                this.importFromText(text, callback, main);
            };
            reader.readAsText(file);

        }
    }

    async unzip(blob: globalThis.File): Promise<string> {
        // create a BlobReader to read with a ZipReader the zip from a Blob object
        //@ts-ignore
        const reader = new zip.ZipReader(new zip.BlobReader(blob));

        // get all entries from the zip
        let entries = await reader.getEntries();
        entries = entries.filter(entry => entry.filename.endsWith(".sql"))
        let text: string = "";
        if (entries.length) {

            // get first entry content as text by using a TextWriter
            text = await entries[0].getData(
                // writer
                //@ts-ignore
                new zip.TextWriter(),
                // options
                {
                    onprogress: (index, max) => {
                        // onprogress callback
                    }
                }
            );
        }

        // close the ZipReader
        await reader.close();

        return text;
    }

    private importFromText(text: string, callback: (db: LoadableDatabase) => void, main: MainBase) {
        let lexer: Lexer = new Lexer();
        let lexOutput = lexer.lex(text);

        let parser: Parser = new Parser();
        let m: Module = new Module({
            dirty: false,
            name: "",
            saved: true,
            student_edited_after_revision: false,
            submitted_date: null,
            text: text,
            text_before_revision: null,
            version: 0
        }, main);
        m.tokenList = lexOutput.tokens;

        parser.parse(m);

        




    }


}