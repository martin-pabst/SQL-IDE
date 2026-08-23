import { lm } from "../../tools/language/LanguageManager";

export class SettingsMessages {

    static Saving = () => lm({
        'de': 'Speichere...',
        'en': 'saving...',
        'fr': 'enregistrement...'
    });

    static Saved = () => lm({
        'de': 'Gespeichert',
        'en': 'saved',
        'fr': 'enregistré'
    });


    static OptionDefault = () => lm({
        'de': 'Standard',
        'en': 'default',
        'fr': 'par défaut'
    });

    static OptionTrue = () => lm({
        'de': 'Ja',
        'en': 'true',
        'fr': 'Oui'
    });

    static OptionFalse = () => lm({
        'de': 'Nein',
        'en': 'false',
        'fr': 'Non'
    });


    static CloseButton = () => lm({
        'de': 'Schließen',
        'en': 'Close',
        'fr': 'Fermer'
    });

    static SettingsHeading = () => lm({
        'de': 'Einstellungen',
        'en': 'Settings',
        'fr': 'Paramètres'
    })

    static UserSettingsTabHeading = () => lm({
        'de': 'Meine Einstellungen',
        'en': 'My Settings',
        'fr': 'Mes paramètres'
    });

    static ClassSettingsTabHeading = () => lm({
        'de': 'Klassen-Einstellungen für ',
        'en': 'Class Settings for ',
        'fr': 'Paramètres de la classe pour '
    });

    static SchoolSettingsTabHeading = () => lm({
        'de': 'Schul-Einstellungen',
        'en': 'School Settings',
        'fr': 'Paramètres de l\'école'
    });

    static ScopeUser = () => lm({
        'de': 'Benutzer',
        'en': 'User',
        'fr': 'Utilisateur'
    });

    static ScopeClass = () => lm({
        'de': 'Klasse',
        'en': 'Class',
        'fr': 'Classe'
    });

    static ScopeSchool = () => lm({
        'de': 'Schule',
        'en': 'School',
        'fr': 'École'
    });

    static EditorSettingsName = () => lm({
        'de': 'Editor',
        'en': 'Editor',
        'fr': 'Éditeur'
    });

    static SettingDisabledByHigherPrecedence = () => lm({
        'de': 'Diese Einstellung wird von einer klassen- oder schulweiten Einstellung mit höherer Präzedenz überschrieben und kann daher nicht geändert werden.',
        'en': 'This setting is overridden by a class- or school-wide setting with higher precedence and therefore cannot be changed.',
        'fr': 'Ce paramètre est remplacé par un paramètre de priorité supérieure au niveau de la classe ou de l\'école et ne peut donc pas être modifié.'
    });

    static EditorSettingsDescription = () => lm({
        'de': 'Hier können Sie die Einstellungen des Editors anpassen.',
        'en': 'Here you can adjust the editor settings.',
        'fr': 'Ici, vous pouvez ajuster les paramètres de l\'éditeur.'
    });

    static HoverVerbosityName = () => lm({
        'de': 'Texte beim Hovern über Code',
        'en': 'Hover-Verbosity',
        'fr': 'Verbosité des infobulles'
    });

    static HoverVerbosityDescription = () => lm({
        'de': 'Menge an Informationen, die in Hover-Infoballons angezeigt werden.',
        'en': 'Information amount displayed in hover tooltips.',
        'fr': 'Quantité d\'informations affichées dans les infobulles.'
    });

    static ShowHelpOnKeywordsAndOperators = () => lm({
        'de': 'Hilfstexte für Schlüsselwörter und Operatoren anzeigen',
        'en': 'Show help texts for keywords and operators',
        'fr': 'Afficher les textes d\'aide pour les mots-clés et les opérateurs'
    });

    static None = () => lm({
        'de': 'Keine',
        'en': 'None',
        'fr': 'Aucun'
    });

