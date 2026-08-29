import { TranslatedText } from "../../tools/language/LanguageManager";
import type { Main } from "../main/Main";
import { SettingsMessages } from "./SettingsMessages";
import hoverOverOperator from '/assets/graphics/settings/hover_over_operator.png';
import hoverOverMethod from '/assets/graphics/settings/hover_over_method.png';
import hoverOverClass from '/assets/graphics/settings/hover_over_class.png';
import scopeLines from '/assets/graphics/settings/scope_lines.png';
import classDiagram from '/assets/graphics/settings/class_diagram.png';
import explorer from '/assets/graphics/settings/explorer.png';
import parameterHints from '/assets/graphics/settings/parameter_hints.png';
import structureStatement from '/assets/graphics/settings/structure_statement_help.png';
import variableShadowingError from '/assets/graphics/settings/variable_shadowing_error.png';
import showHelpForKeywords from '/assets/graphics/settings/show_help_for_keywords.png';

import type * as monaco from 'monaco-editor'
import { SettingKey, SettingsScope, SettingValue } from "./SettingsStore";


export type SettingValues = Partial<Record<SettingKey, SettingValue>>;

export type SettingsMetadataType = 'setting' | 'group';

export type SettingsAction = (main: Main, value: SettingValue) => void;

export type SettingMetadata = {
    key: SettingKey;
    settingType: 'setting',
    scopes?: SettingsScope[]; // Optional scopes for the setting
    name: TranslatedText;
    description: TranslatedText | undefined;
    type: 'enumeration' | 'string' | 'boolean';
    optionValues?: SettingValue[]; // For string settings with predefined options
    optionTexts?: TranslatedText[]; // For string settings with translated options
    action?: SettingsAction; // Optional action to perform when the setting is changed
    image?: string;
    imageWidth?: string;
}

export type GroupOfSettingMetadata = {
    settingType: 'group';
    scopes?: SettingsScope[]; // Optional scopes for the group
    name: TranslatedText;
    description: TranslatedText | undefined;
    settings: (SettingMetadata | GroupOfSettingMetadata)[];
    image?: string;
    isSchooladminOnly?: boolean; // Optional flag to indicate if the group is only for schooladmin users

}

