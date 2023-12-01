import { Component, EventEmitter, Output } from '@angular/core';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';
import { UiService } from 'src/app/tr-services/ui.service';
import { ExportImageService } from 'src/app/tr-services/export-image.service';
import { ExportSvgService } from 'src/app/tr-services/export-svg.service';
import { TokenGameService } from 'src/app/tr-services/token-game.service';
import { ButtonState, TabState } from 'src/app/tr-enums/ui-state';


@Component({
    selector: 'app-button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.css']
})
export class ButtonBarComponent {
    // @Output('tabChange') tabChange: EventEmitter<TabState> = new EventEmitter<TabState>();

    readonly TabState = TabState;
    readonly ButtonState = ButtonState;

    public petrinetCss: string = '';

    constructor(
        protected uiService: UiService,
        protected exportJsonDataService: ExportJsonDataService,
        protected pnmlService: PnmlService,
        protected exportImageService: ExportImageService,
        protected exportSvgService: ExportSvgService,
        protected tokenGameService: TokenGameService
    ) {}

    // gets called when a tab is clicked
    // sets the "tab" property in the uiService
    // empties the "button" property in the uiService
    tabClicked(tab: string) {
        switch (tab) {
            case "build":
                this.uiService.tab = this.TabState.Build;
                this.tokenGameService.clearGameHistory();
                break;
            case "play":
                this.uiService.tab = this.TabState.Play;
                break;
            case "save":
                this.uiService.tab = this.TabState.Save;
                this.tokenGameService.clearGameHistory();
                break;
        }
        this.uiService.button = null;
    }

    // gets called when a button is clicked that needs its state saved globally
    // sets the "button" property in the uiService
    buttonClicked(button: ButtonState) {
        this.uiService.button = button;
    }

}
