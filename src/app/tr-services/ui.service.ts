import { Injectable } from '@angular/core';
import { ButtonState, CodeEditorFormat, TabState } from '../tr-enums/ui-state';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { Transition } from '../tr-classes/petri-net/transition';

export type SimulationMode = 'automatic' | 'manual';

// -----------------------------------------------------------------------------
// UiService: Central UI State Management for Petri Net Frontend
// -----------------------------------------------------------------------------
// This service acts as a global state container for UI-related information such as
// the current tab, active tool/button, and code editor format. It is provided
// application-wide (singleton) and is intended to be injected wherever UI state
// needs to be read or updated.
//
// Design Decisions:
// - Uses BehaviorSubjects for reactive state changes, allowing components to
//   subscribe and react to UI state updates (e.g., tool changes, code format changes).
// - Maintains both direct properties (for imperative access) and BehaviorSubjects
//   (for reactive programming and Angular template bindings).
// - The tabTransitioning flag is used to enable smooth UI transitions when switching
//   between tabs, especially for visual effects in the Petri net view.
//
// Interface Overview:
// - tab: Current active tab (see TabState enum). Default is Build mode.
// - button: Current active tool/button (see ButtonState enum). Null if none selected.
// - tabTransitioning: True for 1.1s after a tab switch, then false. Used for UI effects.
// - buttonState$: Emits whenever the button or tab changes. Used to reset tool state
//   (e.g., Blitz tool selection) in dependent components.
// - codeEditorFormat$: Emits whenever the code format changes, so the code editor
//   can reload or reformat its content.
//
// Example Usage:
//   // In a component:
//   constructor(private uiService: UiService) {}
//   ngOnInit() {
//     this.uiService.buttonState$.subscribe(state => { ... });
//   }
//
// Maintenance Notes:
// - If you add new UI state (e.g., new tabs or tools), update the enums and consider
//   whether a new BehaviorSubject is needed for reactivity.
// - Always use the provided BehaviorSubjects for cross-component communication.
// - Avoid storing component-specific state here; this service is for global UI state only.
// -----------------------------------------------------------------------------

@Injectable({
    providedIn: 'root',
})
export class UiService {
    // Stores the active tab (see TabState enum). Default is Build mode.
    // This property is used for imperative access to the current tab.
    // IMPORTANT: Always use the setter to update this value to ensure tab$ observable emits!
    private _tab: TabState = TabState.Build;
    
    /**
     * Observable that emits whenever the active tab changes.
     * 
     * This enables reactive tab-awareness across components:
     * - PetriNetComponent subscribes to show/hide simulation highlighting
     * - Other components can react to tab switches for context-sensitive behavior
     * 
     * Always use the `tab` setter to update the tab state so this observable emits properly.
     * 
     * @example
     * // Subscribe to tab changes
     * this.uiService.tab$.subscribe(newTab => {
     *   if (newTab === TabState.Simulation) {
     *     this.enableSimulationFeatures();
     *   } else {
     *     this.disableSimulationFeatures();
     *   }
     * });
     */
    private _tab$ = new BehaviorSubject<TabState>(this._tab);
    public tab$: Observable<TabState> = this._tab$.asObservable();

    /**
     * Gets the current active tab.
     * @returns The current TabState
     */
    public get tab(): TabState {
        return this._tab;
    }

    /**
     * Sets the active tab and emits the change to all subscribers.
     * This ensures tab-aware components react to tab switches.
     * 
     * @param value - The new TabState to activate
     */
    public set tab(value: TabState) {
        if (this._tab !== value) {
            this._tab = value;
            this._tab$.next(value);
            console.log('UiService: Tab changed to', TabState[value]);
        }
    }

    // Stores the active button/tool (see ButtonState enum). Null if none selected.
    // Used for imperative access to the current tool.
    button: ButtonState | null = null;

    // Indicates when the user is switching between tabs.
    // Set to true for 1.1 seconds after a tab switch, then reset to false.
    // Used for smooth UI transitions (e.g., Petri net view effects).
    tabTransitioning: boolean = false;

