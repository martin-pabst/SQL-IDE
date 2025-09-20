import { Editor } from "./Editor.js";
import { Module } from "../../compiler/parser/Module.js";
import * as monaco from 'monaco-editor'



export class MyHoverProvider {

    private static keywordDescriptions: { [keyword: string]: string } = {
        "select": "```\nselect spalte1, spalte2, ..., spalteN from tabelle where <Bedingung>\n``` \nsucht alle Zeilen der Tabelle, die der Bedingung genügen (**Selektion**) und gibt davon die angegebenen Spalten aus (**Projektion**). Das Ergebnis der ```select```-Anweisung ist wieder eine Tabelle. \n ",
        "from": "```\nselect spalte1, spalte2, ..., spalteN from tabelle where <Bedingung>\n``` \nsucht alle Zeilen der Tabelle, die der Bedingung genügen (**Selektion**) und gibt davon die angegebenen Spalten aus (**Projektion**). Das Ergebnis der ```select```-Anweisung ist wieder eine Tabelle. \n ",
        "where": "```\n... where <Bedingung>\n``` \nHinter ```where``` steht immer eine Bedingung, d.h. ein Term mit booleschem Wert (```true``` oder ```false```). Die Anweisung wird für alle Zeilen ausgeführt, die der Bedingung genügen, d.h. für die der Term den Wert ```true``` ergibt. \n ",
        "delete": "```\ndelete from tabelle where <Bedingung>\n``` \nlöscht alle Zeilen der Tabelle, die der Bedingung genügen. \n ",
        "insert": "```\ninsert (spalte1, spalte2, ..., spalteN) into tabelle values (Wert1, ..., WertN), (Wert1, ..., WertN), ... \n``` \nFügt Datensätze in eine Tabelle ein. Die Werte ```wert1, ..., wertN``` müssen den angegebenen Spalten ```Spalte1, ..., SpalteN``` entsprechen.\n ",
        "values": "```\ninsert (spalte1, spalte2, ..., spalteN) into tabelle values (Wert1, ..., WertN), (Wert1, ..., WertN), ... \n``` \nFügt Datensätze in eine Tabelle ein. Die Werte ```wert1, ..., wertN``` müssen den angegebenen Spalten ```Spalte1, ..., SpalteN``` entsprechen.\n ",
        "update": "```\nupdate tabelle set Spalte1 = Wert1, Spalte2 = Wert2, ..., SpalteN = WertN where <Bedingung> \n``` \nÄndert in allen Datensätze der Tabelle, die der Bedingung genügen, die Werte in den angegebenen Spalten ```Spalte1, ..., SpalteN```.\n ",
        "%": "```\na % b\n```  \n (sprich: 'a modulo b') berechnet den **Rest** der ganzzahligen Division a/b.",
        "=": "```\na = b\n```  \nergibt genau dann ```true```, wenn ```a``` und ```b``` gleich sind.  \n```=``` nennt man **Vergleichsoperator**. \n\n**Tipp:** In SQL gibt es auch einen **Ungleich-Operator**: ```<>```",
        "<=": "```\na <= b\n```  \nergibt genau dann ```true```, wenn der Wert von ```a``` kleiner oder gleich dem Wert von ```b``` ist.",
        ">=": "```\na <= b\n```  \nergibt genau dann ```true```, wenn der Wert von ```a``` größer oder gleich dem Wert von ```b``` ist.",
        "<>": "```\na <> b\n```  \nergibt genau dann ```true```, wenn ```a``` und ```b``` **un**gleich sind.  \n```<>``` nennt man **Ungleich-Operator**.",

    }

    constructor(private editor: Editor) {

    }

    provideHover(model: monaco.editor.ITextModel, position: monaco.Position, token: monaco.CancellationToken):
        monaco.languages.ProviderResult<monaco.languages.Hover> {

        let selection: monaco.Selection = this.editor.editor.getSelection();
        
        // if cursor is inside current selection then don't show hover, because editor.onDidChangeCursorPosition evaluates selected Text 
        // (see class Editor).
        if(selection != null){
            if(selection.startLineNumber != selection.endLineNumber || selection.startColumn != selection.endColumn){
                if(
                    (selection.startLineNumber < position.lineNumber || selection.startLineNumber == position.lineNumber && selection.startColumn <= position.column) && 
                    (selection.endLineNumber > position.lineNumber || selection.endLineNumber == position.lineNumber && selection.endColumn >= position.column) 
                ){
                    return;
                }
            }
        }

        let module: Module = this.editor.main.getCurrentWorkspace()?.getModuleByMonacoModel(model);

        if (module == null) {
            return null;
        }

        for(let errorList of module.errors){
            for(let error of errorList){
                if(error.position.line == position.lineNumber && 
                    error.position.column <= position.column && 
                    error.position.column + error.position.length >= position.column){
                        return null; // Show error-tooltip and don't show hover-tooltip
                    }
            }
        }

        let element = module.getElementAtPosition(position.lineNumber, position.column);

        let declarationAsString = "";

        if (element != null) {
        } else {
            let word = this.getWordUnderCursor(model, position);
            let desc = MyHoverProvider.keywordDescriptions[word];
            if (desc != null) {
                return {
                    range: null,
                    contents: [{ value: desc }],
                }
            }
        }


    }

    getWordUnderCursor(model: monaco.editor.ITextModel, position: monaco.Position)
         : string {
        
        let pos = model.getValueLengthInRange({
            startColumn: 0,
            startLineNumber: 0,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });

        let text = model.getValue();

        let word = "";

        let end = pos;
        while (end < text.length && this.isInsideIdentifierOrArrayDescriptor(text.charAt(end))) {
            end++;
        }

        let begin = pos;
        while (begin > 0 && this.isInsideIdentifierOrArrayDescriptor(text.charAt(begin - 1))) {
            begin--;
        }

        if (end - begin > 1) {
            word = text.substring(begin, end);
        } else {
            end = pos;
            while (end < text.length && this.isInsideOperator(text.charAt(end))) {
                end++;
            }
    
            begin = pos;
            while (begin > 0 && this.isInsideOperator(text.charAt(begin - 1))) {
                begin--;
            }
    
            if (end - begin > 0) {
                word = text.substring(begin, end);
            }
        }

        return word;

    }

    widenDeclaration(model: monaco.editor.ITextModel, position: monaco.Position,
        identifier: string): string {

        let pos = model.getValueLengthInRange({
            startColumn: 0,
            startLineNumber: 0,
            endLineNumber: position.lineNumber,
            endColumn: position.column
        });

        let text = model.getValue();

        let end = pos;
        while (end < text.length && this.isInsideIdentifierOrArrayDescriptor(text.charAt(end))) {
            end++;
        }

        let begin = pos;
        while (begin > 0 && this.isInsideIdentifierChain(text.charAt(begin - 1))) {
            begin--;
        }

        let lenght: number = identifier?.length == null ? 1 : identifier.length;

        if (end - begin > length) {
            return text.substring(begin, end);
        }

        return identifier;
    }

    isInsideIdentifierChain(t: string) {

        return t.toLocaleLowerCase().match(/[a-z0-9äöüß_\[\]\.]/i);

    }

    isInsideOperator(t: string) {

        return t.toLocaleLowerCase().match(/[!%<>=\+\-\*\/]/i);

    }

    isInsideIdentifierOrArrayDescriptor(t: string) {

        return t.toLocaleLowerCase().match(/[a-z0-9äöüß\[\]]/i);

    }


}