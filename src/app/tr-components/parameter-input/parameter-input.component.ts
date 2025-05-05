import { Component, OnInit } from '@angular/core';
import { FormControl, Validators, ReactiveFormsModule } from '@angular/forms'; // Import ReactiveFormsModule
import { PlanningService } from '../../tr-services/planning.service';
import { finalize } from 'rxjs/operators';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { TextFieldModule } from '@angular/cdk/text-field'; // Import TextFieldModule

// Helper for JSON validation
function jsonValidator(control: FormControl): { [key: string]: any } | null {
    try {
        if (control.value && control.value.trim() !== '') { // Check if not empty before parsing
             JSON.parse(control.value);
        }
        return null; // Valid JSON or empty
    } catch (e) {
        return { jsonInvalid: true }; // Invalid JSON
    }
}

// Helper function to replace null values recursively
function replaceNullWithDefaults(obj: any): any {
    if (obj === null) {
        // Decide default based on context if possible, otherwise use generic defaults
        // This part might need refinement based on specific field requirements
        return ''; // Defaulting null to empty string might work for some fields
                   // but might need adjustment (e.g., [] for arrays, 0 for numbers)
                   // Let's refine based on the error messages
    }

    if (Array.isArray(obj)) {
        return obj.map(item => replaceNullWithDefaults(item));
    }

    if (typeof obj === 'object' && obj !== null) {
        const newObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                if (value === null) {
                    // Replace null based on known problematic keys from the error
                    switch (key) {
                        case 'description':
                        case 'historical_data_start':
                        case 'historical_data_end':
                            newObj[key] = ''; // Replace null strings with empty string
                            break;
                        case 'required_skills':
                        case 'skills':
                        case 'work_rulesets':
                        case 'personnel':
                            newObj[key] = []; // Replace null arrays with empty array
                            break;
                        case 'depth_limit':
                        case 'random_seed':
                            newObj[key] = 0; // Replace null integers with 0 (adjust if another default is better)
                            break;
                        default:
                            // Keep null if we don't have specific instructions,
                            // or choose a generic default like empty string
                            newObj[key] = ''; // Or keep as null: obj[key];
                            break;
                    }
                } else {
                    newObj[key] = replaceNullWithDefaults(value); // Recurse for nested objects/arrays
                }
            }
        }
        return newObj;
    }

    return obj; // Return primitives and non-null values as is
}

@Component({
    selector: 'app-parameter-input',
    templateUrl: './parameter-input.component.html',
    styleUrls: ['./parameter-input.component.css'],
     // --- Add imports for standalone component if needed ---
    standalone: true, // Mark as standalone
    imports: [ // Import necessary modules here
        CommonModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        TextFieldModule // For cdkTextareaAutosize
    ]
    // --- End standalone imports ---
})
export class ParameterInputComponent implements OnInit {
    parameterControl = new FormControl('', [Validators.required, jsonValidator]);
    isLoadingDefaults = false;
    isLoadingSimulation = false;
    statusMessage: string | null = null;
    hasError: boolean = false;

    constructor(private planningService: PlanningService) { }

    ngOnInit(): void {
         // Optional: Load defaults on init?
         // this.loadDefaults();
    }

    loadDefaults(): void {
        this.isLoadingDefaults = true;
        this.statusMessage = null;
        this.hasError = false;
        this.planningService.getDefaults()
            .pipe(finalize(() => this.isLoadingDefaults = false))
            .subscribe({
                next: (defaults) => {
                    this.parameterControl.setValue(JSON.stringify(defaults, null, 2)); // Pretty print
                    this.statusMessage = 'Defaults geladen.';
                    this.parameterControl.markAsPristine(); // Reset validation state after loading
                    this.parameterControl.updateValueAndValidity();
                },
                error: (err) => {
                    this.statusMessage = `Fehler beim Laden der Defaults: ${err.message || err}`;
                    this.hasError = true;
                    console.error(err);
                }
            });
    }

    runSimulation(): void {
        if (this.parameterControl.invalid) {
            this.statusMessage = "Bitte korrigieren Sie das ungültige JSON oder laden Sie die Defaults.";
            this.hasError = true;
            // Force validation message display if touched
            this.parameterControl.markAsTouched();
            return;
        }

        this.isLoadingSimulation = true;
        this.statusMessage = null;
        this.hasError = false;
        let planningData;
        try {
             planningData = JSON.parse(this.parameterControl.value || '{}');
        } catch(e) {
             this.statusMessage = "Fehler beim Parsen des JSON.";
             this.hasError = true;
             this.isLoadingSimulation = false;
             return;
        }

        // *** WORKAROUND: Replace null values before sending ***
        const cleanedPlanningData = replaceNullWithDefaults(planningData);
        console.log("Cleaned planning data:", cleanedPlanningData); // Log the data being sent

        // Use the cleaned data for the API call
        this.planningService.runPlanning(cleanedPlanningData)
            .pipe(finalize(() => this.isLoadingSimulation = false))
            .subscribe({
                next: (response) => {
                    console.log('Simulation Response:', response);
                    // Check if response is an object and has status/message
                    if (response && typeof response === 'object') {
                        this.statusMessage = `Simulation gestartet/beendet: ${response.message || response.status || 'Keine detaillierte Meldung.'}`;
                        // Determine error based on a potential 'status' field or lack thereof
                        this.hasError = !(response.status && response.status.toUpperCase() === 'SUCCESS');
                    } else {
                        // Handle non-standard responses
                        this.statusMessage = `Simulation abgeschlossen. Antwort: ${JSON.stringify(response)}`;
                        this.hasError = false; // Assume success if no error structure is present
                    }
                    // Hier könnten Ergebnisse verarbeitet werden, z.B. Aktualisierung der Visualisierung
                    // if (response.results && response.results.petriNetUpdate) { ... }
                },
                error: (err) => {
                    this.statusMessage = `Fehler beim Starten der Simulation: ${err.message || err}`;
                    this.hasError = true;
                    console.error(err);
                }
            });
    }
}