    // Emits the current button state whenever the button or tab changes.
    // Used by components to reset tool-specific state (e.g., Blitz tool selection).
    buttonState$: BehaviorSubject<ButtonState | null> =
        new BehaviorSubject<ButtonState | null>(this.button);

    // Emits the current code editor format whenever it changes.
    // Used by the code editor component to reload or reformat content.
    codeEditorFormat$: BehaviorSubject<CodeEditorFormat> =
        new BehaviorSubject<CodeEditorFormat>(CodeEditorFormat.JSON);

    // Simulation steps for timeline
    private _totalSimulationSteps$ = new BehaviorSubject<number>(0);
    private _currentSimulationStep$ = new BehaviorSubject<number>(0);

    public totalSimulationSteps$: Observable<number> = this._totalSimulationSteps$.asObservable();
    public currentSimulationStep$: Observable<number> = this._currentSimulationStep$.asObservable();

    // Simulation speed
    private _simulationSpeed$ = new BehaviorSubject<number>(1); // Default speed 1x
    public simulationSpeed$: Observable<number> = this._simulationSpeed$.asObservable();

    // Simulation mode (automatic playback vs manual token game)
    private _simulationMode$ = new BehaviorSubject<SimulationMode>('automatic');
    public simulationMode$ = this._simulationMode$.asObservable();

    /**
     * Stores the simulation step that was active when switching FROM automatic TO manual mode.
     * 
     * This enables "Return to Automatic Playback" to restore the user to their last position
     * in the automatic simulation, rather than always jumping back to step 0.
     * 
     * **Use cases:**
     * 1. User pauses automatic animation at step 5, switches to manual, fires more transitions
     *    → "Return to Automatic" goes back to step 5 (not step 0)
     * 
     * 2. User starts in manual mode from beginning (never ran automatic)
     *    → lastAutomaticStep remains 0 → "Return to Automatic" goes to step 0
     * 
     * **Updated when:**
     * - setSimulationMode('manual') is called → saves current step
     * - Simulation starts fresh → reset to 0
     * 
     * **Read by:**
     * - returnToAutomaticMode() in ButtonBarComponent → restores this step
     * 
     * @see setSimulationMode - Updates this value when switching to manual mode
     * @see getLastAutomaticStep - Getter for this value
     */
    private lastAutomaticStep: number = 0;

    private manualHighlightUpdateSubject = new Subject<Transition | null>();
    public manualHighlightUpdate$ = this.manualHighlightUpdateSubject.asObservable();

    // Emits simulation results (e.g., from backend simulation or planning).
    // Used to trigger animation or display results in the UI.
    simulationResults$: BehaviorSubject<any | null> = new BehaviorSubject<any | null>(null);

    // Animation state: true if animation is currently running.
    // Used to control animation playback and UI state.
    animationRunning$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    // Emits when autoplay is requested (e.g., via Play button in UI).
    requestAutoplay$: Subject<void> = new Subject<void>();

    // Emits when the "Start Simulation" button in the ButtonBar (Build tab) is clicked.
    runSimulationRequest$: Subject<void> = new Subject<void>();

    private _simulationResultsMultiRun$ = new BehaviorSubject<any | null>(null);
    public simulationResultsMultiRun$ = this._simulationResultsMultiRun$.asObservable();

    private _transitionFiringFrequencies$ = new BehaviorSubject<Map<string, number> | null>(null);
    public transitionFiringFrequencies$ = this._transitionFiringFrequencies$.asObservable();

    public setMultiRunResults(results: any): void {
        this._simulationResultsMultiRun$.next(results);

        // If results are cleared, also clear the frequencies
        if (!results) {
            this._transitionFiringFrequencies$.next(null);
            return;
        }

        // Pre-process the results to calculate firing frequencies
        const frequencyMap = new Map<string, number>();
        if (results.runs && Array.isArray(results.runs)) {
            for (const run of results.runs) {
                if (run.firing_seq && Array.isArray(run.firing_seq)) {
                    for (const transitionId of run.firing_seq) {
                        frequencyMap.set(transitionId, (frequencyMap.get(transitionId) || 0) + 1);
                    }
                }
            }
        }
        this._transitionFiringFrequencies$.next(frequencyMap);
    }

