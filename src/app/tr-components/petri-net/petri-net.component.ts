import { HttpClient } from '@angular/common/http';
import {
    Component,
    Input,
    OnDestroy,
    OnInit,
    ViewChild, 
    ElementRef, 
    AfterViewInit, 
} from '@angular/core';
import { ParserService } from 'src/app/tr-services/parser.service';
import { take, Subscription } from 'rxjs'; // Ensure 'Subscription' is imported
import { FileReaderService } from '../../services/file-reader.service';
import { DataService } from '../../tr-services/data.service';

import {
    anchorRadius,
    placeIdYOffset,
    radius,
    transitionHeight,
    transitionIdYOffset,
    transitionWidth,
    transitionXOffset,
    transitionYOffset,
    transSilentWidth,
    transSilentXOffset,
    lineSeparator,
    showTooltipDelay,
} from '../../tr-services/position.constants';

import { PnmlService } from '../../tr-services/pnml.service';
import { ExportJsonDataService } from 'src/app/tr-services/export-json-data.service';
import { UiService } from 'src/app/tr-services/ui.service';
import { Place } from 'src/app/tr-classes/petri-net/place';
import { Point } from 'src/app/tr-classes/petri-net/point';
import { Transition } from 'src/app/tr-classes/petri-net/transition';
import { Arc } from 'src/app/tr-classes/petri-net/arc';
import { EditMoveElementsService } from 'src/app/tr-services/edit-move-elements.service';
import {
    ButtonState,
    CodeEditorFormat,
    TabState,
} from 'src/app/tr-enums/ui-state';
import { TokenGameService } from 'src/app/tr-services/token-game.service';
import { MatDialog } from '@angular/material/dialog';
import { SetActionPopupComponent } from '../set-action-popup/set-action-popup.component';
import { Node } from 'src/app/tr-interfaces/petri-net/node';
import { MouseConstants } from '../../tr-enums/mouse-constants';
import { ZoomService } from '../../tr-services/zoom.service';
import { SvgCoordinatesService } from 'src/app/tr-services/svg-coordinates-service';
import { PlaceInvariantsService } from 'src/app/tr-services/place-invariants.service';
import { PlaceInvariantsTableComponent } from '../place-invariants-table/place-invariants-table.component';
import { DummyArc } from 'src/app/tr-classes/petri-net/dummyArc';
import { ErrorPopupComponent } from '../error-popup/error-popup.component';
import { validateJsonAgainstSchema } from 'src/app/tr-utils/json.utils';
import { LayoutSugiyamaService } from '../../tr-services/layout-sugiyama.service';
import { TransitionFiringInfoPopupComponent } from '../transition-firing-info-popup/transition-firing-info-popup.component';

@Component({
    selector: 'app-petri-net',
    templateUrl: './petri-net.component.html',
    styleUrls: ['./petri-net.component.css'],
})
export class PetriNetComponent implements OnInit, OnDestroy, AfterViewInit {
    @Input() buttonState: ButtonState | undefined;

    lastNode: Node | null = null;
    nextNode: Node | null = null;
    addElement: boolean = true;

    public anchorRadius = anchorRadius;
    public lineSeparator = lineSeparator;
    public showTooltipDelay = showTooltipDelay;

    @ViewChild('drawingArea') drawingArea!: ElementRef<SVGElement>;
    simulationFiringSeq: any | null = null;
    simulationDetailedLog: any | null = null;
    currentSimulationStep: number = 0; // Note: This local variable might be redundant if UiService is the source of truth
    isSimulating: boolean = false;

    private animationPlaces: Place[] = [];
    private animationTransitions: Transition[] = [];
    private animationArcs: Arc[] = [];
    private initialMarkings: Map<string, number> = new Map();
    private currentStepBeingDisplayed: number = -1;
    
    // MODIFIED: Removed hardcoded ANIMATION_DELAY, added BASE_ANIMATION_DELAY_MS
    private animationTimer: any = null;
    private readonly BASE_ANIMATION_DELAY_MS = 1000; // Base delay for 1x speed

    private _subs: Subscription[] = [];
    private viewInitialized = false;
    public isFrequencyAnalysisActive = false;
    private frequencySubscription: Subscription | undefined;

    // ADDED: Subscription for speed changes and previous speed tracking
    private speedSubscription: Subscription | undefined;
    private previousSpeedMultiplier: number = 1; // Initialize with a non-zero value, ideally from UiService on init

    constructor(
        private parserService: ParserService,
        private httpClient: HttpClient,
        private fileReaderService: FileReaderService,
        protected dataService: DataService,
        protected exportJsonDataService: ExportJsonDataService,
        protected pnmlService: PnmlService,
        public uiService: UiService,
        protected tokenGameService: TokenGameService,
        private matDialog: MatDialog,
        public zoomService: ZoomService,
        protected editMoveElementsService: EditMoveElementsService,
        private layoutSugiyamaService: LayoutSugiyamaService,
        protected svgCoordinatesService: SvgCoordinatesService,
        protected placeInvariantsService: PlaceInvariantsService,
    ) {
        console.log('PetriNetComponent Constructed');
    }

