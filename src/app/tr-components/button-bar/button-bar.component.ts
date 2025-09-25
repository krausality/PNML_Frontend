import { Component, OnDestroy, OnInit } from '@angular/core';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { PnmlService } from 'src/app/tr-services/pnml.service';
import { UiService } from 'src/app/tr-services/ui.service';
import { ExportImageService } from 'src/app/tr-services/export-image.service';
import { ExportSvgService } from 'src/app/tr-services/export-svg.service';
import { MatDialog } from '@angular/material/dialog';
import { ManageActionsPopupComponent } from '../manage-actions-popup/manage-actions-popup.component';
import { TokenGameService } from 'src/app/tr-services/token-game.service';
import {
    ButtonState,
    CodeEditorFormat,
    TabState,
} from 'src/app/tr-enums/ui-state';
import { ClearPopupComponent } from '../clear-popup/clear-popup.component';
import { DataService } from '../../tr-services/data.service';
import { PlaceInvariantsService } from 'src/app/tr-services/place-invariants.service';
import { PlaceInvariantsTableComponent } from '../place-invariants-table/place-invariants-table.component';
import { LayoutSpringEmbedderService } from 'src/app/tr-services/layout-spring-embedder.service';
import { LayoutSugiyamaService } from 'src/app/tr-services/layout-sugiyama.service';
import { MatTab } from '@angular/material/tabs';

import { showTooltipDelay } from 'src/app/tr-services/position.constants';
import { HelpPopupComponent } from '../help-popup/help-popup.component';
import { ErrorPopupComponent } from '../error-popup/error-popup.component'; // Import ErrorPopupComponent
import { PlanningService } from '../../tr-services/planning.service'; // Import PlanningService
import { Observable, Subscription } from 'rxjs';

@Component({
    selector: 'app-button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.css'],
})
/**
 * Primary top-level control surface for the Petri net application.
 *
 * The button bar orchestrates high-level interactions across tabs (Build, Simulation,
 * Analyze, etc.) and acts as the composition root for cross-cutting services. It exposes
 * commands for editing, simulation, export, layout, and analysis features, while keeping
 * stateful coordination (such as tab selection, simulation triggers, and background tasks)
 * centralized in one component for easier maintenance.
 */
export class ButtonBarComponent implements OnInit, OnDestroy {
    /** Enum shortcuts for template readability (avoid fully qualified access). */
    readonly TabState = TabState;
    /** Enum shortcut for button tool states (used in template bindings). */
    readonly ButtonState = ButtonState;
    /** Enum shortcut that feeds code editor format toggle buttons. */
    readonly CodeEditorFormat = CodeEditorFormat;

    /** Standardized Material tooltip delay shared across icon buttons. */
    readonly showTooltipDelay = showTooltipDelay;

    /** Optional inline CSS overrides that can be injected from host contexts. */
    public petrinetCss: string = '';
    /** Lazy-loaded collection of example PNML models provided by the backend. */
    public availableModels$: Observable<string[]> | undefined;
    /** Loading guard for example models dropdown; prevents redundant requests/UI flicker. */
    public isLoadingModels = false;
    /** Default number of runs for multi-run simulation workflows. */
    public numberOfSimulations: number = 10;
    /** Signals when multi-run simulations are in progress to disable UI appropriately. */
    public isMultiRunInProgress = false;
    /** Tracks whether we have results to offer for download in the Simulation tab. */
    public hasMultiRunResults = false;
    /** Aggregates subscription for multi-run results stream. */
    private resultsSubscription: Subscription | undefined;
    /** Watches model mutations so we can lazily refresh simulation data. */
    private dataChangedSubscription: Subscription | undefined;
    /** Manages the lifecycle of the pending automatic simulation observable. */
    private autoSimulationSubscription: Subscription | undefined;
    /** Ensures only one auto-simulation runs at a time, preventing duplicate backend calls. */
    private isAutoSimulationInProgress = false;
    /** Dirty bit indicating the Build/Code tabs modified the net since last simulation. */
    private netDirty = true;

