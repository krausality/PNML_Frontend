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

        // Raw coordinates relative to the SVG viewport
        let rawX = event.clientX - svgRect.left;
        let rawY = event.clientY - svgRect.top;

        // Adjust coordinates based on scale (assuming transform-origin is 0,0 for the scaled group)
        let scaledX = rawX / scale;
        let scaledY = rawY / scale;

        // TODO: Account for panning (translation) if implemented via transform
        // TODO: Account for transform-origin if not 0 0

        return new Point(scaledX, scaledY);
    }
}