export var AllSettingsMetadata: GroupOfSettingMetadata[] = [
    {
        settingType: 'group',
        name: SettingsMessages.EditorSettingsName,
        description: SettingsMessages.EditorSettingsDescription,
        settings: [
            {
                settingType: 'group',
                name: SettingsMessages.HoverVerbosityName,
                description: SettingsMessages.HoverVerbosityDescription,
                settings: [
                    {
                        key: "editor.hoverVerbosity.showHelpOnKeywordsAndOperators",
                        settingType: 'setting',
                        name: SettingsMessages.ShowHelpOnKeywordsAndOperators,
                        description: undefined,
                        type: 'boolean',
                        image: hoverOverOperator,
                    }

                ]
            },
            {
                settingType: 'group',
                name: SettingsMessages.TypingAssistanceName,
                description: SettingsMessages.TypingAssistanceDescription,
                settings: [
                    {
                        key: "editor.autoClosingBrackets",
                        settingType: 'setting',
                        name: SettingsMessages.AutoClosingBracketsName,
                        description: SettingsMessages.AutoClosingBracketsDescription,
                        type: 'enumeration',
                        optionValues: ["always", "beforeWhitespace", "never"],
                        optionTexts: [SettingsMessages.AutoClosingBracketsAlways,
                        SettingsMessages.AutoClosingBracketsBeforeWhitespace,
                        SettingsMessages.AutoClosingBracketsNever],
                        action: (main, value) => {
                            main.getMonacoEditor().updateOptions({
                                autoClosingBrackets: value as monaco.editor.EditorAutoClosingStrategy
                            })
                        }
                    },
                    {
                        key: "editor.autoClosingQuotes",
                        settingType: 'setting',
                        name: SettingsMessages.AutoClosingQuotesName,
                        description: SettingsMessages.AutoClosingQuotesDescription,
                        type: 'enumeration',
                        optionValues: ["always", "beforeWhitespace", "never"],
                        optionTexts: [SettingsMessages.AutoClosingBracketsAlways,
                        SettingsMessages.AutoClosingBracketsBeforeWhitespace,
                        SettingsMessages.AutoClosingBracketsNever],
                        action: (main, value) => {
                            main.getMonacoEditor().updateOptions({
                                autoClosingQuotes: value as monaco.editor.EditorAutoClosingStrategy
                            })
                        }
                    },
                    {
                        key: "editor.autoSemicolons",
                        settingType: 'setting',
                        name: SettingsMessages.AutoSemicolonsName,
                        description: SettingsMessages.AutoSemicolonsDescription,
                        type: 'boolean',
                        optionTexts: [SettingsMessages.On, SettingsMessages.Off],
                    },

                ]
            },
            {
                settingType: 'group',
                name: SettingsMessages.EditorViewSettings,
                description: SettingsMessages.EditorViewSettingsDescription,
                settings: [
                    {
                        key: "editor.bracketPairLines",
                        settingType: 'setting',
                        name: SettingsMessages.BracketPairLines,
                        description: SettingsMessages.BracketPairLinesDescription,
                        type: 'enumeration',
                        optionValues: ["off", "vertical", "verticalAndUnderlined"],
                        optionTexts: [SettingsMessages.BracketPairLinesOff,
                        SettingsMessages.BracketPairLinesVertical,
                        SettingsMessages.BracketPairLinesVerticalAndUnderlined],
                        action: (main, value) => {
                            main.getMonacoEditor().updateOptions({
                                guides: {
                                    bracketPairs: value !== 'off',
                                    highlightActiveBracketPair: value !== 'off',
                                    bracketPairsHorizontal: (value === 'verticalAndUnderlined')
                                } as monaco.editor.IGuidesOptions
                            })
                        },
                        image: scopeLines
                    },
                ]
            },

        ]
    },
    {
        settingType: 'group',
        name: SettingsMessages.ExplorerSettingsName,
        description: SettingsMessages.ExplorerSettingsDescription,
        image: explorer,
        settings: [
            {
                key: "explorer.fileOrder",
                settingType: 'setting',
                name: SettingsMessages.ExplorerFileOrderName,
                description: SettingsMessages.ExplorerFileOrderDescription,
                type: 'enumeration',
                optionValues: ["comparator", "user-defined"],
                optionTexts: [
                    SettingsMessages.ExplorerOrderComparator,
                    SettingsMessages.ExplorerOrderUserDefined
                ],
                action: (main, value) => {
                    let treeview = main.projectExplorer.fileTreeview;
                    treeview.config.orderBy = value as 'comparator' | 'user-defined';
                    treeview.sort();
                }
            },
            {
                key: "explorer.workspaceOrder",
                settingType: 'setting',
                name: SettingsMessages.ExplorerDatabaseOrderName,
                description: SettingsMessages.ExplorerDatabaseOrderDescription,
                type: 'enumeration',
                optionValues: ["comparator", "user-defined"],
                optionTexts: [
                    SettingsMessages.ExplorerOrderComparator,
                    SettingsMessages.ExplorerOrderUserDefined
                ],
                action: (main, value) => {
                    let treeview = main.projectExplorer.workspaceTreeview;
                    treeview.config.orderBy = value as 'comparator' | 'user-defined';
                    treeview.sort();
                }
            },
        ]
    },
    {
        settingType: 'group',
        name: SettingsMessages.SchooladminSettingsName,
        description: SettingsMessages.SchooladminSettingsDescription,
        isSchooladminOnly: true, // This group is only for schooladmin users
        settings: [
            {
                key: "schooladmin.functionality.pruefungen",
                settingType: 'setting',
                name: SettingsMessages.PruefungFunctionalityName,
                description: SettingsMessages.PruefungFunctionalityDescription,
                type: 'enumeration',
                optionValues: ["enabled", "disabled"],
                optionTexts: [
                    SettingsMessages.enabled,
                    SettingsMessages.disabled
                ],
                action: (main, value) => {
                    main.teacherExplorer.initPruefungButtons();
                }
            }
        ]
    }

]

