import { Injectable } from '@angular/core';
import { Coords, JsonPetriNet } from '../classes/json-petri-net';
import { Place } from '../tr-classes/petri-net/place';
import { Point } from '../tr-classes/petri-net/point';
import { Transition } from '../tr-classes/petri-net/transition';
import { Arc } from '../tr-classes/petri-net/arc';
import { Node } from '../tr-interfaces/petri-net/node';

import parseJson from 'json-parse-better-errors';

/**
 * @Injectable
 * @providedIn 'root'
 *
 * @description
 * The `ParserService` is responsible for parsing a string representation of a Petri net,
 * specifically in JSON format (conforming to the `JsonPetriNet` interface),
 * and transforming it into the application's internal object model.
 * This service encapsulates the logic for interpreting the JSON structure and creating
 * instances of `Place`, `Transition`, and `Arc` objects.
 *
 * Modularity:
 * - As an Angular service, it isolates the parsing concern, promoting separation of concerns.
 * - Private helper methods (`retrievePosition`, `retrieveTokens`, etc.) break down the parsing
 *   logic into manageable, single-responsibility functions, enhancing readability and maintainability.
 * - It relies on the `JsonPetriNet` interface as a contract for the input JSON structure.
 * - It outputs standardized internal objects (`Place`, `Transition`, `Arc`) for other parts of the
 *   application to consume.
 */
@Injectable({
    providedIn: 'root',
})
export class ParserService {
    /**
     * @constructor
     * Initializes a new instance of the ParserService.
     */
    constructor() {}

    /**
     * @description
     * A flag indicating whether the parsed JSON data was missing some layout information.
     * This is set to `true` by `retrievePosition` if a node's coordinates are not found
     * in the `layout` section of the input JSON, resulting in default coordinates `(0,0)` being used.
     */
    incompleteLayoutData: boolean = false;

    /**
     * @description
     * Parses a string containing Petri net data in JSON format.
     * It converts the raw JSON data into arrays of `Place`, `Transition`, `Arc` objects,
     * and an array of action strings.
     *
     * Note: Errors during the initial JSON parsing (e.g., malformed JSON) are thrown by
     * the `json-parse-better-errors` library and are expected to be caught and handled
     * by the caller of this `parse` method.
     *
     * @param text The string content of the JSON file to be parsed.
     * @returns A tuple containing:
     *          - An array of `Place` objects.
     *          - An array of `Transition` objects.
     *          - An array of `Arc` objects.
     *          - An array of `string` representing actions.
     */
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

    /**
     * @private
     * @description
     * Retrieves the position (coordinates) for a given element ID from the layout data.
     * If the layout data for the ID is not found, it defaults to `(0,0)` and sets
     * the `incompleteLayoutData` flag to `true`.
     *
     * @param data The raw `JsonPetriNet` object.
     * @param id The ID of the element (place or transition) whose position is to be retrieved.
     * @returns A `Point` object representing the coordinates (x, y).
     */
    private retrievePosition(data: JsonPetriNet, id: string): Point {
        if (data.layout && data.layout[id]) {
            const coords = data.layout[id] as Coords;
            return new Point(coords.x, coords.y);
        } else {
            this.incompleteLayoutData = true;
            return new Point(0, 0);
        }
    }

    /**
     * @private
     * @description
     * Retrieves the number of tokens for a given place ID from the marking data.
     * If the marking data for the ID is not found, it defaults to `0` tokens.
     *
     * @param data The raw `JsonPetriNet` object.
     * @param id The ID of the place whose token count is to be retrieved.
     * @returns The number of tokens for the specified place.
     */
    private retrieveTokens(data: JsonPetriNet, id: string): number {
        if (data.marking && data.marking[id]) {
            return data.marking[id];
        } else {
            return 0;
        }
    }

    /**
     * @private
     * @description
     * Retrieves the label for a given element ID from the labels data.
     *
     * @param data The raw `JsonPetriNet` object.
     * @param id The ID of the element (place or transition) whose label is to be retrieved.
     * @returns The label string if found, otherwise `undefined`.
     */
    private retrieveLabel(data: JsonPetriNet, id: string): string | undefined {
        if (data.labels && data.labels[id]) {
            return data.labels[id];
        } else {
            return undefined;
        }
    }

    /**
     * @private
     * @description
     * Finds and retrieves a `Node` (either a `Place` or a `Transition`) from the
     * provided arrays based on its ID. This is used to link arcs to their
     * source and target nodes.
     *
     * @param places An array of `Place` objects already parsed.
     * @param transitions An array of `Transition` objects already parsed.
     * @param id The ID of the node to retrieve.
     * @returns The found `Node` (either `Place` or `Transition`), or `undefined` if not found.
     */
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

    /**
     * @private
     * @description
     * Retrieves an array of anchor points for a given arc ID from the layout data.
     * Anchor points are used to define the curve or segments of an arc.
     * If layout data for the arc ID is not found or does not contain an array of Coords,
     * an empty array is returned.
     *
     * @param data The raw `JsonPetriNet` object.
     * @param id The ID of the arc (usually a "fromId,toId" string) whose anchor points are to be retrieved.
     * @returns An array of `Point` objects representing the anchor points. Returns an empty array if no anchors are defined.
     */
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
