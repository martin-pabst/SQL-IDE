import { Editor } from "./Editor.js";
import { Module } from "../../compiler/parser/Module.js";
import { SymbolTable } from "../../compiler/parser/SymbolTable.js";
import { Main } from "../Main.js";
import { TokenType } from "../../compiler/lexer/Token.js";

export class MyCompletionItemProvider implements monaco.languages.CompletionItemProvider {

    isConsole: boolean;

    public triggerCharacters: string[] = ['.', 'abcdefghijklmnopqrstuvwxyzäöüß_ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', ' '];

    constructor(private main: Main) {
    }

    first: boolean = true;
    provideCompletionItems(model: monaco.editor.ITextModel, position: monaco.Position, context: monaco.languages.CompletionContext, token: monaco.CancellationToken): monaco.languages.ProviderResult<monaco.languages.CompletionList> {

        setTimeout(() => {
            //@ts-ignore
            let sw = this.main.getMonacoEditor()._contentWidgets["editor.widget.suggestWidget"].widget;
            if (this.first) {
                sw.toggleDetails();
                this.first = false;
            }
            // sw.toggleSuggestionDetails();
            // this.main.monaco.trigger('keyboard', 'editor.action.toggleSuggestionDetails', {});
            // this.main.monaco.trigger('keyboard', 'editor.action.triggerSuggest', {});
            // this.main.monaco.trigger(monaco.KeyMod.CtrlCmd + monaco.KeyCode.Space, 'type', {});
        }, 300);

        let module: Module = 
            this.main.getCurrentWorkspace().getModuleByMonacoModel(model);

        if (module == null) {
            return null;
        }

        if (this.isStringLiteral(module, position)) return null;

        let textUntilPosition = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
        let textAfterPosition = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber + 5, endColumn: 1 });


    }

    isStringLiteral(module: Module, position: monaco.Position) {

        let tokenList = module.tokenList;
        if (tokenList == null || tokenList.length == 0) return false;

        let posMin = 0;
        let posMax = tokenList.length - 1;
        let pos: number;

        let watchDog = 1000;

        while (true) {
            let posOld = pos;
            pos = Math.round((posMax + posMin) / 2);

            if (posOld == pos) return false;

            watchDog--;
            if (watchDog == 0) return false;

            let t = tokenList[pos];
            let p = t.position;

            if (p.line < position.lineNumber || p.line == position.lineNumber && p.column + p.length < position.column) {
                posMin = pos;
                continue;
            }

            if (p.line > position.lineNumber || p.line == position.lineNumber && p.column > position.column) {
                posMax = pos;
                continue;
            }

            return t.tt == TokenType.stringConstant;

        }

    }


    getKeywordCompletion(symbolTable: SymbolTable): monaco.languages.CompletionItem[] {
        let keywordCompletionItems: monaco.languages.CompletionItem[] = [];
        if (!this.isConsole)
            keywordCompletionItems = keywordCompletionItems.concat([
                {
                    label: "while(Bedingung){Anweisungen}",
                    detail: "while-Wiederholung",
                    filterText: 'while',
                    // insertText: "while(${1:Bedingung}){\n\t$0\n}",
                    insertText: "while($1){\n\t$0\n}",
                    command: {
                        id: "editor.action.triggerParameterHints",
                        title: '123',
                        arguments: []
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "for(){}",
                    // insertText: "for(${1:Startanweisung};${2:Solange-Bedingung};${3:Nach_jeder_Wiederholung}){\n\t${0:Anweisungen}\n}",
                    insertText: "for( $1 ; $2 ; $3 ){\n\t$0\n}",
                    detail: "for-Wiederholung",
                    filterText: 'for',
                    // command: {
                    //     id: "editor.action.triggerParameterHints",
                    //     title: '123',
                    //     arguments: []
                    // },    
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "for(int i = 0; i < 10; i++){}",
                    // insertText: "for(${1:Startanweisung};${2:Solange-Bedingung};${3:Nach_jeder_Wiederholung}){\n\t${0:Anweisungen}\n}",
                    insertText: "for(int ${1:i} = 0; ${1:i} < ${2:10}; ${1:i}++){\n\t$0\n}",
                    detail: "Zähl-Wiederholung",
                    filterText: 'for',
                    // command: {
                    //     id: "editor.action.triggerParameterHints",
                    //     title: '123',
                    //     arguments: []
                    // },    
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "switch(){case...}",
                    // insertText: "switch(${1:Selektor}){\n\tcase ${2:Wert_1}: {\n\t\t ${3:Anweisungen}\n\t\t}\n\tcase ${4:Wert_2}: {\n\t\t ${0:Anweisungen}\n\t\t}\n}",
                    insertText: "switch($1){\n\tcase $2:\n\t\t $3\n\t\tbreak;\n\tcase $4:\n\t\t $5\n\t\tbreak;\n\tdefault:\n\t\t $0\n}",
                    detail: "switch-Anweisung",
                    filterText: 'switch',
                    command: {
                        id: "editor.action.triggerParameterHints",
                        title: '123',
                        arguments: []
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "if(){}",
                    // insertText: "if(${1:Bedingung}){\n\t${0:Anweisungen}\n}",
                    insertText: "if($1){\n\t$0\n}",
                    detail: "Bedingung",
                    filterText: 'if',
                    command: {
                        id: "editor.action.triggerParameterHints",
                        title: '123',
                        arguments: []
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                },
                {
                    label: "if(){} else {}",
                    insertText: "if($1){\n\t$2\n}\nelse {\n\t$0\n}",
                    detail: "Zweiseitige Bedingung",
                    filterText: 'if',
                    command: {
                        id: "editor.action.triggerParameterHints",
                        title: '123',
                        arguments: []
                    },
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    range: undefined
                }]);



        return keywordCompletionItems;

    }


}