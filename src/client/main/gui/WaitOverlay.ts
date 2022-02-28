export class WaitOverlay {

    visible: boolean = false;
    fadeOutPending: boolean = false;

    show(message: string){
        this.fadeOutPending = false;
        jQuery('#bitteWartenText').html(message);
        jQuery('#bitteWartenProgress').html('');
        if(!this.visible){
            this.visible = true;
            jQuery('#bitteWarten').css('display', 'flex');
            jQuery('#bitteWarten').hide();
            jQuery('#bitteWarten').fadeIn(400);
        }
    }

    setProgress(message: string){
        jQuery('#bitteWartenProgress').html(message);
    }

    hide(){
        if(this.visible){
            this.fadeOutPending = true;
            setTimeout(() => {
                if(this.fadeOutPending){
                    this.fadeOutPending = false;
                    jQuery('#bitteWarten').fadeOut(200, () => {
                        jQuery('#bitteWarten').css('display', 'none');
                    })
                    this.visible = false;        
                }                
            }, 50);
        }
    }

}