import { lm } from "../../../../tools/language/LanguageManager";

export class MainMenuMessages {
    static ClassesUserTests = () => lm({
        "de": "Klassen/Benutzer/Prüfungen ...",
        "en": "Classes/Users/Tests ...",
        "fr": "Classes/Utilisateurs/Tests ...",
    })

    static Settings = () => lm({
        "de": "Einstellungen",
        "en": "Settings",
        "fr": "Paramètres",
    })

    static SaveAndExit = () => lm({
        "de": "Speichern und beenden",
        "en": "Save and exit",
        "fr": "Enregistrer et quitter",
    })


}