    /**
     * Constructor wires together all collaborating services. While a long argument list may
     * appear intimidating, each dependency corresponds to a feature group surfaced directly
     * in the button bar (export, layouting, simulation, dialogs, etc.). Keeping the wiring in
     * one place reduces indirection and eases reasoning about cross-service interactions.
     */
    constructor(
        protected uiService: UiService,
        protected exportJsonDataService: ExportJsonDataService,
        protected pnmlService: PnmlService,
        protected exportImageService: ExportImageService,
        protected exportSvgService: ExportSvgService,
        protected tokenGameService: TokenGameService,
        private dataService: DataService,
        private matDialog: MatDialog,
        protected placeInvariantsService: PlaceInvariantsService,
        private layoutSpringEmebdderService: LayoutSpringEmbedderService,
        private layoutSugiyamaService: LayoutSugiyamaService,
        private planningService: PlanningService
    ) {}

    /**
     * Initializes asynchronous data sources and subscriptions that power the button bar.
     *
     * Responsibilities:
     *  - Kick off loading of example models so the Simulation tab menu is ready when opened.
     *  - Track availability of multi-run results for enabling/disabling download buttons.
     *  - Observe Petri net edits in Build/Code tabs to mark simulation results as stale.
     */
    ngOnInit(): void {
        this.isLoadingModels = true;
        this.availableModels$ = this.planningService.getAvailableExampleModels();
        this.availableModels$.subscribe({
            next: () => { this.isLoadingModels = false; },
            error: () => { this.isLoadingModels = false; }
        });

        this.resultsSubscription = this.uiService.simulationResultsMultiRun$.subscribe(results => {
            this.hasMultiRunResults = !!results; // true wenn results nicht null/undefined, sonst false
        });

        this.dataChangedSubscription = this.dataService.dataChanged$.subscribe(() => {
            if ([this.TabState.Build, this.TabState.Code].includes(this.uiService.tab)) {
                this.netDirty = true;
            }
        });
    }

    /**
     * Lifecycle clean-up to prevent memory leaks when the component is destroyed, such as during
     * module teardown or embedded reuse. Always guard unsubscribes because Angular may call this
     * before `ngOnInit` completes in some edge cases.
     */
    ngOnDestroy(): void {
        if (this.resultsSubscription) {
            this.resultsSubscription.unsubscribe();
        }
        if (this.dataChangedSubscription) {
            this.dataChangedSubscription.unsubscribe();
        }
        if (this.autoSimulationSubscription) {
            this.autoSimulationSubscription.unsubscribe();
        }
    }

    /**
     * Central tab routing entry point invoked by Angular Material's tab change events.
     *
     * The method updates global UI state, triggers feature-specific side-effects (e.g. clearing
     * token history when returning to Build, resetting inequalities for Analyze, or lazily running
     * simulations), and ensures transient selections are cleared. The deliberate switch statement
     * keeps the control flow explicit and easy to extend when new tabs appear.
     */
    tabClicked(tab: string) {
        this.uiService.tabTransitioning = true;

        switch (tab.toLowerCase()) {
            case 'offshore':
                this.uiService.tab = this.TabState.Offshore;
                break;
            case 'build':
                this.uiService.tab = this.TabState.Build;
                this.tokenGameService.clearGameHistory();
                break;
            case 'simulation':
                this.uiService.tab = this.TabState.Simulation;
                this.ensureSimulationUpToDate();
                break;
            case 'save':
                this.uiService.tab = this.TabState.Save;
                break;
            case 'analyze':
                this.placeInvariantsService.reset();
                this.uiService.tab = this.TabState.Analyze;
                break;
            case 'code':
                this.uiService.tab = this.TabState.Code;
                this.uiService.codeEditorFormat$.next(
                    this.uiService.codeEditorFormat$.value,
                );
                break;
        }
        this.uiService.button = null;
        this.uiService.buttonState$.next(null);

        setTimeout(() => {
            this.uiService.tabTransitioning = false;
        }, 1100);
    }

    /**
     * Propagates tool-button selections to the shared UiService so other components stay in sync.
     * This keeps the active tool canonical even when the same control surface appears in multiple
     * views (e.g. overlays, dialogs). The separation also simplifies unit-testing downstream consumers.
     */
    buttonClicked(button: ButtonState) {
        this.uiService.button = button;
        this.uiService.buttonState$.next(button);
    }

    /** Opens the action management dialog for editing transition labels and shortcuts. */
    openActionDialog() {
        this.matDialog.open(ManageActionsPopupComponent);
    }

