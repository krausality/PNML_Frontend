import { Component, OnInit } from '@angular/core';
import { FormControl, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms'; // Import ReactiveFormsModule and FormsModule
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

@Component({
    selector: 'app-parameter-input',
    templateUrl: './parameter-input.component.html',
    styleUrls: ['./parameter-input.component.css'],
     // --- Add imports for standalone component if needed ---
    standalone: true, // Mark as standalone
    imports: [ // Import necessary modules here
        CommonModule,
        ReactiveFormsModule,
        FormsModule, // <-- Add FormsModule here
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

    parametersText = `{
  "parameter_name": "string",
  "another_param": 42,
  "a_boolean_flag": true
}`;

    constructor(private planningService: PlanningService) { }

    // Basic placeholder for loading defaults
    loadDefaults(): void {
        this.isLoadingDefaults = true;
        this.statusMessage = null;
        this.hasError = false;
        this.planningService.getDefaults().subscribe({
            next: (defaults) => {
                // Simpler: just display what the backend sent, assuming it's valid JSON.
                this.parameterControl.setValue(JSON.stringify(defaults, null, 2));

                this.isLoadingDefaults = false;
                this.statusMessage = 'Default parameters loaded successfully.';
                this.hasError = false;
            },
            error: (err) => {
                console.error('Error loading default parameters:', err);
                this.parameterControl.setValue('// Failed to load default parameters.\\n// Check console for errors.');
                this.isLoadingDefaults = false;
                this.statusMessage = 'Failed to load default parameters. See console for details.';
                this.hasError = true;
            }
        });
    }

    ngOnInit(): void {
         // Optional: Load defaults on init?
         // this.loadDefaults();
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

        // Use the original planningData for the API call
        this.planningService.runPlanning(planningData)
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

    getRawParameters(): string {
      return this.parameterControl.value || '';
    }
}
