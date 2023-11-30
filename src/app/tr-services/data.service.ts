import {Injectable} from "@angular/core";
import {Arc} from "../tr-classes/petri-net/arc";
import {Place} from "../tr-classes/petri-net/place";
import {Transition} from "../tr-classes/petri-net/transition";
import {Point} from "../tr-classes/petri-net/point";
import {Observable, of} from "rxjs";

@Injectable({
    providedIn: 'root'
})


export class DataService {
    private _places: Place[] = []
    private _transitions: Transition[] = [];
    private _arcs: Arc[] = [];
    private _actions: string[] = [];


    constructor() {
    }

    getPlaces(): Place[] {
        return this._places
    }

    getPlacesAsync(): Observable<Place[]> {
        return of(this._places);
    }

    getTransitions(): Transition[] {
        return this._transitions
    }

    getTransitionsAsync(): Observable<Transition[]> {
        return of(this._transitions);
    }

    getArcs(): Arc[] {
        return this._arcs
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
    }

    set transitions(value: Transition[]) {
        this._transitions = value;
    }

    set arcs(value: Arc[]) {
        this._arcs = value;
    }

    set actions(value: string[]) {
        this._actions = value;
    }


    removePlace(deletablePlace: Place): Place[] {
        const deletableArcs = this._arcs.filter(arc => !(arc.from === deletablePlace || arc.to === deletablePlace));
        deletableArcs.forEach(arc => this.removeArc(arc));
        this._places = this._places.filter(place => place !== deletablePlace);
        return this._places;
    }

    removeTransition(deletableTransition: Transition): Transition[] {
        const deletableArcs = this._arcs.filter(arc => !(arc.from === deletableTransition || arc.to === deletableTransition));
        deletableArcs.forEach(arc => this.removeArc(arc));
        this._transitions = this._transitions.filter(transition => transition !== deletableTransition);
        return this._transitions;
    }

    removeArc(deletableArc: Arc): Arc[] {
        this._arcs = this._arcs.filter(arc => arc != deletableArc);

        if (deletableArc.from instanceof Transition) {
            const t: Transition = deletableArc.from as Transition;
            t.postArcs = t.postArcs.filter(arc => arc !== deletableArc);
        } else {
            const t: Transition = deletableArc.to as Transition;
            t.preArcs = t.preArcs.filter(arc => arc !== deletableArc);
        }
        return this._arcs;
    }

    removeAction(deletableAction: string): string[] {
        this._transitions.forEach(
            transition => {if (transition.label === deletableAction) {
                transition.label = undefined;
            }
        });
        this._actions = this._actions.filter(action => action !== deletableAction);
        return this._actions;
    }

    checkActionUsed(action: string): boolean {
        return this._transitions.some(transition => transition.label === action);
    }

    mockData() {
        this.places = [
            new Place(4, new Point(100, 200), "p1"),
            new Place(2, new Point(200, 100), "p2"),
            new Place(3, new Point(300, 300), "p3"),
            new Place(0, new Point(400, 200), "p4")
        ];

        this.transitions = [
            new Transition(new Point(150, 150), "t1"),
            new Transition(new Point(250, 200), "t2"),
            new Transition(new Point(350, 250), "t3")
        ];

        this.arcs = [
            new Arc(this._places[0], this._transitions[0], 5),
            new Arc(this._transitions[0], this._places[1], 1),
            new Arc(this._places[1], this._transitions[1], 1),
            new Arc(this._transitions[1], this._places[2], 1, [new Point(250, 300)]),
        ];

        this._transitions[0].appendPreArc(this._arcs[0]);
        this._transitions[0].appendPostArc(this._arcs[1]);
        this._transitions[1].appendPreArc(this._arcs[2]);
        this._transitions[1].appendPostArc(this._arcs[3]);
    }
}