    /**
     * Ensures the Simulation tab reflects the latest Petri net model.
     *
     * Strategy:
     *  - Skip work if another refresh is running or the net is known to be up to date.
     *  - Clear simulation state when the net is empty/invalid to avoid stale displays.
     *  - Otherwise, serialize PNML and invoke the backend simple simulation endpoint.
     *  - Handle both success and failure paths, resetting the dirty bit in all cases so we do not
     *    hammer the backend unnecessarily.
     */
    private ensureSimulationUpToDate(): void {
        if (!this.netDirty || this.isAutoSimulationInProgress) {
            return;
        }

        if (this.dataService.isEmpty()) {
            this.uiService.simulationResults$.next(null);
            this.uiService.resetSimulationSteps();
            this.netDirty = false;
            return;
        }

        const pnmlContent = this.pnmlService.getPNML();
        if (!pnmlContent || !pnmlContent.trim()) {
            this.uiService.simulationResults$.next(null);
            this.uiService.resetSimulationSteps();
            this.netDirty = false;
            return;
        }

        this.isAutoSimulationInProgress = true;
        if (this.autoSimulationSubscription) {
            this.autoSimulationSubscription.unsubscribe();
        }

        this.autoSimulationSubscription = this.planningService
            .runSimpleSimulationFromString(pnmlContent, 1, 'current_model.pnml')
            .subscribe({
                next: (results) => {
                    if (results && results.results) {
                        this.uiService.simulationResults$.next(results.results);
                        this.netDirty = false;
                    } else {
                        this.matDialog.open(ErrorPopupComponent, {
                            data: { error: 'Simulation API call successful, but "results" property is missing.' },
                        });
                        this.netDirty = false;
                    }
                    this.isAutoSimulationInProgress = false;
                },
                error: (err) => {
                    console.error('Automatic simulation failed:', err);
                    this.matDialog.open(ErrorPopupComponent, {
                        data: { error: 'Simulation API call failed. Check console for errors.' },
                    });
                    this.netDirty = false;
                    this.isAutoSimulationInProgress = false;
                },
            });
    }

    /** Displays a confirmation dialog that clears the entire Petri net. */
    openClearDialog() {
        this.matDialog.open(ClearPopupComponent);
    }

    /** Presents contextual help based on the currently active tab. */
    openHelpDialog() {
        this.matDialog.open(HelpPopupComponent);
    }

    /** Convenience wrapper for surfacing recoverable errors to the user. */
    openErrorDialog(errorMessage: string) {
        this.matDialog.open(ErrorPopupComponent, {
            data: { message: errorMessage },
        });
    }

    /** Opens the place invariants table in a large dialog for analysis workflows. */
    openPlaceInvariantsTable() {
        this.matDialog.open(PlaceInvariantsTableComponent, {
            width: '80vw',
            height: '80vh',
            panelClass: 'no-padding-dialog', // Optional: if you need custom styling for the dialog panel
        });
    }

    // --- Simulation and Animation Controls ---

    /**
     * Triggers a request to run the simulation via UiService.
     * ParameterInputComponent listens to this request.
     */
    public startSimulation(): void {
        this.uiService.runSimulationRequest$.next();
    }

    /**
     * Starts or resumes the animation playback.
     */
    public play(): void {
        this.uiService.startAnimation();
    }

    /**
     * Pauses the animation playback.
     */
    public pause(): void {
        this.uiService.stopAnimation();
    }

    /**
     * Stops the animation playback and resets the timeline to the initial state.
     */
    public stop(): void {
        this.uiService.stopAnimation();
        this.uiService.setCurrentSimulationStep(0);
    }

    /**
     * Checks if the animation is currently playing.
     * @returns True if animation is running, false otherwise.
     */
    public get isPlaying(): boolean {
        return this.uiService.isAnimationRunning();
    }

    /**
     * Gets the current step/state index of the simulation timeline.
     * @returns The current 0-indexed simulation step.
     */
    public get currentStep(): number {
        return this.uiService.getCurrentSimulationStep();
    }

    /**
     * Gets the total number of steps/states in the simulation timeline.
     * @returns The total number of simulation states.
     */
    public get totalSteps(): number {
        return this.uiService.getTotalSimulationSteps();
    }

