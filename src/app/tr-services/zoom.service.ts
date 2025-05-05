import { Injectable, ElementRef } from '@angular/core'; // Add ElementRef
import { BehaviorSubject, combineLatest, Observable } from 'rxjs'; // Add Observable if not present
import { map } from 'rxjs/operators';
import { DataService } from './data.service'; // Inject DataService
import { Place } from '../tr-classes/petri-net/place';
import { Transition } from '../tr-classes/petri-net/transition';
import { Point } from '../tr-classes/petri-net/point';
import {
    radius,
    transitionWidth,
    transitionHeight,
    transSilentWidth,
} from './position.constants'; // Import element dimensions

@Injectable({
    providedIn: 'root',
})
export class ZoomService {
    private readonly initialScale = 1;
    private readonly initialOffset: Point = { x: 0, y: 0 }; // Add initial offset
    private readonly scaleStep = 0.1;
    private readonly minScale = 0.05; // Allow more zoom out
    private readonly maxScale = 3.0;
    private readonly CONTENT_MARGIN = 50; // Pixels margin around content

    private scaleSubject = new BehaviorSubject<number>(this.initialScale);
    private offsetSubject = new BehaviorSubject<Point>(this.initialOffset); // Add offset state

    /** Observable for the current scale factor. */
    public scale$: Observable<number> = this.scaleSubject.asObservable();
     /** Observable for the current offset (pan). */
    public offset$: Observable<Point> = this.offsetSubject.asObservable(); // Add offset observable

    // Combined transform observable for SVG
    public transform$: Observable<string> = combineLatest([
        this.scale$,
        this.offset$,
    ]).pipe(
        map(([scale, offset]) => `translate(${offset.x} ${offset.y}) scale(${scale})`)
    );

    constructor(private dataService: DataService) {} // Inject DataService

    /** Gets the current scale factor. */
    get currentScale(): number {
        return this.scaleSubject.value;
    }

     /** Gets the current offset. */
    get currentOffset(): Point { // Add getter for current offset
        return this.offsetSubject.value;
    }

    /** Increases the zoom level. */
    zoomIn(): void {
        const newScale = Math.min(
            this.maxScale,
            this.currentScale + this.scaleStep
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
            this.currentScale - this.scaleStep
        );
         // Use toFixed to avoid floating point inaccuracies causing unnecessary updates
        if (newScale.toFixed(2) !== this.currentScale.toFixed(2)) {
            this.scaleSubject.next(newScale);
        }
    }

    /** Resets the zoom level and pan offset to the initial state. */
    resetZoom(): void {
         // Reset both scale and offset
         if (this.initialScale !== this.currentScale || this.currentOffset.x !== this.initialOffset.x || this.currentOffset.y !== this.initialOffset.y) {
            this.scaleSubject.next(this.initialScale);
            this.offsetSubject.next(this.initialOffset); // Reset offset as well
        }
    }

     /**
     * Pans the view by a given delta in screen coordinates.
     * @param deltaX Change in X screen coordinate.
     * @param deltaY Change in Y screen coordinate.
     */
    pan(deltaX: number, deltaY: number): void {
        const currentOffset = this.currentOffset;
        // Panning distance needs to be adjusted by the current scale
        const newOffset = {
            x: currentOffset.x + deltaX,
            y: currentOffset.y + deltaY,
        };
        this.offsetSubject.next(newOffset);
    }

