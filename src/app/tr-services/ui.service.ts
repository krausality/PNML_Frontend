import { Injectable } from '@angular/core';
import { ButtonState, CodeEditorFormat, TabState } from '../tr-enums/ui-state';
import { BehaviorSubject, Subject } from 'rxjs';

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

    // Emits simulation results (e.g., from backend simulation or planning).
    // Used to trigger animation or display results in the UI.
    simulationResults$: BehaviorSubject<any | null> = new BehaviorSubject<any | null>(null);

    // Animation state: true if animation is currently running.
    // Used to control animation playback and UI state.
    animationRunning$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    // Emits when autoplay is requested (e.g., via Play button in UI).
    requestAutoplay$: Subject<void> = new Subject<void>();

    constructor() {}

    /**
     * Call to request starting the animation (autoplay).
     * Sets animationRunning$ to true and emits on requestAutoplay$.
     * Components listening to requestAutoplay$ should begin animation playback.
     */
    startAnimation() {
        this.animationRunning$.next(true);
        this.requestAutoplay$.next();
    }

    /**
     * Call to request stopping the animation.
     * Sets animationRunning$ to false. Components should stop animation playback.
     */
    stopAnimation() {
        this.animationRunning$.next(false);
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
        return this.simulationResults$.getValue() !== null;
    }
}
// -----------------------------------------------------------------------------
// End of UiService
// -----------------------------------------------------------------------------
