import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import {ButtonState} from "./tr-enums/ui-state";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css'],
})
export class AppComponent {
    public textareaFc: FormControl;
    public buttonState: ButtonState | undefined;

    constructor() {
        this.textareaFc = new FormControl();
        this.textareaFc.disable();
    }

    public processSourceChange(newSource: string) {
        this.textareaFc.setValue(newSource);
    }

    public updateButtonState(buttonState: ButtonState) {
        this.buttonState = buttonState;
    }
}