    ngOnInit(): void {
        this.uiService.buttonState$.subscribe((buttonState) => {
            if (buttonState !== ButtonState.Blitz) {
                this.dummyArc.points = [];
                this.lastNode = null;
            }
        });
        this._subs.push(
            /**
             * Subscription to DataService change notifications with conditional view adjustment.
             *
             * This subscription implements intelligent view management by differentiating between
             * incremental data changes (fitContent=false) and significant structural changes (fitContent=true).
             *
             * Change handling strategy:
             * - fitContent=false: Only update data bindings, preserve current zoom/pan state
             * - fitContent=true: Update data bindings AND automatically adjust view to fit content
             *
             * This approach prevents unwanted zoom interruptions during interactive editing while
             * ensuring proper view adjustment for major operations like net loading.
             *
             * Timing considerations:
             * - Subscription is established in ngOnInit before view initialization
             * - fitContentToView is only called when viewInitialized=true to prevent premature calls
             * - Uses defensive checks to handle edge cases during component lifecycle
             *
             * @param data - Change notification object with fitContent flag
             * @param data.fitContent - Boolean indicating whether view adjustment is required
             *
             * @see triggerDataChanged - Method that emits these notifications
             * @see fitContentToView - View adjustment method called conditionally
             * @see viewInitialized - Component lifecycle flag preventing premature view operations
             */
            this.dataService.dataChanged$.subscribe((data) => {
                console.log('Data changed, view initialized:', this.viewInitialized, 'fitContent:', data?.fitContent);
                if (this.viewInitialized && data?.fitContent) {
                    this.fitContentToView();
                }
            })
        );
        this._subs.push(
            this.uiService.simulationResults$.subscribe(results => {
                if (results && results.firing_seq) {
                    console.log('PetriNetComponent: Received simulation results from UiService', results);
                    this.initializeAnimationAndTimeline(results);
                } else if (!results) {
                    console.log('PetriNetComponent: Simulation results cleared.');
                    this.uiService.resetSimulationSteps();
                    this.isSimulating = false;
                    this.simulationFiringSeq = null;
                    this.simulationDetailedLog = null;
                    this.initialMarkings.clear();
                    this.currentStepBeingDisplayed = -1;
                    this.clearAllTransitionHighlights();
                    this.dataService.triggerDataChanged();
                }
            })
        );

        this._subs.push(
            this.uiService.getAnimationState$().subscribe(isRunning => {
                if (isRunning && this.uiService.tab === TabState.Simulation && this.isSimulating) {
                    console.log('PetriNetComponent: Starting/Resuming autoplay animation');
                    // ADDED: Check current speed before starting animation loop
                    const currentSpeed = this.uiService.getAnimationSpeedMultiplier();
                    if (currentSpeed > 0) {
                        this.animateNextStep();
                    } else {
                        console.log('PetriNetComponent: Autoplay requested but speed is 0x. Animation timer will not start.');
                         // Ensure any old timer is cleared if speed became 0 right before play
                        if (this.animationTimer) {
                            clearTimeout(this.animationTimer);
                            this.animationTimer = null;
                        }
                    }
                } else if (!isRunning) {
                    console.log('PetriNetComponent: Animation state is false (paused/stopped). Clearing animation timer.');
                    if (this.animationTimer) {
                        clearTimeout(this.animationTimer);
                        this.animationTimer = null;
                    }
                }
            })
        );

        this._subs.push(
            this.uiService.currentSimulationStep$.subscribe(step => {
                if (this.uiService.hasSimulationData() && !this.uiService.isAnimationRunning() && step !== this.currentStepBeingDisplayed) {
                    console.log(`PetriNetComponent: currentSimulationStep$ changed to ${step} via UI, updating display.`);
                    this.displayStateForStep(step);
                }
            })
        );

        // ADDED: Subscription to simulation speed changes
        this.previousSpeedMultiplier = this.uiService.getAnimationSpeedMultiplier(); // Get initial speed

        this.speedSubscription = this.uiService.simulationSpeed$.subscribe(newSpeedMultiplier => {
            console.log(`PetriNetComponent: Speed changed. Previous: ${this.previousSpeedMultiplier}, New: ${newSpeedMultiplier}`);
            const wasPausedBySpeedZero = this.previousSpeedMultiplier === 0 && newSpeedMultiplier > 0;
            const isCurrentlyPausedBySpeedZero = newSpeedMultiplier === 0;

            this.previousSpeedMultiplier = newSpeedMultiplier;

            if (wasPausedBySpeedZero && this.uiService.isAnimationRunning()) {
                console.log('PetriNetComponent: Speed changed from 0x to >0x, and animation is in play state. Resuming animateNextStep.');
                // Clear any existing timer that might have been set if speed was >0 then 0 then >0 very quickly
                if (this.animationTimer) {
                    clearTimeout(this.animationTimer);
                    this.animationTimer = null;
                }
                this.animateNextStep(); // Restart the animation loop
            } else if (isCurrentlyPausedBySpeedZero && this.uiService.isAnimationRunning()) {
                // If speed is set to 0 while animation is supposed to be running, clear the timer.
                // animateNextStep() will also handle this, but this ensures it's cleared immediately.
                console.log('PetriNetComponent: Speed changed to 0x. Clearing animation timer proactively.');
                if (this.animationTimer) {
                    clearTimeout(this.animationTimer);
                    this.animationTimer = null;
                }
            }
        });

        /**
         * Tab-awareness subscription for context-sensitive UI behavior.
         * 
         * This subscription enables the PetriNetComponent to react to tab switches and ensures
         * simulation-specific UI elements (highlighting, animations) are only active in the
         * Simulation tab.
         * 
         * **Behavior on tab change:**
         * - **Switch TO Simulation tab:**
         *   - Re-enables transition highlighting if simulation is in manual mode
         *   - Resumes animation if it was playing before tab switch
         * 
         * - **Switch AWAY FROM Simulation tab:**
         *   - Clears all transition highlights immediately
         *   - Stops animation timer to prevent background activity
         *   - Preserves simulation state (can be resumed when returning to Simulation tab)
         * 
         * **Rationale:**
         * - Prevents visual confusion: Highlighting in non-simulation tabs would be misleading
         * - Improves performance: No unnecessary DOM updates when tab is not visible
         * - Better UX: Clear separation between editing (Build) and execution (Simulation) modes
         * 
         * **Memory leak prevention:**
         * This subscription is automatically cleaned up in ngOnDestroy() via the _subs array.
         * 
         * @see clearAllTransitionHighlights - Removes all highlight CSS classes
         * @see highlightManualModeTransitions - Re-applies highlighting for manual mode
         * @see TabState - Enum defining all available tabs
         */
        this._subs.push(
            this.uiService.tab$.subscribe(newTab => {
                console.log(`PetriNetComponent: Tab changed to ${TabState[newTab]}`);
                
                /**
                 * BASELINE SNAPSHOT: Ensure we always have a fallback marking to reset to.
                 * 
                 * This creates a baseline snapshot if:
                 * 1. We have places in the DataService (network is loaded)
                 * 2. No snapshot exists yet (initialMarkings is empty)
                 * 
                 * This prevents the "reset to 0" fallback from ever triggering when switching
                 * between tabs (especially when returning from Offshore or switching to/from
                 * Simulation without ever loading simulation results).
                 * 
                 * The snapshot captures the current token state, which is typically the
                 * Build-tab baseline loaded from PNML/JSON files.
                 */
                if (this.dataService.getPlaces().length > 0 && this.initialMarkings.size === 0) {
                    this.initialMarkings.clear();
                    this.dataService.getPlaces().forEach(place => {
                        this.initialMarkings.set(place.id, place.token);
                    });
                    console.log('PetriNetComponent: Created baseline snapshot (first-time):', this.initialMarkings);
                }
                
                if (newTab === TabState.Simulation) {
                    // Switched TO Simulation tab
                    console.log('PetriNetComponent: Switched to Simulation tab - enabling simulation features');
                    
                    /**
                     * Create/update snapshot of current token distribution when entering Simulation.
                     * 
                     * This ensures we have a reliable baseline to reset to when leaving Simulation tab,
                     * even if no simulation results were ever loaded. This snapshot is taken EVERY time
                     * we enter Simulation tab, ensuring it always reflects the most recent Build-tab state
                     * (user might have edited tokens in Build before switching to Simulation).
                     * 
                     * This OVERWRITES the baseline snapshot created above, which is intentional:
                     * we want to capture the Build-tab state immediately before entering Simulation.
                     */
                    if (this.dataService.getPlaces().length > 0) {
                        this.initialMarkings.clear();
                        this.dataService.getPlaces().forEach(place => {
                            this.initialMarkings.set(place.id, place.token);
                        });
                        console.log('PetriNetComponent: Updated snapshot for Simulation tab:', this.initialMarkings);
                    }
                    
                    // Re-enable highlighting if we're in manual mode
                    if (this.uiService.isManualMode()) {
                        console.log('PetriNetComponent: Re-enabling manual mode highlighting');
                        this.highlightManualModeTransitions();
                    }
                    
                    // Resume animation if it was running
                    if (this.uiService.isAnimationRunning() && this.isSimulating) {
                        console.log('PetriNetComponent: Resuming animation after tab switch');
                        const currentSpeed = this.uiService.getAnimationSpeedMultiplier();
                        if (currentSpeed > 0) {
                            this.animateNextStep();
                        }
                    }
                } else {
                    // Switched AWAY FROM Simulation tab
                    console.log('PetriNetComponent: Switched away from Simulation tab - disabling simulation features');
                    
                    /**
                     * Guard: Skip token reset when switching to Offshore tab.
                     * 
                     * Rationale:
                     * - Offshore tab uses a separate, isolated DataService instance (via providers: [DataService])
                     * - Offshore's PetriNetComponent operates on completely different data arrays
                     * - Resetting the Standard DataService (this instance) when switching to Offshore
                     *   would unnecessarily modify data that won't be displayed anyway
                     * - When user returns from Offshore, the Standard DataService data should remain
                     *   unchanged, preserving the state from Build/Code/Analyze tabs
                     * 
                     * We still clear highlights and stop animations for consistent UI behavior.
                     */
                    if (newTab === TabState.Offshore) {
                        console.log('PetriNetComponent: Switched to Offshore tab (separate DataService), skipping token reset');
                        
                        // Clear visual artifacts
                        this.clearAllTransitionHighlights();
                        
                        // Stop animation timer
                        if (this.animationTimer) {
                            console.log('PetriNetComponent: Clearing animation timer on Offshore switch');
                            clearTimeout(this.animationTimer);
                            this.animationTimer = null;
                        }
                        
                        // Early return - NO token reset for Offshore
                        return;
                    }
                    
                    // For all other tabs (Build, Code, Save, Analyze): perform full cleanup
                    
                    // Clear all highlights immediately
                    this.clearAllTransitionHighlights();
                    
                    // Stop animation timer (but preserve animation state for resume)
                    if (this.animationTimer) {
                        console.log('PetriNetComponent: Clearing animation timer on tab switch');
                        clearTimeout(this.animationTimer);
                        this.animationTimer = null;
                    }
                    
                    /**
                     * Reset tokens to Build-tab values when leaving Simulation tab.
                     * 
                     * Rationale:
                     * - Manual mode changes should not persist when user switches to Build/Code tabs
                     * - Build tab is the source of truth for token distribution
                     * - This ensures consistency: what user sees in Build = what simulation starts with
                     * 
                     * ALWAYS reset tokens, regardless of whether initialMarkings is populated.
                     * This prevents marking bleeding from Simulation tab to other tabs even when
                     * simulation was never initialized (e.g., user manually changed tokens in Simulation
                     * without loading simulation results first).
                     * 
                     * The resetTokensToInitialMarking() method has fallback logic (sets to 0 if no
                     * initial marking stored), ensuring robust behavior in all scenarios.
                     */
                    console.log('PetriNetComponent: Resetting tokens to Build-tab values on tab switch');
                    this.resetTokensToInitialMarking();
                }
            })
        );
        this._subs.push(this.speedSubscription); // Ensure cleanup

        this.frequencySubscription = this.uiService.transitionFiringFrequencies$.subscribe(frequencies => {
            this.isFrequencyAnalysisActive = (frequencies !== null && frequencies.size > 0);
        });
        this._subs.push(this.frequencySubscription);

        this._subs.push(
            this.uiService.manualHighlightUpdate$.subscribe(transition => {
                if (this.uiService.isManualMode()) {
                    this.highlightManualModeTransitions(transition ?? undefined);
                }
            })
        );

        /**
         * Subscription to simulation mode changes.
         * 
         * When switching TO manual mode, we invalidate currentStepBeingDisplayed by setting it to -1.
         * This ensures that when returning to automatic mode (via "Return to Automatic Playback"),
         * the subscription to currentSimulationStep$ will definitely trigger displayStateForStep()
         * even if the step number happens to be the same as before.
         * 
         * **Why this is needed:**
         * In manual mode, tokens are changed by manual transition firings, but currentStepBeingDisplayed
         * is not updated. When returning to automatic at the saved step (e.g., step 5), we need to
         * restore the tokens/highlights for that step via displayStateForStep(5), but the subscription
         * has a guard `step !== this.currentStepBeingDisplayed`. By setting currentStepBeingDisplayed = -1
         * when entering manual mode, we ensure the guard passes when returning to automatic.
         * 
         * **Example flow:**
         * 1. Automatic mode at step 5 → currentStepBeingDisplayed = 5
         * 2. Switch to manual → currentStepBeingDisplayed = -1 (this subscription)
         * 3. Fire transitions manually → tokens change, currentStepBeingDisplayed still -1
         * 4. Return to automatic at step 5 → setCurrentSimulationStep(5) called
         * 5. Subscription checks: 5 !== -1 → true → calls displayStateForStep(5)
         * 6. Tokens/highlights restored correctly!
         * 
         * @see currentStepBeingDisplayed - The variable being invalidated
         * @see displayStateForStep - The method that needs to be called
         * @see currentSimulationStep$ subscription - The subscription that checks the guard
         */
        this._subs.push(
            this.uiService.simulationMode$.subscribe(mode => {
                if (mode === 'manual') {
                    console.log('PetriNetComponent: Switched to manual mode, invalidating currentStepBeingDisplayed');
                    this.currentStepBeingDisplayed = -1;
                }
            })
        );
    }

    ngAfterViewInit(): void {
        this.viewInitialized = true;
        console.log('View initialized.'); // Log view init

        /**
         * Initialize viewport dimensions for zoom service.
         *
         * Critical initialization step that enables accurate viewport-center zoom calculations.
         * Without proper viewport dimensions, zoom operations will use incorrect center coordinates,
         * leading to unpredictable zoom behavior and potential drift.
         *
         * Timing requirements:
         * - Must occur after DOM elements are fully rendered (ngAfterViewInit)
         * - Must happen before any zoom operations that depend on viewport center
         * - Should be updated if viewport resizes (though not implemented in this basic version)
         *
         * @see setViewportDimensions - Method that stores these dimensions
         * @see zoomIn/zoomOut - Methods that use viewport center for zoom calculations
         * @see fitContentToView - Also updates viewport dimensions for consistency
         */
        if (this.drawingArea?.nativeElement) {
            const rect = this.drawingArea.nativeElement.getBoundingClientRect();
            this.zoomService.setViewportDimensions(rect.width, rect.height);
        }

        // Fit content initially if data is already present and view is ready
        if (!this.dataService.isEmpty()) {
            console.log('View initialized with existing data, fitting content.'); // Log initial fit
            this.fitContentToView();
        }
    }    ngOnDestroy(): void {
        this._subs.forEach((sub) => sub.unsubscribe());
        
        if (this.animationTimer) {
            clearTimeout(this.animationTimer);
            this.animationTimer = null;
        }
        
        if (this.uiService.isAnimationRunning()) {
            this.uiService.stopAnimation();
        }
        // No need to explicitly unsubscribe speedSubscription if it's added to _subs
        // as it will be handled by the loop above.
    }

