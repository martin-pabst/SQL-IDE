import { lm } from "../../../../tools/language/LanguageManager";

export class ProjectExplorerMessages {

    static confirmDeleteFileFolderRecursively = (numberOfFilesToDelete: number) => lm({
        'de': `Sie sind dabei, einen Ordner mitsamt aller darin enthaltenen Dateien und Unterordner rekursiv zu löschen.
Insgesamt betrifft dies ${numberOfFilesToDelete} Dateien und Ordner.
Diese Opertion kann nicht wieder rückgängig gemacht werden!
Sind Sie sicher?`,
        'en': `You are about to delete a folder with all its files and subfolders recursively.
This affects a total of ${numberOfFilesToDelete} files and folders.
This operation cannot be undone!
Are you sure?`
    });

    static confirmDeleteWorkspaceFolderRecursively = (numberOfWorkspacesToDelete: number) => lm({
        'de': `Sie sind dabei, einen Ordner mitsamt aller darin enthaltenen Datenbanken und Unterordner rekursiv zu löschen.
Insgesamt betrifft dies ${numberOfWorkspacesToDelete} Datenbanken und Ordner.
Diese Opertion kann nicht wieder rückgängig gemacht werden!
Sind Sie sicher?`,
        'en': `You are about to delete a folder with all its databases and subfolders recursively.
This affects a total of ${numberOfWorkspacesToDelete} databases and folders.
This operation cannot be undone!
Are you sure?`
    });


    static databaseSettings = () => lm({
        'de': 'Datenbank-Einstellungen',
        'en': 'Database settings'
    });

    static noWorkspaceSelected = () => lm({
        'de': 'Kein Workspace ausgewählt',
        'en': 'No workspace selected'
    });

    static newFile = () => lm({
        'de': 'Neue Datei...',
        'en': 'New file...'
    });

    static firstChooseWorkspace = () => lm({
        'de': 'Bitte wählen Sie zuerst einen Workspace aus.',
        'en': 'Choose workspace first.'
    });

    static firstChooseWorkspaceBecauseFolderIsSelected = () => lm({
        'de': 'Bitte wählen Sie zuerst einen Workspace aus. Selektiert ist aktuell ein Ordner, kein Workspace.',
        'en': 'Choose workspace first. Currently a folder is selected, not a workspace.'
    });

    static serverNotReachable = () => lm({
        'de': 'Der Server ist nicht erreichbar!',
        'en': 'Server not reachable!'
    });

    static noFile = () => lm({
        'de': `Keine Datei vorhanden.
        
!!!!
!  !   
!  !   Hilf mit beim Datenschutz:
!  !   
!  !   Bitte achte darauf, keine 
!!!!   personenbezogenen Daten  
       im Programmtext einzugeben!
!!!!
!  !
!!!!`,
        'en': `No file present.
!!!!
!  !
!  !   Help with data protection:
!  !
!  !   Please make sure not to enter any
!!!!   personal data in the program text!

!!!!
!  !
!!!!`
    });

    static duplicate = () => lm({
        'de': 'Duplizieren',
        'en': 'Duplicate'
    });

    static exportAsFile = () => lm({
        'de': 'Als Datei exportieren',
        'en': 'Export as file'
    });

    static copy = () => lm({
        'de': 'Kopie',
        'en': 'copy'
    });

    static markAsAssignment = () => lm({
        'de': 'Als Hausaufgabe markieren',
        'en': 'Label as assignment'
    });

    static removeAssignmentLabel = () => lm({
        'de': 'Hausaufgabenmarkierung entfernen',
        'en': 'Remove assignment label'
    });

    static synchronizeWorkspaceWithRepository = () => lm({
        'de': 'Workspace mit Repository synchronisieren',
        'en': 'Synchronize workspace with repository'
    });

    static labeledAsAssignment = () => lm({
        'de': 'Wurde aus Hausaufgabe abgegeben',
        'en': 'Labeled as assignment'
    });

    static assignmentIsCorrected = () => lm({
        'de': 'Korrektur liegt vor',
        'en': 'Assignment is corrected',
        'fr': 'Devoir corrigé'
    });


    static WORKSPACES = () => lm({
        'de': 'WORKSPACES',
        'en': 'WORKSPACES'
    });

    static newDatabase = () => lm({
        'de': 'Neue Datenbank',
        'en': 'New database'
    });

    static selectDatabase = () => lm({
        'de': 'Bitte Datenbank selektieren',
        'en': 'Select database'
    });

    static error = () => lm({
        'de': 'Fehler',
        'en': 'Error'
    });

    static displayOwnDatabases = () => lm({
        'de': 'Meine eigenen Datenbanken anzeigen',
        'en': 'Display own databases'
    });

    static importDatabase = () => lm({
        'de': 'Datenbank importieren',
        'en': 'Import database'
    });

    static exportFolder = () => lm({
        'de': 'Ordner exportieren',
        'en': 'Export folder'
    });

    static exportToFile = () => lm({
        'de': 'Datenbank als Datei exportieren',
        'en': 'Export database to file'
    });

    static distributeToClass = () => lm({
        'de': 'An Klasse austeilen',
        'en': 'Distribute to class'
    });

    static workspaceDistributed = (databaseName: string, className: string) => lm({
        'de': "Die Datenbank " + databaseName + " wurde an die Klasse " + className + " ausgeteilt. Sie wird sofort in der Datenbankliste der Schüler/innen erscheinen.\n Falls das bei einer Schülerin/einem Schüler nicht klappt, bitten Sie sie/ihn, sich kurz aus- und wieder einzuloggen.",
        'en': "Database " + databaseName + " gets distributed to class " + className + " . If it's not visible for a given student, she/he might logout and login to see it.",
    });

    static distributeToStudents = () => lm({
        'de': 'An einzelne Schüler/-innen austeilen...',
        'en': 'Distribute to individual students...'
    });

    static settings = () => lm({
        'de': 'Einstellungen',
        'en': 'Settings'
    });

    static noWorkspace = () => lm({
        'de': 'Keine Datenbank vorhanden',
        'en': 'No database'
    });

    static myWorkspaces = () => lm({
        'de': 'Meine DATENBANKEN',
        'en': 'Own databases'
    });

    static NewFileName = () => lm({
        "de": "Datei",
        "en": "File",
        "fr": "Fichier",
    })

    static NewDatabaseName = () => lm({
        "de": "Datenbank",
        "en": "Database",
        "fr": "Espace de travail",
    })

    static FilenameHasBeenTruncated = (newLength: number) => lm({
        'de': `Der Dateiname wurde auf ${newLength} Zeichen gekürzt.`,
        'en': `Filename has been truncated to ${newLength} characters.`,
        'fr': `Le nom du fichier a été tronqué à ${newLength} caractères.`,
    });

    static cantMoveFilesToDatabaseFolder = () => lm({
        'de': `Dateien können nicht in einen Datenbank-Ordner verschoben/kopiert werden.`,
        'en': `Cannot move/copy files to database folder.`,
        'fr': `Impossible de déplacer/copier des fichiers vers le dossier de l'espace de travail.`,
    });
    
}