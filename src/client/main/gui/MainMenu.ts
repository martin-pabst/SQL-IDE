import { Main } from "../Main.js";
import { UserData } from "../../communication/Data.js";
import { DatabaseSettingsDialog } from "./DatabaseSettingsDialog.js";
import { DatabaseImportExport } from "../../tools/DatabaseImportExport.js";
import { NewDatabaseDialog } from "./NewDatabaseDialog.js";
import { ajax } from "../../communication/AjaxHelper.js";
import { TemplateUploader } from "../../tools/TemplateUploader.js";
import jQuery from "jquery";

declare var BUILD_DATE: string;
declare var APP_VERSION: string;

export type Action = (identifier: string) => void;

type Menu = {
    items: MenuItem[];
    $element?: JQuery<HTMLElement>;
    level?: number;
}

type MenuItem = {
    identifier: string;
    $element?: JQuery<HTMLElement>;
    action?: Action;
    link?: string;
    subMenu?: Menu;
    noHoverAnimation?: boolean
}

export class MainMenu {

    constructor(private main: Main) {

    }


    currentSubmenu: { [level: number]: JQuery<HTMLElement> } = {};
    openSubmenusOnMousemove: boolean = false;

    initGUI(user: UserData) {

        let that = this;
        let editor = this.main.getMonacoEditor();

        let mainMenu: Menu = {
            items: [
                {
                    identifier: "Datei", subMenu:
                    {
                        items: [
                            {
                                identifier: "Speichern und Beenden",
                                action: () => { jQuery('#buttonLogout').trigger("click"); }
                            },

                        ]
                    }
                },
                {
                    identifier: "Bearbeiten", subMenu:
                    {
                        items: [
                            { identifier: "Rückgängig (Strg + z)", action: () => { editor.trigger(".", "undo", {}); } },
                            { identifier: "Wiederholen (Strg + y)", action: () => { editor.trigger(".", "redo", {}); } },
                            { identifier: "-" },
                            { identifier: "Kopieren (Strg + c)", action: () => { editor.getAction("editor.action.clipboardCopyAction").run(); } },
                            { identifier: "Ausschneiden (Strg + x)", action: () => { editor.getAction("editor.action.clipboardCutAction").run(); } },
                            { identifier: "Nach oben kopieren (Alt + Shift + Pfeil rauf)", action: () => { editor.getAction("editor.action.copyLinesUpAction").run(); } },
                            { identifier: "Nach unten kopieren (Alt + Shift + Pfeil runter)", action: () => { editor.getAction("editor.action.copyLinesDownAction").run(); } },
                            { identifier: "Nach oben verschieben (Alt + Pfeil rauf)", action: () => { editor.getAction("editor.action.moveLinesUpAction").run(); } },
                            { identifier: "Nach unten verschieben (Alt + Pfeil runter)", action: () => { editor.getAction("editor.action.moveLinesDownAction").run(); } },
                            { identifier: "-" },
                            { identifier: "Suchen... (Strg + f)", action: () => { editor.getAction("actions.find").run(); } },
                            { identifier: "Ersetzen... (Strg + h)", action: () => { editor.getAction("editor.action.startFindReplaceAction").run(); } },
                            { identifier: "-" },
                            { identifier: "Aus-/Einkommentieren (Strg + #)", action: () => { editor.getAction("editor.action.commentLine").run(); } },
                            { identifier: "Dokument formatieren (Alt + Shift + f)", action: () => { editor.getAction("editor.action.formatDocument").run(); } },
                            { identifier: "-" },
                            { identifier: "Finde zugehörige Klammer (Strg + k)", action: () => { editor.getAction("editor.action.jumpToBracket").run(); } },
                            { identifier: "-" },
                            { identifier: "Alles zusammenfalten", action: () => { editor.getAction("editor.foldAll").run(); } },
                            { identifier: "Alles auffalten", action: () => { editor.getAction("editor.unfoldAll").run(); } },
                            { identifier: "-" },
                            {
                                identifier: "Vorschlag auslösen (Strg + Leertaste)", action: () => {
                                    editor.focus();
                                    setTimeout(() => {
                                        editor.getAction("editor.action.triggerSuggest").run();
                                    }, 200);
                                }
                            },
                            { identifier: "Parameterhilfe (Strg + Shift + Leertaste)", action: () => { editor.getAction("editor.action.triggerParameterHints").run(); } },
                            {
                                identifier: "Gehe zur Definition (Strg + Click)", action: () => {
                                    editor.focus();
                                    setTimeout(() => {
                                        editor.getAction("editor.action.revealDefinition").run();
                                    }, 200);
                                }
                            },

                        ]
                    }
                },
                {
                    identifier: "Ansicht", subMenu:
                    {
                        items: [
                            {
                                identifier: "Theme",
                                subMenu: {
                                    items: [
                                        {
                                            identifier: "Dark",
                                            action: () => {
                                                that.switchTheme("dark");
                                            }
                                        },
                                        {
                                            identifier: "Light",
                                            action: () => {
                                                that.switchTheme("light");
                                            }
                                        }
                                    ]
                                }
                            },
                            { identifier: "-" },
                            { identifier: "Hoher Kontrast im Editor ein/aus", action: () => { editor.getAction("editor.action.toggleHighContrast").run(); } },

                            { identifier: "-" },
                            { identifier: "Zoom out (Strg + Mausrad)", action: () => { this.main.editor.changeEditorFontSize(-4); } },
                            { identifier: "Zoom normal", action: () => { this.main.editor.setFontSize(14); } },
                            { identifier: "Zoom in (Strg + Mausrad)", action: () => { this.main.editor.changeEditorFontSize(4); } },

                        ]
                    }
                },
                {
                    identifier: "Datenbank", subMenu:
                    {
                        items: [
                            {
                                identifier: "Neue Datenbank anlegen...", action: () => {
                                    let owner_id: number = that.main.user.id;
                                    if (that.main.workspacesOwnerId != null) {
                                        owner_id = that.main.workspacesOwnerId;
                                    }

                                    new NewDatabaseDialog(that.main, owner_id, []);
                                }
                            },
                            { identifier: "Einstellungen...", action: () => { new DatabaseSettingsDialog(this.main, this.main.currentWorkspace) } },
                            {
                                identifier: "Export als Binärdump (.sqLite-File)...", action: () => {
                                    new DatabaseImportExport().saveToFile(this.main.getDatabaseTool());
                                }
                            },
                            {
                                identifier: "Aktuellen Zustand als Vorlage hochladen...", action: () => {
                                    let currentWorkspace = this.main.currentWorkspace;
                                    if (currentWorkspace == null) {
                                        alert('Es ist kein Workspace ausgewählt.');
                                        return;
                                    }
                                    if (currentWorkspace.database.owner_id != this.main.user.id) {
                                        alert('Die Datenbank gehört einer anderen Benutzerin/einem anderen Benutzer. Sie kann daher nicht als Vorlage hochgeladen werden.');
                                        return;
                                    }
                                    if (currentWorkspace.database.published_to == 0) {
                                        alert('Die Datenbank ist noch nicht für andere Benutzer/innen veröffentlicht, daher kann sie nicht als Vorlage hochgeladen werden. \nDie Möglichkeit zum Veröffentlichen finden Sie unter Datenbank->Einstellungen.');
                                        return;
                                    }
                                    new TemplateUploader().uploadCurrentDatabase(currentWorkspace.id, this.main, null, "publishDatabaseAsTemplate",
                                        () => { alert('Der aktuelle Zustand der Datebank wurde erfolgreich als Vorlage hochgeladen.') });
                                }
                            },

                        ]
                    }
                },
                {
                    identifier: "Hilfe", subMenu:
                    {
                        items: [
                            {
                                identifier: "Über die Online-IDE...",
                                link: "https://www.learnj.de/doku.php?id=javaonline:ueber"
                            },
                            {
                                identifier: "Impressum...",
                                link: "https://www.learnj.de/doku.php?id=ide:impressum"
                            },
                            {
                                identifier: "Datenschutzerklärung...",
                                link: "https://www.learnj.de/doku.php?id=ide:datenschutzerklaerung"
                            },
                            {
                                identifier: "<div class='jo_menu_version'>" + "Version " + APP_VERSION + " (" + BUILD_DATE + ")</div>",
                                noHoverAnimation: true
                            }


                        ]
                    }
                }

            ]
        };

        if (user != null && (user.is_admin)) {
            mainMenu.items[0].subMenu.items.push({
                identifier: "Shutdown server...",
                action: () => {
                    if (confirm("Server wirklich herunterfahren?")) {
                        ajax("shutdown", {}, () => {
                            alert('Server erfolgreich heruntergefahren.');
                        }, (message) => {
                            alert(message);
                        })
                    }
                }
            }
            )
        }


        jQuery('#mainmenu').empty();
        this.initMenu(mainMenu, 0);
    }

