import { Component } from '@angular/core';
import { MatTab } from '@angular/material/tabs';
import { UiService } from 'src/app/tr-services/ui.service';

@Component({
    selector: 'app-button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.css']
})
export class ButtonBarComponent {

    constructor(protected uiService: UiService) {}

    tabClicked(tab: string) {
        this.uiService.tab = tab;
    }
}
