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

    static OfferStatementTemplates = () => lm({
        'de': `Vorlagen für SQL-Statements anbieten`,
        'en': `Offer SQL statement templates`,
        'fr': `Proposer des modèles d'instructions SQL`
    })

    static OfferIdentifiers = () => lm({
        'de': `Vorschläge für Tabellen- und Spaltenbezeichner anbieten`,
        'en': `Offer suggestions for table and column identifiers`,
        'fr': `Proposer des suggestions pour les identificateurs de tables et de colonnes`
    })

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

        static SchooladminSettingsName = () => lm({
        'de': 'Schulweite Festlegungen',
        'en': 'School-wide settings',
        'fr': 'Paramètres à l\'échelle de l\'école'
    });

    static SchooladminSettingsDescription = () => lm({
        'de': 'Hier können Sie Einstellungen vornehmen, die schulweit gelten.',
        'en': 'Here you can adjust settings that apply school-wide.',
        'fr': 'Ici, vous pouvez ajuster les paramètres qui s\'appliquent à l\'échelle de l\'école.'
    });

    static PruefungFunctionalityName = () => lm({
        'de': 'Funktionalität "Prüfungen" aktivieren/deaktivieren',
        'en': 'Functionality "Exams" enable/disable',
        'fr': 'Fonctionnalité "Examens" activer/désactiver'
    });

    static PruefungFunctionalityDescription = () => lm({
        'de': 'Hier können Sie einstellen, ob die Funktionalität "Prüfungen" in der Online-IDE aktiviert oder deaktiviert werden soll.',
        'en': 'Here you can set whether the functionality "Exams" should be enabled or disabled in the online IDE.',
        'fr': 'Ici, vous pouvez définir si la fonctionnalité "Examens" doit être activée ou désactivée dans l\'IDE en ligne.'
    });

    static enabled = () => lm({
        'de': 'aktiviert',
        'en': 'enabled',
        'fr': 'activé'
    });

    static disabled = () => lm({
        'de': 'deaktiviert',
        'en': 'disabled',
        'fr': 'désactivé'
    });

    static CsvExportSettingsName = () => lm({
        'de': 'CSV-Export-Optionen',
        'en': 'CSV Export Options',
        'fr': 'Options d\'exportation CSV'
    });

    static CsvExportSettingsDescription = () => lm({
        'de': 'Hier können Sie Einstellungen für den CSV-Export vornehmen.',
        'en': 'Here you can adjust settings for CSV export.',
        'fr': 'Ici, vous pouvez ajuster les paramètres pour l\'exportation CSV.'
    });

    static CsvExportWithColumnIdentifiersName = () => lm({
        'de': 'Spaltenbezeichner in CSV-Dateien exportieren',
        'en': 'Export column identifiers in CSV files',
        'fr': 'Exporter les identificateurs de colonnes dans les fichiers CSV'
    });

    static CsvExportWithColumnIdentifiersDescription = () => lm({
        'de': 'Hier können Sie einstellen, ob beim Export von Tabellen in CSV-Dateien die Spaltenbezeichner in der ersten Zeile der CSV-Datei enthalten sein sollen.',
        'en': 'Here you can set whether the column identifiers should be included in the first line of the CSV file when exporting tables to CSV files.',
        'fr': 'Ici, vous pouvez définir si les identificateurs de colonnes doivent être inclus dans la première ligne du fichier CSV lors de l\'exportation de tableaux vers des fichiers CSV.'
    });

    static CsvExportSeparatorName = () => lm({
        'de': 'Trennzeichen zwischen den Werten',
        'en': 'Separator between values',
        'fr': 'Séparateur entre les valeurs'
    });

    static CsvExportSeparatorDescription = () => lm({
        'de': 'Hier können Sie einstellen, welches Zeichen als Trennzeichen zwischen den Werten in der CSV-Datei verwendet werden soll.',
        'en': 'Here you can set which character should be used as a separator between the values in the CSV file.',
        'fr': 'Ici, vous pouvez définir quel caractère doit être utilisé comme séparateur entre les valeurs dans le fichier CSV.'
    });

    static CsvExportSeparatorComma = () => lm({
        'de': 'Komma (,)',
        'en': 'Comma (,)',
        'fr': 'Virgule (,)'
    });

    static CsvExportSeparatorSemicolon = () => lm({
        'de': 'Semikolon (;)',
        'en': 'Semicolon (;)',
        'fr': 'Point-virgule (;)'
    });

    static CsvExportSeparatorTab = () => lm({
        'de': 'Tabulator (\\t)',
        'en': 'Tab (\\t)',
        'fr': 'Tabulation (\\t)'
    });

    static CsvExportQuotesAroundValuesName = () => lm({
        'de': 'Anführungszeichen um Werte setzen',
        'en': 'Set quotes around values',
        'fr': 'Mettre des guillemets autour des valeurs'
    });

    static CsvExportQuotesAroundValuesDescription = () => lm({
        'de': 'Hier können Sie einstellen, ob beim Export von Tabellen in CSV-Dateien die Werte in Anführungszeichen gesetzt werden sollen.',
        'en': 'Here you can set whether the values should be enclosed in quotes when exporting tables to CSV files.',
        'fr': 'Ici, vous pouvez définir si les valeurs doivent être entourées de guillemets lors de l\'exportation de tableaux vers des fichiers CSV.'
    });

    static CsvExportQuotesAroundValuesSingleQuote = () => lm({
        'de': 'Einfaches Anführungszeichen (\')',
        'en': 'Single quote (\')',
        'fr': 'Guillemet simple (\')'
    });

    static CsvExportQuotesAroundValuesDoubleQuote = () => lm({
        'de': 'Doppeltes Anführungszeichen (")',
        'en': 'Double quote (")',
        'fr': 'Guillemet double (")'
    });

    static CsvExportQuotesAroundValuesNone = () => lm({
        'de': 'Keine Anführungszeichen',
        'en': 'No quotes',
        'fr': 'Pas de guillemets'
    });

}