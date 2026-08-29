export type SettingsScope = 'user' | 'class' | 'school' | 'default';

export type SettingPrecedence = 'userClassSchoolDefault' | 'classSchoolUserDefault';
export var SettingsPrecedenceArrays: { [key in SettingPrecedence]: SettingsScope[] } = {
    'userClassSchoolDefault': ['user', 'class', 'school', 'default'],
    'classSchoolUserDefault': ['class', 'school', 'user', 'default']
}

export type SettingsType = {
    "editor.hoverVerbosity.showHelpOnKeywordsAndOperators": true | false,
    "editor.hoverVerbosity.showMethodDeclaration": 'none' | 'declarations' | 'declarationsAndComments',
    "editor.hoverVerbosity.showClassDeclaration": 'none' | 'declarations' | 'declarationsAndComments',
    "editor.autoClosingBrackets": "always" | "beforeWhitespace" | "never",
    "editor.autoClosingQuotes": "always" | "beforeWhitespace" | "never",
    "editor.autoSemicolons": true | false,
    "editor.bracketPairLines": "off" | "vertical" | "verticalAndUnderlined",

    "explorer.fileOrder": "user-defined" | "comparator",
    "explorer.workspaceOrder": "user-defined" | "comparator",

    "schooladmin.functionality.pruefungen": "enabled" | "disabled"


}

export type SettingKey = keyof SettingsType;

export var SettingDefaultValues: SettingsType = {
    "editor.hoverVerbosity.showHelpOnKeywordsAndOperators": true,
    "editor.hoverVerbosity.showMethodDeclaration": 'declarationsAndComments',
    "editor.hoverVerbosity.showClassDeclaration": 'declarationsAndComments',
    "editor.autoClosingBrackets": "beforeWhitespace",
    "editor.autoClosingQuotes": "beforeWhitespace",
    "editor.autoSemicolons": true,
    "editor.bracketPairLines": "vertical",

    "explorer.fileOrder": "user-defined",
    "explorer.workspaceOrder": "user-defined",

    "schooladmin.functionality.pruefungen": "enabled"
};

export var SettingPrecedenceValues: Partial<{ [key in SettingKey]: SettingPrecedence }> = {
    "editor.hoverVerbosity.showHelpOnKeywordsAndOperators": "classSchoolUserDefault",
}

export type SettingValue = string | number | boolean | undefined;

export interface SettingsStore {
    getValue(key: SettingKey, scope?: SettingsScope): SettingValue | undefined;
}

export class DefaultValueSettingsStore implements SettingsStore {
    getValue(key: SettingKey, scope?: SettingsScope): SettingValue | undefined {
        return SettingDefaultValues[key];
    }
}