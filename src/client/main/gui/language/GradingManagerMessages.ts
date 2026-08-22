import { lm } from "../../../../tools/language/LanguageManager";

export class GradingManagerMessages {
    static evaluation = () => lm({
        'de': 'Bewertung',
        'en': 'Evaluation'
    });

    static points = () => lm({
        'de': 'Punkte',
        'en': 'Points'
    });

    static grade = () => lm({
        'de': 'Note',
        'en': 'Grade'
    });

    static attendance = () => lm({
        'de': 'Anwesend',
        'en': 'Attendance'
    });

    static yes = () => lm({
        'de': `Ja`,
        'en': `yes`
    });

    static no = () => lm({
        'de': `Nein`,
        'en': `no`
    });
    
    

    static remark = () => lm({
        'de': 'Bemerkung',
        'en': 'Remark'
    });

}
