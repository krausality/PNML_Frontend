import { Injectable } from '@angular/core';
import { Arc } from '../tr-classes/petri-net/arc';
import { Place } from '../tr-classes/petri-net/place';
import { Transition } from '../tr-classes/petri-net/transition';
import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Point } from '../tr-classes/petri-net/point';
import { Observable, of, Subject } from 'rxjs'; // Import Subject

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


    constructor() {
        console.log('DataService Constructed'); // Add log here
    }

    getPlaces(): Place[] {
        return this._places;
    }

    getPlacesAsync(): Observable<Place[]> {
        return of(this._places);
    }

    getTransitions(): Transition[] {
        return this._transitions;
    }

    getTransitionsAsync(): Observable<Transition[]> {
        return of(this._transitions);
    }

    getArcs(): Arc[] {
        return this._arcs;
    }

    getArcsAsync(): Observable<Arc[]> {
        return of(this._arcs);
    }

    getActions(): string[] {
        return this._actions;
    }

    getActionsAsync(): Observable<string[]> {
        return of(this._actions);
    }

    set places(value: Place[]) {
        this._places = value;
        // Consider triggering change notification here if needed,
        // but parsePetrinetData is the main trigger point after layout.
    }

    set transitions(value: Transition[]) {
        this._transitions = value;
        // Consider triggering change notification here if needed.
    }

    set arcs(value: Arc[]) {
        this._arcs = value;
        // Consider triggering change notification here if needed.
    }

    set actions(value: string[]) {
        this._actions = value;
        // Consider triggering change notification here if needed.
    }

    removePlace(deletablePlace: Place): Place[] {
        const deletableArcs = this._arcs.filter(
            (arc) => arc.from === deletablePlace || arc.to === deletablePlace,
        );
        deletableArcs.forEach((arc) => this.removeArc(arc));
        this._places = this._places.filter((place) => place !== deletablePlace);
        this.triggerDataChanged(); // Notify after removal
        return this._places;
    }

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

    checkActionUsed(action: string): boolean {
        return this._transitions.some(
            (transition) => transition.label === action,
        );
    }

    //The Nodes are not added to the Arrays during this function
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

    clearAll(): void {
        this._places = [];
        this._transitions = [];
        this._arcs = [];
        this._actions = [];
        this.triggerDataChanged(); // Notify after clearing
    }

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

    /** Triggers the dataChanged$ observable to notify subscribers. */
    public triggerDataChanged(): void {
        console.log('DataService: triggerDataChanged() called'); // <-- ADD THIS LOG
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
