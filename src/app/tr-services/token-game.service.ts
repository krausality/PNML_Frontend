import { Injectable } from '@angular/core';
import { Transition } from '../tr-classes/petri-net/transition';
import { Place } from '../tr-classes/petri-net/place';

@Injectable({
    providedIn: 'root'
})
export class TokenGameService {

    constructor() { }

    // Method for token game
    fire(transition: Transition) {
        if (transition.isActive) {
            // Decrease token numbers of pre-places (note: weights of pre-arcs
            // have a negative sign in the internal data representation)
            for (let arc of transition.preArcs) {
                (arc.from as Place).token += arc.weight;
            }
            // Increase token numbers of post-places
            for (let arc of transition.postArcs) {
                (arc.to as Place).token += arc.weight;
            }
        }
    }
}