     /**
     * Calculates the bounding box of the current Petri net elements.
     * @returns The bounding box {minX, minY, maxX, maxY} or null if no elements exist.
     */
    private calculateContentBoundingBox(): { minX: number, minY: number, maxX: number, maxY: number } | null {
        const places = this.dataService.getPlaces();
        const transitions = this.dataService.getTransitions();
        console.log(`Calculating bbox for ${places.length} places, ${transitions.length} transitions.`); // Log element count

        if (places.length === 0 && transitions.length === 0) {
            console.log('Bbox calculation: No elements.');
            return null;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        places.forEach(p => {
            // console.log(`Place ${p.id} pos:`, p.position); // Optional: Log individual positions
            minX = Math.min(minX, p.position.x - radius);
            maxX = Math.max(maxX, p.position.x + radius);
            minY = Math.min(minY, p.position.y - radius);
            maxY = Math.max(maxY, p.position.y + radius);
        });

        transitions.forEach(t => {
            // console.log(`Transition ${t.id} pos:`, t.position); // Optional: Log individual positions
            const width = t.label ? transitionWidth : transSilentWidth;
            const height = transitionHeight;
            minX = Math.min(minX, t.position.x - width / 2);
            maxX = Math.max(maxX, t.position.x + width / 2);
            minY = Math.min(minY, t.position.y - height / 2);
            maxY = Math.max(maxY, t.position.y + height / 2);
        });

        if (!isFinite(minX)) {
             // ... handle single element case ...
             console.log('Bbox calculation: Infinite bounds initially, handling single element case.');
             if (places.length > 0) {
                 minX = places[0].position.x - radius - this.CONTENT_MARGIN;
                 maxX = places[0].position.x + radius + this.CONTENT_MARGIN;
                 minY = places[0].position.y - radius - this.CONTENT_MARGIN;
                 maxY = places[0].position.y + radius + this.CONTENT_MARGIN;
             } else if (transitions.length > 0) {
                 const t = transitions[0];
                 const width = t.label ? transitionWidth : transSilentWidth;
                 const height = transitionHeight;
                 minX = t.position.x - width / 2 - this.CONTENT_MARGIN;
                 maxX = t.position.x + width / 2 + this.CONTENT_MARGIN;
                 minY = t.position.y - height / 2 - this.CONTENT_MARGIN;
                 maxY = t.position.y + height / 2 + this.CONTENT_MARGIN;
             } else {
                 return null; // Should not happen based on initial check, but safe guard
             }
        } else {
            // ... existing code ...
            minX -= this.CONTENT_MARGIN;
            minY -= this.CONTENT_MARGIN;
            maxX += this.CONTENT_MARGIN;
            maxY += this.CONTENT_MARGIN;
        }


        const bbox = { minX, minY, maxX, maxY };
        console.log('Calculated bbox (incl. margin):', bbox); // Log final bbox
        return bbox;
    }

    /**
     * Adjusts zoom and pan to fit the entire Petri net content within the given viewport dimensions.
     * @param viewportWidth The width of the SVG container.
     * @param viewportHeight The height of the SVG container.
     */
    fitContent(viewportWidth: number, viewportHeight: number): void {
        console.log(`FitContent called with viewport: ${viewportWidth} x ${viewportHeight}`); // Log entry and viewport
        const bbox = this.calculateContentBoundingBox();

        if (!bbox || viewportWidth <= 0 || viewportHeight <= 0) {
            console.log('FitContent: Resetting zoom due to no bbox or invalid viewport.'); // Log reset reason
            this.resetZoom();
            return;
        }

        const contentWidth = bbox.maxX - bbox.minX;
        const contentHeight = bbox.maxY - bbox.minY;
        console.log(`FitContent: Content dimensions: ${contentWidth} x ${contentHeight}`); // Log content dimensions

        if (contentWidth <= 0 || contentHeight <= 0) {
             // ... handle zero size content ...
             console.log('FitContent: Content has zero width or height, centering at initial scale.'); // Log zero size handling
             const centerX = bbox.minX + (bbox.maxX - bbox.minX) / 2; // Should be bbox.minX
             const centerY = bbox.minY + (bbox.maxY - bbox.minY) / 2; // Should be bbox.minY
             const newScale = this.initialScale;
             const newOffsetX = viewportWidth / 2 - centerX * newScale;
             const newOffsetY = viewportHeight / 2 - centerY * newScale;

             // Update subjects only if values changed significantly
             const scaleChanged = newScale.toFixed(3) !== this.currentScale.toFixed(3);
             const offsetChanged = newOffsetX.toFixed(1) !== this.currentOffset.x.toFixed(1) ||
                                   newOffsetY.toFixed(1) !== this.currentOffset.y.toFixed(1);

             if (scaleChanged) this.scaleSubject.next(newScale);
             if (offsetChanged) this.offsetSubject.next({ x: newOffsetX, y: newOffsetY });
             return;
        }

        const scaleX = viewportWidth / contentWidth;
        const scaleY = viewportHeight / contentHeight;
        let newScale = Math.min(scaleX, scaleY);
        console.log(`FitContent: Raw scale factors (x, y): ${scaleX}, ${scaleY}. Chosen initial scale: ${newScale}`); // Log scale factors

        // Clamp scale within min/max limits
        newScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
        console.log(`FitContent: Clamped scale: ${newScale}`); // Log clamped scale

        // Calculate the center of the content
        const contentCenterX = bbox.minX + contentWidth / 2;
        const contentCenterY = bbox.minY + contentHeight / 2;
        console.log(`FitContent: Content center: ${contentCenterX}, ${contentCenterY}`); // Log content center

        // Calculate the required offset to center the scaled content
        // Formula for translate(offsetX offsetY) scale(scale)
        const newOffsetX = viewportWidth / 2 - contentCenterX * newScale;
        const newOffsetY = viewportHeight / 2 - contentCenterY * newScale;
        console.log(`FitContent: Calculated offset: ${newOffsetX}, ${newOffsetY}`); // Log calculated offset

        // Update subjects if values changed significantly to avoid rapid updates
        const scaleChanged = newScale.toFixed(3) !== this.currentScale.toFixed(3);
        const offsetChanged = newOffsetX.toFixed(1) !== this.currentOffset.x.toFixed(1) ||
                              newOffsetY.toFixed(1) !== this.currentOffset.y.toFixed(1);
        console.log(`FitContent: Scale changed: ${scaleChanged}, Offset changed: ${offsetChanged}`); // Log change detection

        if (scaleChanged || offsetChanged)
        {
            console.log('FitContent: Applying new scale and/or offset.'); // Log update application
            if (scaleChanged) this.scaleSubject.next(newScale);
            if (offsetChanged) this.offsetSubject.next({ x: newOffsetX, y: newOffsetY });
        } else {
            console.log('FitContent: No significant change in scale or offset, not updating.'); // Log no update
        }
    }
}
