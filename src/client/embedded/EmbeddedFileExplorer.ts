import { Module, ModuleStore } from "../compiler/parser/Module.js";
import { MainEmbedded } from "./MainEmbedded.js";
import { openContextMenu, makeEditable } from "../tools/HtmlTools.js";
import { JOScript, ScriptType } from "./EmbeddedStarter.js";
import markdownit from 'markdown-it';
import * as monaco from 'monaco-editor'
import jQuery from "jquery";

type FileData = {
    type: ScriptType,
    module?: Module,
    hint?: string,
    $fileDiv: JQuery<HTMLElement>
}

export class EmbeddedFileExplorer {

    currentFile: FileData;
    files: FileData[] = [];

    constructor(private moduleStore: ModuleStore, private $fileListDiv: JQuery<HTMLElement>, private main: MainEmbedded) {

        let that = this;

        for (let module of moduleStore.getModules(false)) {

            this.addModule(module);

        }

        let $filesDiv = $fileListDiv.parent();
        let $addButton = jQuery('<div class="joe_addFileButton jo_button img_add-dark jo_active" title="Datei hinzufügen"></div>');
        $filesDiv.append($addButton);

        $addButton.on("click", () => {

            let module = this.main.addModule({ text: "", title: "Neue Datei.java", type: "sql" });
            let fileData = this.addModule(module);

            this.renameElement(fileData, () => {
                // if there's no file yet and then one is added and subsequently renamed: select it!
                if (that.currentFile != fileData) {
                    that.selectFile(fileData);
                }
            });
        });


    }

    removeAllFiles() {
        this.files.forEach(f => this.removeFile(f));
    }


    addHint(script: JOScript): void {
        let that = this;
        let $fileDiv = jQuery('<div class="jo_file jo_hint" ><div class="jo_fileimage"></div><div class="jo_filename" style="line-height: 22px">' +
            script.title + '</div><div class="jo_additionalButtons"></div></div></div>');
        this.$fileListDiv.append($fileDiv);

        let fileData: FileData = {
            module: null,
            $fileDiv: $fileDiv,
            type: "hint",
            hint: script.text
        };

        this.files.push(fileData);

        $fileDiv.on("click", (event) => {
            that.selectFile(fileData);
        });

    }


    addModule(module: Module): FileData {
        let that = this;
        let $fileDiv = jQuery(`<div class="jo_file jo_java" >
        <div class="jo_fileimage"></div>
        <div class="jo_filename" style="line-height: 22px">${module.file.name}</div>
        <div class="jo_additionalButtonStart"></div>
        <div class="jo_delete img_delete jo_button jo_active" title="Datei löschen"></div></div></div>`);
        this.$fileListDiv.append($fileDiv);

        let fileData: FileData = {
            module: module,
            $fileDiv: $fileDiv,
            type: "sql"
        };

        this.files.push(fileData);

        module.file.panelElement = {
            name: module.file.name,
            $htmlFirstLine: $fileDiv,
            isFolder: false,
            path: []
        }

        $fileDiv.find('.jo_delete').on("mousedown", (e: JQuery.MouseDownEvent) => {
            that.onDelete(fileData, e);
        })

        $fileDiv.find('.jo_delete').on("click", (e) => { e.preventDefault(); e.stopPropagation() });

        $fileDiv.on("click", (event) => {
            that.selectFile(fileData);
        });

        $fileDiv[0].addEventListener("contextmenu", function (event) {
            event.preventDefault();
            openContextMenu([{
                caption: "Umbenennen",
                callback: () => {
                    that.renameElement(fileData, () => { });
                }
            }], event.pageX, event.pageY);
        }, false);

        return fileData;

    }

    onDelete(fileData: FileData, ev: JQuery.MouseDownEvent) {
        ev.preventDefault();
        ev.stopPropagation();
        let that = this;
        openContextMenu([{
            caption: "Abbrechen",
            callback: () => {
                // nothing to do.
            }
        }, {
            caption: "Ich bin mir sicher: löschen!",
            color: "#ff6060",
            callback: () => {
                that.removeFile(fileData);
            }
        }], ev.pageX + 2, ev.pageY + 2);

    }

