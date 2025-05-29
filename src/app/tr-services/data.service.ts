/**
 * @file data.service.ts
 * @description This service acts as a central store and manager for the Petri net data,
 * including places, transitions, arcs, and actions. It is responsible for holding the
 * current state of the Petri net model and providing methods to access and modify this data.
 *
 * Modularity:
 * This service centralizes all data operations related to the Petri net. Instead of components
 * or other services managing their own copies or aspects of the Petri net data, they interact
 * with `DataService`. This approach offers several benefits:
 *   - **Single Source of Truth**: Ensures data consistency across the application.
 *   - **Decoupling**: Components and services that consume or modify Petri net data are
 *     decoupled from the specifics of data storage and management. They only need to know
 *     about the `DataService` API.
 *   - **Maintainability**: Changes to data structures or data handling logic are localized
 *     to this service, making the codebase easier to maintain and update.
 *   - **Reactivity**: It uses an RxJS `Subject` (`dataChangedSubject`) to notify subscribers
 *     (e.g., UI components) whenever the data changes. This allows for reactive updates
 *     in the UI or other parts of the application that depend on this data.
 *
 * Key Responsibilities:
 *   - Storing arrays of `Place`, `Transition`, and `Arc` objects.
 *   - Storing an array of `actions` (strings) associated with transitions.
 *   - Providing getter and setter methods for these data elements.
 *   - Providing methods to add or remove elements (places, transitions, arcs).
 *   - Emitting an event via `dataChanged$` Observable when any data is modified,
 *     allowing other parts of the application to react to these changes.
 *
 * Usage:
 * Other services (e.g., `PnmlService` for parsing/saving, `UiService` for UI interactions)
 * and components (e.g., `PetriNetComponent` for display) inject `DataService` to
 * access or manipulate the Petri net data.
 */
import { Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { Place } from '../tr-classes/petri-net/place';
import { Transition } from '../tr-classes/petri-net/transition';
import { Arc } from '../tr-classes/petri-net/arc';
import { Node } from '../tr-interfaces/petri-net/node';
import { Point } from '../tr-classes/petri-net/point';

/**
 * @service DataService
 * @description This service acts as a central store and manager for the Petri net data,
 * including places, transitions, arcs, and layout information.
 * It provides methods to access and modify this data, and notifies subscribers
 * (via `dataChanged$`) when changes occur.
 * This modularization ensures that data handling is centralized, making the application
 * easier to maintain and reason about. Other services and components interact with
 * this service to get or update Petri net data, rather than managing it themselves.
 */
@Injectable({
    providedIn: 'root',
})
export class DataService {
    private _places: Place[] = [];
    private _transitions: Transition[] = [];
    private _arcs: Arc[] = [];
    private _actions: string[] = [];

    // Subject to notify subscribers when data (including layout) has changed
    private dataChangedSubject = new Subject<void>();
    /** Observable that emits when data (places, transitions, arcs, layout) has been updated. */
    public dataChanged$ = this.dataChangedSubject.asObservable();


    constructor() { }

    /** @description Gets all places in the current Petri net. */
    getPlaces(): Place[] {
        return this._places;
    }

    /** @description Asynchronously gets all places. */
    getPlacesAsync(): Observable<Place[]> {
        return of(this._places);
    }

    /** @description Gets all transitions in the current Petri net. */
    getTransitions(): Transition[] {
        return this._transitions;
    }

    /** @description Asynchronously gets all transitions. */
    getTransitionsAsync(): Observable<Transition[]> {
        return of(this._transitions);
    }

    /** @description Gets all arcs in the current Petri net. */
    getArcs(): Arc[] {
        return this._arcs;
    }

    /** @description Asynchronously gets all arcs. */
    getArcsAsync(): Observable<Arc[]> {
        return of(this._arcs);
    }

    /** @description Gets all actions defined in the Petri net. */
    getActions(): string[] {
        return this._actions;
    }

    /** @description Asynchronously gets all actions. */
    getActionsAsync(): Observable<string[]> {
        return of(this._actions);
    }

    /** @description Sets the places of the Petri net and triggers a data changed event. */
    set places(value: Place[]) {
        this._places = value;
        this.triggerDataChanged();
    }

    /** @description Sets the transitions of the Petri net and triggers a data changed event. */
    set transitions(value: Transition[]) {
        this._transitions = value;
        this.triggerDataChanged();
    }

    /** @description Sets the arcs of the Petri net and triggers a data changed event. */
    set arcs(value: Arc[]) {
        this._arcs = value;
        this.triggerDataChanged();
    }

    /** @description Sets the actions of the Petri net and triggers a data changed event. */
    set actions(value: string[]) {
        this._actions = value;
        this.triggerDataChanged();
    }

    /**
     * @description Removes a place from the Petri net and triggers a data changed event.
     * @param deletablePlace The place to remove.
     * @returns The updated array of places.
     */
    removePlace(deletablePlace: Place): Place[] {
        this._places = this._places.filter((place) => place !== deletablePlace);
        this.triggerDataChanged();
        return this._places;
    }

    /**
     * @description Removes a transition from the Petri net and triggers a data changed event.
     * @param deletableTransition The transition to remove.
     * @returns The updated array of transitions.
     */
    removeTransition(deletableTransition: Transition): Transition[] {
        this._transitions = this._transitions.filter(
            (transition) => transition !== deletableTransition,
        );
        this.triggerDataChanged();
        return this._transitions;
    }

    /**
     * @description Removes an arc from the Petri net and triggers a data changed event.
     * @param deletableArc The arc to remove.
     * @returns The updated array of arcs.
     */
    removeArc(deletableArc: Arc): Arc[] {
        this._arcs = this._arcs.filter((arc) => arc !== deletableArc);
        this.triggerDataChanged();
        return this._arcs;
    }

    /**
     * @description Notifies subscribers that the Petri net data has changed.
     * This is typically called after any modification to places, transitions, arcs, or layout.
     */
    public triggerDataChanged(): void {
        this.dataChangedSubject.next();
    }

    mockData() {
        this.places = [
            new Place(4, new Point(100, 200), 'p1'),
            new Place(2, new Point(200, 100), 'p2'),
            new Place(3, new Point(300, 300), 'p3'),
            new Place(0, new Point(400, 200), 'p4'),
        ];

        this.transitions = [
            new Transition(new Point(150, 150), 't1'),
            new Transition(new Point(250, 200), 't2'),
            new Transition(new Point(350, 250), 't3'),
        ];

        this.arcs = [
            new Arc(this._places[0], this._transitions[0], 5),
            new Arc(this._transitions[0], this._places[1], 1),
            new Arc(this._places[1], this._transitions[1], 1),
            new Arc(this._transitions[1], this._places[2], 1, [
                new Point(250, 300),
            ]),
        ];

        this._transitions[0].appendPreArc(this._arcs[0]);
        this._transitions[0].appendPostArc(this._arcs[1]);
        this._transitions[1].appendPreArc(this._arcs[2]);
        this._transitions[1].appendPostArc(this._arcs[3]);
        // No need to trigger here, as this is usually for initial setup/testing
    }
}
