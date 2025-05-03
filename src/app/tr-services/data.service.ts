import { Injectable, OnDestroy } from '@angular/core';
import { Arc } from '../tr-classes/petri-net/arc';
import { Place } from '../tr-classes/petri-net/place';
import { Transition } from '../tr-classes/petri-net/transition';
import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { Point } from '../tr-classes/petri-net/point';
import { Observable, of, Subject, Subscription } from 'rxjs'; // Import Subject

@Injectable({
    providedIn: 'root',
})
export class DataService implements OnDestroy {
    private _places: Place[] = [];
    private _transitions: Transition[] = [];
    private _arcs: Arc[] = [];
    private _actions: string[] = [];

    // Subject to notify subscribers when data (including layout) has changed
    private dataChangedSubject = new Subject<void>();
    /** Observable that emits when data (places, transitions, arcs, layout) has been updated. */
    public dataChanged$ = this.dataChangedSubject.asObservable();

    private subscriptions: Subscription = new Subscription();


    constructor() {
        console.log('DataService Constructed'); // Add log here
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
        this.dataChangedSubject.complete(); // Complete the subject on destroy
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
        // Trigger notification when data is set externally (e.g., after parsing)
        this.triggerDataChanged();
    }

    set transitions(value: Transition[]) {
        this._transitions = value;
        // Trigger notification when data is set externally
         this.triggerDataChanged();
    }

    set arcs(value: Arc[]) {
        this._arcs = value;
         // Trigger notification when data is set externally
         this.triggerDataChanged();
    }

    set actions(value: string[]) {
        this._actions = value;
         // Trigger notification when data is set externally (e.g., for action list UI)
         this.triggerDataChanged();
    }

    removePlace(deletablePlace: Place): Place[] {
        const deletableArcs = this._arcs.filter(
            (arc) => arc.from === deletablePlace || arc.to === deletablePlace,
        );
        // Important: Remove arcs *before* removing the place to avoid dangling references
        deletableArcs.forEach((arc) => this.removeArc(arc)); // removeArc already triggers change
        this._places = this._places.filter((place) => place !== deletablePlace);
        this.triggerDataChanged(); // Notify after place removal itself
        return this._places;
    }

    removeTransition(deletableTransition: Transition): Transition[] {
        const deletableArcs = this._arcs.filter(
            (arc) =>
                arc.from === deletableTransition ||
                arc.to === deletableTransition,
        );
         // Important: Remove arcs *before* removing the transition
        deletableArcs.forEach((arc) => this.removeArc(arc)); // removeArc already triggers change
        this._transitions = this._transitions.filter(
            (transition) => transition !== deletableTransition,
        );
         this.triggerDataChanged(); // Notify after transition removal itself
        return this._transitions;
    }

    removeArc(deletableArc: Arc): Arc[] {
        // Remove arc from main list
        this._arcs = this._arcs.filter((arc) => arc != deletableArc);

        // Remove arc references from connected transitions
        if (deletableArc.from instanceof Transition) {
            const t: Transition = deletableArc.from as Transition;
            t.postArcs = t.postArcs.filter((arc) => arc !== deletableArc);
        }
        if (deletableArc.to instanceof Transition) { // Check 'to' as well
            const t: Transition = deletableArc.to as Transition;
            t.preArcs = t.preArcs.filter((arc) => arc !== deletableArc);
        }
        this.triggerDataChanged(); // Notify after removal
        return this._arcs;
    }

    removeAction(deletableAction: string): string[] {
        let labelChanged = false;
        this._transitions.forEach((transition) => {
            if (transition.label === deletableAction) {
                transition.label = undefined;
                labelChanged = true;
            }
        });
        const initialLength = this._actions.length;
        this._actions = this._actions.filter(
            (action) => action !== deletableAction,
        );
        // Trigger change if transition labels changed (visual)
        // or the action list UI needs update.
        if (labelChanged || this._actions.length !== initialLength) {
            this.triggerDataChanged();
        }
        return this._actions;
    }

