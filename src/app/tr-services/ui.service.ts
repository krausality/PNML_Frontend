import { Injectable } from '@angular/core';
import { ButtonState, CodeEditorFormat, TabState } from '../tr-enums/ui-state';
import { BehaviorSubject, Subject, Observable } from 'rxjs';

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
    tab: TabState = TabState.Build;

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

    constructor() {}

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
     */
    resetSimulationSteps(): void {
        this._totalSimulationSteps$.next(0); // No states (or 1 for a default initial state if always present)
        this._currentSimulationStep$.next(0);
        this.simulationResults$.next(null); // Also clear results
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