    public getMultiRunResults(): any {
        return this._simulationResultsMultiRun$.getValue();
    }

    public getTransitionFiringFrequencies(): Map<string, number> | null {
        return this._transitionFiringFrequencies$.getValue();
    }

    constructor() {}

    /**
     * Sets the simulation mode and saves the current step when switching to manual mode.
     * 
     * This method switches between automatic playback and manual token game modes.
     * When switching FROM automatic TO manual, it saves the current simulation step
     * so that "Return to Automatic Playback" can restore the user to that position.
     * 
     * **Behavior:**
     * - Switch to 'manual': Saves current step as lastAutomaticStep
     * - Switch to 'automatic': No special action (lastAutomaticStep already saved)
     * - No change in mode: No action taken
     * 
     * **Why save the step:**
     * User might pause automatic animation at step 5, switch to manual to explore,
     * then want to return to automatic playback from step 5 (not restart from 0).
     * 
     * @param mode - The simulation mode to switch to ('automatic' or 'manual')
     * 
     * @see lastAutomaticStep - The stored step value
     * @see getLastAutomaticStep - Getter for the stored step
     * @see returnToAutomaticMode - Uses this stored step to restore position
     * 
     * @example
     * // User pauses at step 5, switches to manual
     * this.uiService.setSimulationMode('manual'); // Saves step 5
     * // ... user fires transitions manually ...
     * // User clicks "Return to Automatic Playback"
     * // → Restores to step 5 (not step 0)
     */
    setSimulationMode(mode: SimulationMode): void {
        const currentMode = this._simulationMode$.getValue();
        
        if (currentMode !== mode) {
            // When switching TO manual mode, save the current automatic step
            if (mode === 'manual') {
                this.lastAutomaticStep = this.getCurrentSimulationStep();
                console.log(`UiService: Switching to manual mode, saved automatic step: ${this.lastAutomaticStep}`);
            }
            
            this._simulationMode$.next(mode);
        }
    }

    getSimulationMode(): SimulationMode {
        return this._simulationMode$.getValue();
    }

    isAutomaticMode(): boolean {
        return this.getSimulationMode() === 'automatic';
    }

    isManualMode(): boolean {
        return this.getSimulationMode() === 'manual';
    }

    /**
     * Gets the simulation step that was active when last switching to manual mode.
     * 
     * This value is used by "Return to Automatic Playback" to restore the user
     * to their position in the automatic simulation before they switched to manual.
     * 
     * **Returns:**
     * - The step number (0-based index) where automatic mode was left
     * - 0 if manual mode was entered from the beginning (never ran automatic)
     * 
     * **Example usage:**
     * User pauses animation at step 5, switches to manual, fires more transitions.
     * When returning to automatic, this returns 5 (not 0).
     * 
     * @returns The last automatic simulation step
     * 
     * @see lastAutomaticStep - The stored value
     * @see setSimulationMode - Updates this value when switching to manual
     * @see returnToAutomaticMode - Uses this to restore position
     */
    getLastAutomaticStep(): number {
        return this.lastAutomaticStep;
    }

    triggerManualHighlightUpdate(transition?: Transition | null): void {
        this.manualHighlightUpdateSubject.next(transition ?? null);
    }

    // --- New public getters for direct value access ---
    getCurrentSimulationStep(): number {
        return this._currentSimulationStep$.getValue();
    }

    getTotalSimulationSteps(): number {
        return this._totalSimulationSteps$.getValue();
    }
    // --- End new public getters ---

    /**
     * Sets the total number of simulation steps.
     * @param numFirings The total number of firings in the simulation.
     */
    setTotalSimulationSteps(numFirings: number): void {
        if (numFirings < 0) {
            this._totalSimulationSteps$.next(0); // Or 1 if an initial state always exists and is counted
        } else {
            this._totalSimulationSteps$.next(numFirings + 1); // Total states = numFirings + 1
        }
    }