    removeAnchor(deletableAnchor: Point) {
        let changed = false;
        for (let arc of this._arcs) {
            const initialLength = arc.anchors.length;
            arc.anchors = arc.anchors.filter(anchor => anchor !== deletableAnchor);
            if (arc.anchors.length !== initialLength) {
                changed = true;
                // No need to break, might be used in multiple arcs (though unlikely)
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
        let arcAdded = false;
        if (from instanceof Place && to instanceof Transition) {
            const arc = new Arc(from, to, 1);
            this._arcs.push(arc);
            to.appendPreArc(arc); // Make sure appendPreArc exists and works
            arcAdded = true;
        } else if (from instanceof Transition && to instanceof Place) {
            const arc = new Arc(from, to, 1);
            this._arcs.push(arc);
            from.appendPostArc(arc); // Make sure appendPostArc exists and works
            arcAdded = true;
        }
        if (arcAdded) {
            this.triggerDataChanged(); // Notify after connection
        }
    }

    clearAll(): void {
        const wasEmpty = this.isEmpty();
        this._places = [];
        this._transitions = [];
        this._arcs = [];
        this._actions = [];
        if (!wasEmpty) {
             this.triggerDataChanged(); // Notify after clearing only if it wasn't empty
        }
    }

    isEmpty(): boolean {
        return (
            this._places.length === 0 &&
            this._transitions.length === 0 &&
            this._arcs.length === 0 // Actions don't define emptiness visually
        );
    }

    hasElementsWithoutPosition(): boolean {
        // Check if any node has undefined or null position properties, or NaN coordinates
        return [...this.getTransitions(), ...this.getPlaces()].some(
            (node: Node) => {
                return (
                    !node.position ||
                    node.position.x === undefined || node.position.x === null || isNaN(node.position.x) ||
                    node.position.y === undefined || node.position.y === null || isNaN(node.position.y)
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
        // Check for existing arcs between the same two nodes in the same direction
        // Use the direct _arcs array for efficiency
        const exists = this._arcs.some(arc => arc.from === startNode && arc.to === endNode);
        return !exists;

        // Original logic using pre/postArcs (less direct):
        /*
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
        return false; // Should not happen if types are correct
        */
    }

    /** Triggers the dataChanged$ observable to notify subscribers. */
    public triggerDataChanged(): void {
        // Use setTimeout to ensure change detection runs after the current microtask
        // This can help prevent ExpressionChangedAfterItHasBeenCheckedError in some scenarios
        setTimeout(() => {
             this.dataChangedSubject.next();
             console.debug('DataService: dataChanged$ triggered'); // Add debug log
        }, 0);
    }


    // Mock data for testing purposes
    mockData() {
        this.clearAll(); // Clear existing data first

        const p1 = new Place(4, new Point(100, 200), 'p1');
        const p2 = new Place(2, new Point(200, 100), 'p2');
        const p3 = new Place(3, new Point(300, 300), 'p3');
        const p4 = new Place(0, new Point(400, 200), 'p4');
        this._places.push(p1, p2, p3, p4);

        const t1 = new Transition(new Point(150, 150), 't1');
        const t2 = new Transition(new Point(250, 200), 't2');
        const t3 = new Transition(new Point(350, 250), 't3');
        this._transitions.push(t1, t2, t3);

        const arc1 = new Arc(p1, t1, 5); // p1 -> t1
        const arc2 = new Arc(t1, p2, 1); // t1 -> p2
        const arc3 = new Arc(p2, t2, 1); // p2 -> t2
        const arc4 = new Arc(t2, p3, 1, [ // t2 -> p3 with anchor
            new Point(250, 300),
        ]);
        const arc5 = new Arc(p3, t3, 1); // p3 -> t3
        const arc6 = new Arc(t3, p4, 1); // t3 -> p4
        this._arcs.push(arc1, arc2, arc3, arc4, arc5, arc6);

        // Correctly link arcs to transitions using helper methods if they exist,
        // otherwise manually update pre/postArcs arrays. Assuming methods exist:
        t1.appendPreArc(arc1);
        t1.appendPostArc(arc2);
        t2.appendPreArc(arc3);
        t2.appendPostArc(arc4);
        t3.appendPreArc(arc5);
        t3.appendPostArc(arc6);


        // Update actions list based on transition labels
        this._actions = this._transitions
                            .map(t => t.label)
                            .filter((label): label is string => !!label); // Filter out undefined labels

        // Trigger data changed after setting mock data
        this.triggerDataChanged();
    }
}
