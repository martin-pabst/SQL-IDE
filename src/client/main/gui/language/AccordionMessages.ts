import { lm } from "../../../../tools/language/LanguageManager";

export class AccordionMessages {
    static createFolderTopmostLevel = () => lm({
        'de': 'Neuen Ordner auf oberster Ebene anlegen',
        'en': 'Create folder at topmost level'
    });

    static cancel = () => lm({
        'de': 'Abbrechen',
        'en': 'Cancel'
    });


    static newFolder = () => lm({
        'de': 'Neuer Ordner',
        'en': 'New Folder'
    });

    static collapseAllFoders = () => lm({
        'de': 'Alle Ordner zusammenfalten',
        'en': 'Collapse all folders'
    });

    static rename = () => lm({
        'de': 'Umbenennen',
        'en': 'Rename'
    });

    static createNewFolderBelow = (name: string) => lm({
        'de': "Neuen Unterordner anlegen (unterhalb '" + name + "')...",
        'en': 'Create new folder (below ' + name + "')..."
    });

    static sureDelete = () => lm({
        'de': 'Ich bin mir sicher: löschen!',
        'en': "I'm sure: delete!"
    });

    static cannotDeleteNonEmptyFolder = () => lm({
        'de': 'Dieser Ordner kann nicht gelöscht werden, da er nicht leer ist.',
        'en': "Can't delete folder as it is not empty."
    });

}
