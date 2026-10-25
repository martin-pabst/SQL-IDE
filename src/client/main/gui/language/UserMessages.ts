import { lm } from "../../../../tools/language/LanguageManager";

export class UserMenuMessages {
    static changePassword = () => lm({
        'de': 'Passwort ändern',
        'en': 'Change password'
    });

    static changePasswordDescription = () => lm({
        'de': "Bitte geben Sie Ihr bisheriges Passwort und darunter zweimal Ihr neues Passwort ein. <br> Das Passwort muss mindestens 8 Zeichen lang sein und sowohl Buchstaben als auch Zahlen oder Sonderzeichen enthalten.",
        'en': 'Please input your old password and your new one (two times). <br>Your password has to be at least 8 charachters long and must contain letters, digits and special chars.'
    });

    static oldPassword = () => lm({
        'de': 'Altes Passwort',
        'en': 'Old password'
    });

    static newPassword = () => lm({
        'de': 'Neues Passwort',
        'en': 'New password'
    });

    static repeatNewPassword = () => lm({
        'de': 'Neues Passwort wiederholen',
        'en': 'Repeat new password'
    });

    static pleaseWait = () => lm({
        'de': 'Bitte warten...',
        'en': 'Please wait...'
    });

    static cancel = () => lm({
        'de': 'Abbrechen',
        'en': 'Cancel'
    });

    static ok = () => lm({
        'de': 'OK',
        'en': 'OK'
    });

    static passwordsDontMatch = () => lm({
        'de': 'Die zwei eingegebenen neuen Passwörter stimmen nicht überein.',
        'en': "New passwords don't match."
    });

    static settingPasswordSuccessful = () => lm({
        'de': 'Das Passwort wurde erfolgreich geändert.',
        'en': 'Setting new password was successful.'
    });


}
