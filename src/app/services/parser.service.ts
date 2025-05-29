import {Injectable} from '@angular/core';
import {Diagram} from '../classes/diagram/diagram';
import {JsonPetriNet} from '../classes/json-petri-net';
import {Coords} from '../classes/json-petri-net';
import {Element} from '../classes/diagram/element';

/**
 * @service ParserService
 * @description This service is responsible for parsing a JSON string representing a Petri net
 * and converting it into a Diagram object.
 * It handles the transformation of the raw JSON data into the internal Diagram model,
 * including parsing elements and their positions.
 * This modularization separates parsing logic from other concerns like display or file reading.
 */
@Injectable({
    providedIn: 'root'
})
export class ParserService {

    constructor() {
    }

    /**
     * @description Parses a JSON string and converts it into a Diagram object.
     * @param text The JSON string representing the Petri net.
     * @returns A Diagram object if parsing is successful, otherwise undefined.
     */
    parse(text: string): Diagram | undefined {
        try {
            const rawData = JSON.parse(text) as JsonPetriNet;

            const elements = this.parseElements(rawData['places']);
            this.setPosition(elements, rawData['layout']);

            return new Diagram(elements);
        } catch (e) {
            console.error('Error while parsing JSON', e, text);
            return undefined;
        }
    }

    /**
     * @description Parses the place IDs from the JSON data and creates Element objects.
     * @param placeIds An array of place IDs.
     * @returns An array of Element objects.
     * @private
     */
    private parseElements(placeIds: Array<string> | undefined): Array<Element> {
        if (placeIds === undefined || !Array.isArray(placeIds)) {
            return [];
        }

        return placeIds.map(pid => new Element(pid));
    }

    /**
     * @description Sets the position of elements based on the layout information in the JSON data.
     * @param elements An array of Element objects.
     * @param layout The layout information from the JSON data.
     * @private
     */
    private setPosition(elements: Array<Element>, layout: JsonPetriNet['layout']) {
        if (layout === undefined) {
            return;
        }

        for (const el of elements) {
            const pos = layout[el.id] as Coords | undefined;
            if (pos !== undefined) {
                el.x = pos.x;
                el.y = pos.y;
            }
        }
    }
}
