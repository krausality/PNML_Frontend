import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PlanningService } from '../../tr-services/planning.service';
import { finalize } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TextFieldModule } from '@angular/cdk/text-field';
import { ParameterRowComponent } from '../parameter-row/parameter-row.component';
import { ParameterDefinition } from '../../tr-interfaces/parameter-definition.interface';
import { FlexLayoutModule } from '@angular/flex-layout'; // ENSURE THIS IS PRESENT AND CORRECT

@Component({
    selector: 'app-parameter-input',
    templateUrl: './parameter-input.component.html',
    styleUrls: ['./parameter-input.component.css'],
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        TextFieldModule,
        ParameterRowComponent,
        FlexLayoutModule // ENSURE THIS IS IMPORTED AND ADDED HERE
    ]
})
export class ParameterInputComponent implements OnInit {
    private static instanceCounter = 0;
    private instanceId: number;

    parameterFormGroup: FormGroup = new FormGroup({});
    parameterDefinitions: ParameterDefinition[] = [];

    isLoadingDefaults = false;
    isLoadingSimulation = false;
    statusMessage: string | null = null;
    hasError: boolean = false;

    constructor(
        private planningService: PlanningService,
        private cdr: ChangeDetectorRef
    ) {
        this.instanceId = ++ParameterInputComponent.instanceCounter;
        console.log(`[CONSTRUCTOR ${this.instanceId}] ParameterInputComponent constructed.`);
    }

    ngOnInit(): void {
        console.log(`[NGONINIT ${this.instanceId}] ParameterInputComponent ngOnInit. isLoadingDefaults: ${this.isLoadingDefaults}, definitions.length: ${this.parameterDefinitions.length}`);
        if (!this.isLoadingDefaults && this.parameterDefinitions.length === 0) {
            this.loadDefaults();
        } else {
            console.log(`[NGONINIT ${this.instanceId}] Skipping loadDefaults call. isLoadingDefaults: ${this.isLoadingDefaults}, definitions.length: ${this.parameterDefinitions.length}`);
        }
    }

