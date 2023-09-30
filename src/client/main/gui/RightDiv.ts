import { makeTabs } from "../../tools/HtmlTools.js";
import { Main } from "../Main.js";
import { MainBase } from "../MainBase.js";


export class RightDiv {

    isWholePage: boolean = false;

    $tabs: JQuery<HTMLElement>;
    $headings: JQuery<HTMLElement>;

    constructor(private main: MainBase, public $rightDiv: JQuery<HTMLElement>) {

        this.$tabs = $rightDiv.find('.jo_tabs');
        this.$headings = $rightDiv.find('.jo_tabheadings');
        
        let withClassDiagram = this.$headings.find('.jo_classDiagramTabHeading').length > 0;
        let withObjectDiagram = this.$headings.find('.jo_objectDiagramTabHeading').length > 0;

        let that = this;
        let rightdiv_width: string = "100%";
        $rightDiv.find('.jo_whole-window').on("click", () => {

            that.isWholePage = !that.isWholePage;
            
            let $wholeWindow = jQuery('.jo_whole-window');

            if (!that.isWholePage) {
                jQuery('#code').css('display', 'flex');
                jQuery('#rightdiv').css('width', rightdiv_width);
                // jQuery('#run').css('width', '');
                $wholeWindow.removeClass('img_whole-window-back');
                $wholeWindow.addClass('img_whole-window');
                jQuery('#controls').insertAfter(jQuery('#view-mode'));
                $wholeWindow.attr('title', 'Auf Fenstergröße vergrößern');
                jQuery('.jo_graphics').trigger('sizeChanged');
            } else {
                jQuery('#code').css('display', 'none');
                rightdiv_width = jQuery('#rightdiv').css('width');
                jQuery('#rightdiv').css('width', '100%');
                $wholeWindow.removeClass('img_whole-window');
                $wholeWindow.addClass('img_whole-window-back');
                // that.adjustWidthToWorld();
                jQuery('.jo_control-container').append(jQuery('#controls'));
                $wholeWindow.attr('title', 'Auf normale Größe zurückführen');
                jQuery('.jo_graphics').trigger('sizeChanged');
            }
        });

    }

    initGUI() {
        makeTabs(this.$rightDiv);
    }



}