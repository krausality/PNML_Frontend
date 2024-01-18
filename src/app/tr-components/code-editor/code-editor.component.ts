import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import { DataService } from 'src/app/tr-services/data.service';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { ParserService } from 'src/app/tr-services/parser.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';

import Ajv from 'ajv/dist/2020';
// import betterAjvErrors from 'better-ajv-errors';
import jsonSchema from 'src/app/tr-components/code-editor/petrinet.schema';
// import * as petrinetSchema from './petrinet.schema.json';

@Component({
    selector: 'app-code-editor',
    templateUrl: './code-editor.component.html',
    styleUrls: ['./code-editor.component.css'],
})
export class CodeEditorComponent {
    languageSelected = 'json';
    textareaControl = new FormControl('');

    ajv = new Ajv({
        allowMatchingProperties: true,
        verbose: true,
        allErrors: true,
    });
    validate = this.ajv.compile(jsonSchema);

    constructor(
        private exportJsonDataService: ExportJsonDataService,
        private pnmlService: PnmlService,
        private parserService: ParserService,
        private dataService: DataService,
    ) {}

    // loads the source code in json or pnml depending on
    // which language is selected in the language switch
    public loadSourceCode() {
        if (this.languageSelected === 'json') {
            const jsonContent = this.exportJsonDataService.getJson();
            if (jsonContent) {
                this.textareaControl.setValue(jsonContent);
            }
        } else {
            this.textareaControl.setValue(this.pnmlService.getPNML());
        }
    }

    // applies the current source code as json or pnml
    // depending on which language is selected
    public applySourceCode() {
        let sourceCode = this.textareaControl.value;
        // the value of the textareaControl can be null
        // if this is the case nothing should be applied
        // TODO: should the existing petri net be deleted if an
        //       empty one is applied?
        if (!sourceCode) {
            // TODO: possibly delete the existing petrinet here
            return;
        }

        // parse the data as json or pnml based on the selected language
        let parsedData: [
            Array<Place>,
            Array<Transition>,
            Array<Arc>,
            Array<string>?,
        ];
        if (this.languageSelected === 'json') {
            // validate JSON structure
            try {
                JSON.parse(sourceCode);
            } catch (e) {
                console.log('Problem parsing JSON', e);
                // handle and show error message e.g.
            }

            // validate agains JSON schema
            const json = JSON.parse(sourceCode);
            const valid = this.validate(json);
            if (!valid) {
                console.log(this.validate.errors);
                return;
            }

            parsedData = this.parserService.parse(sourceCode);
        } else {
            parsedData = this.pnmlService.parse(sourceCode);
        }
        // destructure the parsed data and overwrite the corresponding parameters
        // in the data service
        const [places, transitions, arcs, actions] = parsedData;
        this.dataService.places = places;
        this.dataService.transitions = transitions;
        this.dataService.arcs = arcs;
        // only overwrite actions if there are any
        if (actions) {
            this.dataService.actions = actions;
        }
    }
}
