import { Component, OnInit, ChangeDetectorRef } from '@angular/core'; // Import ChangeDetectorRef
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
        ParameterRowComponent
    ]
})
export class ParameterInputComponent implements OnInit {
    parameterFormGroup: FormGroup = new FormGroup({});
    parameterDefinitions: ParameterDefinition[] = [];

    isLoadingDefaults = false;
    isLoadingSimulation = false;
    statusMessage: string | null = null;
    hasError: boolean = false;

    constructor(
        private planningService: PlanningService,
        private cdr: ChangeDetectorRef // Inject ChangeDetectorRef
    ) { }

    ngOnInit(): void {
        this.loadDefaults();
    }

    private parseJsonToParameterDefinitions(obj: any, pathPrefix: string = '', definitions: ParameterDefinition[] = []): ParameterDefinition[] {
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                if (key === null || key === undefined || key.trim() === '') {
                    console.warn(`parseJsonToParameterDefinitions: Skipping parameter with empty or invalid key at path prefix: '${pathPrefix}'`);
                    continue;
                }

                const value = obj[key];
                const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
                let paramType: string;
                let paramValue: any;

                if (Array.isArray(value)) {
                    paramType = 'array';
                    // For arrays that might contain objects, ensure they are stringified if they are to be edited as text.
                    // If they are handled by sub-components or specific logic, this might differ.
                    paramValue = JSON.stringify(value); 
                    definitions.push({
                        path: currentPath,
                        type: paramType,
                        required: 'No', // This would typically come from a schema
                        value: paramValue,
                        description: `Parameter for ${currentPath}`
                    });
                    // Note: If array items need individual controls, this parsing needs to be deeper.
                    // The current setup treats the whole array as a single (stringified) value.
                } else if (typeof value === 'object' && value !== null) {
                    // Recursive call for nested objects
                    this.parseJsonToParameterDefinitions(value, currentPath, definitions);
                    // No definition is added for the object container itself, only its leaf properties.
                    continue; 
                } else {
                    // Primitive types (string, number, boolean, null)
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
        this.isLoadingDefaults = true;
        this.statusMessage = null;
        this.hasError = false;
        const newFormGroup = new FormGroup({});
        let newDefinitions: ParameterDefinition[] = [];

        this.planningService.getDefaults().subscribe({
            next: (defaults) => {
                console.log('loadDefaults: Raw defaults received from backend:', JSON.parse(JSON.stringify(defaults)));
                newDefinitions = this.parseJsonToParameterDefinitions(defaults);
                console.log('loadDefaults: Parsed parameter definitions:', newDefinitions);

                newDefinitions.forEach(paramDef => {
                    const control = new FormControl(paramDef.value, paramDef.required === 'Yes' ? Validators.required : null);
                    newFormGroup.addControl(paramDef.path, control);
                });
                console.log('loadDefaults: Controls added to new FormGroup:', newFormGroup.value);

                this.parameterFormGroup = newFormGroup;
                this.parameterDefinitions = newDefinitions;
                
                // Manually trigger change detection
                this.cdr.detectChanges(); // <--- ADDED THIS LINE

                console.log('loadDefaults: New FormGroup final value:', this.parameterFormGroup.value);

                this.statusMessage = 'Default parameters loaded successfully.';
                this.isLoadingDefaults = false;
                // It's possible the status message update also needs change detection if the previous cycle was problematic
                // this.cdr.detectChanges(); // Optionally, call again if status message doesn't appear
            },
            error: (err) => {
                console.error('Error loading default parameters:', err);
                this.parameterDefinitions = [];
                this.parameterFormGroup = new FormGroup({});
                this.isLoadingDefaults = false;
                this.statusMessage = 'Failed to load default parameters. See console for details.';
                this.hasError = true;
                this.cdr.detectChanges(); // Also detect changes on error
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
                    this.cdr.detectChanges(); // Update view with status
                },
                error: (err: any) => {
                    this.statusMessage = `Fehler beim Starten der Simulation: ${err.message || err}`;
                    this.hasError = true;
                    console.error(err);
                    this.cdr.detectChanges(); // Update view with status
                }
            });
    }

    public getFormControl(path: string): FormControl {
        // console.log(`getFormControl called for path: '${path}'`); // DEBUG LOG
        const control = this.parameterFormGroup.get(path) as FormControl;
        // if (!control) { // DEBUG LOG
        //     console.error(`Control NOT FOUND for path: '${path}' in FormGroup. Available paths:`, Object.keys(this.parameterFormGroup.controls));
        // }
        return control;
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