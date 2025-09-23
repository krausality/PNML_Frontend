import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// -----------------------------------------------------------------------------
// PlanningService: Backend Communication for Planning, Simulation, and Firing Sequences
// -----------------------------------------------------------------------------
// This service is responsible for all HTTP communication with backend endpoints
// related to planning, simulation, and retrieval of default parameters for Petri nets.
//
// Key Responsibilities:
// - Fetching default planning parameters from the backend for UI initialization.
// - Sending planning data to the backend and receiving computed plans or results.
// - Uploading PNML files for simulation and receiving the resulting firing sequence.
// - Centralized error handling for all HTTP requests to ensure robust error reporting.
//
// Design Decisions:
// - All backend URLs are constructed from environment variables for flexibility and environment separation.
// - All HTTP methods return Observables for reactive programming and easy integration with Angular components.
// - Error handling is centralized in handleError() for consistent user feedback and debugging.
// - No UI state is stored here; this service is strictly for backend communication.
//
// Data Flow for Simulated Firing Sequence:
// - The runSimpleSimulation(pnmlFile) method uploads a PNML file to the backend's simulation endpoint.
// - The backend processes the file and returns a simulation result, typically including a firing sequence
//   (an array of transition firings, possibly with timestamps or step indices).
// - The Observable returned by runSimpleSimulation emits the backend's response, which should be
//   subscribed to by a component or service (e.g., UiService or PetriNetComponent).
// - The subscribing component is responsible for interpreting the firing sequence, updating the UI,
//   and triggering any animations or state changes based on the simulation result.
// - The expected format of the firing sequence is backend-dependent, but usually consists of an array
//   of transition IDs or labels, possibly with additional metadata (e.g., marking after each firing).
// - If the backend returns an error or malformed data, handleError ensures a user-friendly error is emitted.
//
// Example Usage:
//   this.planningService.runSimpleSimulation(file).subscribe(result => {
//     // result.firingSequence contains the sequence of fired transitions
//     // result.markings contains the marking after each step (if provided)
//     // Pass result to UiService or directly to PetriNetComponent for animation
//   });
//
// Maintenance Notes:
// - If the backend API changes (e.g., new endpoints, changed response format), update the relevant URLs
//   and adjust the expected result processing in subscribing components.
// - Always use catchError for all HTTP calls to avoid unhandled errors.
// - If new simulation or planning endpoints are added, follow the same pattern for Observables and error handling.
// - Document the expected backend response format for each method, especially for simulation results.
// -----------------------------------------------------------------------------

@Injectable({
    providedIn: 'root'
})
export class PlanningService {
    private apiUrl = `${environment.backendApiUrl}/dto/planning`;
    private simpleSimApiUrl = `${environment.backendApiUrl}/simulation-petri-nets/simple-sim`; // Added for the new endpoint

    constructor(private http: HttpClient) { }

    /**
     * Fetches default planning parameters from the backend.
     * 
     * This method sends a GET request to the backend to retrieve the default
     * parameters used in the planning process. It is typically called on
     * application startup to initialize planning settings.
     * 
     * @returns An Observable containing the default parameters.
     */
    getDefaults(): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/defaults`)
            .pipe(catchError(this.handleError));
    }

    /**
     * Sends planning data to the backend and returns the result.
     * 
     * This method is used to submit planning data to the backend for processing.
     * It sends a POST request with the planning data and returns the response
     * from the server, which typically includes the results of the planning
     * operation.
     * 
     * @param planningData The data to be sent to the backend for planning.
     * @returns An Observable containing the result of the planning operation.
     */
    runPlanning(planningData: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, planningData)
            .pipe(catchError(this.handleError));
    }

    /**
     * 
     * Uploads a PNML file for simulation and returns the result.
     * 
     * This method is used to upload a PNML (Petri Net Markup Language) file to
     * the backend for simulation purposes. It sends a POST request with the
     * PNML file and returns the simulation results from the server.
     * 
     * @param pnmlFile The PNML file to be uploaded for simulation.
     * @param runs The number of simulation runs to execute (default: 1).
     * @returns An Observable containing the result of the simulation.
     */
    runSimpleSimulation(pnmlFile: File, runs: number = 1): Observable<any> {
        const formData = new FormData();
        formData.append('pnml_model', pnmlFile, pnmlFile.name);
        formData.append('num_runs', runs.toString());

        // Wichtig: Setzen Sie den Content-Type Header NICHT manuell.
        // Der Browser erledigt das korrekt für multipart/form-data, wenn ein FormData-Objekt übergeben wird.
        return this.http.post<any>(this.simpleSimApiUrl, formData)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Runs simulation using PNML content string instead of uploading a file.
     * This is useful when working with the already loaded PNML in the application.
     * 
     * @param pnmlContent The PNML XML content as string.
     * @param runs The number of simulation runs to execute (default: 1).
     * @param fileName Optional filename for reference (default: 'current_model.pnml').
     * @returns An Observable containing the result of the simulation.
     */
    runSimpleSimulationFromString(pnmlContent: string, runs: number = 1, fileName: string = 'current_model.pnml'): Observable<any> {
        const formData = new FormData();
        
        // Convert string to File object
        const pnmlFile = new File([pnmlContent], fileName, { type: 'application/xml' });
        formData.append('pnml_model', pnmlFile, fileName);
        formData.append('num_runs', runs.toString());

        return this.http.post<any>(this.simpleSimApiUrl, formData)
            .pipe(
                catchError(this.handleError)
            );
    }

    /**
     * Fetches the list of available example PNML models from the backend.
     * @returns An Observable emitting an array of model filenames (e.g. ["pdc2023_000000.pnml", ...])
     */
    getAvailableExampleModels(): Observable<string[]> {
        const url = `${environment.backendApiUrl}/simulation-petri-nets/example-models`;
        return this.http.get<string[]>(url).pipe(catchError(this.handleError));
    }

    /**
     * Loads the content of a specific example PNML model by name from the backend.
     * @param name The filename of the model to load (e.g. "pdc2023_000000.pnml")
     * @returns An Observable emitting the PNML XML content as a string
     */
    loadExampleModelByName(name: string): Observable<string> {
        const url = `${environment.backendApiUrl}/simulation-petri-nets/example-models/${encodeURIComponent(name)}`;
        return this.http.get(url, { responseType: 'text' }).pipe(catchError(this.handleError));
    }

    /**
     * Centralized error handling for HTTP requests.
     * 
     * This private method handles errors from HTTP requests. It distinguishes
     * between client-side/network errors and server-side errors, and formats
     * the error message accordingly. The formatted error message is logged to
     * the console, and an observable error is thrown.
     * 
     * @param error The error response from the HTTP request.
     * @returns An observable error with a user-friendly error message.
     */
    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Unbekannter Fehler!';
        if (error.error instanceof ErrorEvent) {
            // Client-seitiger oder Netzwerkfehler
            errorMessage = `Fehler: ${error.error.message}`;
        } else {
            // Backend hat einen Fehlercode zurückgegeben
            errorMessage = `Serverfehler: Code ${error.status}, Nachricht: ${error.message}`;
            if (error.error && typeof error.error === 'object') {
                errorMessage += ` Details: ${JSON.stringify(error.error)}`;
            }
        }
        console.error(errorMessage);
        return throwError(() => new Error(errorMessage));
    }
}