    startTransition: Transition | undefined;
    startPlace: Place | undefined;
    anchorToDelete: Point | undefined;
    dummyArc = new DummyArc();

    private parsePetrinetData(
        content: string | undefined,
        contentType: CodeEditorFormat | undefined,
    ) {
        console.log('parsePetrinetData: Started', { contentType }); // Log start
        if (content) {
            console.log('parsePetrinetData: Content exists'); // Log content check
            // Variable to parse the data into
            let parsedData: [
                Array<Place>,
                Array<Transition>,
                Array<Arc>,
                Array<string>,
            ];

            try {
                console.log('parsePetrinetData: Entering parsing try block'); // Log try block
                // Use pnml parser if file type is pnml
                // we'll try the json parser for all other cases
                if (contentType === CodeEditorFormat.PNML) {
                    console.log('parsePetrinetData: Using PnmlService.parse'); // Log PNML parse
                    parsedData = this.pnmlService.parse(content);
                } else {
                    console.log('parsePetrinetData: Using ParserService.parse'); // Log JSON parse
                    parsedData = this.parserService.parse(content);
                }
                console.log('parsePetrinetData: Parsing successful'); // Log parse success
            } catch (error) {
                console.error('parsePetrinetData: Parsing error caught', error); // Log error
                this.matDialog.open(ErrorPopupComponent, {
                    data: {
                        parsingError: error,
                        schemaValidationErrors: false,
                    },
                });
                console.log('parsePetrinetData: Exiting due to parsing error', error); // Log exit on error
                return; // Exit if parsing fails
            }

            if (contentType === CodeEditorFormat.JSON) {
                const schemaValidationErrors =
                    validateJsonAgainstSchema(content);

                if (Object.keys(schemaValidationErrors).length) {
                    this.matDialog.open(ErrorPopupComponent, {
                        data: {
                            parsingError: false,
                            schemaValidationErrors: schemaValidationErrors,
                        },
                    });

                    return;
                }
            }

            console.log('parsePetrinetData: Destructuring parsed data'); // Log data assignment
            // Destructure the parsed data and overwrite the corresponding parameters
            // in the data service
            const [places, transitions, arcs, actions] = parsedData;
            this.dataService.places = places;
            this.dataService.transitions = transitions;
            this.dataService.arcs = arcs;
            this.dataService.actions = actions;
            console.log(`parsePetrinetData: DataService updated with ${places.length}p, ${transitions.length}t, ${arcs.length}a`); // Log data update

            // Apply layout if needed
            let layoutApplied = false;
            console.log('parsePetrinetData: Checking if layout is needed'); // Log layout check
            if (
                contentType !== CodeEditorFormat.PNML &&
                this.parserService.incompleteLayoutData
            ) {
                console.log('parsePetrinetData: Applying Sugiyama layout (JSON incomplete)'); // Log layout apply (JSON)
                this.layoutSugiyamaService.applySugiyamaLayout();
                layoutApplied = true;
            }

            if (
                contentType === CodeEditorFormat.PNML &&
                this.pnmlService.incompleteLayoutData
            ) {
                console.log('parsePetrinetData: Applying Sugiyama layout (PNML incomplete)'); // Log layout apply (PNML)
                this.layoutSugiyamaService.applySugiyamaLayout();
                layoutApplied = true;
            }
            console.log('parsePetrinetData: Layout check complete. Layout applied:', layoutApplied); // Log layout result

            /**
             * Critical notification point: Trigger data change with automatic content fitting.
             *
             * This notification must occur AFTER all data mutations and layout operations are complete
             * to ensure subscribers receive a consistent, fully-processed state. The fitContent=true
             * parameter is essential for PNML loading because:
             *
             * 1. **Major State Change**: PNML loading represents a complete net replacement
             * 2. **Layout Uncertainty**: Automatic layout algorithms may reposition elements anywhere
             * 3. **User Expectation**: Users expect to see the entire loaded net immediately
             * 4. **Viewport Safety**: Prevents nets from loading outside visible area
             *
             * Timing is critical - this must be the final operation before returning to ensure
             * all subscribers receive the complete, processed state simultaneously.
             *
             * @see triggerDataChanged - Notification method with fitContent parameter
             * @see dataChanged$ - Observable that subscribers monitor for this notification
             * @see fitContentToView - View adjustment triggered by this notification
             */
            console.log('parsePetrinetData: About to call triggerDataChanged()'); // Log before trigger
            this.dataService.triggerDataChanged(true); // Fit content when loading new nets
            console.log('parsePetrinetData: triggerDataChanged() called successfully'); // Log after trigger

        } else {
            console.warn('parsePetrinetData: Content was empty or undefined'); // Log empty content case
            // If content is empty/undefined, clear data and trigger change
            this.dataService.clearAll(); // clearAll already triggers dataChanged
        }
        console.log('parsePetrinetData: Finished'); // Log end
    }

    /**
     * Calls the ZoomService to fit the content to the current view dimensions.
     */
    private fitContentToView(): void {
        console.log('Attempting fitContentToView...'); // Log entry
        // Ensure the drawing area element is available and view is initialized
        if (this.drawingArea?.nativeElement && this.viewInitialized) {
            const rect = this.drawingArea.nativeElement.getBoundingClientRect();

            /**
             * Update viewport dimensions before zoom operations.
             *
             * Ensures zoom service has current viewport size for accurate calculations.
             * Critical for maintaining consistent zoom behavior, especially when viewport
             * has changed since initialization or previous operations.
             *
             * This synchronization prevents zoom drift and ensures that zoom operations
             * use the correct center coordinates relative to the current viewport size.
             *
             * @see setViewportDimensions - Updates stored viewport dimensions
             * @see zoomIn/zoomOut - Methods that depend on accurate viewport dimensions
             */
            this.zoomService.setViewportDimensions(rect.width, rect.height);

            console.log('Drawing area rect:', rect.width, 'x', rect.height); // Log dimensions
            if (rect.width > 0 && rect.height > 0) {
                this.zoomService.fitContent(rect.width, rect.height);
            } else {
                console.log('Drawing area dimensions are 0, using requestAnimationFrame fallback.'); // Log fallback
                // Fallback or retry logic if dimensions are 0 initially
                // For example, use setTimeout to try again shortly after
                // Use requestAnimationFrame for better timing related to rendering
                requestAnimationFrame(() => {
                    if (this.drawingArea?.nativeElement) {
                        const currentRect = this.drawingArea.nativeElement.getBoundingClientRect();

                        /**
                         * Update viewport dimensions in fallback as well.
                         *
                         * Ensures consistency even in edge cases where initial dimensions
                         * are zero. Critical for maintaining zoom calculation accuracy
                         * across all code paths.
                         */
                        this.zoomService.setViewportDimensions(currentRect.width, currentRect.height);

                        console.log('Drawing area rect (fallback):', currentRect.width, 'x', currentRect.height); // Log fallback dimensions
                        if (currentRect.width > 0 && currentRect.height > 0) {
                            this.zoomService.fitContent(currentRect.width, currentRect.height);
                        } else {
                            console.error('Drawing area dimensions still 0 in fallback.'); // Log error if still 0
                        }
                    }
                });
            }
        } else {
            console.warn('fitContentToView called but drawingArea or view not ready.', this.drawingArea, this.viewInitialized); // Log warning if called too early
        }
    }

    /**
     * Resets the view by fitting the current content to the drawing area.
     * Called by the reset button.
     */
    public resetViewToFitContent(): void {
        console.log('PetriNetComponent: resetViewToFitContent() called by button.'); // Log button click
        this.fitContentToView();
    }

    // Process Drag & Drop using Observables
    public processDropEvent(event: DragEvent) {
        event.preventDefault(); // Prevent opening of the dragged file in a new tab

        // Drag & Drop imports should only be available in
        // Code & Build Mode to prevent inconsistencies.
        if (![TabState.Code, TabState.Build].includes(this.uiService.tab)) {
            this.matDialog.open(ErrorPopupComponent, {
                data: {
                    error: 'Importing by drag & drop is only available in "Build" and "Code" mode',
                },
            });

            return;
        }

        this.readFile(event.dataTransfer?.files);
    }

    private readFile(files: FileList | undefined | null) {
        console.log('PetriNetComponent.readFile: Called with files:', files); // Log entry
        if (files === undefined || files === null || files.length === 0) {
            console.warn('PetriNetComponent.readFile: No files provided.'); // Log no files
            return;
        }

        const file = files[0];
        console.log('PetriNetComponent.readFile: Processing file:', file.name, file.type); // Log file info

        // Extract type from file name
        const extension = file.name.split('.').pop();
        let fileType: CodeEditorFormat | undefined;

        switch (extension) {
            case 'json':
                fileType = CodeEditorFormat.JSON;
                break;
            case 'pnml':
            case 'xml':
                fileType = CodeEditorFormat.PNML;
                break;
            default:
                fileType = undefined;
                break;
        }
        console.log('PetriNetComponent.readFile: Determined fileType:', fileType); // Log file type

        console.log('PetriNetComponent.readFile: Calling FileReaderService.readFile'); // Log before service call
        this.fileReaderService
            .readFile(files[0])
            .pipe(take(1))
            .subscribe({
                next: (content) => {
                    console.log('PetriNetComponent.readFile: FileReaderService emitted content (length:', content?.length, ')'); // Log success
                    this.parsePetrinetData(content, fileType);
                    this.emitFileContent(content);
                },
                error: (err) => {
                    console.error('PetriNetComponent.readFile: FileReaderService threw error:', err); // Log error
                },
                complete: () => {
                    console.log('PetriNetComponent.readFile: FileReaderService completed.'); // Log completion
                }
            });
        console.log('PetriNetComponent.readFile: Subscription to FileReaderService set up.'); // Log subscription setup
    }

