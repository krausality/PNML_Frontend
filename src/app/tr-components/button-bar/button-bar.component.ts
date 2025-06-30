import { Component, OnInit } from '@angular/core';
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
import { Observable } from 'rxjs';

@Component({
    selector: 'app-button-bar',
    templateUrl: './button-bar.component.html',
    styleUrls: ['./button-bar.component.css'],
})
export class ButtonBarComponent implements OnInit {
    readonly TabState = TabState;
    readonly ButtonState = ButtonState;
    readonly CodeEditorFormat = CodeEditorFormat;

    readonly showTooltipDelay = showTooltipDelay;

    public petrinetCss: string = '';

    public availableModels$: Observable<string[]> | undefined;
    public isLoadingModels = false;

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
        private planningService: PlanningService // Inject PlanningService
    ) {}

    ngOnInit(): void {
        this.isLoadingModels = true;
        this.availableModels$ = this.planningService.getAvailableExampleModels();
        this.availableModels$.subscribe({
            next: () => { this.isLoadingModels = false; },
            error: () => { this.isLoadingModels = false; }
        });
    }

    // Gets called when a tab is clicked
    // Sets the "tab" property in the uiService
    // Empties the "button" property in the uiService
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
            case 'play':
                this.uiService.tab = this.TabState.Play;
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

    // Gets called when a button is clicked that needs its state saved globally
    // Sets the "button" property in the uiService
    buttonClicked(button: ButtonState) {
        this.uiService.button = button;
        this.uiService.buttonState$.next(button);
    }

    openActionDialog() {
        this.matDialog.open(ManageActionsPopupComponent);
    }

    openClearDialog() {
        this.matDialog.open(ClearPopupComponent);
    }

    openHelpDialog() {
        this.matDialog.open(HelpPopupComponent);
    }

    openErrorDialog(errorMessage: string) {
        // Method to open the error dialog
        this.matDialog.open(ErrorPopupComponent, {
            data: { message: errorMessage },
        });
    }

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
                    console.log('ButtonBarComponent.uploadPnmlFile: PNML content passed to pnmlService for parsing.');

                    // Start simple simulation
                    this.planningService.runSimpleSimulation(file).subscribe({
                        next: (results) => {
                            if (results && results.results) {
                                console.log('ButtonBarComponent.uploadPnmlFile: Simulation results received, passing to UiService.', results.results);
                                this.uiService.simulationResults$.next(results.results);
                            } else {
                                console.warn('ButtonBarComponent.uploadPnmlFile: Simulation results received, but "results" property is missing or empty:', results);
                                this.matDialog.open(ErrorPopupComponent, {
                                    data: { error: 'Simulation API call successful, but "results" property is missing.' },
                                });
                            }
                        },
                        error: (err) => {
                            console.error('ButtonBarComponent.uploadPnmlFile: Simple simulation failed:', err);
                            this.matDialog.open(ErrorPopupComponent, {
                                data: { error: 'Simulation API call failed. Check console for errors.' },
                            });
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
                    // Simulations-API analog zu uploadPnmlFile aufrufen
                    // String zu File konvertieren (Workaround, falls API File erwartet)
                    const pnmlFile = new File([pnmlContent], name, { type: 'application/xml' });
                    this.planningService.runSimpleSimulation(pnmlFile).subscribe({
                        next: (results) => {
                            if (results && results.results) {
                                this.uiService.simulationResults$.next(results.results);
                            } else {
                                this.matDialog.open(ErrorPopupComponent, {
                                    data: { error: 'Simulation API call successful, but "results" property is missing.' },
                                });
                            }
                        },
                        error: (err) => {
                            this.matDialog.open(ErrorPopupComponent, {
                                data: { error: 'Simulation API call failed. Check console for errors.' },
                            });
                        }
                    });
                } catch (e) {
                    this.openErrorDialog('Fehler beim Parsen des Beispielmodells.');
                }
                this.isLoadingModels = false;
            },
            error: (err) => {
                this.openErrorDialog('Fehler beim Laden des Beispielmodells.');
                this.isLoadingModels = false;
            }
        });
    }
}
