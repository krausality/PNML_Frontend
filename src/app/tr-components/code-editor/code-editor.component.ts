import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ErrorStateMatcher } from '@angular/material/core';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import { DataService } from 'src/app/tr-services/data.service';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { ParserService } from 'src/app/tr-services/parser.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';
import { ErrorPopupComponent } from '../error-popup/error-popup.component';
import { UiService } from 'src/app/tr-services/ui.service';
import { CodeEditorFormat } from 'src/app/tr-enums/ui-state';
import { ButtonState } from 'src/app/tr-enums/ui-state';

import { createJsonSchemaValidator } from './json-schema.validator';

@Component({
    selector: 'app-code-editor',
    templateUrl: './code-editor.component.html',
    styleUrls: ['./code-editor.component.css'],
})
export class CodeEditorComponent implements OnInit {
    textareaControl = new FormControl('', [createJsonSchemaValidator()]);

    constructor(
        private exportJsonDataService: ExportJsonDataService,
        private pnmlService: PnmlService,
        private parserService: ParserService,
        private dataService: DataService,
        private uiService: UiService,
        private matDialog: MatDialog,
    ) {}

    ngOnInit() {
        // reload the source code in a the given format when the
        // BehaviorSubject changes its value
        this.uiService.codeEditorFormat$.subscribe((format) => {
            if (format === CodeEditorFormat.JSON) {
                this.textareaControl.setValue(
                    this.exportJsonDataService.getJson(),
                );
            } else {
                this.textareaControl.setValue(this.pnmlService.getPNML());
            }
        });

        this.uiService.buttonState$.subscribe((buttonState) => {
            if (buttonState === ButtonState.ApplyCode) {
                this.applySourceCode();
            }
        });
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

        // validate JSON / XML formats and display popup if formatting rules are broken
        try {
            if (
                this.uiService.codeEditorFormat$.value === CodeEditorFormat.JSON
            ) {
                parsedData = this.parserService.parse(sourceCode);
            } else {
                parsedData = this.pnmlService.parse(sourceCode);
            }
        } catch (error) {
            this.matDialog.open(ErrorPopupComponent, {
                data: {
                    parsingError: true,
                    schemaValidationErrors: this.textareaControl.errors,
                },
            });
            return;
        }

        // Display results of JSON against Petrinet JSOn Schema
        // TODO: Validate XML as well?
        if (this.textareaControl.errors) {
            this.matDialog.open(ErrorPopupComponent, {
                data: {
                    parsingError: false,
                    schemaValidationErrors: this.textareaControl.errors,
                },
            });
            return;
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