    /**
     * Sets the current simulation step.
     * @param step The 0-indexed state index.
     */
    setCurrentSimulationStep(step: number): void {
        const numStates = this.getTotalSimulationSteps();
        // Allow step to be from 0 (initial state) to numStates - 1 (final state)
        if (step >= 0 && step < numStates) {
            this._currentSimulationStep$.next(step);
        } else if (numStates === 1 && step === 0) { // Special case: 0 firings, 1 state (initial)
             this._currentSimulationStep$.next(0);
        }
        // Out of bounds steps are ignored, or could be clamped if desired.
    }

    /**
     * Resets simulation step counters, typically when simulation data is cleared.
     * Also resets the lastAutomaticStep to 0 for a fresh start.
     */
    resetSimulationSteps(): void {
        this._totalSimulationSteps$.next(0); // No states (or 1 for a default initial state if always present)
        this._currentSimulationStep$.next(0);
        this.simulationResults$.next(null); // Also clear results
        this.lastAutomaticStep = 0; // Reset to beginning for new simulation
        console.log('UiService: Reset simulation steps and lastAutomaticStep to 0');
    }
    // --- End new methods ---

    /**
     * Call to request starting the animation (autoplay).
     * Sets animationRunning$ to true and emits on requestAutoplay$.
     * Components listening to requestAutoplay$ should begin animation playback.
     */
    startAnimation() {
        const numStates = this.getTotalSimulationSteps(); // Total number of states
        const currentStateIndex = this.getCurrentSimulationStep(); // Current state index (0 to numStates-1)

        if (!this.animationRunning$.getValue()) {
            if (numStates <= 1) { // If 0 or 1 state (e.g., 0 firings means 1 state)
                this._currentSimulationStep$.next(0);
            } else if (currentStateIndex >= numStates - 1) { // If at the final state
                this._currentSimulationStep$.next(0); // Restart from initial state
            }
            // If paused mid-way (0 <= currentStateIndex < numStates - 1), currentSimulationStep$ is already correct.
        }
        this.animationRunning$.next(true);
        this.requestAutoplay$.next();
    }

    /**
     * Call to request stopping the animation.
     * Sets animationRunning$ to false. Components should stop animation playback.
     */
    stopAnimation() {
        this.animationRunning$.next(false);
        // Note: We don't reset currentSimulationStep here,
        // so the timeline stays at the step where animation was stopped.
    }

    /**
     * Returns true if animation is currently running (imperative access).
     * @returns {boolean} True if animation is running, false otherwise.
     */
    isAnimationRunning(): boolean {
        return this.animationRunning$.getValue();
    }

    /**
     * Returns the animation state as an observable (for reactive subscriptions).
     * @returns {Observable<boolean>} Observable emitting animation running state.
     */
    getAnimationState$() {
        return this.animationRunning$.asObservable();
    }

    /**
     * Returns true if simulation data is available (e.g., after backend call).
     * @returns {boolean} True if simulationResults$ contains data, false otherwise.
     */
    hasSimulationData(): boolean {
        return this.simulationResults$.getValue() !== null && this.getTotalSimulationSteps() > 0; // Changed to use getter
    }

    /**
     * Sets the simulation speed.
     * @param speed The speed factor (e.g., 1 for normal speed, 2 for double speed).
     */
    setSimulationSpeed(speed: number): void {
        // Set the new simulation speed.
        // This will be observed by PetriNetComponent to adjust animation timing.
        this._simulationSpeed$.next(speed);
    }

    // Getter for the current speed multiplier - this fulfills requirement 1
    /**
     * Gets the current animation speed multiplier.
     * @returns {number} The current speed multiplier (e.g., 0, 0.5, 1, 2, 4).
     */    getAnimationSpeedMultiplier(): number {
        return this._simulationSpeed$.getValue();
    }

    /**
     * Placeholder method for backward compatibility.
     * @returns null as this functionality is not implemented yet.
     */
    getUploadedPnmlFile(): File | null {
        // This method is called by button-bar but not actually implemented
        // Return null for now to prevent errors
        return null;
    }
}
// -----------------------------------------------------------------------------
// End of UiService
// -----------------------------------------------------------------------------
