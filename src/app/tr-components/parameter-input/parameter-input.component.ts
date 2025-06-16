import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core'; // Added OnDestroy
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
import { UiService } from '../../tr-services/ui.service'; // Import UiService
import { Subscription } from 'rxjs'; // Import Subscription

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
export class ParameterInputComponent implements OnInit, OnDestroy { // Implement OnDestroy
    private static instanceCounter = 0;
    private instanceId: number;
    private initialLoadDone = false;
    private runSimulationSubscription: Subscription | undefined; // For unsubscribing

    trackByPath(index: number, rowData: ParameterRowData): string {
        return rowData.definition.path;
    }


    parameterFormGroup: FormGroup = new FormGroup({}); 
    combinedDataForRows: ParameterRowData[] = [];
    isLoadingDefaults = false;
    isLoadingSimulation = false;
    statusMessage: string | null = null;
    hasError: boolean = false;

    constructor(
        private planningService: PlanningService,
        private cdr: ChangeDetectorRef,
        private uiService: UiService // Inject UiService
    ) {
        this.instanceId = ++ParameterInputComponent.instanceCounter;
        console.log(`[CONSTRUCTOR ${this.instanceId}] ParameterInputComponent constructed. Timestamp: ${Date.now()}`);
    }

    ngOnInit(): void {
        console.log(`[NGONINIT ${this.instanceId}] ngOnInit. initialLoadDone: ${this.initialLoadDone}. Timestamp: ${Date.now()}`);
        if (!this.initialLoadDone) {
            this.loadDefaults();
        }
        this.runSimulationSubscription = this.uiService.runSimulationRequest$.subscribe(() => {
            console.log(`[PARAM_INPUT ${this.instanceId}] Received run simulation request from UiService. Calling this.runSimulation().`);
            this.runSimulation();
        });
    }

    ngOnDestroy(): void { // Implement ngOnDestroy
        console.log(`[PARAM_INPUT ${this.instanceId}] ngOnDestroy called. Unsubscribing from runSimulationRequest$.`);
        if (this.runSimulationSubscription) {
            this.runSimulationSubscription.unsubscribe();
        }
    }

