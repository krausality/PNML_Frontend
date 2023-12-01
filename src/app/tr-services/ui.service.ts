import { Injectable } from '@angular/core';
import { ButtonState, TabState } from '../tr-enums/ui-state';

@Injectable({
    providedIn: 'root'
})
export class UiService {

    // stores the active tab
    // starting value is "TabState.Build", meaning we always start on the build tab
    tab: TabState = TabState.Build;
    // stores the active button inside the build tab
    // default is empty
    button: ButtonState | null = null;

    constructor() { }
}
