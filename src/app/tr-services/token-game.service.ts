import { Injectable } from '@angular/core';
import { Transition } from '../tr-classes/petri-net/transition';
import { Place } from '../tr-classes/petri-net/place';

import { DataService } from "./data.service";
import { UiService } from "./ui.service";

import { TabState } from '../tr-enums/ui-state';

@Injectable({
    providedIn: 'root'
})
export class TokenGameService {
    
    private _tokenHistory: Map<Place, number>[]= [];
    
    constructor(
        protected dataService: DataService,
        protected uiService: UiService
    ) {
        // Add subscription to tab change event.
        // This allows us to reset the game state on each
        // switch to the play tab and basically open a new "game session"
        // whenever the user visits the play tabs
        this.uiService.tab$.subscribe(tab => {
            if (tab !== TabState.Play) {
                this.clearGameHistory();
            }
        })
    }
    
    // Method for token game
    fire(transition: Transition) {
        if (transition.isActive) {
            // whenever a transition is fired the token distribution BEFORE the change
            // is added to our game history stack, so we can later revisit it
            this.saveCurrentGameState();

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

    saveCurrentGameState() {
        this._tokenHistory.push(this.getGameState());
        console.log(this._tokenHistory);
    }

    clearGameHistory() {
        this._tokenHistory = [];
    }
    
    private getGameState(): Map<Place, number> {
        const tokenMapping = new Map<Place, number>();
        for (let place of this.dataService.getPlaces()) {
            tokenMapping.set(place, place.token);
        }
        return tokenMapping;
    }
    
    private setGameState(state: Map<Place, number>) {
        for (let place of this.dataService.getPlaces()) {
            const tokens = state.get(place);
            place.setToken(tokens ? tokens : 0);
        }
    }
    
    revertToPreviousState() {
        // Takes the last/top item of the token history stack
        // and resets the values accordingly
        const state = this._tokenHistory.pop();
        if (!state) return;

        this.setGameState(state);
    }
    
    resetGame() {
        // Takes the first/bottom item of the token history stack
        // and resets the values accordingly
        const state = this._tokenHistory.shift();
        if (!state) return;

        this.setGameState(state);

        // clear history as we're starting from the beginning again
        this.clearGameHistory();
    }
}
