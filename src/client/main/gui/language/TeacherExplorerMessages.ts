import { lm } from "../../../../tools/language/LanguageManager";

export class TeacherExplorerMessages {
    static students = () => lm({
        'de': 'Schüler/-innen',
        'en': 'Students'
    });

    static classes = () => lm({
        'de': 'Klassen',
        'en': 'classes'
    });

    static tests = () => lm({
        'de': 'Prüfungen',
        'en': 'tests'
    });

    static createNewTest = () => lm({
        'de': 'Prüfungen verwalten',
        'en': 'Manage tests'
    });

    static testIsInState = (state: string) => lm({
        'de': 'Die Prüfung befindet sich im Zustand "' + state + ", daher kann noch keine Schülerliste zur Korrektur angezeigt werden." +
            "\nKlicken Sie auf das Zahnrad rechts oberhalb der Prüfungsliste, um zur Prüfungsverwaltung zu gelangen. Dort können Sie den Zustand der Prüfung ändern.",
        'en': 'This test is in state "' + state + ", therefore a list of participating students cannot be displayed yet." +
            "\nClick on the cogwheel right above this list of tests to go to test administration. There you can manage each tests state.",
    });

    static noFile = () => lm({
        'de': 'Keine Datei vorhanden',
        'en': 'No file'
    });

}
