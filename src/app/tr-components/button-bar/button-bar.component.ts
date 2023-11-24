import { Component } from '@angular/core';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';
import { UiService } from 'src/app/tr-services/ui.service';
import { ExportImageService } from 'src/app/tr-services/export-image.service';
import { ExportSvgService } from 'src/app/tr-services/export-svg.service';

@Component({
    selector: 'app-button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.css']
})
export class ButtonBarComponent {

    public petrinetCss: string = '';

    constructor(protected uiService: UiService, protected exportJsonDataService: ExportJsonDataService, protected pnmlService: PnmlService, protected exportImageService: ExportImageService, protected exportSvgService: ExportSvgService) {}

    // gets called when a tab is clicked
    // sets the "tab" property in the uiService
    // empties the "button" property in the uiService
    tabClicked(tab: string) {
        this.uiService.tab = tab;
        this.uiService.button = "";
    }

    // gets called when a button is clicked that needs its state saved globally
    // sets the "button" property in the uiService
    buttonClicked(button: string) {
        this.uiService.button = button;
    }

}
