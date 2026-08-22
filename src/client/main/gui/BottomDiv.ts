import { makeTabs } from "../../../tools/HtmlTools.js";
import { Main } from "../Main.js";
import { ErrorManager } from "./ErrorManager.js";
import { HomeworkManager } from "./HomeworkManager.js";
import { MainBase } from "../MainBase.js";
import jQuery from "jquery";
import { TabManager } from "../../../tools/TabManager.js";
import { GradingManager } from "./GradingManager.js";
import { DOM } from "../../../tools/DOM.js";
import compileGIF from '/assets/graphics/compile.gif';
import { ResultsetPresenter } from "./ResultsetPresenter.js";
import { HistoryViewer } from "./HistoryViewer.js";

export class BottomDiv {

    tabManager: TabManager;

    errorManager: ErrorManager;
    homeworkManager: HomeworkManager;
    gradingManager: GradingManager;
    resultsetPresenter: ResultsetPresenter;
    historyViewer: HistoryViewer;

    $updateTimer: JQuery<HTMLElement>;

    networkBusy: HTMLImageElement;


    constructor(private main: MainBase, public $bottomDiv: JQuery<HTMLElement>, public $mainDiv: JQuery<HTMLElement>,
        withErrors: boolean,
        isEmbedded: boolean
    ) {

        this.tabManager = new TabManager($bottomDiv[0]);

        this.resultsetPresenter = new ResultsetPresenter(<Main>main, this.tabManager);

        if (!isEmbedded) {
            this.homeworkManager = new HomeworkManager(<Main>main, this.tabManager);
            this.gradingManager = new GradingManager(<Main>main, this.tabManager);
        }

        if (withErrors) {
            this.errorManager = new ErrorManager(main, this.tabManager);
            this.errorManager.tab.show();
        }

        this.historyViewer = new HistoryViewer(main, this.tabManager);

        if (!isEmbedded) {
            this.networkBusy = DOM.makeElement(this.tabManager.tabheadingRightDiv, 'img', 'jo_network_busy') as HTMLImageElement;
            this.networkBusy.setAttribute('src', compileGIF);
            this.hideNetworkBusy();

            this.$updateTimer = jQuery(`<div class="jo_updateTimerDiv">
                <svg width="30" height="16">
                <rect class="jo_updateTimerRect" x="0" y="4" width="30" height="8"
                style="stroke:none;fill:#008000;fill-opacity:0.8">
                </rect>
                </svg>
                </div>`);
            this.tabManager.insertIntoRightDiv(this.$updateTimer[0]);
        }

    }

    initGUI() {
        makeTabs(this.$bottomDiv);
        if (this.homeworkManager != null) this.homeworkManager.initGUI();

        this.$bottomDiv.find('.jo_tabs').children().first().trigger("click");

    }

    showHomeworkTab() {

        this.homeworkManager.tab.setVisible(true);

    }

    hideHomeworkTab() {

        this.homeworkManager.tab.setVisible(false);

    }

    showNetworkBusy() {
        this.networkBusy.style.display = 'block';
    }

    hideNetworkBusy() {
        this.networkBusy.style.display = 'none';
    }

}