    static ShowStructureStatementHelp = () => lm({
        'de': `Hilfe für Strukturanweisungen anzeigen`,
        'en': `Show help for structure statements`,
        'fr': `Afficher l'aide pour les instructions de structure`
    });


    static TypingAssistanceName = () => lm({
        'de': 'Unterstützung bei der Eingabe von Code',
        'en': 'Typing Assistance',
        'fr': 'Assistance à la saisie de code'
    });

    static EditorViewSettings = () => lm({
        'de': `Anzeigeeinstellungen des Editors`,
        'en': `Editor View Settings`,
        'fr': `Paramètres d'affichage de l'éditeur`
    });

    static EditorViewSettingsDescription = () => lm({
        'de': `Hier können Sie die Anzeigeeinstellungen des Editors anpassen.`,
        'en': `You can adjust the editor view settings here.`,
        'fr': `Vous pouvez ajuster les paramètres d'affichage de l'éditeur ici.`
    });

    static TypingAssistanceDescription = () => lm({
        'de': 'Hier können Sie die Eingabeunterstützung des Editors anpassen.',
        'en': 'Here you can adjust the typing assistance of the editor.',
        'fr': 'Ici, vous pouvez ajuster l\'assistance à la saisie de l\'éditeur.'
    });

    static AutoClosingBracketsName = () => lm({
        'de': 'Automatisches Schließen von Klammern',
        'en': 'Auto Closing Brackets',
        'fr': 'Fermeture automatique des parenthèses'
    });

    static BracketPairLines = () => lm({
        'de': `Linien zwischen Klammerpaaren anzeigen`,
        'en': `Display lines between bracket pairs`,
        'fr': `Afficher les lignes entre les paires de parenthèses`
    });

    static BracketPairLinesDescription = () => lm({
        'de': `Vertikale Linien zwischen passenden Klammerpaaren anzeigen, gegebenfalls um Unterstreichung des Scope-Beginns.`,
        'en': `Display vertical lines between matching bracket pairs, possibly with underlined scope-start.`,
        'fr': `Afficher des lignes verticales entre les paires de parenthèses correspondantes, éventuellement avec le début du scope souligné.`
    });

    static BracketPairLinesOff = () => lm({
        'de': `Keine Linien anzeigen`,
        'en': `Do not display lines`,
        'fr': `Ne pas afficher de lignes`
    });

    static BracketPairLinesVertical = () => lm({
        'de': `Vertikale Linien anzeigen (entspricht Scope)`,
        'en': `Display vertical lines (according to scope)`,
        'fr': `Afficher des lignes verticales (selon le scope)`
    });

    static BracketPairLinesVerticalAndUnderlined = () => lm({
        'de': `Vertikale Linien und Unterstreichung anzeigen`,
        'en': `Display vertical lines and underline`,
        'fr': `Afficher des lignes verticales et souligner`
    });

    static AutoSemicolonsName = () => lm({
        'de': `Automatisches Ergänzen von Strichpunkten`,
        'en': `Auto Semicolons`,
        'fr': `Point-virgules automatiques`
    });

    static AutoSemicolonsDescription = () => lm({
        'de': `Fehlende Strichpunkte am Ende der Zeile werden in den meisten Fällen automatisch ergänzt.`,
        'en': `Missing semicolons at the end of the line are automatically added in most cases.`,
        'fr': `Les points-virgules manquants à la fin de la ligne sont automatiquement ajoutés dans la plupart des cas.`
    });

    static On = () => lm({
        'de': `Ein`,
        'en': `On`,
        'fr': `Activé`
    });

    static Off = () => lm({
        'de': `Aus`,
        'en': `Off`,
        'fr': `Désactivé`
    });


    static AutoClosingQuotesName = () => lm({
        'de': 'Automatisches Schließen von Anführungszeichen',
        'en': 'Auto Closing Quotes',
        'fr': 'Fermeture automatique des guillemets'
    });

