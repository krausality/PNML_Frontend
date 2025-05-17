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
import { FlexLayoutModule } from '@angular/flex-layout';

// New interface for the combined data
export interface ParameterRowData {
    definition: ParameterDefinition;
    control: FormControl;
}

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
        FlexLayoutModule
    ]
})
export class ParameterInputComponent implements OnInit {
    private static instanceCounter = 0;
    private instanceId: number;
    private initialLoadDone = false;

    parameterFormGroup: FormGroup = new FormGroup({}); 
    // parameterDefinitions: ParameterDefinition[] = []; // Will be replaced by combinedDataForRows
    
    // New property to hold combined data for template iteration
    combinedDataForRows: ParameterRowData[] = [];

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
        console.log(`[NGONINIT ${this.instanceId}] ParameterInputComponent ngOnInit. initialLoadDone: ${this.initialLoadDone}`);
        if (!this.initialLoadDone) {
            this.loadDefaults();
        }
    }

    private parseJsonToParameterDefinitions(obj: any, pathPrefix: string = '', definitions: ParameterDefinition[] = []): ParameterDefinition[] {
        for (let key in obj) { 
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const originalKey = key; 
                const trimmedKey = key.trim(); 

                if (trimmedKey === null || trimmedKey === undefined || trimmedKey === '') {
                    // console.warn(`[DEBUG ${this.instanceId}] parseJsonToParameterDefinitions: Skipping parameter with empty or invalid key (original: "${originalKey}") at path prefix: '${pathPrefix}'`);
                    continue;
                }

                const value = obj[originalKey]; 
                const currentPath = pathPrefix ? `${pathPrefix}.${trimmedKey}` : trimmedKey; // Use trimmedKey for path
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
            console.warn(`[LOADDEFAULTS_START ${this.instanceId}] Aborting loadDefaults because isLoadingDefaults is true.`);
            return; 
        }

        this.isLoadingDefaults = true;
        this.statusMessage = null;
        this.hasError = false;
        
        const localNewFormGroup = new FormGroup({});
        let localNewDefinitions: ParameterDefinition[] = [];
        
        console.log(`[LOADDEFAULTS_HTTP ${this.instanceId}] Calling planningService.getDefaults().`);

        this.planningService.getDefaults().subscribe({
            next: (defaults) => {
                console.log(`[LOADDEFAULTS_NEXT ${this.instanceId}] Raw defaults received from backend.`);
                localNewDefinitions = this.parseJsonToParameterDefinitions(defaults);
                console.log(`[LOADDEFAULTS_NEXT ${this.instanceId}] Parsed ${localNewDefinitions.length} parameter definitions.`);
                
                const tempCombinedData: ParameterRowData[] = [];

                localNewDefinitions.forEach(paramDef => {
                    const control = new FormControl(paramDef.value, paramDef.required === 'Yes' ? Validators.required : null);
                    localNewFormGroup.addControl(paramDef.path, control);
                    tempCombinedData.push({ definition: paramDef, control: control }); // Store pair
                });
                console.log(`[LOADDEFAULTS_NEXT ${this.instanceId}] Local FormGroup populated with ${Object.keys(localNewFormGroup.controls).length} controls and ${tempCombinedData.length} combined rows created.`);

                this.parameterFormGroup = localNewFormGroup;
                // this.parameterDefinitions = localNewDefinitions; // No longer directly used by template for rows
                this.combinedDataForRows = tempCombinedData; // Assign the new combined data
                
                this.initialLoadDone = true;
                console.log(`[LOADDEFAULTS_BEFORE_CDR ${this.instanceId}] Instance FormGroup and CombinedData ASSIGNED. isLoadingDefaults: ${this.isLoadingDefaults}, initialLoadDone: ${this.initialLoadDone}`);
                console.log(`[LOADDEFAULTS_BEFORE_CDR ${this.instanceId}] Instance FormGroup has ${Object.keys(this.parameterFormGroup.controls).length} controls.`);
                console.log(`[LOADDEFAULTS_BEFORE_CDR ${this.instanceId}] Instance CombinedDataForRows length: ${this.combinedDataForRows.length}.`);
                
                this.isLoadingDefaults = false;
                this.statusMessage = 'Default parameters loaded successfully.';
                console.log(`[LOADDEFAULTS_SUCCESS ${this.instanceId}] Success. isLoadingDefaults: ${this.isLoadingDefaults}. Status: ${this.statusMessage}`);
                
                this.cdr.detectChanges(); 
                console.log(`[LOADDEFAULTS_AFTER_CDR ${this.instanceId}] Final detectChanges completed.`);

            },
            error: (err) => {
                console.error(`[LOADDEFAULTS_ERROR ${this.instanceId}] Error loading default parameters:`, err);
                // this.parameterDefinitions = [];
                this.combinedDataForRows = [];
                this.parameterFormGroup = new FormGroup({});
                
                this.isLoadingDefaults = false;
                this.statusMessage = 'Failed to load default parameters. See console for details.';
                this.hasError = true;
                this.initialLoadDone = true; 
                this.cdr.detectChanges();
            }
        });
    }

    // ... runSimulation and reconstructNestedObject remain the same ...
    runSimulation(): void {
        if (!this.initialLoadDone) {
            this.statusMessage = "Please load default parameters first.";
            this.hasError = true;
            return;
        }
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

    // getFormControl is not strictly needed by the template if combinedDataForRows is used
    public getFormControl(path: string): FormControl | null {
        return this.parameterFormGroup.get(path) as FormControl | null;
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