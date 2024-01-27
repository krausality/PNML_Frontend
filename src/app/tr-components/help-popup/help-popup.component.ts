import { Component } from '@angular/core';
import { UiService } from 'src/app/tr-services/ui.service';
import { TabState } from 'src/app/tr-enums/ui-state';

@Component({
    selector: 'help-build-popup',
    templateUrl: './help-popup.component.html',
    styleUrls: ['./help-popup.component.css'],
})
export class HelpPopupComponent {
    constructor(
        protected uiService: UiService,
    ) {}

    readonly TabState = TabState;
}
