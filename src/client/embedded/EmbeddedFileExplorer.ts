import { MainEmbedded } from "./MainEmbedded.js";
import markdownit from 'markdown-it';
import * as monaco from 'monaco-editor'
import  { GUIFile } from "../compiler/parser/GUIFile.js";
import  { Treeview } from "../../tools/components/treeview/Treeview.js";
import { FileTypeManager } from "../compiler/parser/FileTypeManager.js";
import { EmbeddedMessages } from "./EmbeddedMessages.js";
import type { Workspace } from "../workspace/Workspace.js";

export class EmbeddedFileExplorer {

    public treeview: Treeview<GUIFile, number>;

    constructor($fileListDiv: JQuery<HTMLElement>, private main: MainEmbedded) {

        this.treeview = new Treeview(<HTMLDivElement>$fileListDiv[0], {
            captionLine: {
                enabled: true,
                text: "Dateien"
            },
            withSelection: true,
            selectMultiple: false,
            buttonAddElements: true,
            buttonAddElementsCaption: "Dateien hinzufügen",
            buttonAddFolders: false,
            comparator: ((a, b) => a.name.localeCompare(b.name)),
            keyExtractor: (file) => file.id,
            parentKeyExtractor: (file) => file.parent_folder_id,
            withDeleteButtons: true,
            confirmDelete: true,
            orderBy: "comparator",
            scrollToSelectedElement: false
        });

        this.treeview.newNodeCallback = async (name, node) => {
            let file = this.main.addFile({ text: "", title: name });

            let fileType = FileTypeManager.filenameToFileType(file.name);
            node.iconClass = fileType.iconclass;
            node.readOnly = fileType.suffix == ".md";
            node.externalObject = file;

            this.treeview.selectNodeAndSetFocus(node, true);
            return file;
        }

        this.treeview.renameCallback = async (file, newName, node): Promise<{ correctedName: string; success: boolean; }> => {
            newName = newName.substring(0, 30);
            file.name = newName;
            file.setSaved(false);
            main.saveScripts();
            let fileType = FileTypeManager.filenameToFileType(newName);
            monaco.editor.setModelLanguage(file.getMonacoModel(), fileType.language);

            return { correctedName: newName, success: true };
        }

        this.treeview.deleteCallback = async (file, node) => {
            let files = this.treeview.nodes.filter(node => !node.isRootNode() && node.externalObject != file).map(node => node.externalObject);
            this.main.removeFile(file);
            if (node?.hasFocus) {
                if (files.length > 0) {
                    this.selectFile(files[0], true);
                } else {
                    this.selectFirstFileIfPresent();
                }
            }
            this.treeview.nodes.forEach(node => node.externalObject?.setSaved(false));
            this.main.showResetButton();
            return true;
        }

        this.treeview.nodeClickedCallback = (file) => {
            this.selectFile(file, true);
        }

    }

    selectFirstFileIfPresent(): GUIFile {
        if (this.treeview.nodes.length > 1) {
            let nodeToSelect = this.treeview.nodes[1];
            this.treeview.selectNodeAndSetFocus(nodeToSelect, true);
            return nodeToSelect.externalObject;
        } else {
            let editor = this.main.getMonacoEditor();
            let model = monaco.editor.createModel("Keine Datei vorhanden.", "plaintext");
            editor.setModel(model);
            // editor.setValue("Keine Datei vorhanden.");
            editor.updateOptions({ readOnly: true });
        }
    }

    getUniqueFilename(): string {
        let newFileName = EmbeddedMessages.NewFileName();

        let i = 0;
        let name: string = newFileName + " " + i + ".java";
        while (this.treeview.nodes.some(node => node.caption == (name = newFileName + " " + i + ".java"))) {
            i++;
        }

        return name;

    }

    removeAllFiles() {
        this.treeview.clear();
        this.selectFirstFileIfPresent();
    }


    addFile(file: GUIFile) {

        let fileType = FileTypeManager.filenameToFileType(file.name);
        let iconclass = fileType.iconclass;
        let node = this.treeview.addNode(false, file.name, iconclass, file);
        node.readOnly = fileType.suffix == ".md";

    }

    removeFile(file: GUIFile, focusFirstFileSubsequently: boolean = true) {
        this.treeview.removeElementAndItsFolderContents(file);
        this.selectFirstFileIfPresent();
        this.treeview.nodes.forEach(node => node.externalObject?.setSaved(false));
    }

    selectFile(file: GUIFile, focusEditorSubsequently: boolean = true) {

        if (!file) return;

        let type = FileTypeManager.filenameToFileType(file.name);

        switch (type.suffix) {
            case ".md":
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

                md1.render(file.getText());

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


                    let html = md2.render(file.getText());
                    this.main.$hintDiv.html(html);
                });
                break;

            default:
                this.main.$hintDiv.hide();
                this.main.$monacoDiv.show();
                this.main.setFileActive(file);
                if (focusEditorSubsequently) {
                    setTimeout(() => {
                        this.main.getMonacoEditor().focus();
                    }, 100);
                }

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


    getFiles() {
        return this.treeview.nodes.filter(node => !node.isRootNode() && node.externalObject).map(node => node.externalObject);
    }

    renderErrorCount(currentWorkspace: Workspace, errorCountMap: Map<GUIFile, number>) {
        if (errorCountMap == null) return;
        for (let f of currentWorkspace.getFiles()) {
            let errorCount: number = errorCountMap.get(f);
            let errorCountS: string = ((errorCount == null || errorCount == 0) ? "" : "(" + errorCount + ")");

            let node = this.treeview.findNodeByElement(f);
            node?.setRightPartOfCaptionErrors(errorCountS);
        }
    }

    markAsSelectedButDontInvokeCallback(file: GUIFile) {
        let node = this.treeview.findNodeByElement(file);
        if (node) {
            this.treeview.unselectAllNodes(true);
            node.setSelected(true)
            node.setFocus(true);
        }
    }

}