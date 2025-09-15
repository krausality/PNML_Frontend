import { Injectable } from '@angular/core';
import { Point } from '../tr-classes/petri-net/point';
import { ZoomService } from './zoom.service'; // Import ZoomService

@Injectable({
    providedIn: 'root',
})
export class SvgCoordinatesService {
    constructor(private zoomService: ZoomService) {} // Inject ZoomService

    // gets the current pointer coordinates relative to the SVG bounding rect, adjusted for zoom
    getRelativeEventCoords(event: MouseEvent, drawingArea: HTMLElement): Point {
        const svgRect = drawingArea.getBoundingClientRect();
        const scale = this.zoomService.currentScale; // Get current scale
        const offset = this.zoomService.currentOffset; // Get current pan offset

        // Raw coordinates relative to the SVG viewport
        let rawX = event.clientX - svgRect.left;
        let rawY = event.clientY - svgRect.top;

        // Adjust coordinates based on scale and pan offset
        // Formula: (screen_coord - pan_offset) / scale
        let scaledX = (rawX - offset.x) / scale;
        let scaledY = (rawY - offset.y) / scale;

        return new Point(scaledX, scaledY);
    }
}
