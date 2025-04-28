import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class ZoomService {
    private readonly initialScale = 1;
    private readonly scaleStep = 0.1;
    private readonly minScale = 0.2; // Minimum zoom out
    private readonly maxScale = 3.0; // Maximum zoom in

    private scaleSubject = new BehaviorSubject<number>(this.initialScale);
    /** Observable for the current scale factor. */
    public scale$ = this.scaleSubject.asObservable();

    /** Gets the current scale factor. */
    get currentScale(): number {
        return this.scaleSubject.value;
    }

    /** Increases the zoom level. */
    zoomIn(): void {
        const newScale = Math.min(
            this.maxScale,
            this.currentScale + this.scaleStep,
        );
        // Use toFixed to avoid floating point inaccuracies causing unnecessary updates
        if (newScale.toFixed(2) !== this.currentScale.toFixed(2)) {
            this.scaleSubject.next(newScale);
        }
    }

    /** Decreases the zoom level. */
    zoomOut(): void {
        const newScale = Math.max(
            this.minScale,
            this.currentScale - this.scaleStep,
        );
         // Use toFixed to avoid floating point inaccuracies causing unnecessary updates
        if (newScale.toFixed(2) !== this.currentScale.toFixed(2)) {
            this.scaleSubject.next(newScale);
        }
    }

    /** Resets the zoom level to the initial scale (100%). */
    resetZoom(): void {
         if (this.initialScale !== this.currentScale) {
            this.scaleSubject.next(this.initialScale);
        }
    }
}
