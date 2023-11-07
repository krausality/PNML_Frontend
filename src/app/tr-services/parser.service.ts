import { Injectable } from '@angular/core';
import { Coords, JsonPetriNet } from '../classes/json-petri-net';
import { Place } from '../tr-classes/petri-net/place';
import { Point } from '../tr-classes/petri-net/point';
import { Transition } from '../tr-classes/petri-net/transition';
import { Arc } from '../tr-classes/petri-net/arc';
import { Node } from '../tr-interfaces/petri-net/node';

@Injectable({
    providedIn: 'root'
})
export class ParserService {

    constructor() { }

    // TODO specify correct return type
    parse(text: string): [Array<Place>, Array<Transition>, Array<Arc>] {
        let rawData: JsonPetriNet;
        try {
            rawData = JSON.parse(text) as JsonPetriNet;
        } catch (e) {
            // TODO error handling
            console.error("Cannot parse JSON", e, text);
            return [[], [], []];
        }

        let places: Place[] = [];
        let transitions: Transition[] = [];
        let arcs: Arc[] = [];

        // parse Places
        rawData.places.forEach(placeId => {
            places.push(new Place(this.retrieveTokens(rawData, placeId), this.retrievePosition(rawData, placeId), placeId, this.retrieveLabel(rawData, placeId)));
        });

        // parse Transitions
        rawData.transitions.forEach(transitionId => {
            transitions.push(new Transition(this.retrievePosition(rawData, transitionId), transitionId, this.retrieveLabel(rawData, transitionId)));
        });

        // parse Arcs and append Arcs to Transitions
        if (rawData.arcs) {
            Object.entries(rawData.arcs).forEach(([arcId, weight]) => {
                const [fromId, toId]: string[] = arcId.split(",");
                const fromNode = this.retrieveNode(places, transitions, fromId);
                const toNode = this.retrieveNode(places, transitions, toId);
                // TODO error handling
                // TODO check that fromNode and toNode are not of the same type
                if (fromNode && toNode) {
                    const anchors = this.retrieveAnchors(rawData, arcId);
                    const arc = new Arc(fromNode, toNode, weight, anchors);
                    arc.appendSelfToTransition();
                    arcs.push(arc);
                }
            });
        }

        // TODO store in extra data service
        return [places, transitions, arcs];
    }

    // if contained returns the position from data.layout for the provided id
    // if not, then (0, 0) will be returned as default
    // TODO more sensible default value
    private retrievePosition(data: JsonPetriNet, id: string): Point {
        if (data.layout && data.layout[id]) {
            const coords = data.layout[id] as Coords;
            return new Point(coords.x, coords.y);
        } else {
            return new Point(0, 0);
        }
    }

    private retrieveTokens(data: JsonPetriNet, id: string): number {
        if (data.marking && data.marking[id]) {
            return data.marking[id];
        } else {
            return 0;
        }
    }

    private retrieveLabel(data: JsonPetriNet, id: string): string | undefined {
        if (data.labels && data.labels[id]) {
            return data.labels[id];
        } else {
            return undefined;
        }
    }

    private retrieveNode(places: Place[], transitions: Transition[], id: string): Node | undefined {
        const foundPlace = places.find(place => place.id === id);
        const foundTransition = transitions.find(transition => transition.id === id);
        if (foundPlace) {
            return foundPlace;
        } else if (foundTransition) {
            return foundTransition;
        } else {
            return undefined;
        }
    }

    private retrieveAnchors(data: JsonPetriNet, id: string): Point[] {
        const points: Point[] = [];
        if (data.layout && data.layout[id]) {
            // TODO implement checks to allow for both single anchorpoints and arrays
            (data.layout[id] as Coords[]).forEach(position => {
                points.push(new Point(position.x, position.y));
            })
        }
        return points;
    }
}
