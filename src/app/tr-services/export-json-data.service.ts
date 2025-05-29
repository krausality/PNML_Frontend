import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { JsonPetriNet } from '../classes/json-petri-net'; // Corrected import path
import {
    Formatter,
    FracturedJsonOptions,
    EolStyle,
} from 'fracturedjsonjs';
import { Place } from '../tr-classes/petri-net/place';
import { Transition } from '../tr-classes/petri-net/transition';
import { Arc } from '../tr-classes/petri-net/arc';

/**
 * @service ExportJsonDataService
 * @description This service is responsible for generating a JSON representation of the current
 * Petri net data and providing functionality to export it as a .json file.
 * It utilizes the `DataService` to get the current Petri net elements and the
 * `fracturedjsonjs` library to format the JSON output.
 * This modularization isolates the JSON export logic.
 */
@Injectable({
    providedIn: 'root',
})
export class ExportJsonDataService {
    constructor(private dataService: DataService) {}

    /**
     * @description Generates a formatted JSON string representing the current Petri net.
     * @returns A string containing the serialized and formatted JSON object.
     */
    public getJson(): string {
        const jsonObj: JsonPetriNet = this.generateJsonObject();
        let serializedJsonObj: string | undefined;

        // Option 1: serialization with Formatter() of FracturedJsonJs library:

        // Set formatting options
        const options = new FracturedJsonOptions();
        options.MaxTotalLineLength = 2000000000;
        options.MaxInlineComplexity = 0;
        options.JsonEolStyle = EolStyle.Crlf;
        options.MaxTableRowComplexity = 0;
        options.DontJustifyNumbers = true;

        // Instantiate Formatter and serialize JsonPetriNet object
        const formatter = new Formatter();
        formatter.Options = options;
        serializedJsonObj = formatter.Serialize(jsonObj);
        if (serializedJsonObj === undefined) {
            console.error('Error: Serialized JSON is undefined');
            return ''; // Return empty string or throw error as appropriate
        }
        return serializedJsonObj;
    }

    /**
     * @description Exports the current Petri net data as a JSON file.
     * It retrieves the JSON string using `getJson()` and then triggers a download.
     */
    public exportAsJson() {
        const serializedJsonObj = this.getJson();
        // Create a blob from the JSON string
        const blob = new Blob([serializedJsonObj], { type: 'application/json' });
        // Create a link element, set its href to the blob URL, and click it to trigger download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'petri-net.json'; // Set a default filename
        document.body.appendChild(link); // Required for Firefox
        link.click();
        document.body.removeChild(link); // Clean up
    }

    /**
     * @description Generates a `JsonPetriNet` object from the current data in `DataService`.
     * This object is then typically serialized to a JSON string.
     * @returns A `JsonPetriNet` object.
     * @private
     */
    private generateJsonObject(): JsonPetriNet {
        // - Declaration of the undefined properties guaranties that the order of
        //   the properties in the export file is fixed irrespective of the order
        //   in which they are initialized.
        // - Properties, which stay undefined, will not be included in the export file.
        const jsonObj: JsonPetriNet = {
            places: [],
            transitions: [],
            arcs: undefined,
            actions: undefined,
            labels: undefined,
            marking: undefined,
            layout: undefined,
        };

        // In the application, places and transitions always have coordinates,
        // i.e. the layout will never be undefined --> initialize already here
        jsonObj.layout = {};

        // Parse Places[]
        for (let place of this.dataService.getPlaces()) {
            jsonObj.places.push(place.id);

            if (place.token) {
                if (!jsonObj.marking) jsonObj.marking = {};
                jsonObj.marking[place.id] = place.token;
            }

            jsonObj.layout[place.id] = place.position;
        }

        // Parse Transitions[]
        for (let transition of this.dataService.getTransitions()) {
            jsonObj.transitions.push(transition.id);

            jsonObj.layout[transition.id] = transition.position;

            if (transition.label) {
                if (!jsonObj.labels) jsonObj.labels = {};
                jsonObj.labels[transition.id] = transition.label;
            }
        }

        // Parse Arcs[]
        for (let arc of this.dataService.getArcs()) {
            if (!jsonObj.arcs) jsonObj.arcs = {};
            jsonObj.arcs[arc.from.id + ',' + arc.to.id] = Math.abs(arc.weight);

            if (arc.anchors.length != 0) {
                jsonObj.layout[arc.from.id + ',' + arc.to.id] = arc.anchors;
            }
        }

        // Parse Actions[] (i.e. String[])
        for (let action of this.dataService.getActions()) {
            if (!jsonObj.actions) jsonObj.actions = [];
            jsonObj.actions.push(action);
        }

        return jsonObj;
    }
}