    // --- Layout Controls ---
    /**
     * Applies graph layout algorithms to improve readability of the current Petri net.
     * Additional algorithms can slot into the switch while reusing termination semantics.
     */
    applyLayout(layoutAlgorithm: string) {
        switch (layoutAlgorithm) {
            case 'spring-embedder':
                this.layoutSpringEmebdderService.layoutSpringEmbedder();
                break;
            case 'sugiyama':
                this.layoutSpringEmebdderService.terminate();
                this.layoutSugiyamaService.applySugiyamaLayout();
                break;
            default:
                this.layoutSpringEmebdderService.terminate();
                break;
        }
    }

    switchCodeEditorFormat(format: CodeEditorFormat) {
        // Only send a new value if it is not the same as the current value
        if (format === this.uiService.codeEditorFormat$.value) {
            return;
        }

        // Set the new format as next value in the BehaviorSubject
        this.uiService.codeEditorFormat$.next(format);
    }

    /**
     * Handles the file input change event for PNML uploads.
     * Reads the selected file and triggers parsing via PnmlService.
     * @param event The file input change event.
     */
    uploadPnmlFile(event: Event): void {
        console.log('ButtonBarComponent.uploadPnmlFile: Event triggered', event); // Log entry
        const input = event.target as HTMLInputElement;

        if (!input.files || input.files.length === 0) {
            console.warn('ButtonBarComponent.uploadPnmlFile: No files selected.');
            return;
        }

        const file = input.files[0];
        console.log('ButtonBarComponent.uploadPnmlFile: File selected:', file.name, file.type, file.size); // Log file info

        // Optional: Check file type although 'accept' attribute helps
        if (!file.name.toLowerCase().endsWith('.pnml')) {
            console.error('ButtonBarComponent.uploadPnmlFile: Invalid file type selected.');
            this.matDialog.open(ErrorPopupComponent, {
                data: {
                    error: 'Invalid file type. Please select a .pnml file.',
                },
            });
            input.value = ''; // Reset file input
            return;
        }

        const reader = new FileReader();
        console.log('ButtonBarComponent.uploadPnmlFile: FileReader created.'); // Log reader creation

        reader.onload = (e) => {
            console.log('ButtonBarComponent.uploadPnmlFile: FileReader onload triggered.');
            try {
                const pnmlContent = e.target?.result as string;
                if (pnmlContent) {
                    console.log('ButtonBarComponent.uploadPnmlFile: File content read successfully.');
                    // Bestehende Logik zum Parsen und Anzeigen der PNML
                    // this.dataService.loadPetriNetFromPnml(pnmlContent); // ERROR: Method does not exist
                    this.pnmlService.parse(pnmlContent); // CORRECTED: Use PnmlService to parse and load
                    console.log('ButtonBarComponent.uploadPnmlFile: PNML content passed to pnmlService for parsing.');                    // Start simple simulation with 1 run for visualization
                    this.planningService.runSimpleSimulation(file, 1).subscribe({
                        next: (results) => {
                            if (results && results.results) {
                                console.log('ButtonBarComponent.uploadPnmlFile: Simulation results received, passing to UiService.', results.results);
                                this.uiService.simulationResults$.next(results.results);
                                this.netDirty = false;
                            } else {
                                console.warn('ButtonBarComponent.uploadPnmlFile: Simulation results received, but "results" property is missing or empty:', results);
                                this.matDialog.open(ErrorPopupComponent, {
                                    data: { error: 'Simulation API call successful, but "results" property is missing.' },
                                });
                                this.netDirty = false;
                            }
                        },
                        error: (err) => {
                            console.error('ButtonBarComponent.uploadPnmlFile: Simple simulation failed:', err);
                            this.matDialog.open(ErrorPopupComponent, {
                                data: { error: 'Simulation API call failed. Check console for errors.' },
                            });
                            this.netDirty = false;
                        }
                    });

                } else {
                    console.error('ButtonBarComponent.uploadPnmlFile: File content is null or undefined.');
                    this.matDialog.open(ErrorPopupComponent, {
                        data: { error: 'Failed to read file content.' },
                    });
                }
            } catch (error) {
                console.error('ButtonBarComponent.uploadPnmlFile: Error processing PNML file:', error);
                let errorMessage = 'Error processing PNML file.';
                if (error instanceof Error) {
                    errorMessage += ` Details: ${error.message}`;
                }
                this.matDialog.open(ErrorPopupComponent, {
                    data: { error: errorMessage },
                });
            } finally {
                // Reset file input to allow uploading the same file again if needed
                input.value = '';
            }
        };

        reader.onerror = (e) => {
            console.error('ButtonBarComponent.uploadPnmlFile: FileReader onerror triggered:', reader.error); // Log reader error
            this.matDialog.open(ErrorPopupComponent, {
                data: { error: `Error reading file: ${reader.error?.message}` },
            });
            input.value = ''; // Reset file input
        };

        console.log('ButtonBarComponent.uploadPnmlFile: Calling reader.readAsText...'); // Log before readAsText
        reader.readAsText(file);
    }

