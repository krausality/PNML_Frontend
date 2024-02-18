import { Injectable } from '@angular/core';
import { DataService } from './data.service';
import { JsonPetriNet } from '../classes/json-petri-net';
import {
    Formatter,
    FracturedJsonOptions,
    EolStyle,
} from 'fracturedjsonjs';

@Injectable({
    providedIn: 'root',
})
export class ExportJsonDataService {
    constructor(private dataService: DataService) {}

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
            throw new Error('Json data could not be serialized');
        }
        return serializedJsonObj;
    }

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