    static AutoClosingBracketsDescription = () => lm({
        'de': 'Bei Eingabe von öffnenden Klammern wird automatisch die schließende Klammer hinzugefügt.',
        'en': 'Automatically add closing brackets when typing opening brackets.',
        'fr': 'Ajoute automatiquement les parenthèses fermantes lors de la saisie des parenthèses ouvrantes.'
    });

    static AutoClosingQuotesDescription = () => lm({
        'de': 'Bei Eingabe eines Anführungszeichens wird automatisch ein zweites hinter dem Cursor hinzugefügt.',
        'en': 'Automatically add a second quote behind the cursor when typing a quote.',
        'fr': 'Ajoute automatiquement un deuxième guillemet derrière le curseur lors de la saisie d\'un guillemet.'
    });

    static AutoClosingBracketsAlways = () => lm({
        'de': 'Immer',
        'en': 'Always',
        'fr': 'Toujours'
    });

    static AutoClosingBracketsNever = () => lm({
        'de': 'Nie',
        'en': 'Never',
        'fr': 'Jamais'
    });

    static AutoClosingBracketsBeforeWhitespace = () => lm({
        'de': 'Nur vor Leerzeichen',
        'en': 'Only before whitespace',
        'fr': 'Seulement avant les espaces'
    });

    static ExplorerSettingsName = () => lm({
        'de': `Explorer`,
        'en': `Explorer`,
        'fr': `Explorateur`
    });

    static ExplorerSettingsDescription = () => lm({
        'de': `Einstellungen für den Datei- und Workspaceexplorer (im Hauptfenster links).`,
        'en': `Settings for file- and workspace explorer (in the main window on the left).`
    });

    static ExplorerFileOrderName = () => lm({
        'de': `Sortierung des Dateibaums`,
        'en': `Order of file treeview`
    });

    static ExplorerFileOrderDescription = () => lm({
        'de': `Hier können Sie einstellen, ob der Dateibaum grundsätzlich alphabetisch sortiert werden soll oder der Nutzer durch drag and drop eine davon abweichende Sortierung festlegen kann.`,
        'en': `You can set here whether the file tree should be sorted alphabetically by default or whether the user can define a different sorting by drag and drop.`
    });

    static ExplorerDatabaseOrderName = () => lm({
        'de': `Sortierung des Datenbankbaums`,
        'en': `Order of database treeview`
    });

    static ExplorerDatabaseOrderDescription = () => lm({
        'de': `Hier können Sie einstellen, ob der Datenbankbaum grundsätzlich alphabetisch sortiert werden soll oder der Nutzer durch drag and drop eine davon abweichende Sortierung festlegen kann.`,
        'en': `You can set here whether the database tree should be sorted alphabetically by default or whether the user can define a different sorting by drag and drop.`
    });

    static ExplorerOrderComparator = () => lm({
        'de': `Immer alphabetisch`,
        'en': `Always alphabetical`,
        'fr': `Toujours alphabétique`
    });

    static ExplorerOrderUserDefined = () => lm({
        'de': `Nutzerdefinierte Sortierung`,
        'en': `User-defined order`,
        'fr': `Ordre défini par l'utilisateur`
    });

    static ContextSensitiveHelpName = () => lm({
        'de': `Kontextsensitive Hilfe`,
        'en': `Context-sensitive help`
    });

    static ContextSensitiveHelpDescription = () => lm({
        'de': `Hier können Sie einstellen, ob in bestimmten Bereichen der Anwendung kontextsensitive Hilfetexte angezeigt werden sollen.`,
        'en': `Here you can set whether context-sensitive help texts should be displayed in certain areas of the application.`, 
        'fr': `Ici, vous pouvez définir si des textes d'aide contextuels doivent être affichés dans certaines zones de l'application.`
    });

    static yes = () => lm({
        'de': `Ja`,
        'en': `Yes`,
        'fr': `Oui`
    });

    static no = () => lm({
        'de': `Nein`,
        'en': `No`,
        'fr': `Non`
    });

}