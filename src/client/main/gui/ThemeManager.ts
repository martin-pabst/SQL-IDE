import * as monaco from 'monaco-editor'

export type ThemeName = "dark" | "light";

export type Theme = {
    name: ThemeName,
    monacoTheme: string,
    cssColors: { [color: string]: string }
}

/**
 * Applies a theme (dark/light) to the html elements of one IDE instance: it sets the css variables
 * of the theme (cssColors) and the css class jo_theme-<name> (switches icon sets, see assets/css/icons.css)
 * on the instance's root element.
 *
 * The full IDE has one instance (root element: body), the embedded version has one instance per
 * embedded IDE (root element: its div). Several embedded IDEs on one page may use different themes.
 *
 * Monaco editors can't have individual themes: Monaco has only one page-global theme. It is
 * set by the ThemeManager which was created first on the page.
 */
export class ThemeManager {

    private static themes: Theme[] | undefined;

    private static instances: ThemeManager[] = [];

    /**
     * The first ThemeManager on the page sets the page-global theme of all Monaco editors.
     */
    private static monacoThemeOwner: ThemeManager | undefined;

    /**
     * ThemeManager of the IDE instance the user interacted with last, see getActiveThemeManager
     */
    private static lastActiveInstance: ThemeManager | undefined;

    currentTheme: Theme;

    constructor(private rootElement: HTMLElement) {
        if (!ThemeManager.themes) {
            ThemeManager.themes = ThemeManager.createThemes();
            ThemeManager.defineEditorThemes();
            ThemeManager.trackLastActiveInstance();
        }
        if (!ThemeManager.monacoThemeOwner) ThemeManager.monacoThemeOwner = this;
        ThemeManager.instances.push(this);

        this.currentTheme = ThemeManager.themes[0];
    }

    static isThemeName(name: string): name is ThemeName {
        return name == "dark" || name == "light";
    }

    /**
     * Elements outside of all IDE instances' root elements (e.g. context menus, which are appended
     * to body) don't inherit a theme. They get the theme of the IDE instance the user interacted
     * with last (see applyThemeToElement).
     */
    static getActiveThemeManager(): ThemeManager | undefined {
        return ThemeManager.lastActiveInstance ?? ThemeManager.instances[0];
    }

    private static trackLastActiveInstance() {
        const rememberInstance = (event: Event) => {
            if (!(event.target instanceof Node)) return;
            let instance = ThemeManager.instances.find(tm => tm.rootElement.contains(<Node>event.target));
            if (instance) ThemeManager.lastActiveInstance = instance;
        }
        // capture phase, as some components stop propagation
        document.addEventListener("pointerdown", rememberInstance, true);
        document.addEventListener("focusin", rememberInstance, true);
    }

    switchTheme(name: string) {
        for (let theme of ThemeManager.themes) {
            if (theme.name == name) {
                this.internalSwitchTheme(theme);
                break;
            }
        }
    }

    private internalSwitchTheme(theme: Theme) {
        this.currentTheme = theme;

        if (ThemeManager.monacoThemeOwner == this) {
            monaco.editor.setTheme(theme.monacoTheme);
        }

        this.applyThemeToElement(this.rootElement);
    }

    /**
     * Applies this IDE instance's theme to element. Use it for elements outside of the instance's
     * root element, e.g. context menus appended to body.
     */
    applyThemeToElement(element: HTMLElement) {
        const theme = this.currentTheme;

        for (const key of Object.keys(theme.cssColors)) {
            element.style.setProperty(key, theme.cssColors[key]);
        }

        // switches icon sets: assets/css/icons.css overrides the (dark) icons for .jo_theme-light
        for (const t of ThemeManager.themes) {
            element.classList.toggle("jo_theme-" + t.name, t == theme);
        }
    }

