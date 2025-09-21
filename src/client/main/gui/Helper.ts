import { Main } from "../Main.js";
import jQuery from "jquery";

export type HelperDirection = "top" | "bottom" | "left" | "right";

export class Helper {

    public static openHelper(text: string, targetElement: JQuery<HTMLElement>, direction: HelperDirection) {

        let $helper = jQuery('.jo_arrow_box');
        $helper.removeClass(['jo_arrow_box_left', 'jo_arrow_box_right', 'jo_arrow_box_top', 'jo_arrow_box_bottom']);

        $helper.addClass('jo_arrow_box_' + direction);

        $helper.css({ left: '', right: '', top: '', bottom: '' });

        let to = targetElement.offset();
        let b = jQuery('body');

        let delta: number = 34;

        switch (direction) {
            case "bottom": $helper.css({
                left: to.left + targetElement.width() / 2 - delta,
                bottom: b.height() - to.top + delta
            });
                break;
            case "top": $helper.css({
                left: to.left + targetElement.width() / 2 - delta,
                top: to.top + targetElement.height() + 26
            });
                break;
            case "left": $helper.css({
                left: to.left + targetElement.width() + delta,
                top: to.top + targetElement.height() / 2 - delta
            });
                break;
            case "right": $helper.css({
                right: b.width() - to.left,
                top: to.top + targetElement.height() / 2 - delta
            });
                break;
        }

        $helper.find('span').html(text);

        let $button = $helper.find('.jo_button');
        $button.on('click', (e) => {
            e.stopPropagation();
            $button.off('click');
            Helper.close();
        });

        $helper.fadeIn(800);

    }

    static close() {
        let $helper = jQuery('.jo_arrow_box');
        $helper.fadeOut(800);
    }


    static showHelper(id: string, mainBase: Main, $element?: JQuery<HTMLElement>) {

        let main: Main;
        if(mainBase instanceof Main){
            main = mainBase;
        } else {
            return;
        }

        let user = main.user;
        if(user == null) return;

        let helperHistory = user.settings!.helperHistory;

        let flag = id + "Done";

        if (helperHistory != null && (helperHistory[flag] == null || !helperHistory[flag])) {
            helperHistory[flag] = true;
            main.networkManager.sendUpdateUserSettings(() => { });

            let text: string = "";
            let direction: HelperDirection = "left";

            switch (id) {
                case "newDatabaseHelper":
                    text = `Es gibt noch keine Datenbank. <br> Nutzen Sie den Button
                        <span class='img_add-database-dark jo_inline-image'></span> um eine Datenbank anzulegen.
                        `;
                    direction = "left";
                    break;
                    case "newSQLFileHelper":
                        text = `Es gibt noch keine Datei mit SQL-Anweisungen. <br> Nutzen Sie den Button 
                            <span class='img_add-file-dark jo_inline-image'></span> um eine neue Datei anzulegen.
                            `;
                        direction = "left";
                        break;
                case "homeButtonHelper":
                    text = "Mit dem Home-Button <span class='img_home-dark jo_inline-image'></span> können Sie wieder zu Ihren eigenen Workspaces wechseln.";
                    direction = "top";
                    $element = jQuery('.img_home-dark');
                    break;
                case "playButtonHelper":
                    text = `Mit dem "Start-Button"
                        (<span class='img_start-dark jo_inline-image'></span>) 
                        oder der Tastenkombination &lt;Strg&gt;&nbsp;+&nbsp&lt;Enter&gt; 
                        wird die Anweisung ausgeführt, in der der Cursor gerade steht. 
                        <br> Wollen Sie mehrere Anweisungen hintereinander ausführen, so markieren 
                        Sie alle Anweisungen und klicken Sie dann auf <span class='img_start-dark jo_inline-image'></span>
                        oder drücken Sie  &lt;Strg&gt;&nbsp;+&nbsp&lt;Enter&gt;. `;
                    direction = "top";
                    break;
                case "consoleHelper": 
                    text=`
                        Hier können Sie Anweisungen oder Terme eingeben, die nach Bestätigung mit der Enter-Taste ausgeführt/ausgewertet werden. Das Ergebnis sehen Sie im Bereich über der Eingabezeile. <br>
                        Falls das Programm gerade pausiert (z.B. bei Ausführung in Einzelschritten) können Sie auch auf die Variablen des aktuellen Sichtbarkeitsbereiches zugreifen.
                    `;
                    direction = "bottom";
            }

            if (text != "" && $element != null && $element.length > 0) {
                Helper.openHelper(text, $element, direction);
            }

        }

    }



}