    onLoadExampleModel(name: string): void {
        this.isLoadingModels = true;
        this.planningService.loadExampleModelByName(name).subscribe({
            next: (pnmlContent: string) => {
                try {
                    this.pnmlService.parse(pnmlContent);
                    // Simulations-API analog zu uploadPnmlFile aufrufen                    // String zu File konvertieren (Workaround, falls API File erwartet)
                    const pnmlFile = new File([pnmlContent], name, { type: 'application/xml' });
                    this.planningService.runSimpleSimulation(pnmlFile, 1).subscribe({
                        next: (results) => {
                            if (results && results.results) {
                                this.uiService.simulationResults$.next(results.results);
                                this.netDirty = false;
                            } else {
                                this.matDialog.open(ErrorPopupComponent, {
                                    data: { error: 'Simulation API call successful, but "results" property is missing.' },
                                });
                                this.netDirty = false;
                            }
                        },
                        error: (err) => {
                            this.matDialog.open(ErrorPopupComponent, {
                                data: { error: 'Simulation API call failed. Check console for errors.' },
                            });
                            this.netDirty = false;
                        }
                    });
                } catch (e) {
                    this.openErrorDialog('Fehler beim Parsen des Beispielmodells.');
                }
                this.isLoadingModels = false;
            },
            error: (err) => {
                this.openErrorDialog('Fehler beim Laden des Beispielmodells.');                this.isLoadingModels = false;
            }
        });
    }    /**
     * Handles multi-run simulation for data analysis using the currently loaded PNML.
     * Runs multiple simulations and downloads the results as a JSON file.
     * 
     * TODO: WORKAROUND - Backend doesn't support multiple runs natively yet.
     * This implementation uses a loop to call single simulation endpoint multiple times.
     * Replace with native backend multiple runs support when available.
     */
    runAndStoreMultiSimulation(): void {
        console.log('ButtonBarComponent.runAndStoreMultiSimulation: Running multi-simulation with', this.numberOfSimulations, 'runs');

        // Check if there's a PNML loaded in the application
        if (this.dataService.isEmpty()) {
            console.warn('ButtonBarComponent.runAndStoreMultiSimulation: No Petri net loaded.');
            this.matDialog.open(ErrorPopupComponent, {
                data: {
                    error: 'No Petri net loaded. Please load a PNML first in the Build tab.',
                },
            });
            return;
        }

        // Get current PNML as string from PnmlService
        const currentPnmlContent = this.pnmlService.getPNML();
        
        if (!currentPnmlContent) {
            console.error('ButtonBarComponent.runAndStoreMultiSimulation: Failed to get current PNML content.');
            this.matDialog.open(ErrorPopupComponent, {
                data: {
                    error: 'Failed to get current PNML content.',
                },
            });
            return;
        }

        this.isMultiRunInProgress = true;
        this.uiService.setMultiRunResults(null); // Clear previous results

        // TODO: WORKAROUND - Execute multiple single runs since backend doesn't support batch runs yet
        this.executeMultipleSimulationRuns(currentPnmlContent);
    }    /**
     * TODO: WORKAROUND - Execute multiple single simulation runs sequentially
     * This is a temporary solution until the backend supports native batch simulation.
     * 
     * @param pnmlContent The PNML content to simulate
     */
    private executeMultipleSimulationRuns(pnmlContent: string): void {
        const allResults: any[] = [];
        let completedRuns = 0;
        let hasError = false;

        console.log(`ButtonBarComponent.executeMultipleSimulationRuns: Starting ${this.numberOfSimulations} sequential simulation runs...`);

        // TODO: WORKAROUND - Sequential execution instead of parallel to avoid overwhelming the backend
        // Consider adding a small delay between runs if backend performance becomes an issue
        const executeNextRun = (runIndex: number) => {
            if (hasError || runIndex >= this.numberOfSimulations) {
                if (!hasError) {
                    // All runs completed successfully
                    console.log(`ButtonBarComponent.executeMultipleSimulationRuns: All ${this.numberOfSimulations} runs completed successfully`);
                    
                    // TODO: WORKAROUND - Format results to match expected multiple runs structure
                    const multiRunResults = {
                        total_runs: this.numberOfSimulations,
                        runs: allResults.map((result, index) => ({
                            run_id: index + 1,
                            firing_seq: result.results?.firing_seq || result.firing_seq,
                            detailed_log: result.results?.detailed_log || result.detailed_log,
                            // Include any other properties from the single run result
                            ...result.results || result
                        })),
                        metadata: {
                            timestamp: new Date().toISOString(),
                            pnml_filename: 'current_model.pnml',
                            backend_simulation_method: 'sequential_single_runs', // TODO: Change when backend supports batch
                        }
                    };
                    
                    // ... (rest of the result formatting)
                    
                    this.uiService.setMultiRunResults(multiRunResults);
                }
                this.isMultiRunInProgress = false; // Stop progress indicator
                return;
            }

            console.log(`ButtonBarComponent.executeMultipleSimulationRuns: Executing run ${runIndex + 1}/${this.numberOfSimulations}`);

            // TODO: WORKAROUND - Use single run endpoint with runs=1 instead of batch endpoint
            this.planningService.runSimpleSimulationFromString(pnmlContent, 1, `current_model_run${runIndex + 1}.pnml`).subscribe({
                next: (result) => {
                    console.log(`ButtonBarComponent.executeMultipleSimulationRuns: Run ${runIndex + 1} completed successfully`);
                    allResults.push(result);
                    completedRuns++;
                    
                    // Execute next run after a small delay to be gentle on the backend
                    // TODO: WORKAROUND - Add delay to prevent backend overload, remove when batch support is available
                    setTimeout(() => executeNextRun(runIndex + 1), 100);
                },
                error: (err) => {
                    hasError = true;
                    console.error(`ButtonBarComponent.executeMultipleSimulationRuns: Run ${runIndex + 1} failed:`, err);
                    this.matDialog.open(ErrorPopupComponent, {
                        data: { 
                            error: `Multi-run simulation failed at run ${runIndex + 1}/${this.numberOfSimulations}. ${completedRuns} runs completed successfully. Error: ${err.message || err}` 
                        },
                    });
                    this.isMultiRunInProgress = false; // Stop progress indicator on error
                }
            });
        };

        // Start the first run
        executeNextRun(0);
    }

