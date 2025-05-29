import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { JsonPetriNet } from '../classes/json-petri-net';
import {
    Formatter,
    FracturedJsonOptions,
    EolStyle,
} from 'fracturedjsonjs';

/**
 * @Injectable
 * Provided in 'root', making this service a singleton available throughout the application.
 *
 * @description
 * The `ExportJsonDataService` is responsible for converting the current Petri net model
 * into a JSON string and providing functionality to download this JSON data as a file.
 *
 * Modularity:
 * This service encapsulates all logic related to JSON serialization and file export
 * for Petri net data. It achieves modularity in the following ways:
 * - **Single Responsibility:** Its sole purpose is to handle the export of Petri net data to JSON format.
 *   It does not concern itself with how the Petri net data is created, managed, or modified.
 * - **Decoupling through DataService:** It depends on the `DataService` to obtain the
 *   Petri net data. `DataService` acts as the central repository for the application's
 *   data model. This decouples `ExportJsonDataService` from the specific implementation
 *   details of data storage and management. If the internal representation of the Petri net
 *   changes within `DataService`, `ExportJsonDataService` can remain largely unaffected
 *   as long as the interface provided by `DataService` (e.g., `getPlaces()`, `getTransitions()`)
 *   remains consistent or is adapted within the `generateJsonObject` method.
 * - **Encapsulation of Formatting Logic:** The service uses the `FracturedJsonJs` library
 *   for fine-grained control over JSON formatting. This choice and its configuration
 *   are internal to this service. If a different formatting strategy or library were
 *   to be adopted, the changes would be localized here, minimizing impact on other
 *   parts of the application.
 * - **Clear Interface:** It exposes simple public methods (`getJson`, `exportAsJson`) for
 *   other parts of the application (e.g., UI components) to consume.
 *
 * This modular design enhances maintainability by isolating JSON export concerns,
 * making the system easier to understand, test, and modify.
 */
@Injectable({
    providedIn: 'root',
})
export class ExportJsonDataService {
    /**
     * Constructs the `ExportJsonDataService`.
     * @param dataService The central service for accessing Petri net data.
     */
    constructor(private dataService: DataService) {}

    /**
     * Generates a formatted JSON string representing the current Petri net model.
     *
     * This method orchestrates the conversion of the Petri net data, obtained from
     * `DataService`, into a `JsonPetriNet` object, which is then serialized
     * into a string using the `FracturedJsonJs` library for enhanced readability
     * and specific formatting control.
     *
     * @returns {string} A string containing the JSON representation of the Petri net.
     * @throws {Error} If the JSON data cannot be serialized.
     */
    public getJson(): string {
        const jsonObj: JsonPetriNet = this.generateJsonObject();
        let serializedJsonObj: string | undefined;

        // Option 1: serialization with Formatter() of FracturedJsonJs library:
        // The FracturedJsonJs library is chosen for its advanced formatting capabilities,
        // allowing for control over line length, inline complexity, EOL style, etc.,
        // which can produce more human-readable or machine-friendly JSON output
        // compared to the standard JSON.stringify.

        // Set formatting options
        const options = new FracturedJsonOptions();
        options.MaxTotalLineLength = 2000000000; // Effectively disables line wrapping by length for most practical purposes.
        options.MaxInlineComplexity = 0; // Prevents complex objects/arrays from being inlined.
        options.JsonEolStyle = EolStyle.Crlf; // Uses Windows-style line endings (CRLF).
        options.MaxTableRowComplexity = 0; // Affects formatting of arrays of simple objects.
        options.DontJustifyNumbers = true; // Prevents right-justification of numbers.

        // Instantiate Formatter and serialize JsonPetriNet object
        const formatter = new Formatter();
        formatter.Options = options;
        serializedJsonObj = formatter.Serialize(jsonObj);
        if (serializedJsonObj === undefined) {
            throw new Error('Json data could not be serialized');
        }
        return serializedJsonObj;
    }

    /**
     * Exports the current Petri net model as a JSON file and initiates a download.
     *
     * This method first generates the JSON string representation of the Petri net
     * using `getJson()`. It then creates a Blob (Binary Large Object) from this
     * string, sets the appropriate MIME type ('application/json'), and uses a
     * dynamically created anchor (`<a>`) element to trigger a file download
     * in the user's browser. The default filename is "petri-net-with-love.json".
     *
     * The commented-out sections demonstrate alternative serialization methods using
     * `JSON.stringify` with different formatting options (compact, expanded, mixed).
     * These are preserved for reference but the primary method uses `FracturedJsonJs`
     * via `getJson()` for its superior formatting control.
     */
    public exportAsJson() {
        const serializedJsonObj = this.getJson();

        // Alternative serializations with JSON.stringify(data, replacer, space):

        // Option 2: compact format *****************************************
        // const serializedJsonObj = JSON.stringify(this.generateJsonObject());
        // ******************************************************************

        // Option 3: expanded format ****************************************
        // const serializedJsonObj = JSON.stringify(this.generateJsonObject(), null, 4);
        // ******************************************************************

        // Option 4: mixed format *******************************************
        // let serializedJsonObj = JSON.stringify(this.generateJsonObject(), (key, value) => {
        //     if (['places', 'transitions', 'actions'].includes(key)) {
        //         return JSON.stringify(value);
        //     } else {
        //         return value;
        //     }
        // }, 4);
        // // String normalization: removal of extra quotes and back slashes
        // serializedJsonObj = serializedJsonObj.replace(/\"\[/g, '[');
        // serializedJsonObj = serializedJsonObj.replace(/\]\"/g, ']');
        // serializedJsonObj = serializedJsonObj.replace(/\\\"/g, '"');
        // ******************************************************************

        // Create Blob (Binary Large OBject)
        const file = new Blob([serializedJsonObj], {
            type: 'application/json',
        });

        // Create anchor element with url to the Blob object and programmatically
        // trigger a click event on the anchor to initiate the download
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = 'petri-net-with-love.json';
        link.click();

        // Free up resources
        URL.revokeObjectURL(link.href);
    }

    /**
     * Generates a `JsonPetriNet` object from the current Petri net data.
     *
     * This private helper method is responsible for transforming the application's
     * internal Petri net data structures (obtained from `DataService`) into the
     * specific `JsonPetriNet` interface format defined in `app/classes/json-petri-net.ts`.
     * This structure is then used for serialization into a JSON string.
     *
     * The method ensures a consistent order of properties in the resulting JSON
     * by pre-declaring them in the `jsonObj`. Properties that remain undefined
     * (e.g., if there are no arcs or labels) will not be included in the final
     * JSON output by most serializers.
     *
     * It iterates over places, transitions, arcs, and actions from `DataService`,
     * mapping their properties to the corresponding fields in the `JsonPetriNet` object.
     * This includes:
     * - Place IDs and their markings.
     * - Transition IDs and their labels.
     * - Arc definitions (source, target, weight).
     * - Layout information (positions for places/transitions, anchor points for arcs).
     * - Action labels.
     *
     * @returns {JsonPetriNet} An object conforming to the `JsonPetriNet` interface,
     *                         representing the current state of the Petri net.
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