    private static createThemes(): Theme[] {

        let themes: Theme[] = [];

        themes.push({
            name: "dark",
            monacoTheme: "myCustomThemeDark",
            cssColors: {
                "--backgroundDark": "#1e1e1e",
                "--backgroundLight": "#252526",
                "--backgroundHeading": "#37373d",
                "--backgroundSelected": "#2a2d2e",
                "--fontColorNormal": "#c2cccc",
                "--fontColorLight": "#e7e7e7",
                "--slider": "#414141",
                "--loginButtonBackgrond": "#59a15d",
                "--loginButtonFontColor": "#000000",
                "--loginMessageColor": "rgb(122, 48, 48)",
                "--loginButtonHover": "#63a867",
                "--loginButtonActive": "#94ffd1",
                "--scrollbar": "#1e1e1e",
                "--scrollbar-thumb": "#3e3e3e",
                "--scrollbar-thumb-hover": "#5e5e5e",
                "--scrollbar-thumb-active": "#7e7e7e",
                "--submenu-hover": "#094771",
                "--submenu-color": "#ffffff",
                "--menuitemsdivider": "#616162",
                "--file-hover": "hsla(0, 0%, 38%, 0.125)",
                "--file-active": "#094771",
                "--file-active-hover": "rgba(9, 71, 113, 0.827)",
                "--file-errorcount": "red",
                "--treeview-selected-background": "#114c74c0",
                "--treeview-selected-hover-background": "#2a4658c0",
                "--treeview-focus-border": "#66b6ecab",
                "--inplace-editor": "blue",
                "--contextmenu-background": "#3c3c3c",
                "--contextmenu-color": "rgb(212,212,212)",
                "--contextmenu-hover-background": "#094771",
                "--contextmenu-hover-color": "#ffffff",
                "--error-filename": "#2a709e",
                "--error-line-ative": "#094771",
                "--error-line-hover": "rgba(96, 96, 96, 0.125)",
                "--error-position": "#c0802d",
                "--linecolumn": "#14c714",
                "--reveal-error": "rgba(253, 101, 101, 0.745)",
                "--reveal-method": "#2b2b7d2f",
                "--reveal-errorline-background": "red",
                "--reveal-error-whole-line": "rgba(255, 0, 0, 0.555)",
                "--reveal-programpointer": "rgba(111, 214, 27, 0.337)",
                "--reveal-syntaxelement": "rgb(85,85,85)",
                "--margin-breakpoint": "rgba(255, 0, 0, 0.623)",
                "--speedcontrol-bar": "#9d9d9d",
                "--speedcontrol-grip": "#588555",
                "--speedcontrol-grip-hover": "#89d185",
                "--speedcontrol-display-background": "#383838",
                "--speedcontrol-display-border": "#9d9d9d",
                "--editorTooltip-background": "#252526",
                "--editorTooltip-border": "#454545",

                "--renameInput-color": "#ffffff",

                // embedded version: buttons "Code Reset"/"Datenbank Reset" and their dialogs
                "--resetButton-background": "#464646c7",
                "--resetButton-color": "#c2cccc",
                "--resetDialog-background": "rgba(46, 46, 46, 0.849)",
                "--resetDialog-color": "#c2cccc",
                "--resetDialog-button-color": "#c2cccc",
                "--resetDialog-cancelButton-background": "rgb(15, 104, 15)",
                "--resetDialog-okButton-background": "rgb(128, 33, 33)",

                //bottomDiv
                "--bottomdiv-tabheading-hover": "white",
                "--bottomdiv-tabheading-active": "rgb(97,97,255)",
                "--noErrorMessage": "rgb(37, 211, 37)",
                "--console-top-borderbottom": "#c4c4c4",
                "--console-top-background": "#1e1e1e",
                "--consoleEntry-withBorder": "#303030",
                "--consoleEntryValue": "white",
                "--consoleEntryIdentifier": "rgb(156, 156, 235)",
                "--consoleEntryNoValue": "gray",
                "--consoleEntryCaption": "white",
                "--error-Caption": "rgb(166, 165, 176)",
                "--console-error": "rgb(155, 51, 51)",

                // Debugger
                "--deIdentifier": "rgb(156, 156, 235)",
                "--deValue": "white",

                // Helper
                "--helper-background-color": "#383838",
                "--helper-border-color": "#d4d4d4",
                "--arrowBoxButtonOuter-background": "#59a15d",
                "--arrowBoxButtonOuter-border": "#3d3d3d",
                "--arrowBoxButtonOuter-color": "black",
                "--arrowBoxButtonOuter-button-hover": "#63a867",
                "--arrowBox-after": "rgba(136, 183, 213, 0)",
                "--arrowBox-before": "rgba(194, 225, 245, 0)",

                //run
                "--defaultOutputColor": "#ffffff",
                "--runInputColor": "#ffffff",
                "--runBackgroundColor": "rgba(255, 255, 255, 0.2)",

                // table
                "--table-even": "#222", /*#d1d2e4*/
                "--table-heading": "#202060", /*#c3f2b9*/

                // highlight statements
                "--highlightStatementGreen-color": "#015a0165",


            }
        });

        let highlightColor = "#8080ff";

        themes.push({
            name: "light",
            monacoTheme: "myCustomThemeLight",
            cssColors: {
                "--backgroundDark": "white",
                "--backgroundLight": "#f3f3f3",
                "--backgroundHeading": "#dcdcdc",
                "--backgroundSelected": "#e8e8e8",
                "--fontColorNormal": "#000",
                "--fontColorLight": "#303030",
                "--slider": "#b0b0b0",
                "--loginButtonBackgrond": "#59a15d",
                "--loginButtonFontColor": "#000000",
                "--loginMessageColor": "rgb(122, 48, 48)",
                "--loginButtonHover": "#63a867",
                "--loginButtonActive": "#94ffd1",
                "--scrollbar": "#e3e3e3",
                "--scrollbar-thumb": "#bababa",
                "--scrollbar-thumb-hover": "#8e8e8e",
                "--scrollbar-thumb-active": "#616161",
                "--submenu-hover": highlightColor,
                "--submenu-color": "#ffffff",
                "--menuitemsdivider": "#cfcfcf",
                "--file-hover": "#e8e8e8",
                "--file-active": highlightColor,
                "--file-active-hover": "#a0a0ff",
                "--file-errorcount": "red",
                "--treeview-selected-background": "rgba(171, 231, 255, 0.74)",
                "--treeview-selected-hover-background": "rgba(203, 212, 253, 0.61)",
                "--treeview-focus-border": "rgba(76, 204, 255, 0.74)",
                "--inplace-editor": "white",
                "--contextmenu-background": "white",
                "--contextmenu-color": "#756161",
                "--contextmenu-hover-background": highlightColor,
                "--contextmenu-hover-color": "#a0a0ff",
                "--error-filename": "#ff0000",
                "--error-line-ative": "#ffa0a0",
                "--error-line-hover": "#ffc0c0",
                "--error-position": "#804040",
                "--linecolumn": "#14c714", // TODO
                "--reveal-error": "rgba(253, 101, 101, 0.745)",
                "--reveal-method": "#babaec80",
                "--reveal-errorline-background": "red",
                "--reveal-error-whole-line": "rgba(255, 0, 0, 0.555)",
                "--reveal-programpointer": "rgba(111, 214, 27, 0.337)",
                "--reveal-syntaxelement": "#c0c0c0",
                "--margin-breakpoint": "rgba(255, 0, 0, 0.623)",
                "--speedcontrol-bar": "#9d9d9d",
                "--speedcontrol-grip": "#588555",
                "--speedcontrol-grip-hover": "#89d185",
                "--speedcontrol-display-background": "#e0e0e0",
                "--speedcontrol-display-border": "#9d9d9d",
                "--editorTooltip-background": "#e0e0e0",
                "--editorTooltip-border": "#9d9d9d",

                "--renameInput-color": "#000000",

                // embedded version: buttons "Code Reset"/"Datenbank Reset" and their dialogs
                "--resetButton-background": "#e0e0e0",
                "--resetButton-color": "#000000",
                "--resetDialog-background": "rgba(243, 243, 243, 0.92)",
                "--resetDialog-color": "#000000",
                "--resetDialog-button-color": "#000000",
                "--resetDialog-cancelButton-background": "rgb(140, 210, 140)",
                "--resetDialog-okButton-background": "rgb(240, 140, 140)",

                //bottomDiv
                "--bottomdiv-tabheading-hover": "#424242",
                "--bottomdiv-tabheading-active": "#424242",
                "--noErrorMessage": "rgb(17, 180, 17)",
                "--console-top-borderbottom": "#c4c4c4",
                "--console-top-background": "white",
                "--consoleEntry-withBorder": "#303030",
                "--consoleEntryValue": "#0000a0",
                "--consoleEntryIdentifier": "black",
                "--consoleEntryNoValue": "gray",
                "--consoleEntryCaption": "#756161",
                "--error-Caption": "rgb(166, 165, 176)",
                "--console-error": "rgb(155, 21, 21)",

                // Debugger
                "--deIdentifier": "black",
                "--deValue": "#0000a0",

                // Helper
                "--helper-background-color": "#f3f3f3",
                "--helper-border-color": "#606060",
                "--arrowBoxButtonOuter-background": "#59a15d",
                "--arrowBoxButtonOuter-border": "#3d3d3d",
                "--arrowBoxButtonOuter-color": "black",
                "--arrowBoxButtonOuter-button-hover": "#63a867",
                "--arrowBox-after": "rgba(136, 183, 213, 0)",
                "--arrowBox-before": "rgba(194, 225, 245, 0)",

                //run
                "--defaultOutputColor": "#303030",
                "--runInputColor": "#000000",
                "--runBackgroundColor": "rgba(0, 0, 0, 0.2)",

                // table
                "--table-even": "#d1d2e4", /*#d1d2e4*/
                "--table-heading": "#c3f2b9", /*#c3f2b9*/

                // highlight statements
                "--highlightStatementGreen-color": "#015a0120",

            }
        });

        return themes;
    }

