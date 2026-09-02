import * as monaco from 'monaco-editor';
import { Compiler } from "../compiler/Compiler.js";
import { SemicolonAngel } from "../compiler/parser/SemicolonAngel.js";
import { DatabaseTool } from "../sqljs-worker/DatabaseTools.js";
import { Workspace } from "../workspace/Workspace.js";
import { ActionManager } from "./gui/ActionManager.js";
import { BottomDiv } from "./gui/BottomDiv.js";
import { DatabaseExplorer } from "./gui/DatabaseExplorer.js";
import { HistoryViewer } from "./gui/HistoryViewer.js";
import { ResultsetPresenter } from "./gui/ResultsetPresenter.js";
import { RightDiv } from "./gui/RightDiv.js";
import { WaitOverlay } from "./gui/WaitOverlay.js";
import type { GUIFile } from '../compiler/parser/GUIFile.js';
import type { Module } from '../compiler/parser/Module.js';
import type { SettingsStore } from '../settings/SettingsStore.js';

export interface MainBase {
    compileIfDirty();

    version: number;

    getCurrentlyEditedFile(): GUIFile;
    getCurrentlyEditedModule(): Module;
    getMonacoEditor(): monaco.editor.IStandaloneCodeEditor;
    getCurrentWorkspace(): Workspace;
    getRightDiv(): RightDiv;
    getBottomDiv(): BottomDiv;
    getActionManager(): ActionManager;
    getCompiler(): Compiler;
    setFileActive(file: GUIFile);
    getSemicolonAngel(): SemicolonAngel;
    isEmbedded(): boolean;

    getDatabaseTool(): DatabaseTool;
    getDatabaseExplorer(): DatabaseExplorer;
    getResultsetPresenter():ResultsetPresenter;
    getWaitOverlay(): WaitOverlay;
    getHistoryViewer(): HistoryViewer;

    getSettings(): SettingsStore;
}