    switchTheme(theme: string) {
        this.main.viewModeController.setTheme(theme);
    }

    initMenu(menu: Menu, level?: number) {

        menu.level = level;

        if (level == 0) {
            menu.$element = jQuery('#mainmenu');
        } else {
            menu.$element = jQuery('<div class="jo_submenu"></div>');
            jQuery('body').append(menu.$element);
        }

        menu.$element.data('model', menu);
        for (let mi of menu.items) {
            if (mi.identifier == '-') {
                mi.$element = jQuery('<div class="jo_menuitemdivider"></div>');
            } else {
                let noHoverKlass = mi.noHoverAnimation ? ' class="jo_menuitem_nohover"' : '';
                mi.$element = jQuery(`<div${noHoverKlass}>${mi.identifier}</div>`);
                if (mi.link != null) {
                    let $link = jQuery('<a href="' + mi.link + '" target="_blank" class="jo_menulink"></a>');
                    $link.on("pointerdown", (event) => {
                        event.stopPropagation();
                    })
                    $link.on("pointerup", (ev) => {
                        ev.stopPropagation();
                        setTimeout(() => {
                            menu.$element.hide();
                        }, 500);
                    })
                    $link.append(mi.$element);
                    mi.$element = $link;

                }
                if (mi.subMenu != null) {
                    this.initMenu(mi.subMenu, level + 1);
                }
                this.initMenuitemCallbacks(menu, mi);
                if (level == 0) {
                    mi.$element.addClass('jo_mainmenuitem');
                }
            }
            menu.$element.append(mi.$element);
            mi.$element.data('model', mi);
        }

        let that = this;
        jQuery(document).on('pointerdown', () => {
            for (let i = 0; i < 5; i++) {
                if (that.currentSubmenu[i] != null) {
                    that.currentSubmenu[i].hide();
                    that.currentSubmenu[i] = null;
                }
            }
            that.openSubmenusOnMousemove = false;
        });

    }

