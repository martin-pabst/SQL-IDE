// <div id="controls">
// <div id="speedcontrol-outer" title="Geschwindigkeitsregler" draggable="false">
//     <div id="speedcontrol-bar" draggable="false"></div>
//     <div id="speedcontrol-grip" draggable="false">
//         <div id="speedcontrol-display">100 Schritte/s</div>
//     </div>
// </div>
// <!-- <img id="buttonStart" title="Start" src="assets/projectexplorer/start-dark.svg"> -->
// <div id="buttonStart" title="Start" class="img_start button"></div>
// <div id="buttonPause" title="Pause" class="img_pause button"></div>
// <div id="buttonStop" title="Stop" class="img_stop button"></div>
// <div id="buttonStepOver" title="Step over" class="img_step-over button"></div>
// <div id="buttonStepInto" title="Step into" class="img_step-into button"></div>
// <div id="buttonStepOut" title="Step out" class="img_step-out button"></div>
// <div id="buttonRestart" title="Restart" class="img_restart button"></div>
// </div>

import { MainBase } from "../MainBase.js";
import jQuery from "jquery";


export class ProgramControlButtons {

    $buttonStart: JQuery<HTMLElement>;
    $buttonRollback: JQuery<HTMLElement>;
    // $buttonPause: JQuery<HTMLElement>;
    // $buttonStop: JQuery<HTMLElement>;
    // $buttonStepOver: JQuery<HTMLElement>;
    // $buttonStepInto: JQuery<HTMLElement>;
    // $buttonStepOut: JQuery<HTMLElement>;
    // $buttonRestart: JQuery<HTMLElement>;

    // $buttonEdit: JQuery<HTMLElement>;


    constructor(private main: MainBase, private $buttonsContainer: JQuery<HTMLElement>) {

        this.$buttonStart = jQuery('<div title="Start" class="img_start jo_button"></div>');
        this.$buttonRollback = jQuery('<div title="Rollback" class="img_undo jo_button"></div>');

        let am = this.main.getActionManager();

        am.registerAction("execute", ['Strg + Enter'],
            () => {
                if (am.isActive("execute")) {

                    this.main.getResultsetPresenter().executeSelectedStatements();
                }

            }, "SQL-Statement ausführen", this.$buttonStart
        );

        am.setActive('execute',false);

        am.registerAction("rollback", ['Strg + LeftArrow'],
            () => {
                if (am.isActive("rollback")) {

                    this.main.getHistoryViewer().rollback();
                }

            }, "Letztes schreibendes SQL-Statement rückgängig machen", this.$buttonRollback
        );

        am.setActive('rollback',false);

        // this.$buttonPause = jQuery('<div title="Pause" class="img_pause jo_button"></div>');
        // this.$buttonStop = jQuery('<div title="Stop" class="img_stop jo_button"></div>');
        // this.$buttonStepOver = jQuery('<div title="Step over" class="img_step-over jo_button"></div>');
        // this.$buttonStepInto = jQuery('<div title="Step into" class="img_step-into jo_button"></div>');
        // this.$buttonStepOut = jQuery('<div title="Step out" class="img_step-out jo_button"></div>');
        // this.$buttonRestart = jQuery('<div title="Restart" class="img_restart jo_button"></div>');

        // this.$buttonEdit = jQuery('<div class="jo_editButton" title="Programm anhalten damit der Programmtext bearbeitbar wird"></div>')
        // $editorContainer.append(this.$buttonEdit);

        $buttonsContainer.append(this.$buttonStart, this.$buttonRollback
            // , this.$buttonPause, this.$buttonStop,
            // this.$buttonStepOver, this.$buttonStepInto, this.$buttonStepOut, this.$buttonRestart
        );

        // <!-- <img id="buttonStart" title="Start" src="assets/projectexplorer/start-dark.svg"> -->
        // <div id="buttonStart" title="Start" class="img_start button"></div>
        // <div id="buttonPause" title="Pause" class="img_pause button"></div>
        // <div id="buttonStop" title="Stop" class="img_stop button"></div>
        // <div id="buttonStepOver" title="Step over" class="img_step-over button"></div>
        // <div id="buttonStepInto" title="Step into" class="img_step-into button"></div>
        // <div id="buttonStepOut" title="Step out" class="img_step-out button"></div>
        // <div id="buttonRestart" title="Restart" class="img_restart button"></div>



    }

}