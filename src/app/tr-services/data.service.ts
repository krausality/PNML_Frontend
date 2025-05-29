import { Injectable } from '@angular/core';
import { Arc } from '../tr-classes/petri-net/arc';
import { Place } from '../tr-classes/petri-net/place';
import { Transition } from '../tr-classes/petri-net/transition';
import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Point } from '../tr-classes/petri-net/point';
import { Observable, of, Subject } from 'rxjs'; // Import Subject

/**
 * @Injectable
 * Provided in 'root', making this service a singleton available throughout the application.
 *
 * @description
 * The `DataService` is a central Angular service responsible for managing the core data model of a Petri net.
 * It acts as a single source of truth for all Petri net elements, including places, transitions, arcs, and actions (labels for transitions).
 *
 * Modularity:
 * This service encapsulates the Petri net's state and fundamental operations. It is designed to be a foundational module upon which other
 * services and components build. For example:
 * - UI components inject `DataService` to render the Petri net and allow user interactions that modify it.
 * - Layout services (e.g., `LayoutSugiyamaService`, `LayoutSpringEmbedderService`) consume data from this service to compute element positions.
 * - Import/Export services (e.g., `PnmlService`, `ExportJsonDataService`) use this service to populate or serialize the Petri net data.
 * - Analysis services (e.g., `PlaceInvariantsService`, `TokenGameService`) operate on the data managed here.
 *
 * This centralized approach promotes:
 * - **Decoupling:** Reduces direct dependencies between other components and services by providing a consistent API for data access and manipulation.
 * - **Data Consistency:** Ensures that all parts of the application work with the same, up-to-date Petri net data.
 * - **Maintainability:** Localizes changes related to the core data model, making the codebase easier to manage and evolve.
 * - **Testability:** Allows for isolated unit testing of the data management logic.
 * - **Reactivity:** Utilizes RxJS Observables to notify subscribers about data changes, enabling a responsive user interface.
 */
@Injectable({
    providedIn: 'root',
})
export class DataService {
    /** @private Stores the array of Place objects in the Petri net. */
    private _places: Place[] = [];
    /** @private Stores the array of Transition objects in the Petri net. */
    private _transitions: Transition[] = [];
    /** @private Stores the array of Arc objects in the Petri net. */
    private _arcs: Arc[] = [];
    /** @private Stores the array of unique action strings (labels) used by transitions. */
    private _actions: string[] = [];

    /** @private Subject used to emit events when any Petri net data changes. */
    private dataChangedSubject = new Subject<void>();
    /**
     * Observable that emits a void value whenever the Petri net data
     * (places, transitions, arcs, or their layout/properties) is updated.
     * Components and services can subscribe to this observable to react to changes.
     */
    public dataChanged$ = this.dataChangedSubject.asObservable();


    /**
     * Constructs the DataService.
     * Logs a message to the console upon construction.
     */
    constructor() {
        console.log('DataService Constructed'); // Add log here
    }

    /**
     * Retrieves the current array of Place objects.
     * @returns {Place[]} An array of Place objects.
     */
    getPlaces(): Place[] {
        return this._places;
    }

    /**
     * Retrieves the current array of Place objects as an Observable.
     * Useful for asynchronous operations or when a stream of data is preferred.
     * @returns {Observable<Place[]>} An Observable emitting an array of Place objects.
     */
    getPlacesAsync(): Observable<Place[]> {
        return of(this._places);
    }

    /**
     * Retrieves the current array of Transition objects.
     * @returns {Transition[]} An array of Transition objects.
     */
    getTransitions(): Transition[] {
        return this._transitions;
    }

    /**
     * Retrieves the current array of Transition objects as an Observable.
     * @returns {Observable<Transition[]>} An Observable emitting an array of Transition objects.
     */
    getTransitionsAsync(): Observable<Transition[]> {
        return of(this._transitions);
    }

    /**
     * Retrieves the current array of Arc objects.
     * @returns {Arc[]} An array of Arc objects.
     */
    getArcs(): Arc[] {
        return this._arcs;
    }

    /**
     * Retrieves the current array of Arc objects as an Observable.
     * @returns {Observable<Arc[]>} An Observable emitting an array of Arc objects.
     */
    getArcsAsync(): Observable<Arc[]> {
        return of(this._arcs);
    }

    /**
     * Retrieves the current array of action strings (transition labels).
     * @returns {string[]} An array of action strings.
     */
    getActions(): string[] {
        return this._actions;
    }

    /**
     * Retrieves the current array of action strings as an Observable.
     * @returns {Observable<string[]>} An Observable emitting an array of action strings.
     */
    getActionsAsync(): Observable<string[]> {
        return of(this._actions);
    }