    initMenuitemCallbacks(menu: Menu, mi: MenuItem) {
        let that = this;

        if (mi.action != null) {
            mi.$element.on('pointerdown', (ev) => {
                ev.stopPropagation();
            })


            mi.$element.on('pointerup', (ev) => {
                ev.stopPropagation();
                mi.action(mi.identifier);
                for (let i = 0; i < 5; i++) {
                    if (that.currentSubmenu[i] != null) {
                        that.currentSubmenu[i].hide();
                        that.currentSubmenu[i] = null;
                    }
                }
                that.openSubmenusOnMousemove = false;
            });
        }

        if (mi.subMenu != null) {
            mi.$element.on('mousedown', (ev) => {
                that.opensubmenu(mi);
                that.openSubmenusOnMousemove = true;
                ev.stopPropagation();
            });

            mi.$element.on('mousemove.mainmenu', () => {
                if (that.openSubmenusOnMousemove) {
                    that.opensubmenu(mi);
                } else {
                    if (that.currentSubmenu[menu.level + 1] != null) {
                        that.currentSubmenu[menu.level + 1].hide();
                        that.currentSubmenu[menu.level + 1] = null;
                    }
                }
            });
        } else {
            mi.$element.on('mousemove.mainmenu', () => {
                if (that.currentSubmenu[menu.level + 1] != null) {
                    that.currentSubmenu[menu.level + 1].hide();
                    that.currentSubmenu[menu.level + 1] = null;
                }
            });
        }

    }

    opensubmenu(mi: MenuItem) {

        let subMenu = mi.subMenu;

        let left: number;
        let top: number;
        if (subMenu.level == 1) {
            left = mi.$element.position().left;
            top = 30;
        } else {
            left = mi.$element.offset().left + mi.$element.width();
            top = mi.$element.offset().top;
        }

        subMenu.$element.css({
            top: "" + top + "px",
            left: "" + left + "px"
        })

        if (this.currentSubmenu[subMenu.level] != null) {
            this.currentSubmenu[subMenu.level].hide();
        }

        subMenu.$element.show();
        this.currentSubmenu[subMenu.level] = subMenu.$element;
    }



}
