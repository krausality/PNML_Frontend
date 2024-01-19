import { Component } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import { DataService } from 'src/app/tr-services/data.service';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { ParserService } from 'src/app/tr-services/parser.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';

import { createJsonSchemaValidator } from './json-schema.validator';

@Component({
    selector: 'app-code-editor',
    templateUrl: './code-editor.component.html',
    styleUrls: ['./code-editor.component.css'],
})
export class CodeEditorComponent {
    languageSelected = 'json';
    textareaControl = new FormControl('', [createJsonSchemaValidator()]);

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
        // the value of the textareaControl can be null or empty
        // if this is the case the existing petrinet will be deleted

        if (!sourceCode) {
            this.dataService.places = [];
            this.dataService.transitions = [];
            this.dataService.arcs = [];
            this.dataService.actions = [];
            return;
        }

        // parse the data as json or pnml based on the selected language
        let parsedData: [
            Array<Place>,
            Array<Transition>,
            Array<Arc>,
            Array<string>,
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
        this.dataService.actions = actions;
    }
}