    private emitFileContent(content: string | undefined) {
        if (content === undefined) {
            return;
        }
        // Instead of emitting the file content we set the current code editor format as
        // next value of the BehaviorSubject in order to have the code editor component
        // load the source code by itself (with our formatting applied)
        this.uiService.codeEditorFormat$.next(
            this.uiService.codeEditorFormat$.value,
        );
    }

    public prevent(e: Event) {
        // Dragover must be prevented for drop to work
        e.preventDefault();
    }

    protected onWheelEventTransition(e: WheelEvent, transition: Transition) {
        if (
            this.uiService.button === ButtonState.Blitz ||
            this.uiService.button === ButtonState.Select
        ) {
            e.preventDefault();
            e.stopPropagation();
            if (e.deltaY < 0) {
                transition.label = this.getNextLabel(transition.label);
            } else {
                transition.label = this.getLastLabel(transition.label);
            }
        }
    }

    protected onWheelEventPlace(e: WheelEvent, place: Place) {
        // Scrolling is allowed in Both Directions with the Blitz-Tool
        if (this.uiService.button === ButtonState.Blitz) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY < 0) {
                place.token++;
                this.dataService.triggerDataChanged();
            }
            if (e.deltaY > 0 && place.token > 0) {
                place.token--;
                this.dataService.triggerDataChanged();
            }
        }
        if (this.uiService.button === ButtonState.Add) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY < 0) {
                place.token++;
                this.dataService.triggerDataChanged();
            }
        } else if (this.uiService.button === ButtonState.Remove) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY > 0 && place.token > 0) {
                place.token--;
                this.dataService.triggerDataChanged();
            }
        }
    }

    protected onWheelEventArc(e: WheelEvent, arc: Arc) {
        // Scrolling is allowed in Both Directions with the Blitz-Tool
        if (this.uiService.button === ButtonState.Blitz) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY < 0) {
                // positives Gewicht erhöhen
                if (arc.weight > 0) {
                    arc.weight++;
                } // negatives Gewicht erhöhren
                else if (arc.weight < 0) {
                    arc.weight--;
                }
            }
            if (e.deltaY > 0) {
                // positives Gewicht verringern
                if (arc.weight > 1) {
                    arc.weight--;
                } // negatives Gewicht verringern
                else if (arc.weight < -1) {
                    arc.weight++;
                }
                //Scroll Up
            }
        }
        if (this.uiService.button === ButtonState.Add) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY < 0) {
                // positives Gewicht erhöhen
                if (arc.weight > 0) {
                    arc.weight++;
                } // negatives Gewicht erhöhren
                else if (arc.weight < 0) {
                    arc.weight--;
                }
            }
        } else if (this.uiService.button === ButtonState.Remove) {
            e.preventDefault();
            e.stopPropagation();

            if (e.deltaY > 0) {
                // positives Gewicht verringern
                if (arc.weight > 1) {
                    arc.weight--;
                } // negatives Gewicht verringern
                else if (arc.weight < -1) {
                    arc.weight++;
                }
                //Scroll Up
            }
        }
    }

    /**
     * Handles mouse wheel events on the SVG canvas for zooming.
     * @param event The wheel event.
     */
    onMouseWheelZoom(event: WheelEvent) {
        event.preventDefault(); // Prevent page scrolling
        if (event.deltaY < 0) {
            // Scrolled up (zoom in)
            this.zoomService.zoomIn();
        } else if (event.deltaY > 0) {
            // Scrolled down (zoom out)
            this.zoomService.zoomOut();
        }
    }

    // Dispatch methods for display events ************************************

    // SVG
    dispatchSVGClick(event: MouseEvent, drawingArea: HTMLElement) {
        event.preventDefault();
        if (this.uiService.button === ButtonState.Place) {
            // example method: can be deleted/replaced with final implementation
            this.addPlace(event, drawingArea);
        }
        if (this.uiService.button === ButtonState.Transition) {
            this.addTransition(event, drawingArea);
        }

        if (this.uiService.button === ButtonState.Blitz) {
            if (!this.addElement) {
                this.addElement = true;
                return;
            }
            if (this.nextNode && this.nextNode.position) {
                // Initialising Blitz-Tool by clickling on an existing Node
                if (!this.lastNode) {
                    this.dummyArc = new DummyArc();
                    this.dummyArc.points[0] = this.nextNode.position;
                    this.lastNode = this.nextNode;
                    this.nextNode = null;
                    return;
                }
            }

            if (!this.lastNode) {
                // Initialising Blitz-Tool by clickling on the Canvas
                const place = this.createPlace(event, drawingArea);
                this.dataService.getPlaces().push(place);
                this.dataService.triggerDataChanged(); // Trigger change after adding place
                this.lastNode = place;
            } else if (this.lastNode instanceof Place) {
                // Last Node was a Place
                if (this.nextNode instanceof Transition) {
                    // Connecting the Place to an existing Transition
                    const transition = this.nextNode;
                    this.dataService.connectNodes(this.lastNode, transition);
                    this.dataService.triggerDataChanged(); // Trigger change after adding arc
                    this.lastNode = this.nextNode;
                } else if (this.nextNode instanceof Place) {
                    // If a Place is clicked the selected Node is changed
                    this.lastNode = this.nextNode;
                } else if (!this.nextNode) {
                    // Click on the Canvas
                    const transition = this.createTransition(
                        event,
                        drawingArea,
                    );
                    this.dataService.getTransitions().push(transition);
                    this.dataService.triggerDataChanged(); // Trigger change after adding transition
                    this.dataService.connectNodes(this.lastNode, transition);
                    this.dataService.triggerDataChanged(); // Trigger change after adding arc
                    this.lastNode = transition;
                }
            } else if (this.lastNode instanceof Transition) {
                // Last Node was a Transition
                if (this.nextNode instanceof Place) {
                    // Connecting the Transition to an existing Place
                    const place = this.nextNode;
                    this.dataService.connectNodes(this.lastNode, place);
                    this.dataService.triggerDataChanged(); // Trigger change after adding arc
                    this.lastNode = this.nextNode;
                } else if (this.nextNode instanceof Transition) {
                    // If a Transition is clicked the selected Node is changed
                    this.lastNode = this.nextNode;
                } else if (!this.nextNode) {
                    // Click on the Canvas
                    const place = this.createPlace(event, drawingArea);
                    this.dataService.getPlaces().push(place);
                    this.dataService.triggerDataChanged(); // Trigger change after adding place
                    this.dataService.connectNodes(this.lastNode, place);
                    this.dataService.triggerDataChanged(); // Trigger change after adding arc
                    this.lastNode = place;
                }
            }
            this.dummyArc.points[0] = this.lastNode.position;
            this.nextNode = null;
        }
    }

    dispatchSVGMouseDown(event: MouseEvent, drawingArea: HTMLElement) {
        // Default Panning: Initiate panning only if the click target is the SVG canvas itself
        if (event.target === drawingArea) {
            this.editMoveElementsService.initializePetrinetPanning(event);
        }

        // Existing logic for other button states (Blitz, Arc)
        if (
            this.uiService.button === ButtonState.Blitz &&
            event.button == MouseConstants.Right_Click
        ) {
            this.lastNode = null;
            this.nextNode = null;
            this.dummyArc.points = [];
        }
        if (
            this.uiService.button === ButtonState.Blitz &&
            event.button == MouseConstants.Mouse_Wheel_Click &&
            !this.lastNode
        ) {
            event.preventDefault();
            const transition = this.createTransition(event, drawingArea);
            this.dataService.getTransitions().push(transition);
            this.dataService.triggerDataChanged(); // Trigger change after adding transition
            this.lastNode = transition;
            this.dummyArc.points[0] = this.lastNode.position;
        }
        if (
            this.uiService.button === ButtonState.Arc &&
            this.dummyArc.points.length === 1
        ) {
            this.dummyArc.points.push(
                this.svgCoordinatesService.getRelativeEventCoords(
                    event,
                    drawingArea,
                ),
            );
        }
    }

    dispatchSVGMouseMove(event: MouseEvent, drawingArea: HTMLElement) {
        // Always delegate to service, it checks internally if panning is active
        if (this.editMoveElementsService.isCanvasDragInProcess) {
            this.editMoveElementsService.movePetrinetPositionByMousePositionChange(
                event,
            );
        } else if (this.uiService.button === ButtonState.Move) {
            // Only move nodes/anchors if explicitly in Move mode
            this.editMoveElementsService.moveNodeByMousePositionChange(event);
            this.editMoveElementsService.moveAnchorByMousePositionChange(event);
        }

        // Existing logic for Arc/Blitz dummy line
        if (
            (this.uiService.button === ButtonState.Arc ||
                this.uiService.button === ButtonState.Blitz) &&
            this.dummyArc?.points.length > 0
        ) {
            // Drawing the drag & drop DummyArc
            this.dummyArc.points[1] =
                this.svgCoordinatesService.getRelativeEventCoords(
                    event,
                    drawingArea,
                );
        }
    }

    dispatchSVGMouseUp(event: MouseEvent, drawingArea: HTMLElement) {
        // Always finalize/reset potential panning/moving state in the service
        this.editMoveElementsService.finalizeMove();

        // Existing logic for Arc/Anchor deletion
        // Reset for both cancellation or finalization (bubble-up) of arc drawing
        if (this.uiService.button === ButtonState.Arc) {
            this.startTransition = undefined;
            this.startPlace = undefined;
            this.dummyArc.points = [];
        }

        // Resed anchorToDelete after both:
        // * A successfull deletion of an anchor: mouse up on the anchor element
        //   bubbles up to the svg element and triggers dispatchSVGMouseUp().
        // * An aborted anchor deletion: mouse up does not occur on the original
        //   anchor but somewhere else on the display area --> the event
        //   is captuered
        //   here as well.

        if (this.anchorToDelete) {
            this.anchorToDelete = undefined;
        }
    }

    // Places
    dispatchPlaceClick(event: MouseEvent, place: Place) {
        if (this.uiService.button === ButtonState.Add) {
            place.token++;
            // Trigger data change notification so simulation gets re-run
            this.dataService.triggerDataChanged();
        }

        if (this.uiService.button === ButtonState.Remove) {
            if (place.token > 0) {
                place.token--;
                // Trigger data change notification so simulation gets re-run
                this.dataService.triggerDataChanged();
            }
        }

        if (this.uiService.button === ButtonState.Delete) {
            this.dataService.removePlace(place);
        }

        if (
            this.uiService.tab === TabState.Analyze &&
            this.placeInvariantsService.placeInvariantsMatrix
        ) {
            this.openPlaceInvariantsTable(place);
        }
    }

    dispatchPlaceMouseDown(event: MouseEvent, place: Place) {
        if (this.uiService.button === ButtonState.Blitz) {
            if (event.button == MouseConstants.Right_Click) {
                this.dummyArc = new DummyArc();
                this.dataService.removePlace(place);
            } else if (event.button == MouseConstants.Left_Click) {
                // Existing Place is selected as the next Node. Method is called before dispatchSVGClick
                if (this.lastNode instanceof Place) {
                    this.addElement = false;
                } else {
                    this.nextNode = place;
                }
            }
        }

        if (this.uiService.button === ButtonState.Move) {
            // Keep event from bubbling up to canvas and e.g. trigger canvas drag & drop
            event.stopPropagation();
            this.editMoveElementsService.initializeNodeMove(event, place);
        }

        // Set StartNode for Arc
        if (this.uiService.button === ButtonState.Arc) {
            this.startPlace = place;
            this.dummyArc?.points.push(place.position);
        }
    }

    dispatchPlaceMouseUp(event: MouseEvent, place: Place) {
        // Draw Arc with Place as EndNode
        if (
            this.startTransition &&
            !this.isArcExisting(this.startTransition, place) &&
            this.uiService.button === ButtonState.Arc
        ) {
            const newArc: Arc = new Arc(this.startTransition, place, 1);
            this.startTransition.appendPostArc(newArc);
            this.dataService.getArcs().push(newArc);
            this.dataService.triggerDataChanged(); // Trigger change after adding arc
        }
    }

    // Transitions
    /**
     * Handles left-click events on transitions in the Petri net canvas.
     * 
     * Behavior varies by tab and button state:
     * - **Simulation tab**: Switches to manual mode and fires the clicked transition in the token game,
     *   then updates highlighting to reflect enabled transitions.
     * - **Build tab + Select button**: Opens the action configuration dialog for the transition.
     * - **Delete button (any tab)**: Removes the transition from the Petri net.
     * 
     * When entering manual mode from automatic mode, any running animation is stopped and
     * the simulation mode is explicitly set to 'manual', allowing the user to fire transitions
     * by clicking them directly.
     * 
     * @param event - The mouse event triggered by the click
     * @param transition - The transition that was clicked
     * 
     * @see tokenGameService.fire - Executes transition firing logic
     * @see highlightManualModeTransitions - Updates visual feedback for manual token game
     * @see UiService.setSimulationMode - Switches between automatic and manual simulation modes
     */
    dispatchTransitionClick(event: MouseEvent, transition: Transition) {
        // Token game: fire transition
        if (this.uiService.tab === TabState.Simulation) {
            console.log('🎮 Manual mode: firing transition', transition.id);
            this.uiService.stopAnimation();
            this.uiService.setSimulationMode('manual');
            this.tokenGameService.fire(transition);
            this.highlightManualModeTransitions(transition);
        } else if (
            this.uiService.tab === TabState.Build &&
            this.uiService.button === ButtonState.Select
        ) {
            this.matDialog.open(SetActionPopupComponent, {
                data: { node: transition },
            });
        }

        if (this.uiService.button === ButtonState.Delete) {
            this.dataService.removeTransition(transition);
        }
    }

    /**
     * Handles right-click (context menu) events on transitions.
     * 
     * This method implements conditional statistics display based on simulation mode and data availability.
     * It only shows the transition firing statistics dialog when ALL of the following conditions are met:
     * 
     * 1. **Frequency analysis is active**: Multi-run simulation results have been loaded and processed
     * 2. **User is in Simulation tab**: Not in Build, Analyze, or other tabs
     * 3. **Automatic mode is active**: Not in manual token game mode
     * 
     * **When conditions are met:**
     * - Prevents the default browser context menu from appearing (`event.preventDefault()`)
     * - Opens a dialog showing how many times this transition fired across all simulation runs
     * 
     * **When conditions are NOT met:**
     * - Does nothing, allowing the default browser context menu to appear
     * - This ensures no interference with other workflows (e.g., Build tab operations)
     * 
     * This approach provides a clean separation between:
     * - **Automatic mode**: Right-click shows statistics (analysis/inspection workflow)
     * - **Manual mode**: Right-click has default behavior, left-click fires transitions (interactive workflow)
     * 
     * @param event - The context menu event triggered by right-click
     * @param transition - The transition that was right-clicked
     * 
     * @see onTransitionClick - Opens the statistics dialog with transition firing data
     * @see UiService.isAutomaticMode - Checks if simulation is in automatic playback mode
     * @see isFrequencyAnalysisActive - Flag set when multi-run results are loaded
     */
    onTransitionRightClick(event: MouseEvent, transition: Transition) {
        // Only show stats in Simulation tab + Automatic mode + when frequency data exists
        if (
            !this.isFrequencyAnalysisActive ||
            this.uiService.tab !== TabState.Simulation ||
            !this.uiService.isAutomaticMode()
        ) {
            return; // Allow default browser behavior
        }

        // Suppress browser context menu and show stats dialog
        event.preventDefault();
        this.onTransitionClick(transition.id);
    }

    /**
     * Opens a dialog displaying transition firing statistics from multi-run simulations.
     * 
     * This method is invoked when a transition is right-clicked in automatic mode with frequency
     * analysis active. It shows aggregate data about how often the transition fired across
     * multiple simulation runs.
     * 
     * The dialog displays:
     * - **Transition ID**: Which transition was clicked
     * - **Firing count**: Total number of times this transition fired across all runs
     * - **Total runs**: How many simulation runs were executed
     * 
     * **Guard conditions:**
     * - Returns early if frequency analysis is not active (no multi-run data loaded)
     * - Returns early if frequency map or multi-run results are missing
     * 
     * This method is public to allow programmatic access, though it's primarily called
     * internally via `onTransitionRightClick`.
     * 
     * @param transitionId - The ID of the transition to show statistics for
     * 
     * @see TransitionFiringInfoPopupComponent - The dialog component that displays the data
     * @see UiService.getTransitionFiringFrequencies - Retrieves aggregated firing counts per transition
     * @see UiService.getMultiRunResults - Retrieves the full multi-run simulation results
     */
    public onTransitionClick(transitionId: string): void {
        if (!this.isFrequencyAnalysisActive) {
            return; // Do nothing if no frequency data is available
        }

        const frequencies = this.uiService.getTransitionFiringFrequencies();
        const multiRunResults = this.uiService.getMultiRunResults();

        if (!frequencies || !multiRunResults) {
            return;
        }

        const firingCount = frequencies.get(transitionId) || 0;
        const totalRuns = multiRunResults.total_runs || 0;

        this.matDialog.open(TransitionFiringInfoPopupComponent, {
            width: '400px',
            data: {
                transitionId: transitionId,
                firingCount: firingCount,
                totalRuns: totalRuns
            }
        });
    }

    dispatchTransitionMouseDown(event: MouseEvent, transition: Transition) {
        if (this.uiService.button === ButtonState.Blitz) {
            if (event.button == MouseConstants.Right_Click) {
                this.dataService.removeTransition(transition);
            } else if (event.button == MouseConstants.Left_Click) {
                // Existing Transition is selected as the next Node. Method is called before dispatchSVGClick
                if (this.lastNode instanceof Transition) {
                    this.addElement = false;
                } else {
                    this.nextNode = transition;
                }
            }
        }

        if (this.uiService.button === ButtonState.Move) {
            // Keep event from bubbling up to canvas and e.g. trigger canvas drag & drop
            event.stopPropagation();
            this.editMoveElementsService.initializeNodeMove(event, transition);
        }

        // Set StartNode for Arc
        if (this.uiService.button === ButtonState.Arc) {
            this.startTransition = transition;
            this.dummyArc?.points.push(transition.position);
        }
    }

    dispatchTransitionMouseUp(event: MouseEvent, transition: Transition) {
        // Draw Arc with Transition as EndNode
        if (
            this.startPlace &&
            !this.isArcExisting(this.startPlace, transition) &&
            this.uiService.button === ButtonState.Arc
        ) {
            const newArc: Arc = new Arc(this.startPlace, transition, 1);
            transition.appendPreArc(newArc);
            this.dataService.getArcs().push(newArc);
            this.dataService.triggerDataChanged(); // Trigger change after adding arc
        }
    }

    // Arcs
    dispatchArcClick(event: MouseEvent, arc: Arc) {
        // Add Weight to Arc
        if (this.uiService.button === ButtonState.Add) {
            if (arc.weight > 0) {
                arc.weight++;
            } else if (arc.weight < 0) {
                arc.weight--;
            }
        }

        // Remove Weight from Arc
        if (this.uiService.button === ButtonState.Remove) {
            if (arc.weight > 1) {
                arc.weight--;
            } else if (arc.weight < -1) {
                arc.weight++;
            }
        }

        // Remove Arc
        // Check of the field anchorToDelete prevents arc deletion when
        // only an anchor should be deleted.
        if (
            this.uiService.button === ButtonState.Delete &&
            !this.anchorToDelete
        ) {
            this.dataService.removeArc(arc);
        }
    }

    onContextMenu(event: MouseEvent): void {
        if (this.uiService.button === ButtonState.Blitz) {
            event.preventDefault();
        }
    }

    dispatchArcMouseDown(
        event: MouseEvent,
        arc: Arc,
        drawingArea: HTMLElement,
    ) {
        if (
            this.uiService.button === ButtonState.Blitz &&
            event.button == MouseConstants.Right_Click
        ) {
            this.dataService.removeArc(arc);
        }
    }

    dispatchLineSegmentMouseDown(
        event: MouseEvent,
        arc: Arc,
        lineSegment: Point[],
        drawingArea: HTMLElement,
    ) {
        if (this.uiService.button === ButtonState.Anchor) {
            this.editMoveElementsService.insertAnchorIntoLineSegmentStart(
                event,
                arc,
                lineSegment,
                drawingArea,
            );
            this.dataService.triggerDataChanged(); // Trigger change after adding anchor
        }

        if (this.uiService.button === ButtonState.Move) {
            event.stopPropagation();
        }
    }

    // Anchors
    dispatchAnchorMouseDown(event: MouseEvent, anchor: Point) {
        if (this.uiService.button === ButtonState.Move) {
            event.stopPropagation();
            this.editMoveElementsService.initializeAnchorMove(event, anchor);
        }

        if (this.uiService.button === ButtonState.Delete) {
            // Register the anchor to be deleted
            this.anchorToDelete = anchor;
        }
    }

    dispatchAnchorMouseUp(event: MouseEvent, anchor: Point) {
        if (this.anchorToDelete === anchor) {
            this.dataService.removeAnchor(anchor); // removeAnchor already triggers dataChanged
        }
    }

    // ************************************************************************

    addPlace(event: MouseEvent, drawingArea: HTMLElement) {
        const place = this.createPlace(event, drawingArea);
        this.dataService.getPlaces().push(place);
        this.dataService.triggerDataChanged(); // Trigger change after adding place
    }

    createPlace(event: MouseEvent, drawingArea: HTMLElement): Place {
        const point = this.svgCoordinatesService.getRelativeEventCoords(
            event,
            drawingArea,
        );
        return new Place(0, point, this.getPlaceId());
    }

    addTransition(event: MouseEvent, drawingArea: HTMLElement) {
        const transition = this.createTransition(event, drawingArea);
        this.dataService.getTransitions().push(transition);
        this.dataService.triggerDataChanged(); // Trigger change after adding transition
    }

    createTransition(event: MouseEvent, drawingArea: HTMLElement): Transition {
        const point = this.svgCoordinatesService.getRelativeEventCoords(
            event,
            drawingArea,
        );
        return new Transition(point, this.getTransitionId());
    }

    getPlaceId(): string {
        let i = 1;
        let found = false;
        let id: string = '';
        let placeIds: string[] = [];
        this.dataService.getPlaces().forEach((place) => {
            placeIds.push(place.id);
        });
        while (!found) {
            id = 'p' + i;
            if (placeIds.indexOf(id) === -1) {
                found = true;
            }
            i++;
        }
        return id;
    }

    getTransitionId(): string {
        let i = 1;
        let found = false;
        let id: string = '';
        let transitionIds: string[] = [];
        this.dataService.getTransitions().forEach((transition) => {
            transitionIds.push(transition.id);
        });
        while (!found) {
            id = 't' + i;
            if (transitionIds.indexOf(id) === -1) {
                found = true;
            }
            i++;
        }
        return id;
    }

    isArcExisting(startNode: Node, endNote: Node): boolean {
        return this.dataService
            .getArcs()
            .some((arc) => arc.from === startNode && arc.to === endNote);
    }

    // Returns true if the provided place can be edited and should be highlighted
    isPlaceEditable(place: Place): boolean {
        const hasPreArcFromStartTransition =
            this.startTransition &&
            this.dataService.getArcs().filter((arc) => {
                return arc.from === this.startTransition && arc.to === place;
            }).length;

        if (this.uiService.button === ButtonState.Blitz) {
            if (!this.lastNode) {
                return true;
            } else {
                return this.dataService.isConnectionPossible(
                    this.lastNode,
                    place,
                );
            }
        }

        return (
            (this.uiService.button === ButtonState.Move &&
                !this.editMoveElementsService.newAnchor) ||
            this.uiService.button === ButtonState.Add ||
            (this.uiService.button === ButtonState.Remove && place.token > 0) || // Tokens can only be removed if the number of tokens in a place is > 0
            this.uiService.button === ButtonState.Delete ||
            (this.uiService.button === ButtonState.Arc &&
                !this.startPlace &&
                !hasPreArcFromStartTransition)
        ); // If the user starts dragging an arc from a place he can only finish on a transition --> places are no longer editable
    }

    // Returns true if transitions can be edited and should be highlighted
    isTransitionEditable(transition: Transition): boolean {
        const hasPreArcFromStartPlace =
            this.startPlace &&
            transition.preArcs.filter((arc) => {
                return arc.from === this.startPlace;
            }).length;

        if (this.uiService.button === ButtonState.Blitz) {
            if (!this.lastNode) {
                return true;
            } else {
                return this.dataService.isConnectionPossible(
                    this.lastNode,
                    transition,
                );
            }
        }

        return (
            (this.uiService.button === ButtonState.Move &&
                !this.editMoveElementsService.newAnchor) ||
            this.uiService.button === ButtonState.Select ||
            this.uiService.button === ButtonState.Delete ||
            (this.uiService.button === ButtonState.Arc &&
                !this.startTransition &&
                !hasPreArcFromStartPlace)
        ); // If the user starts dragging an arc from a transition he can only finish on a place --> transitions no longer editable
    }

    // Returns true if the provided arc can be edited and should be highlighted
    isArcEditable(arc: Arc): boolean {
        return (
            this.uiService.button === ButtonState.Anchor ||
            this.editMoveElementsService.newAnchor !== undefined ||
            this.uiService.button === ButtonState.Add ||
            (this.uiService.button === ButtonState.Remove &&
                Math.abs(arc.weight) > 1) || // Arc weights can only be decreased if the absolute value is > 1
            this.uiService.button === ButtonState.Delete
        );
    }

    openPlaceInvariantsTable(place: Place) {
        this.placeInvariantsService.selectedPlaceForPITable = place;
        this.matDialog.open(PlaceInvariantsTableComponent);
    }

    getNextLabel(label: string | undefined): string | undefined {
        const actions = this.dataService.getActions();
        if (label) {
            const labelIndex = actions.indexOf(label);
            if (labelIndex + 1 < actions.length) { // Corrected boundary check
                return actions[labelIndex + 1];
            }
        } else {
            if (actions.length > 0) {
                return actions[0];
            }
        }
        return; // Return undefined if no next label
    }

    getLastLabel(label: string | undefined): string | undefined {
        const actions = this.dataService.getActions();
        if (label) {
            const labelIndex = actions.indexOf(label);
            if (labelIndex > 0) { // Corrected boundary check
                return actions[labelIndex - 1];
            }
        } else if (actions.length > 0) {
            return actions[actions.length - 1];
        }
        return; // Return undefined if no previous label
    }

    protected readonly radius = radius;
    protected readonly placeIdYOffset = placeIdYOffset;
    protected readonly transitionWidth = transitionWidth;
    protected readonly transitionHeight = transitionHeight;
    protected readonly transitionXOffset = transitionXOffset;
    protected readonly transitionYOffset = transitionYOffset;
    protected readonly transitionIdYOffset = transitionIdYOffset;
    protected readonly transSilentWidth = transSilentWidth;
    protected readonly transSilentXOffset = transSilentXOffset;

    protected readonly TabState = TabState;
    protected readonly ButtonState = ButtonState;    // Method to start the simulation animation
    // Renamed to initializeAnimationAndTimeline to avoid conflict and match usage
    private initializeAnimationAndTimeline(results: { firing_seq: any, detailed_log: any }): void {
        console.log('PetriNetComponent: initializeAnimationAndTimeline called with', results);

        let firingSeqArray: { transition_id: string }[] = [];
        const transitions = this.dataService.getTransitions();

        if (Array.isArray(results.firing_seq)) {
            firingSeqArray = results.firing_seq.map((step: any) => {
                if (typeof step === 'string') return transitions.find(t => t.id === step) ? { transition_id: step } : null;
                if (typeof step === 'number' && transitions[step]) return { transition_id: transitions[step].id };
                if (step && typeof step === 'object' && step.transition_id && transitions.find(t => t.id === step.transition_id)) return step;
                return null;
            }).filter((s: any): s is { transition_id: string } => s !== null);
        } else if (results.firing_seq && typeof results.firing_seq === 'object') {
            const keys = Object.keys(results.firing_seq).sort((a, b) => Number(a) - Number(b));
            firingSeqArray = keys.map(key => {
                const val = results.firing_seq[key];
                if (typeof val === 'string' && transitions.find(t => t.id === val)) return { transition_id: val };
                if (typeof val === 'number' && transitions[val]) return { transition_id: transitions[val].id };
                return null;
            }).filter((s: any): s is { transition_id: string } => s !== null);
        } else {
            console.error('Invalid firing_seq format:', results.firing_seq);
            this.uiService.resetSimulationSteps();
            return;
        }

        this.simulationFiringSeq = firingSeqArray;
        this.simulationDetailedLog = results.detailed_log;
        this.isSimulating = true;

        this.initialMarkings.clear();
        this.dataService.getPlaces().forEach(place => {
            this.initialMarkings.set(place.id, place.token);
        });
        console.log('PetriNetComponent: Initial markings stored:', this.initialMarkings);

        this.uiService.setTotalSimulationSteps(this.simulationFiringSeq.length);
        this.uiService.setCurrentSimulationStep(0);
        this.currentStepBeingDisplayed = -1; 
        this.displayStateForStep(0);

        console.log('PetriNetComponent: Simulation data initialized for timeline and animation.');
    }    private createAnimationDataCopies(): void {
        console.log('PetriNetComponent: Creating local data copies for animation');
        try {
            // Deep copy places with their current token state
            this.animationPlaces = this.dataService.getPlaces().map(place => {
                const copy = new Place(place.token, place.position, place.id, place.label);
                return copy;
            });

            // Deep copy transitions 
            this.animationTransitions = this.dataService.getTransitions().map(transition => {
                const copy = new Transition(transition.position, transition.id, transition.label);
                return copy;
            });

            // Deep copy arcs
            this.animationArcs = this.dataService.getArcs().map(arc => {
                const copy = new Arc(arc.from, arc.to, arc.weight);
                copy.anchors = [...arc.anchors];
                return copy;
            });

            console.log('PetriNetComponent: Animation data copies created successfully');
        } catch (error) {
            console.error('PetriNetComponent: Error creating animation data copies:', error);
        }
    }

    startAutoplayAnimation(): void {
        console.log('PetriNetComponent: startAutoplayAnimation called');
        if (!this.simulationFiringSeq || !this.isSimulating) {
            console.warn('PetriNetComponent: No simulation data available for autoplay');
            return;
        }

        if (this.uiService.tab !== TabState.Simulation) {
            console.warn('PetriNetComponent: Autoplay can only run in Play tab');
            return;
        }
        
        // Get current speed. If 0, don't start the timer loop.
        // The speed change subscription will handle starting it if speed becomes > 0.
        const currentSpeed = this.uiService.getAnimationSpeedMultiplier();
        if (currentSpeed === 0) {
            console.log('PetriNetComponent: Autoplay requested, but speed is 0x. Animation will not start timers.');
            // Ensure any old timer is cleared if speed became 0 right before play
            if (this.animationTimer) {
                clearTimeout(this.animationTimer);
                this.animationTimer = null;
            }
            return; // Don't start animateNextStep if speed is 0
        }

        this.currentSimulationStep = 0; // Reset to beginning for autoplay start
        console.log('PetriNetComponent: Starting autoplay animation from step 0');
        this.animateNextStep();
    }

    // MODIFIED: animateNextStep method with dynamic delay and 0x speed handling
    private animateNextStep(): void {
        // Get current speed multiplier from UiService
        const speedMultiplier = this.uiService.getAnimationSpeedMultiplier();

        // Check if animation should proceed
        if (!this.isSimulating || !this.uiService.isAnimationRunning() || !this.simulationFiringSeq) {
            // this.uiService.stopAnimation(); // stopAnimation is called by the subscription to animationRunning$
            if (this.animationTimer) { // Clear timer if it was somehow set
                clearTimeout(this.animationTimer);
                this.animationTimer = null;
            }
            return;
        }

        // If speed is 0, effectively pause by not scheduling the next step.
        // Also clear any existing timer.
        if (speedMultiplier === 0) {
            console.log('PetriNetComponent: Animation internally paused due to 0x speed.');
            if (this.animationTimer) {
                clearTimeout(this.animationTimer);
                this.animationTimer = null;
            }
            // Do NOT call uiService.stopAnimation() here, as that's for the main play/pause button.
            // The animation remains in 'play' state, but no steps are executed.
            return; // Stop further execution of this step
        }

        const currentStep = this.uiService.getCurrentSimulationStep();
        const totalSteps = this.uiService.getTotalSimulationSteps();

        // Check if animation is complete
        // The totalSteps includes an initial state (0) and then one state per firing_seq entry.
        // So, if firing_seq has N items, totalSteps is N+1. Steps are 0 to N.
        // currentStep will go from 0 up to N. When currentStep becomes N, it means all N transitions have fired.
        if (currentStep >= totalSteps -1) { // totalSteps-1 is the last valid step index after all firings
            console.log('PetriNetComponent: Animation complete (all steps processed).');
            this.uiService.stopAnimation(); // This will trigger clearing the timer via subscription
            // Display the final state after the last transition has fired.
            // The displayStateForStep logic should handle showing the state *after* the last firing.
            if (totalSteps > 0) {
                this.displayStateForStep(totalSteps - 1, true); // Show final state after last firing
            }
            return;
        }

        // Display current state (state *before* firing transition of currentStep)
        // The 'currentStep' from UiService is the index of the *next transition to fire* from simulationFiringSeq.
        // So, we display the state *before* this transition fires.
        console.log(`PetriNetComponent: Animating. Next transition to fire is at index ${currentStep} of firing_seq. Total steps in UI: ${totalSteps}.`);
        this.displayStateForStep(currentStep, false); // false: not the final state *after* this step's firing
        this.currentStepBeingDisplayed = currentStep; // Keep track of what's on screen

        // Calculate current delay based on speed multiplier
        const currentDelay = this.BASE_ANIMATION_DELAY_MS / speedMultiplier;
        console.log(`PetriNetComponent: Calculated delay: ${currentDelay}ms for speed ${speedMultiplier}x`);

        this.animationTimer = setTimeout(() => {
            // Re-check conditions inside setTimeout, as state might have changed (e.g., user paused, changed speed to 0)
            const latestSpeedMultiplier = this.uiService.getAnimationSpeedMultiplier();
            if (!this.uiService.isAnimationRunning() || latestSpeedMultiplier === 0) {
                console.log('PetriNetComponent: Timeout executed, but animation state is no longer running or speed is 0. Halting this timeout cycle.');
                // If animationRunning$ became false, its subscription should have cleared the timer.
                // If speed became 0, its subscription should have cleared the timer.
                // No need to clear it here again unless being extra cautious, as it might lead to double clearing.
                return;
            }

            // For autoplay, we rely on the UiService's currentStep as the source of truth for the next step.
            const stepToExecute = this.uiService.getCurrentSimulationStep(); 

            if (stepToExecute >= totalSteps -1 ) { // Check again, in case it changed during timeout
                 console.log('PetriNetComponent: Timeout - Animation already completed or step out of bounds. Halting.');
                 this.uiService.stopAnimation();
                 return;
            }

            const stepData = this.simulationFiringSeq![stepToExecute];
            if (stepData && stepData.transition_id) {
                const transitionToFire = this.dataService.getTransitions().find(t => t.id === stepData.transition_id);
                if (transitionToFire) {
                    console.log(`PetriNetComponent: Timeout - Firing transition ${transitionToFire.id} for step index ${stepToExecute} in firing_seq.`);
                    this.applyTransitionFiringToMarkings(transitionToFire);
                    // Display the state *after* firing for the *current* step index.
                    this.displayStateForStep(stepToExecute, true); // true: it's the state after this firing
                } else {
                    console.warn(`PetriNetComponent: Timeout - Transition ID ${stepData.transition_id} not found for step index ${stepToExecute}.`);
                }
            }
            this.dataService.triggerDataChanged(); // Update view after firing

            const nextStepIndexForUi = stepToExecute + 1; // This is the index for the UI's concept of steps (0 to N)
            this.uiService.setCurrentSimulationStep(nextStepIndexForUi); // Advance the step in UiService

            // Check if this was the last transition to fire
            if (nextStepIndexForUi < totalSteps -1) { // If there are more transitions to fire
                this.animateNextStep(); // Schedule next step
            } else { // This was the last transition
                console.log('PetriNetComponent: Animation reached end of sequence after last firing.');
                this.uiService.stopAnimation(); // Animation is complete
                // Final state after last firing was already displayed by displayStateForStep(stepToExecute, true)
            }
        }, currentDelay); // Use calculated dynamic delay
    }

    private displayStateForStep(stepIndex: number, isFinalStateAfterFiring: boolean = false): void {
        // ...  
        if (!this.isSimulating || !this.simulationFiringSeq || !this.simulationDetailedLog) {
            console.warn('PetriNetComponent: displayStateForStep called without simulation data.');
            return;
        }

        /**
         * Tab-awareness guard for automatic simulation highlighting.
         * 
         * This ensures that transition highlights during automatic simulation playback
         * are ONLY shown when in the Simulation tab, matching the behavior of manual mode.
         * 
         * Rationale:
         * - Highlighting outside Simulation tab would be confusing to users
         * - Prevents unnecessary DOM manipulation when tab is not visible
         * - Consistent with manual mode behavior (highlightManualModeTransitions also checks tab)
         */
        const isInSimulationTab = this.uiService.tab === TabState.Simulation;
        if (!isInSimulationTab) {
            console.log('PetriNetComponent: Skipping display highlighting - not in Simulation tab');
            // Still update markings, but don't apply visual highlights
        }

        // Prevent re-rendering the same state if called multiple times for the same step
        // However, allow if isFinalStateAfterFiring changes, as that implies a different highlight logic
        if (stepIndex === this.currentStepBeingDisplayed && !isFinalStateAfterFiring && this._lastIsFinalState === isFinalStateAfterFiring) {
            // console.log(`PetriNetComponent: displayStateForStep already displayed step ${stepIndex}. Final: ${isFinalStateAfterFiring}`);
            // return;
        }

        console.log(`PetriNetComponent: Displaying state for step ${stepIndex}. Final state: ${isFinalStateAfterFiring}`);
        this.currentStepBeingDisplayed = stepIndex;
        this._lastIsFinalState = isFinalStateAfterFiring;


        this.dataService.getPlaces().forEach(place => {
            place.token = this.initialMarkings.get(place.id) ?? 0;
        });

        const simulateUpTo = isFinalStateAfterFiring ? stepIndex : stepIndex - 1;
        for (let i = 0; i <= simulateUpTo; i++) {
            if (i < this.simulationFiringSeq.length) {
                const stepData = this.simulationFiringSeq[i];
                const transitionToFire = this.dataService.getTransitions().find(t => t.id === stepData.transition_id);
                if (transitionToFire) {
                    this.applyTransitionFiringToMarkings(transitionToFire);
                } else {
                     console.warn(`Transition with ID ${stepData.transition_id} not found for step ${i}`);
                }
            }
        }

        this.clearAllTransitionHighlights();
        const detailedLogKey = String(stepIndex);
        const detailedLogEntry = this.simulationDetailedLog[detailedLogKey];

        // Only apply highlighting if we're in the Simulation tab
        if (isInSimulationTab && detailedLogEntry) {
            const transitionToFireId = detailedLogEntry.transition_to_fire || (this.simulationFiringSeq[stepIndex] ? this.simulationFiringSeq[stepIndex].transition_id : null);

            if (!isFinalStateAfterFiring && transitionToFireId) {
                this.highlightTransition(transitionToFireId, 'next-to-fire');
            } else if (isFinalStateAfterFiring && stepIndex >= 0 && stepIndex < this.simulationFiringSeq.length) {
                 // Highlight the transition that *just* fired at stepIndex
                const firedTransitionId = this.simulationFiringSeq[stepIndex].transition_id;
                if(firedTransitionId) this.highlightTransition(firedTransitionId, 'fired');
            }


            if (!isFinalStateAfterFiring && detailedLogEntry.enabled_transitions && Array.isArray(detailedLogEntry.enabled_transitions)) {
                detailedLogEntry.enabled_transitions.forEach((id: string) => {
                    if (id !== transitionToFireId) {
                        this.highlightTransition(id, 'enabled');
                    }
                });
            }
        } else if (isInSimulationTab && stepIndex === 0 && !isFinalStateAfterFiring) {
            // Initial state highlighting (only in Simulation tab)
            const initialLogEntry = this.simulationDetailedLog["0"];
            if(initialLogEntry && initialLogEntry.enabled_transitions && Array.isArray(initialLogEntry.enabled_transitions)) {
                const transitionToFireId = initialLogEntry.transition_to_fire || (this.simulationFiringSeq[0] ? this.simulationFiringSeq[0].transition_id : null);
                initialLogEntry.enabled_transitions.forEach((id: string) => {
                   this.highlightTransition(id, id === transitionToFireId ? 'next-to-fire' : 'enabled');
                });
            }
        } else if (isInSimulationTab && isFinalStateAfterFiring && stepIndex >= 0 && stepIndex < this.simulationFiringSeq.length) {
             // This case is for showing the state *after* transition at stepIndex fired.
             const firedTransitionId = this.simulationFiringSeq[stepIndex].transition_id;
             this.highlightTransition(firedTransitionId, 'fired');
        }


        this.dataService.triggerDataChanged();
    }
    private _lastIsFinalState: boolean | undefined = undefined; // Helper for displayStateForStep re-entry check


    private applyTransitionFiringToMarkings(transition: Transition): void {
        // ...  
        if (!transition) return;
        transition.preArcs.forEach(arc => {
            const place = arc.from as Place;
            const placeFromDs = this.dataService.getPlaces().find(p => p.id === place.id);
            if (placeFromDs) {
                placeFromDs.token = Math.max(0, placeFromDs.token + arc.weight);
            }
        });
        transition.postArcs.forEach(arc => {
            const place = arc.to as Place;
            const placeFromDs = this.dataService.getPlaces().find(p => p.id === place.id);
            if (placeFromDs) {
                placeFromDs.token += arc.weight;
            }
        });
    }

    public stopAnimation(): void {
        console.log('PetriNetComponent: stopAnimation called directly');
        this.uiService.stopAnimation(); 
        const currentStep = this.uiService.getCurrentSimulationStep(); // Use getter
        if (this.uiService.hasSimulationData() && currentStep !== this.currentStepBeingDisplayed) {
             this.displayStateForStep(currentStep);
        } else if (this.uiService.hasSimulationData()) {
            this.displayStateForStep(currentStep, false); 
        }
    }

    public onTimelineStepChanged(newStep: number): void {
        console.log(`PetriNetComponent: Timeline step changed to ${newStep}`);
        if (this.uiService.isAnimationRunning()) {
            this.uiService.stopAnimation();
        }
        this.uiService.setCurrentSimulationStep(newStep);
        // The subscription to uiService.currentSimulationStep$ will call displayStateForStep
        // if the step is different and animation is not running.
        // Explicitly call if the subscription might not catch it or to ensure immediate update:
        if (!this.uiService.isAnimationRunning()) {
             this.displayStateForStep(newStep);
        }
    }

    private highlightTransition(transitionId: string, state: 'enabled' | 'fired' | 'next-to-fire'): void {
        // ... (implementation from email, ensure all states are handled in CSS)
        const transitionElement = document.querySelector(`rect[data-transition-id="${transitionId}"]`);
        if (transitionElement) {
            transitionElement.classList.remove('animation-enabled', 'animation-fired', 'animation-next-to-fire');
            if (state === 'enabled') {
                transitionElement.classList.add('animation-enabled');
            } else if (state === 'fired') {
                transitionElement.classList.add('animation-fired');
            } else if (state === 'next-to-fire') {
                transitionElement.classList.add('animation-next-to-fire');
            }
        } else {
            // console.warn(`Transition element with ID ${transitionId} not found for highlighting.`);
        }
    }

    clearAllTransitionHighlights(): void {
        // ...  
        const highlighted = document.querySelectorAll('.animation-enabled, .animation-fired, .animation-next-to-fire');
        highlighted.forEach(el => {
            el.classList.remove('animation-enabled', 'animation-fired', 'animation-next-to-fire');
        });
    }

    /**
     * Resets all place tokens to their initial Build-Tab values and clears highlights.
     * 
     * This method restores the token distribution to the state defined in the Build tab,
     * effectively undoing all manual transition firings in the Simulation tab.
     * It also clears all transition highlights to provide a clean visual state.
     * 
     * **When to call:**
     * - Tab switch AWAY from Simulation tab → ensures clean state when returning to Build
     * - "Return to Automatic Playback" button → resets tokens before automatic simulation
     * - Any scenario where manual mode changes need to be reverted
     * 
     * **Rationale:**
     * Manual mode token changes should be temporary and not persist across:
     * 1. Tab switches (Build tab defines the canonical state)
     * 2. Mode switches (Automatic mode should start from Build-defined marking)
     * 
     * This ensures consistency: Build tab = Source of Truth for initial marking.
     * 
     * **What gets reset:**
     * 1. **Tokens** - Restored to initialMarkings values (Build-tab state)
     * 2. **Highlights** - All transition highlights cleared (like STOP button)
     * 3. **View** - dataService.triggerDataChanged() updates the display
     * 
     * **Implementation:**
     * Uses the `initialMarkings` Map that was populated when simulation started.
     * This Map contains Place ID → Token count mappings from the Build tab.
     * 
     * **Comparison with STOP button:**
     * - STOP button: Calls setCurrentSimulationStep(0) → triggers displayStateForStep(0) → shows initial state highlights
     * - This method: Clears highlights completely → appropriate for tab switches and mode changes
     * 
     * **Note:** 
     * This is different from `tokenGameService.resetGame()` which uses the
     * game history stack. This method directly sets tokens from Build-tab values,
     * regardless of manual mode history.
     * 
     * @see initialMarkings - Map storing Build-tab token values (Place ID → count)
     * @see initializeAnimationAndTimeline - Method that populates initialMarkings
     * @see displayStateForStep - Uses same logic to restore tokens during timeline navigation
     * @see clearAllTransitionHighlights - Removes all highlight CSS classes
     * 
     * @example
     * // User fires transitions manually, then switches tabs
     * this.resetTokensToInitialMarking(); // Tokens back to Build-tab values, highlights cleared
     * 
     * @example
     * // User clicks "Return to Automatic Playback" button
     * this.tokenGameService.clearGameHistory();
     * this.resetTokensToInitialMarking(); // Start fresh from Build-tab marking, no highlights
     */
    public resetTokensToInitialMarking(): void {
        console.log('PetriNetComponent: Resetting tokens to initial Build-tab marking');
        
        // Step 1: Reset all tokens to Build-tab values
        this.dataService.getPlaces().forEach(place => {
            const initialTokenCount = this.initialMarkings.get(place.id);
            if (initialTokenCount !== undefined) {
                place.token = initialTokenCount;
                console.log(`PetriNetComponent: Reset ${place.id} tokens to ${initialTokenCount}`);
            } else {
                // Fallback: If place wasn't in initialMarkings (shouldn't happen), set to 0
                place.token = 0;
                console.warn(`PetriNetComponent: Place ${place.id} not found in initialMarkings, defaulting to 0 tokens`);
            }
        });
        
        // Step 2: Clear all transition highlights (like STOP button behavior)
        console.log('PetriNetComponent: Clearing all transition highlights');
        this.clearAllTransitionHighlights();
        
        // Step 3: Trigger view update to reflect token changes
        this.dataService.triggerDataChanged();
        
        console.log('PetriNetComponent: Token reset and highlight clearing complete');
    }

    /**
     * Updates visual highlights for transitions in manual token game mode.
     * 
     * This method manages the highlighting of transitions to provide visual feedback during
     * manual token game interactions. It is called after every manual transition firing,
     * rewind, or restart operation.
     * 
     * **Tab-awareness:**
     * Highlighting is ONLY applied when in the Simulation tab. This prevents visual confusion
     * and ensures highlighting only appears in the appropriate context.
     * 
     * **Highlighting logic:**
     * 1. **Checks if currently in Simulation tab** - exits early if not
     * 2. **Clears all existing highlights** to ensure a clean state
     * 3. **Highlights the fired transition** (if provided) with the 'fired' style (light green glow)
     * 4. **Highlights all currently enabled transitions** with the 'enabled' style (softer glow)
     *    - A transition is enabled if it has enough tokens in all pre-places to fire
     *    - The fired transition is excluded from the enabled set to avoid double-highlighting
     * 
     * **Usage scenarios:**
     * - After manual click: `firedTransition` is the transition the user just clicked
     * - After rewind: `firedTransition` is undefined, only enabled transitions are highlighted
     * - After restart: `firedTransition` is undefined, showing initial enabled state
     * 
     * This approach ensures the user always sees which transitions can fire next in the
     * current marking, while providing immediate feedback on their last action.
     * 
     * **Note:** This method only applies highlighting classes; the actual CSS styling is defined
     * in `petri-net.component.css` (`.animation-enabled`, `.animation-fired`).
     * 
     * @param firedTransition - Optional. The transition that was just fired, to be highlighted
     *                          with the 'fired' style. If undefined, only enabled transitions
     *                          are highlighted.
     * 
     * @see highlightTransition - Applies CSS classes to individual transition elements
     * @see clearAllTransitionHighlights - Removes all highlight classes from the canvas
     * @see Transition.isActive - Computed property that checks if a transition can fire
     * @see TabState.Simulation - The only tab where highlighting should be active
     */
    private highlightManualModeTransitions(firedTransition?: Transition): void {
        // Guard: Only highlight in Simulation tab
        if (this.uiService.tab !== TabState.Simulation) {
            console.log('PetriNetComponent: Skipping highlighting - not in Simulation tab');
            return;
        }

        this.clearAllTransitionHighlights();

        if (firedTransition) {
            this.highlightTransition(firedTransition.id, 'fired');
        }

        this.dataService.getTransitions().forEach(transition => {
            if (firedTransition && transition.id === firedTransition.id) {
                return;
            }

            if (transition.isActive) {
                this.highlightTransition(transition.id, 'enabled');
            }
        });
    }
    // ... other existing methods ...
}
