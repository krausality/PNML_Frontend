import {Injectable, OnDestroy} from '@angular/core';
import {BehaviorSubject, Observable} from 'rxjs';
import {Diagram} from '../classes/diagram/diagram';

/**
 * @service DisplayService
 * @description This service is responsible for managing the currently displayed diagram.
 * It holds the state of the active diagram and provides methods to update and access it.
 * This decouples the diagram data from the components that display or interact with it,
 * allowing for a cleaner architecture. Components can subscribe to `diagram$` to receive
 * updates when the diagram changes.
 */
@Injectable({
    providedIn: 'root'
})
export class DisplayService implements OnDestroy {

    private _diagram$: BehaviorSubject<Diagram>;

    constructor() {
        this._diagram$ = new BehaviorSubject<Diagram>(new Diagram([]));
    }

    ngOnDestroy(): void {
        this._diagram$.complete();
    }

    /**
     * @description Observable that emits the current diagram whenever it changes.
     * Components can subscribe to this to react to diagram updates.
     */
    public get diagram$(): Observable<Diagram> {
        return this._diagram$.asObservable();
    }

    /**
     * @description Gets the current value of the diagram.
     * @returns The current Diagram object.
     */
    public get diagram(): Diagram {
        return this._diagram$.getValue();
    }

    /**
     * @description Updates the currently displayed diagram.
     * Notifies all subscribers of `diagram$` about the change.
     * @param net The new Diagram to display.
     */
    public display(net: Diagram) {
        this._diagram$.next(net);
    }

}
