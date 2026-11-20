
type FileType = {
    name: string,
    file_type: number,
    iconclass: string,
    language: string,
    suffix: string
}


export class FileTypeManager {
    static filetypes: FileType[] = [
        { name: "Textdatei", file_type: 1, iconclass: "img_file-text", language: "text", suffix: ".txt" },
        { name: "SQL-Quelltext", file_type: 0, iconclass: "img_file-sql", language: "vscSQL", suffix: ".sql"},
    ];

    static fileTypeToIconClass(file_type: number): string {
        for (let ft of this.filetypes) {
            if (ft.file_type == file_type) return ft.iconclass;
        }
        return "img_file-sql";
    }

    static filenameToFileType(filename: string): FileType {
        for (let ft of this.filetypes) {
            if (filename.endsWith(ft.suffix)) return ft;
        }

        return this.filetypes[1];
    }


}