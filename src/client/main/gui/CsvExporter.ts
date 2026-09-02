import { downloadFile } from "../../../tools/HtmlTools";
import type { QueryResult } from "../../sqljs-worker/DatabaseTools";
import type { MainBase } from "../MainBase";

export class CsvExporter {

    static export(main: MainBase, result: QueryResult, filename: string) {
        let settings = main.getSettings();
        let withColumnIdentifiers = settings.getValue("csvExport.withColumnIdentifiers");
        let separatorSetting = settings.getValue("csvExport.separator");
        let quotesAroundValuesSetting = settings.getValue("csvExport.quotesAroundValues");

        let file: string = "";
        let separator: string = "";

        switch (separatorSetting) {
            case "comma":
                separator = ",";
                break;
            case "semicolon":
                separator = ";";
                break;
            case "tab":
                separator = "\t";
                break;
        }

        let quotationMark: string;
        switch (quotesAroundValuesSetting) {
            case "singleQuote": quotationMark = "'"; break;
            case "doubleQuote": quotationMark = "\""; break;
            case "none": quotationMark = ""; break;
        }

        if(withColumnIdentifiers) {
            file += result.columns.map(c => `${quotationMark}${c}${quotationMark}`).join(separator) + "\n";
        }

        file += result.values.map(line => line.map(c => `${quotationMark}${c}${quotationMark}`).join(separator)).join("\n");

        downloadFile("\ufeff" + file, filename , false);
    }


}