import jQuery from "jquery";
export class WaitOverlay {

    visible: boolean = false;
    fadeOutPending: boolean = false;
    $bitteWartenText: JQuery<HTMLElement>;
    $bitteWartenProgress: JQuery<HTMLElement>;

    constructor(private $waitDiv: JQuery<HTMLElement>){
        $waitDiv.css('display', 'none');
        this.$bitteWartenText = $waitDiv.find('.bitteWartenText');
        this.$bitteWartenProgress = $waitDiv.find('.bitteWartenProgress');
    }

    show(message: string){
        this.fadeOutPending = false;
        this.$bitteWartenText.html(message);
        this.$bitteWartenProgress.html('');
        if(!this.visible){
            this.visible = true;
            this.$waitDiv.css('display', 'flex');
            this.$waitDiv.hide();
            this.$waitDiv.fadeIn(400);
        }
    }

    setProgress(message: string){
        this.$bitteWartenProgress.html(message);
    }

    hide(){
        if(this.visible){
            this.fadeOutPending = true;
            setTimeout(() => {
                if(this.fadeOutPending){
                    this.fadeOutPending = false;
                    this.$waitDiv.fadeOut(200, () => {
                        this.$waitDiv.css('display', 'none');
                    })
                    this.visible = false;        
                }                
            }, 50);
        }
    }

}