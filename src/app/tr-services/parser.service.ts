import { Injectable } from '@angular/core';
import { Coords, JsonPetriNet } from '../classes/json-petri-net';
import { Place } from '../tr-classes/petri-net/place';
import { Point } from '../tr-classes/petri-net/point';
import { Transition } from '../tr-classes/petri-net/transition';
import { Arc } from '../tr-classes/petri-net/arc';
import { Node } from '../tr-interfaces/petri-net/node';

import parseJson from 'json-parse-better-errors';

@Injectable({
    providedIn: 'root',
})
export class ParserService {
    constructor() {}

    incompleteLayoutData: boolean = false;

    parse(
        text: string,
    ): [Array<Place>, Array<Transition>, Array<Arc>, Array<string>] {
        let rawData: JsonPetriNet;

        this.incompleteLayoutData = false;

        // Errors from JSON parse need to be caught & handled when using the parser service
        rawData = parseJson(text) as JsonPetriNet;

        let places: Place[] = [];
        let transitions: Transition[] = [];
        let arcs: Arc[] = [];
        let actions: string[] = [];

        // Parse places
        rawData.places.forEach((placeId) => {
            places.push(
                new Place(
                    this.retrieveTokens(rawData, placeId),
                    this.retrievePosition(rawData, placeId),
                    placeId,
                    this.retrieveLabel(rawData, placeId),
                ),
            );
        });

        // Parse transitions
        rawData.transitions.forEach((transitionId) => {
            transitions.push(
                new Transition(
                    this.retrievePosition(rawData, transitionId),
                    transitionId,
                    this.retrieveLabel(rawData, transitionId),
                ),
            );
        });

        // Parse arcs and append arcs to transitions
        if (rawData.arcs) {
            Object.entries(rawData.arcs).forEach(([arcId, weight]) => {
                const [fromId, toId]: string[] = arcId.split(',');
                const fromNode = this.retrieveNode(places, transitions, fromId);
                const toNode = this.retrieveNode(places, transitions, toId);
                if (fromNode && toNode) {
                    const anchors = this.retrieveAnchors(rawData, arcId);
                    const arc = new Arc(fromNode, toNode, weight, anchors);
                    arc.appendSelfToTransition();
                    arcs.push(arc);
                }
            });
        }

        // Parse actions
        if (rawData.actions) {
            rawData.actions.forEach((action: string) => {
                actions.push(action);
            });
        }

        return [places, transitions, arcs, actions];
    }

    // If contained returns the position from data.layout for the provided id
    // If not, then (0, 0) will be returned as default
    private retrievePosition(data: JsonPetriNet, id: string): Point {
        if (data.layout && data.layout[id]) {
            const coords = data.layout[id] as Coords;
            return new Point(coords.x, coords.y);
        } else {
            this.incompleteLayoutData = true;
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

    private retrieveNode(
        places: Place[],
        transitions: Transition[],
        id: string,
    ): Node | undefined {
        const foundPlace = places.find((place) => place.id === id);
        const foundTransition = transitions.find(
            (transition) => transition.id === id,
        );
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
            (data.layout[id] as Coords[]).forEach((position) => {
                points.push(new Point(position.x, position.y));
            });
        }
        return points;
    }
}
