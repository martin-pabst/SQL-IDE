import { makeTabs } from "../../tools/HtmlTools.js";
import { Main } from "../Main.js";
import { Workspace } from "../../workspace/Workspace.js";
import { Module } from "../../compiler/parser/Module.js";
import { ErrorManager } from "./ErrorManager.js";
import { HomeworkManager } from "./HomeworkManager.js";
import { MainBase } from "../MainBase.js";
import jQuery from "jquery";

export class BottomDiv {

    errorManager: ErrorManager;
    homeworkManager: HomeworkManager;

    constructor(private main: MainBase, public $bottomDiv: JQuery<HTMLElement>, public $mainDiv: JQuery<HTMLElement>) {


        if (this.$bottomDiv.find('.jo_tabheadings>.jo_homeworkTabheading').length > 0) {
            this.homeworkManager = new HomeworkManager(<Main>main, $bottomDiv);
        }

        this.errorManager = new ErrorManager(main, $bottomDiv, $mainDiv);
    }

    initGUI() {
        makeTabs(this.$bottomDiv);
        if (this.homeworkManager != null) this.homeworkManager.initGUI();

        this.$bottomDiv.find('.jo_tabs').children().first().trigger("click");

    }

    showHomeworkTab() {

        jQuery('.jo_homeworkTabheading').css('visibility', 'visible');
        jQuery('.jo_homeworkTabheading').trigger("mousedown");

    }

    hideHomeworkTab() {

        jQuery('.jo_homeworkTabheading').css('visibility', 'hidden');
        jQuery('.jo_tabheadings').children().first().trigger("mousedown");

    }


}