    private static defineEditorThemes() {
        monaco.editor.defineTheme('myCustomThemeDark', {
            base: 'vs-dark', // can also be vs-dark or hc-black
            inherit: true, // can also be false to completely replace the builtin rules
            rules: [
                { token: 'functions', foreground: 'dcdcaa', fontStyle: 'italic' },
                { token: 'string.sql', foreground: '3DC9B0' },
                { token: 'number', foreground: '7bef3f' },
                { token: 'type', foreground: '499cd6' },
                { token: 'identifier', foreground: 'effefe' },
                { token: 'statement', foreground: '9cdcfe', fontStyle: 'bold' },
                { token: 'keyword', foreground: '619ceb', fontStyle: 'bold' },
                { token: 'table', foreground: 'ff0000', fontStyle: 'bold' },
                { token: 'delimiter', foreground: 'e8eb38' }
                // { token: 'comment.js', foreground: '008800', fontStyle: 'bold italic underline' },
            ],
            colors: {
                "editor.background": "#1e1e1e",
                "jo_highlightStatementGreen": "#004000",
                "jo_highlightStatementYellow": "#404000",
                "jo_highlightStatementRed": "#402020"
            }
        });

        monaco.editor.defineTheme('myCustomThemeLight', {
            base: 'vs', // can also be vs-dark or hc-black
            inherit: true, // can also be false to completely replace the builtin rules
            rules: [
                { token: 'functions', foreground: '694E16', fontStyle: 'italic bold' },
                { token: 'string.sql', foreground: 'a03030' },
                { token: 'number', foreground: '404040' },
                { token: 'type', foreground: '0000ff', fontStyle: 'bold' },
                { token: 'identifier', foreground: '8000e0' },
                { token: 'statement', foreground: '001080', fontStyle: 'bold' },
                { token: 'keyword', foreground: '00a000', fontStyle: 'bold' },
                { token: 'comment', foreground: '808080', fontStyle: 'italic' },
            ],
            colors: {
                "editor.background": "#FFFFFF",
                "editor.foreground": "#000000",
                "editor.inactiveSelectionBackground": "#E5EBF1",
                "editorIndentGuide.background": "#D3D3D3",
                "editorIndentGuide.activeBackground": "#939393",
                "editor.selectionHighlightBackground": "#ADD6FF80",
                "editorSuggestWidget.background": "#F3F3F3",
                "activityBarBadge.background": "#007ACC",
                "sideBarTitle.foreground": "#6F6F6F",
                "list.hoverBackground": "#E8E8E8",
                "input.placeholderForeground": "#767676",
                "searchEditor.textInputBorder": "#CECECE",
                "settings.textInputBorder": "#CECECE",
                "settings.numberInputBorder": "#CECECE",
                "statusBarItem.remoteForeground": "#FFF",
                "statusBarItem.remoteBackground": "#16825D",
                "jo_highlightStatementGreen": "#004000",
                "jo_highlightStatementYellow": "#404000",
                "jo_highlightStatementRed": "#400000"
            }
        });
    }

}