    removeFile(fileData: FileData) {
        fileData.$fileDiv.remove();
        this.main.removeModule(fileData.module);
        this.files = this.files.filter((fd) => fd != fileData);
        if (this.currentFile == fileData) {
            if (this.files.length > 0) {
                this.selectFile(this.files[0]);
            } else {
                this.main.getMonacoEditor().setValue("Keine Datei vorhanden.");
                this.main.getMonacoEditor().updateOptions({ readOnly: true });
            }
        }

        this.files.forEach((file) => {
            if(file.module != null){                // Hints have module == null
                file.module.file.saved = false;
            }
        });
    }

    removeModule(module: Module) {
        for (let fileData of this.files) {
            if (fileData.module == module) {
                this.removeFile(fileData);
            }
        }
    }

    renameElement(fileData: FileData, callback: () => void) {
        let that = this;
        let $div = fileData.$fileDiv.find('.jo_filename');
        let pointPos = fileData.module.file.name.indexOf('.');
        let selection = pointPos == null ? null : { start: 0, end: pointPos };
        makeEditable($div, $div, (newText: string) => {
            fileData.module.file.name = newText;
            $div.html(newText);
            if (callback != null) callback();
        }, selection);

    }


    setFirstFileActive() {
        if (this.files.length > 0) {
            this.selectFile(this.files[0]);
        }
    }

    selectFile(fileData: FileData) {
        if (fileData == null) return;
        switch (fileData.type) {
            case "sql":
                this.main.$hintDiv.hide();
                this.main.$monacoDiv.show();
                this.main.setModuleActive(fileData.module);
                this.main.getMonacoEditor().focus();
                break;
            case "hint":
                this.main.$monacoDiv.hide();
                this.main.$hintDiv.show();

                let syntaxMap: { [code: string]: string } = {};
                let code: string[] = [];

                //@ts-ignore
                let md1 = markdownit({
                    highlight: function (str, lang) {
                        code.push(str);
                        return "";
                    }
                });

                md1.renderer.rules.code_inline = function (tokens, idx, options, env, self) {
                    var token = tokens[idx];
                    code.push(token.content);
                    // pass token to default renderer.
                    return ""; //md1.renderer.rules.code_block(tokens, idx, options, env, self);
                };

                md1.render(fileData.hint);

                this.colorize(code, syntaxMap, () => {
                    //@ts-ignore
                    let md2 = markdownit({
                        highlight: function (str, lang) {
                            return syntaxMap[str];
                        }
                    });

                    md2.renderer.rules.code_inline = function (tokens, idx, options, env, self) {
                        var token = tokens[idx];
                        // pass token to default renderer.
                        return syntaxMap[token.content].replace("<br/>", "");
                    };


                    let html = md2.render(fileData.hint);
                    this.main.$hintDiv.html(html);
                });
                this.$fileListDiv.find('.jo_file').removeClass('jo_active');
                fileData.$fileDiv.addClass('jo_active');
                break;
        }
    }

    colorize(code: string[], codeMap: { [code: string]: string }, callback: () => void) {
        let that = this;
        if (code.length > 0) {
            let uncoloredtext = code.pop();
            monaco.editor.colorize(uncoloredtext, 'myJava', { tabSize: 3 }).then((text) => {
                codeMap[uncoloredtext] = text;
                that.colorize(code, codeMap, callback);
            }
            );
        } else {
            callback();
        }

    }


    markFile(module: Module) {
        this.$fileListDiv.find('.jo_file').removeClass('jo_active');

        this.currentFile = this.files.find((fileData) => fileData.module == module);

        if (this.currentFile != null) this.currentFile.$fileDiv.addClass('jo_active');

    }



}