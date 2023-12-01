import { Injectable } from '@angular/core';
import { ButtonState, TabState } from '../tr-enums/ui-state';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class UiService {

    // stores the active tab
    // starting value is "build", meaning we always start on the build tab
    // tab: string = "build";
    private _tab = new BehaviorSubject<TabState>(TabState.Build); // true is your initial value
    tab$ = this._tab.asObservable();
    // stores the active button inside the build tab
    // default is empty
    button: ButtonState | null = null;

    constructor() { }

    set tab(value: TabState) {
        this._tab.next(value);
    }
    
    get tab(): TabState {
    return this._tab.getValue();
    }
}
