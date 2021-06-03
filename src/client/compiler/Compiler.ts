import { Error, Lexer } from "./lexer/Lexer.js";
import { File, Module, ModuleStore } from "./parser/Module.js";
import { Parser } from "./parser/Parser.js";
import { Main } from "../main/Main.js";
import { MainBase } from "../main/MainBase.js";
import { SymbolResolver } from "./parser/SymbolResolver.js";

export enum CompilerStatus {
    compiling, error, compiledButNothingToRun, readyToRun
}

export class Compiler {

    compilerStatus: CompilerStatus = CompilerStatus.compiledButNothingToRun;

    atLeastOneModuleIsStartable: boolean;

    constructor(private main: MainBase) {
    }

    compile(moduleStore: ModuleStore): Error[] {

        this.compilerStatus = CompilerStatus.compiling;

        let t0 = performance.now();

        let lexer = new Lexer();

        // 1st pass: lexing
        for (let m of moduleStore.getModules(false)) {
            m.file.dirty = false;
            m.clear();

            let lexed = lexer.lex(m.getProgramTextFromMonacoModel());
            m.errors[0] = lexed.errors;
            m.tokenList = lexed.tokens;
            m.bracketError = lexed.bracketError;
            if(m.file.name == this.main.getCurrentlyEditedModule().file.name){
                if(this.main.getBottomDiv() != null) this.main.getBottomDiv().errorManager.showParenthesisWarning(lexed.bracketError);
            }
        }

        // 2nd pass: parse tokenlist and generate AST

        this.main.getSemicolonAngel().startRegistering();

        let parser: Parser = new Parser(false);

        for (let m of moduleStore.getModules(false)) {
            parser.parse(m);
        }
        
        // 3rd pass: check symbols and types
        let databaseTool = this.main.getDatabaseTool();
        let symbolResolver: SymbolResolver = new SymbolResolver(databaseTool);

        for(let m of moduleStore.getModules(false)){
            symbolResolver.start(m);
        }

        let dt = performance.now() - t0;
        dt = Math.round(dt * 100) / 100;

        let message = "Compiled in " + dt + " ms.";

        this.main.getCurrentWorkspace().compilerMessage = message;

        this.main.getSemicolonAngel().healSemicolons();

        this.compilerStatus = CompilerStatus.readyToRun;

        return null;
    }

}