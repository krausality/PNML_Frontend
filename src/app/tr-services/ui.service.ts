import { Injectable } from '@angular/core';
import { ButtonState, CodeEditorFormat, TabState } from '../tr-enums/ui-state';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class UiService {
    // Stores the active tab
    // Starting value is "TabState.Build", meaning we always start on the build tab
    tab: TabState = TabState.Build;

    // Stores the active button inside the build tab
    // Default is empty
    button: ButtonState | null = null;

    // Indicates, when the user switches between tabs.
    // When the user switches tabs, this variable is set to true for
    // 1.1 s and then reset again to false.
    // This allows for smooth transitions of the fill for active petri net
    // transitions when tab changes to and from play mode occur. Other fill changes
    // for petri net transitions during the token game are still displayed
    // instantaneously.
    tabTransitioning: boolean = false;

    // BehaviorSubject that changes state when the Button or the Tab is changed
    // this way the selected Element of the Blitz tool is reset
    buttonState$: BehaviorSubject<ButtonState | null> =
        new BehaviorSubject<ButtonState | null>(this.button);

    // BehaviorSubject that changes state when the code format is switched in the button bar
    // This way the code editor can be notified of the new format without the use of event bindings
    codeEditorFormat$: BehaviorSubject<CodeEditorFormat> =
        new BehaviorSubject<CodeEditorFormat>(CodeEditorFormat.JSON);

    simulationResults$: BehaviorSubject<any | null> = new BehaviorSubject<any | null>(null);

    constructor() {}
}
