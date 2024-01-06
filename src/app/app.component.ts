import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { UiService } from './tr-services/ui.service';
import { TabState } from './tr-enums/ui-state';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    // public textareaFc: FormControl;

    constructor(public uiService: UiService) {
        // this.textareaFc = new FormControl();
        // this.textareaFc.disable();
    }

    public processSourceChange(newSource: string) {
        // this.textareaFc.setValue(newSource);
    }

    protected readonly TabState = TabState;
}
