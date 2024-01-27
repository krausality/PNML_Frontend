import { Injectable } from '@angular/core';
import { ButtonState, CodeEditorFormat, TabState } from '../tr-enums/ui-state';
import {BehaviorSubject} from "rxjs";

@Injectable({
    providedIn: 'root',
})
export class UiService {
    // stores the active tab
    // starting value is "TabState.Build", meaning we always start on the build tab
    tab: TabState = TabState.Build;

    // stores the active button inside the build tab
    // default is empty
    button: ButtonState | null = null;

    // Indicates, when the user switches between tabs.
    // When the user switches tabs, this variable is set to true for
    // 1.1 s and then reset again to false.
    // This allows for smooth transitions of the fill for active petri net
    // transitions when tab changes to and from play mode occur. Other fill changes
    // for petri net transitions during the token game are still displayed
    // instantaneously.
    tabTransitioning: boolean = false;

    buttonState$: BehaviorSubject<ButtonState | null> = new BehaviorSubject<ButtonState | null>(this.button);

    // BehaviorSubject that changes state when the code format is switched in the button bar
    // this way the code editor can be notified of the new format without the use of event bindings
    codeEditorFormat$: BehaviorSubject<CodeEditorFormat> = new BehaviorSubject<CodeEditorFormat>(CodeEditorFormat.JSON);

    constructor() {}
}
