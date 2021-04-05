import { Module, MethodCallPosition } from "../../compiler/parser/Module.js";
import { Main } from "../Main.js";



export class MySignatureHelpProvider implements monaco.languages.SignatureHelpProvider {

    signatureHelpTriggerCharacters?: readonly string[] = ['(', ',', ';', '<', '>', '=']; // semicolon, <, >, = for for-loop, if, while, ...
    signatureHelpRetriggerCharacters?: readonly string[] = [];

    constructor(private main: Main) {
    }

    provideSignatureHelp(model: monaco.editor.ITextModel, position: monaco.Position,
        token: monaco.CancellationToken,
        context: monaco.languages.SignatureHelpContext):
        monaco.languages.ProviderResult<monaco.languages.SignatureHelpResult> {

        let that = this;

        return new Promise((resolve, reject) => {

            setTimeout(() => {

                this.main.compileIfDirty();

                resolve(that.provideSignatureHelpLater(model, position, token, context));

            }, 300);


        });

    }

    provideSignatureHelpLater(model: monaco.editor.ITextModel, position: monaco.Position,
        token: monaco.CancellationToken,
        context: monaco.languages.SignatureHelpContext):
        monaco.languages.ProviderResult<monaco.languages.SignatureHelpResult> {

        let isConsole = (model != this.main.getMonacoEditor().getModel());

        let module: Module = 
            this.main.getCurrentWorkspace().getModuleByMonacoModel(model);

        if (module == null) {
            return null;
        }

        // let textUntilPosition = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
        // let textAfterPosition = model.getValueInRange({ startLineNumber: position.lineNumber, startColumn: position.column, endLineNumber: position.lineNumber + 5, endColumn: 1 });

        let methodCallPositions = module.methodCallPositions[position.lineNumber];

        if (methodCallPositions == null) return null;

        let methodCallPosition: MethodCallPosition = null;
        let rightMostPosition: number = -1;

        for (let i = methodCallPositions.length - 1; i >= 0; i--) {
            let mcp = methodCallPositions[i];
            if (mcp.identifierPosition.column + mcp.identifierPosition.length < position.column
                && mcp.identifierPosition.column > rightMostPosition) {
                if (mcp.rightBracketPosition == null ||
                    (position.lineNumber <= mcp.rightBracketPosition.line && position.column <= mcp.rightBracketPosition.column)
                    || (position.lineNumber < mcp.rightBracketPosition.line)) {
                    methodCallPosition = mcp;
                    rightMostPosition = mcp.identifierPosition.column;
                }
            }
        }

        if (methodCallPosition == null) return null;

        return this.getSignatureHelp(methodCallPosition, position);



    }

    getSignatureHelp(methodCallPosition: MethodCallPosition,
        position: monaco.Position): monaco.languages.ProviderResult<monaco.languages.SignatureHelpResult> {

        let parameterIndex: number = 0;

        for (let cp of methodCallPosition.commaPositions) {
            if (cp.line < position.lineNumber || (cp.line == position.lineNumber && cp.column < position.column)) {
                parameterIndex++;
            }
        }

        let signatureInformationList: monaco.languages.SignatureInformation[] = [];

        return Promise.resolve({
            value: {
                activeParameter: parameterIndex,
                activeSignature: 0,
                signatures: signatureInformationList
            },
            dispose: () => { }
        });
    }



}