    private parseJsonToParameterDefinitions(obj: any, pathPrefix: string = '', definitions: ParameterDefinition[] = []): ParameterDefinition[] {
        // console.log(`[DEBUG ${this.instanceId}] parseJsonToParameterDefinitions called for pathPrefix: '${pathPrefix}'. Current definitions count: ${definitions.length}. Timestamp: ${Date.now()}`);
        for (let key in obj) { 
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const originalKey = key; 
                const trimmedKey = key.trim(); 
                if (trimmedKey === null || trimmedKey === undefined || trimmedKey === '') continue;

                const value = obj[originalKey]; 
                const currentPath = pathPrefix ? `${pathPrefix}.${trimmedKey}` : trimmedKey;
                let paramType: string;
                let paramValue: any;

                if (Array.isArray(value)) {
                    paramType = 'array';
                    paramValue = JSON.stringify(value); 
                    definitions.push({ path: currentPath, type: paramType, required: 'No', value: paramValue, description: `Parameter for ${currentPath}` });
                } else if (typeof value === 'object' && value !== null) {
                    this.parseJsonToParameterDefinitions(value, currentPath, definitions);
                } else {
                    paramType = (value === null) ? 'null' : typeof value;
                    paramValue = value;
                    definitions.push({ path: currentPath, type: paramType, required: 'No', value: paramValue, description: `Parameter for ${currentPath}` });
                }
            }
        }
        return definitions;
    }

    loadDefaults(): void {
        const operationStartTime = Date.now();
        console.log(`[LOADDEFAULTS_START ${this.instanceId}] Called. isLoadingDefaults: ${this.isLoadingDefaults}, initialLoadDone: ${this.initialLoadDone}. Timestamp: ${operationStartTime}`);
        
        if (this.isLoadingDefaults && this.initialLoadDone) {
            console.warn(`[LOADDEFAULTS_WARN ${this.instanceId}] Already loading or load completed and not reset. Aborting. Timestamp: ${Date.now()}`);
            return;
        }

        this.isLoadingDefaults = true;
        this.statusMessage = 'Loading default parameters...';
        this.hasError = false;
        console.log(`[LOADDEFAULTS_STATE_SET ${this.instanceId}] isLoadingDefaults=true, statusMessage set. Forcing CDR. Timestamp: ${Date.now()}`);
        this.cdr.detectChanges(); 
        console.log(`[LOADDEFAULTS_POST_INITIAL_CDR ${this.instanceId}] Initial CDR completed. UI should show spinner. Timestamp: ${Date.now()}`);
        
        // Defer the HTTP call and subsequent heavy processing
        setTimeout(() => {
            const timeoutStartTime = Date.now();
            console.log(`[LOADDEFAULTS_TIMEOUT_START ${this.instanceId}] setTimeout callback executing. Timestamp: ${timeoutStartTime}`);
            console.time(`[PERF ${this.instanceId}] SERVICE_CALL_getDefaults`);

            this.planningService.getDefaults().subscribe({
                next: (rawDefaults) => {
                    const httpEndTime = Date.now();
                    console.timeEnd(`[PERF ${this.instanceId}] SERVICE_CALL_getDefaults`);
                    console.log(`[LOADDEFAULTS_NEXT_ENTRY ${this.instanceId}] Raw defaults received. isLoadingDefaults (from outer scope): ${this.isLoadingDefaults}. Timestamp: ${httpEndTime} (HTTP took ${httpEndTime - timeoutStartTime}ms from setTimeout start)`);

                    console.time(`[PERF ${this.instanceId}] parseJsonToParameterDefinitions_IN_NEXT`);
                    const definitions = this.parseJsonToParameterDefinitions(rawDefaults);
                    console.timeEnd(`[PERF ${this.instanceId}] parseJsonToParameterDefinitions_IN_NEXT`);
                    const parseEndTime = Date.now();
                    console.log(`[LOADDEFAULTS_NEXT_PARSED ${this.instanceId}] Parsed ${definitions.length} definitions. Timestamp: ${parseEndTime} (Parsing took ${parseEndTime - httpEndTime}ms)`);

                    const newCombinedData: ParameterRowData[] = [];
                    const controls: { [key: string]: FormControl } = {};

                    console.time(`[PERF ${this.instanceId}] formControlCreation_IN_NEXT`);
                    definitions.forEach(def => {
                        const control = new FormControl(def.value, /* add validators if needed */);
                        controls[def.path] = control;
                        newCombinedData.push({ definition: def, control: control });
                    });
                    console.timeEnd(`[PERF ${this.instanceId}] formControlCreation_IN_NEXT`);
                    const formCreationTime = Date.now();
                    console.log(`[LOADDEFAULTS_NEXT_FORM_POPULATED ${this.instanceId}] Form controls created. Controls: ${Object.keys(controls).length}. Rows: ${newCombinedData.length}. Timestamp: ${formCreationTime} (Form creation took ${formCreationTime - parseEndTime}ms)`);
                    
                    console.time(`[PERF ${this.instanceId}] Total_DataProcessing_and_FormCreation_IN_TIMEOUT`);
                    this.parameterFormGroup = new FormGroup(controls);
                    this.combinedDataForRows = newCombinedData;
                    console.timeEnd(`[PERF ${this.instanceId}] Total_DataProcessing_and_FormCreation_IN_TIMEOUT`);
                    console.log(`[LOADDEFAULTS_NEXT_DATA_ASSIGNED ${this.instanceId}] Instance data assigned. Timestamp: ${Date.now()}`);

                    this.initialLoadDone = true;
                    this.statusMessage = 'Default parameters loaded successfully.';
                    this.hasError = false;
                    // Set isLoadingDefaults to false before the CDR call that renders the rows
                    this.isLoadingDefaults = false; 
                    console.log(`[LOADDEFAULTS_SUCCESS_PRE_CDR ${this.instanceId}] Success state updated. isLoadingDefaults: ${this.isLoadingDefaults}. Status: ${this.statusMessage}. Timestamp: ${Date.now()}`);
                    
                    // Directly call detectChanges, removing the Promise.resolve().then() wrapper
                    console.log(`[LOADDEFAULTS_PRE_ROW_CDR ${this.instanceId}] Calling CDR for rendering rows. Timestamp: ${Date.now()}`);
                    console.time(`[PERF ${this.instanceId}] CDR_FOR_ROWS_DIRECT`);
                    try {
                        this.cdr.detectChanges(); 
                    } catch (error) {
                        console.error(`[LOADDEFAULTS_ROW_CDR_ERROR ${this.instanceId}] Error during direct CDR for rows:`, error);
                        this.statusMessage = 'Error rendering parameters.';
                        this.hasError = true;
                        // Optionally, trigger another CDR if the error message itself needs to be displayed immediately
                        // this.cdr.detectChanges(); 
                    }
                    console.timeEnd(`[PERF ${this.instanceId}] CDR_FOR_ROWS_DIRECT`);
                    console.log(`[LOADDEFAULTS_POST_ROW_CDR ${this.instanceId}] Direct CDR for rows completed. Timestamp: ${Date.now()}`);
                },
                error: (err) => {
                    console.timeEnd(`[PERF ${this.instanceId}] SERVICE_CALL_getDefaults`); // End timer in case of error too
                    console.error(`[LOADDEFAULTS_ERROR ${this.instanceId}] Error fetching defaults:`, err);
                    this.statusMessage = `Failed to load default parameters: ${err.message || 'Unknown server error'}`;
                    this.hasError = true;
                    this.isLoadingDefaults = false;
                    this.initialLoadDone = true; // Or false, depending on desired retry behavior
                    this.cdr.detectChanges();
                }
            });
        }, 0);
        console.log(`[LOADDEFAULTS_METHOD_END_SYNC ${this.instanceId}] loadDefaults method finished. setTimeout scheduled. Timestamp: ${Date.now()}`);
    }

    runSimulation(): void {
        const operationStartTime = Date.now();
        console.log(`[RUNSIMULATION_START ${this.instanceId}] initialLoadDone: ${this.initialLoadDone}. Timestamp: ${operationStartTime}`);
        if (!this.initialLoadDone) {
            this.statusMessage = "Please load default parameters first.";
            this.hasError = true;
            this.cdr.detectChanges();
            return;
        }
        if (this.parameterFormGroup.invalid) {
            this.statusMessage = "Please correct the invalid parameters before running the simulation.";
            this.hasError = true;
            Object.values(this.parameterFormGroup.controls).forEach(control => {
                control.markAsTouched();
            });
            this.cdr.detectChanges();
            return;
        }

        this.isLoadingSimulation = true;
        this.statusMessage = 'Running simulation...';
        this.hasError = false;
        console.log(`[RUNSIMULATION_STATE_SET ${this.instanceId}] isLoadingSimulation=true. Forcing CDR. Timestamp: ${Date.now()}`);
        this.cdr.detectChanges(); 
        console.log(`[RUNSIMULATION_POST_INITIAL_CDR ${this.instanceId}] Initial CDR completed. Timestamp: ${Date.now()}`);

        console.time(`[PERF ${this.instanceId}] reconstructNestedObject_SIM`);
        const planningData = this.reconstructNestedObject(this.parameterFormGroup.value);
        console.timeEnd(`[PERF ${this.instanceId}] reconstructNestedObject_SIM`);
        const afterReconstructTime = Date.now();
        console.log(`[RUNSIMULATION_DATA_RECONSTRUCTED ${this.instanceId}] Planning data reconstructed. Timestamp: ${afterReconstructTime} (Reconstruction took ${afterReconstructTime - operationStartTime}ms so far)`);

        console.time(`[PERF ${this.instanceId}] SERVICE_CALL_runPlanning`);
        this.planningService.runPlanning(planningData)
            .pipe(finalize(() => {
                this.isLoadingSimulation = false;
                console.log(`[RUNSIMULATION_FINALIZE ${this.instanceId}] Finalized. isLoadingSimulation: ${this.isLoadingSimulation}. Timestamp: ${Date.now()}`);
                this.cdr.detectChanges(); 
                console.log(`[RUNSIMULATION_FINALIZE_POST_CDR ${this.instanceId}] CDR after setting isLoadingSimulation=false in finalize. Timestamp: ${Date.now()}`);
            }))
            .subscribe({
                next: (response: any) => {
                    console.timeEnd(`[PERF ${this.instanceId}] SERVICE_CALL_runPlanning`);
                    const afterHttpSimTime = Date.now();
                    console.log(`[RUNSIMULATION_NEXT ${this.instanceId}] Simulation Response:`, response, `. Timestamp: ${afterHttpSimTime} (Sim HTTP took ${afterHttpSimTime - afterReconstructTime}ms)`);
                    if (response && typeof response === 'object') {
                        this.statusMessage = `Simulation completed: ${response.message || response.status || 'No detailed message.'}`;
                        this.hasError = !(response.status && String(response.status).toUpperCase() === 'SUCCESS');
                    } else {
                        this.statusMessage = `Simulation completed. Response: ${JSON.stringify(response)}`;
                        this.hasError = false; 
                    }
                    console.log(`[RUNSIMULATION_SUCCESS_TOTAL_TIME ${this.instanceId}] Total time for successful runSimulation (from call to this point): ${Date.now() - operationStartTime}ms`);
                },
                error: (err: any) => {
                    console.timeEnd(`[PERF ${this.instanceId}] SERVICE_CALL_runPlanning`);
                    this.statusMessage = `Error running simulation: ${err.message || err}`;
                    this.hasError = true;
                    console.error(`[RUNSIMULATION_ERROR ${this.instanceId}] Simulation error. Timestamp: ${Date.now()}`, err);
                    console.log(`[RUNSIMULATION_ERROR_TOTAL_TIME ${this.instanceId}] Total time for failed runSimulation (from call to this point): ${Date.now() - operationStartTime}ms`);
                }
            });
        console.log(`[RUNSIMULATION_METHOD_END_SYNC ${this.instanceId}] runSimulation synchronous part finished. HTTP request pending. Timestamp: ${Date.now()}`);
    }

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
                    const isLastKey = index === keys.length - 1;
                    
                    const arrayMatch = key.match(/^(.+)\[\.\.\.\]$/);
                    let actualKey = arrayMatch ? arrayMatch[1] : key;

                    if (isLastKey) {
                        let valueToSet = flatObject[path];
                        if (typeof valueToSet === 'string') {
                            const trimmedValue = valueToSet.trim();
                            if ((trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) ||
                                (trimmedValue.startsWith('{') && trimmedValue.endsWith('}'))) {
                                try {
                                    valueToSet = JSON.parse(trimmedValue);
                                } catch (e) {
                                    // console.warn(`Failed to parse potential JSON string for path ${path}: ${valueToSet}`, e);
                                }
                            }
                        }
                        currentLevel[actualKey] = valueToSet;
                    } else {
                        if (!currentLevel[actualKey]) {
                            const nextKeyRaw = keys[index+1];
                            const nextKeyArrayMatch = nextKeyRaw ? nextKeyRaw.match(/^(.+)\[\.\.\.\]$/) : null;
                            if (nextKeyArrayMatch) { 
                                 currentLevel[actualKey] = [];
                            } else {
                                 currentLevel[actualKey] = {};
                            }
                        }
                        if (typeof currentLevel[actualKey] !== 'object' || currentLevel[actualKey] === null) {
                            console.warn(`[RECONSTRUCT ${this.instanceId}] Path conflict for key '${actualKey}' at '${path}'. Current value is not an object/array as expected by nesting. Overwriting as object/array based on next key.`);
                            const nextKeyRaw = keys[index+1];
                            const nextKeyArrayMatch = nextKeyRaw ? nextKeyRaw.match(/^(.+)\[\.\.\.\]$/) : null;
                            if (nextKeyArrayMatch) {
                                currentLevel[actualKey] = [];
                            } else {
                                currentLevel[actualKey] = {};
                            }
                        }
                        currentLevel = currentLevel[actualKey];
                    }
                });
            }
        }
        return nestedObject;
    }
}