    /**
     * Sets the array of Place objects.
     * This is typically used when loading a new Petri net.
     * Note: `parsePetrinetData` (likely in another service) is mentioned as the main trigger for `dataChanged$`
     * after layout, implying this setter might not trigger it directly to avoid multiple emissions.
     * @param {Place[]} value The new array of Place objects.
     */
    set places(value: Place[]) {
        this._places = value;
        // Consider triggering change notification here if needed,
        // but parsePetrinetData is the main trigger point after layout.
    }

    /**
     * Sets the array of Transition objects.
     * @param {Transition[]} value The new array of Transition objects.
     */
    set transitions(value: Transition[]) {
        this._transitions = value;
        // Consider triggering change notification here if needed.
    }

    /**
     * Sets the array of Arc objects.
     * @param {Arc[]} value The new array of Arc objects.
     */
    set arcs(value: Arc[]) {
        this._arcs = value;
        // Consider triggering change notification here if needed.
    }

    /**
     * Sets the array of action strings.
     * @param {string[]} value The new array of action strings.
     */
    set actions(value: string[]) {
        this._actions = value;
        // Consider triggering change notification here if needed.
    }

    /**
     * Removes a Place from the Petri net.
     * Also removes all arcs connected to this place.
     * Triggers the `dataChanged$` observable.
     * @param {Place} deletablePlace The Place object to remove.
     * @returns {Place[]} The updated array of Place objects.
     */
    removePlace(deletablePlace: Place): Place[] {
        const deletableArcs = this._arcs.filter(
            (arc) => arc.from === deletablePlace || arc.to === deletablePlace,
        );
        deletableArcs.forEach((arc) => this.removeArc(arc));
        this._places = this._places.filter((place) => place !== deletablePlace);
        this.triggerDataChanged(); // Notify after removal
        return this._places;
    }

    /**
     * Removes a Transition from the Petri net.
     * Also removes all arcs connected to this transition.
     * Triggers the `dataChanged$` observable.
     * @param {Transition} deletableTransition The Transition object to remove.
     * @returns {Transition[]} The updated array of Transition objects.
     */
    removeTransition(deletableTransition: Transition): Transition[] {
        const deletableArcs = this._arcs.filter(
            (arc) =>
                arc.from === deletableTransition ||
                arc.to === deletableTransition,
        );
        deletableArcs.forEach((arc) => this.removeArc(arc));
        this._transitions = this._transitions.filter(
            (transition) => transition !== deletableTransition,
        );
         this.triggerDataChanged(); // Notify after removal
        return this._transitions;
    }

    /**
     * Removes an Arc from the Petri net.
     * Also updates the `preArcs` or `postArcs` collections of the connected transition.
     * Triggers the `dataChanged$` observable.
     * @param {Arc} deletableArc The Arc object to remove.
     * @returns {Arc[]} The updated array of Arc objects.
     */
    removeArc(deletableArc: Arc): Arc[] {
        this._arcs = this._arcs.filter((arc) => arc != deletableArc);

        if (deletableArc.from instanceof Transition) {
            const t: Transition = deletableArc.from as Transition;
            t.postArcs = t.postArcs.filter((arc) => arc !== deletableArc);
        } else {
            const t: Transition = deletableArc.to as Transition;
            t.preArcs = t.preArcs.filter((arc) => arc !== deletableArc);
        }
        this.triggerDataChanged(); // Notify after removal
        return this._arcs;
    }

    /**
     * Removes an action (transition label) from the list of available actions.
     * Also clears this label from any transitions currently using it.
     * Triggers the `dataChanged$` observable.
     * @param {string} deletableAction The action string to remove.
     * @returns {string[]} The updated array of action strings.
     */
    removeAction(deletableAction: string): string[] {
        this._transitions.forEach((transition) => {
            if (transition.label === deletableAction) {
                transition.label = undefined;
            }
        });
        this._actions = this._actions.filter(
            (action) => action !== deletableAction,
        );
        // No visual change, so no triggerDataChanged needed? Or maybe for action list updates?
        // Let's add it for consistency if UI depends on actions list.
        this.triggerDataChanged();
        return this._actions;
    }

    /**
     * Removes a specific anchor point from all arcs that contain it.
     * If any anchor is removed, it triggers the `dataChanged$` observable.
     * @param {Point} deletableAnchor The anchor Point object to remove.
     */
    removeAnchor(deletableAnchor: Point) {
        let changed = false;
        for (let arc of this._arcs) {
            const initialLength = arc.anchors.length;
            arc.anchors = arc.anchors.filter(anchor => anchor !== deletableAnchor);
            if (arc.anchors.length !== initialLength) {
                changed = true;
            }
        }
        if (changed) {
            this.triggerDataChanged(); // Notify if an anchor was removed
        }
    }

