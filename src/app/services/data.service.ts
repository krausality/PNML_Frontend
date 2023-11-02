import {Injectable} from "@angular/core";
import {Arc} from "../tr-classes/petri-net/arc";
import {Place} from "../tr-classes/petri-net/place";
import {Transition} from "../tr-classes/petri-net/transition";

@Injectable({
    providedIn: 'root'
})


export class DataService {
    private _places: Place[] = []
    private _transitions: Transition[] = [];
    private _arcs: Arc[] = [];


    constructor() {
    }

    getPlaces(): Place[] {
        return this._places
    }

    getTransitions(): Transition[] {
        return this._transitions
    }

    getArcs(): Arc[] {
        return this._arcs
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

    removePlace(deletablePlace: Place): Place[] {
        this._arcs = this._arcs.filter(arc => !(arc.from === deletablePlace || arc.to === deletablePlace));
        this._places = this._places.filter(place => place !== deletablePlace);
        return this._places;
    }

    removeTransition(deletableTransition: Transition): Transition[] {
        this._arcs = this._arcs.filter(arc => !(arc.from === deletableTransition || arc.to === deletableTransition));
        this.transitions = this._transitions.filter(transition => transition !== deletableTransition);
        return this._transitions;
    }

    removeArc(deletableArc: Arc): Arc[] {
        this._arcs = this._arcs.filter(arc => arc != deletableArc);
        return this._arcs;
    }
}
