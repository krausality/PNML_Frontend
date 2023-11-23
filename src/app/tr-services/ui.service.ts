import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root'
})
export class UiService {

    // stores the active tab
    // starting value is "build", meaning we always start on the build tab
    tab: string = "build";
    // stores the active button inside the build tab
    // default is empty
    button: string = "blitz";

    constructor() { }
}
