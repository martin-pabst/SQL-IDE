import * as monaco from 'monaco-editor';
import { Compiler } from "../compiler/Compiler.js";
import { Module } from "../compiler/parser/Module.js";
import { SemicolonAngel } from "../compiler/parser/SemicolonAngel.js";
import { DatabaseTool } from "../tools/DatabaseTools.js";
import { Workspace } from "../workspace/Workspace.js";
import { ActionManager } from "./gui/ActionManager.js";
import { BottomDiv } from "./gui/BottomDiv.js";
import { DatabaseExplorer } from "./gui/DatabaseExplorer.js";
import { HistoryViewer } from "./gui/HistoryViewer.js";
import { ResultsetPresenter } from "./gui/ResultsetPresenter.js";
import { RightDiv } from "./gui/RightDiv.js";
import { WaitOverlay } from "./gui/WaitOverlay.js";

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
    getResultsetPresenter():ResultsetPresenter;
    getWaitOverlay(): WaitOverlay;
    getHistoryViewer(): HistoryViewer;
}