    private parseJsonToParameterDefinitions(obj: any, pathPrefix: string = '', definitions: ParameterDefinition[] = []): ParameterDefinition[] {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (key === null || key === undefined || key.trim() === '') {
                    console.warn(`[DEBUG ${this.instanceId}] parseJsonToParameterDefinitions: Skipping parameter with empty or invalid key at path prefix: '${pathPrefix}'`);
                    continue;
                }

                const value = obj[key];
                const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
                let paramType: string;
                let paramValue: any;

                if (Array.isArray(value)) {
                    paramType = 'array';
                    paramValue = JSON.stringify(value);
                    definitions.push({
                        path: currentPath,
                        type: paramType,
                        required: 'No', 
                        value: paramValue,
                        description: `Parameter for ${currentPath}`
                    });
                } else if (typeof value === 'object' && value !== null) {
                    this.parseJsonToParameterDefinitions(value, currentPath, definitions);
                } else {
                    paramType = (value === null) ? 'null' : typeof value;
                    paramValue = value;
                    definitions.push({
                        path: currentPath,
                        type: paramType,
                        required: 'No',
                        value: paramValue,
                        description: `Parameter for ${currentPath}`
                    });
                }
            }
        }
        return definitions;
    }

    loadDefaults(): void {
        console.log(`[LOADDEFAULTS_START ${this.instanceId}] loadDefaults called. Current isLoadingDefaults: ${this.isLoadingDefaults}`);
        if (this.isLoadingDefaults) {
            console.warn(`[LOADDEFAULTS_START ${this.instanceId}] Aborting loadDefaults because isLoadingDefaults is true for this instance.`);
            return; 
        }

        this.isLoadingDefaults = true;
        this.statusMessage = null;
        this.hasError = false;
        this.parameterFormGroup = new FormGroup({});
        this.parameterDefinitions = [];

        const newFormGroup = new FormGroup({});
        let newDefinitions: ParameterDefinition[] = [];
        
        console.log(`[LOADDEFAULTS_HTTP ${this.instanceId}] Calling planningService.getDefaults().`);

        this.planningService.getDefaults().subscribe({
            next: (defaults) => {
                console.log(`[LOADDEFAULTS_NEXT ${this.instanceId}] Raw defaults received from backend.`);
                newDefinitions = this.parseJsonToParameterDefinitions(defaults);
                console.log(`[LOADDEFAULTS_NEXT ${this.instanceId}] Parsed ${newDefinitions.length} parameter definitions.`);

                newDefinitions.forEach(paramDef => {
                    const control = new FormControl(paramDef.value, paramDef.required === 'Yes' ? Validators.required : null);
                    newFormGroup.addControl(paramDef.path, control);
                });
                console.log(`[LOADDEFAULTS_NEXT ${this.instanceId}] Added ${Object.keys(newFormGroup.controls).length} controls to new FormGroup.`);

                this.parameterFormGroup = newFormGroup;
                this.parameterDefinitions = newDefinitions;
                
                console.log(`[LOADDEFAULTS_BEFORE_CDR ${this.instanceId}] Instance FormGroup and Definitions assigned. isLoadingDefaults: ${this.isLoadingDefaults}`);
                console.log(`[LOADDEFAULTS_BEFORE_CDR ${this.instanceId}] Instance FormGroup has ${Object.keys(this.parameterFormGroup.controls).length} controls. Keys:`, Object.keys(this.parameterFormGroup.controls).slice(0,5));
                console.log(`[LOADDEFAULTS_BEFORE_CDR ${this.instanceId}] Instance ParameterDefinitions length: ${this.parameterDefinitions.length}. First 3 paths:`, this.parameterDefinitions.slice(0,3).map(p=>p.path));

                this.cdr.detectChanges();
                console.log(`[LOADDEFAULTS_AFTER_CDR ${this.instanceId}] detectChanges completed.`);

                this.statusMessage = 'Default parameters loaded successfully.';
                this.isLoadingDefaults = false;
                console.log(`[LOADDEFAULTS_SUCCESS ${this.instanceId}] Success. isLoadingDefaults set to: ${this.isLoadingDefaults}. Status: ${this.statusMessage}`);
                this.cdr.detectChanges(); 
            },
            error: (err) => {
                console.error(`[LOADDEFAULTS_ERROR ${this.instanceId}] Error loading default parameters:`, err);
                this.parameterDefinitions = [];
                this.parameterFormGroup = new FormGroup({});
                this.isLoadingDefaults = false;
                this.statusMessage = 'Failed to load default parameters. See console for details.';
                this.hasError = true;
                this.cdr.detectChanges();
            }
        });
    }

    runSimulation(): void {
        if (this.parameterFormGroup.invalid) {
            this.statusMessage = "Please correct the invalid parameters before running the simulation.";
            this.hasError = true;
            Object.values(this.parameterFormGroup.controls).forEach(control => {
                control.markAsTouched();
            });
            return;
        }

        this.isLoadingSimulation = true;
        this.statusMessage = null;
        this.hasError = false;
        const planningData = this.reconstructNestedObject(this.parameterFormGroup.value);

        this.planningService.runPlanning(planningData)
            .pipe(finalize(() => this.isLoadingSimulation = false))
            .subscribe({
                next: (response: any) => {
                    console.log('Simulation Response:', response);
                    if (response && typeof response === 'object') {
                        this.statusMessage = `Simulation gestartet/beendet: ${response.message || response.status || 'Keine detaillierte Meldung.'}`;
                        this.hasError = !(response.status && response.status.toUpperCase() === 'SUCCESS');
                    } else {
                        this.statusMessage = `Simulation abgeschlossen. Antwort: ${JSON.stringify(response)}`;
                        this.hasError = false; 
                    }
                    this.cdr.detectChanges();
                },
                error: (err: any) => {
                    this.statusMessage = `Fehler beim Starten der Simulation: ${err.message || err}`;
                    this.hasError = true;
                    console.error(err);
                    this.cdr.detectChanges();
                }
            });
    }

    public getFormControl(path: string): FormControl {
        // *** MODIFIED FOR DETAILED LOGGING ***
        const numControlsInGroup = this.parameterFormGroup ? Object.keys(this.parameterFormGroup.controls).length : -1;
        console.log(`[GETFORMCONTROL ${this.instanceId}] Path: '${path}'. FormGroup (instance ${this.instanceId}) has ${numControlsInGroup} controls.`);

        if (!this.parameterFormGroup || numControlsInGroup === 0 && this.parameterDefinitions.length > 0) { 
            // Added "&& this.parameterDefinitions.length > 0" to only log error if definitions ARE present but group is empty
            console.error(`[GETFORMCONTROL ${this.instanceId}] CRITICAL: For path '${path}', this.parameterFormGroup is ${this.parameterFormGroup ? 'empty' : 'null/undefined'} when accessed by template, but definitions exist.`);
            return null as any; 
        }
        const control = this.parameterFormGroup.get(path);
        if (!control && this.parameterDefinitions.length > 0) { // Only warn if definitions are expected
            console.warn(`[GETFORMCONTROL ${this.instanceId}] Control NOT FOUND for path '${path}'.`);
        }
        return control as FormControl;
    }

    private reconstructNestedObject(flatObject: { [key: string]: any }): any {
        const nestedObject: { [key: string]: any } = {};
        for (const path in flatObject) {
            if (Object.prototype.hasOwnProperty.call(flatObject, path)) {
                const keys = path.split('.');
                let currentLevel: { [key: string]: any } = nestedObject;
                keys.forEach((key, index) => {
                    if (index === keys.length - 1) {
                        try {
                            const valueToParse = flatObject[path];
                            if (typeof valueToParse === 'string') {
                                if (valueToParse.trim().startsWith('[') && valueToParse.trim().endsWith(']')) {
                                    currentLevel[key] = JSON.parse(valueToParse);
                                } else if (valueToParse.trim().startsWith('{') && valueToParse.trim().endsWith('}')) {
                                    currentLevel[key] = JSON.parse(valueToParse);
                                } else {
                                    currentLevel[key] = valueToParse;
                                }
                            } else {
                                currentLevel[key] = valueToParse;
                            }
                        } catch (e) {
                            currentLevel[key] = flatObject[path];
                        }
                    } else {
                        currentLevel[key] = currentLevel[key] || {};
                        currentLevel = currentLevel[key];
                    }
                });
            }
        }
        return nestedObject;
    }
}