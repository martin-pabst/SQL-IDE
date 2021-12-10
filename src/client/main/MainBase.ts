import { ModuleStore, File, Module } from "../compiler/parser/Module.js";
import { Workspace } from "../workspace/Workspace.js";
import { RightDiv } from "./gui/RightDiv.js";
import { BottomDiv } from "./gui/BottomDiv.js";
import { ActionManager } from "./gui/ActionManager.js";
import { Compiler } from "../compiler/Compiler.js";
import { TextPosition } from "../compiler/lexer/Token.js";
import { ErrorManager } from "./gui/ErrorManager.js";
import { SemicolonAngel } from "../compiler/parser/SemicolonAngel.js";
import { DatabaseTool } from "../tools/DatabaseTools.js";
import { DatabaseExplorer } from "./gui/DatabaseExplorer.js";

export interface MainBase {
    compileIfDirty();

    version: number;

    getCurrentlyEditedModule(): import("../compiler/parser/Module").Module;
    getMonacoEditor(): monaco.editor.IStandaloneCodeEditor;
    getCurrentWorkspace(): Workspace;
    getRightDiv(): RightDiv;
    getBottomDiv(): BottomDiv;
    getActionManager(): ActionManager;
    getCompiler(): Compiler;
    setModuleActive(module: Module);
    getSemicolonAngel(): SemicolonAngel;
    isEmbedded(): boolean;

    getDatabaseTool(): DatabaseTool;
    getDatabaseExplorer(): DatabaseExplorer;
}