    /**
     * Checks if a given action string is currently used as a label by any transition.
     * @param {string} action The action string to check.
     * @returns {boolean} True if the action is used, false otherwise.
     */
    checkActionUsed(action: string): boolean {
        return this._transitions.some(
            (transition) => transition.label === action,
        );
    }

    /**
     * Creates a new Arc and connects two nodes (a Place and a Transition, or vice-versa).
     * The new arc is added to the internal `_arcs` array and to the appropriate
     * `preArcs` or `postArcs` collection of the connected transition.
     * Triggers the `dataChanged$` observable.
     * Note: This function does not add the nodes themselves to the `_places` or `_transitions` arrays;
     * it assumes they already exist.
     * @param {Node} from The source Node (Place or Transition) of the arc.
     * @param {Node} to The target Node (Place or Transition) of the arc.
     */
    connectNodes(from: Node, to: Node): void {
        if (from instanceof Place && to instanceof Transition) {
            const arc = new Arc(from, to, 1);
            this._arcs.push(arc);
            to.appendPreArc(arc);
        } else if (from instanceof Transition && to instanceof Place) {
            const arc = new Arc(from, to, 1);
            this._arcs.push(arc);
            from.appendPostArc(arc);
        }
        this.triggerDataChanged(); // Notify after connection
    }

    /**
     * Clears all Petri net data: places, transitions, arcs, and actions.
     * Triggers the `dataChanged$` observable.
     */
    clearAll(): void {
        this._places = [];
        this._transitions = [];
        this._arcs = [];
        this._actions = [];
        this.triggerDataChanged(); // Notify after clearing
    }

    /**
     * Checks if the Petri net is empty (contains no places, transitions, arcs, or actions).
     * @returns {boolean} True if all data arrays are empty, false otherwise.
     */
    isEmpty(): boolean {
        if (this.getPlaces().length != 0) {
            return false;
        }
        if (this.getTransitions().length != 0) {
            return false;
        }
        if (this.getArcs().length != 0) {
            return false;
        }
        if (this.getActions().length != 0) {
            return false;
        }
        return true;
    }

    /**
     * Checks if there are any places or transitions in the Petri net that do not have
     * valid position coordinates (x or y is undefined, null, or NaN, but not 0).
     * @returns {boolean} True if at least one node has an invalid/missing position, false otherwise.
     */
    hasElementsWithoutPosition(): boolean {
        // [].some search function will return true if
        // any node is found that has either no x or no y position
        return [...this.getTransitions(), ...this.getPlaces()].some(
            (node: Node) => {
                return (
                    (!node.position.x && node.position.x !== 0) ||
                    (!node.position.y && node.position.y !== 0)
                );
            },
        );
    }

    /**
     * Determines if a connection (arc) can be legally made between two given nodes.
     * Connections are not allowed:
     * - Between two transitions.
     * - Between two places.
     * - If an arc already exists in the same direction between a transition and a place.
     * - If an arc already exists in the same direction between a place and a transition.
     * @param {Node} startNode The proposed starting node of the connection.
     * @param {Node} endNode The proposed ending node of the connection.
     * @returns {boolean} True if the connection is possible, false otherwise.
     */
    isConnectionPossible(startNode: Node, endNode: Node): boolean {
        if (startNode instanceof Transition && endNode instanceof Transition) {
            return false;
        }
        if (startNode instanceof Place && endNode instanceof Place) {
            return false;
        }
        if (startNode instanceof Transition && endNode instanceof Place) {
            const amountOfConnections = startNode.postArcs.filter((arc) => {
                return arc.to === endNode;
            }).length;
            return amountOfConnections === 0;
        }
        if (startNode instanceof Place && endNode instanceof Transition) {
            const amountOfConnections = endNode.preArcs.filter((arc) => {
                return arc.from === startNode;
            }).length;
            return amountOfConnections === 0;
        }
        return false;
    }

    /**
     * Triggers the `dataChanged$` observable by calling `next()` on the `dataChangedSubject`.
     * This method should be called after any operation that modifies the Petri net's data
     * or layout to notify subscribers about the change.
     * Logs a message to the console when called.
     */
    public triggerDataChanged(): void {
        console.log('DataService: triggerDataChanged() called'); // <-- ADD THIS LOG
        this.dataChangedSubject.next();
    }

    /**
     * Populates the service with a predefined set of mock Petri net data.
     * This is useful for development, testing, or providing an initial example.
     * It creates sample places, transitions, and arcs, and connects them.
     * Note: This method typically does not trigger `dataChanged$` as it's often used
     * for initial setup before subscribers are active or when a full refresh is implied.
     */
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