    /**
     * Downloads the results of the last multi-run simulation.
     */
    public downloadResults(): void {
        const results = this.uiService.getMultiRunResults();
        if (results) {
            this.downloadSimulationResults(results, 'current_model.pnml');
        } else {
            this.openErrorDialog('No simulation results available to download. Please run a simulation first.');
        }
    }

    /**
     * Downloads simulation results as a JSON file.
     * @param results The simulation results from the backend.
     * @param originalFileName The original PNML filename for reference.
     */    private downloadSimulationResults(results: any, originalFileName: string): void {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const baseFileName = originalFileName.replace('.pnml', '');
        const fileName = `simulation-results_${baseFileName}_${this.numberOfSimulations}runs_${timestamp}.json`;
        
        // TODO: WORKAROUND - Handle both single run and our custom multi-run format
        // When backend supports native multiple runs, this can be simplified
        console.log('ButtonBarComponent.downloadSimulationResults: Downloading results for', this.numberOfSimulations, 'runs');
        console.log('ButtonBarComponent.downloadSimulationResults: Results structure:', results);
        
        const dataStr = JSON.stringify(results, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = fileName;
        link.click();
        
        // Clean up
        URL.revokeObjectURL(link.href);
        console.log('ButtonBarComponent.downloadSimulationResults: File downloaded:', fileName);
    }
}
