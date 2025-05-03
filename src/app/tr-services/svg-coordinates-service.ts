import { Injectable } from '@angular/core';
import { Point } from '../tr-classes/petri-net/point';
// Remove ZoomService import if it's no longer needed here
// import { ZoomService } from './zoom.service';

@Injectable({
    providedIn: 'root',
})
export class SvgCoordinatesService {
    // Remove ZoomService injection if no longer needed
    constructor(/* private zoomService: ZoomService */) {}

    // gets the current pointer coordinates relative to the SVG bounding rect
    getRelativeEventCoords(event: MouseEvent, drawingArea: HTMLElement): Point {
        const svgRect = drawingArea.getBoundingClientRect();
        // const scale = this.zoomService.currentScale; // Remove scale usage

        // Raw coordinates relative to the SVG viewport
        let rawX = event.clientX - svgRect.left;
        let rawY = event.clientY - svgRect.top;

        // Return coordinates relative to the SVG viewport, without manual scaling
        // The SVG transform handles the scaling and panning
        return new Point(rawX, rawY);

        // Remove previous scaled calculation
        /*
        // Adjust coordinates based on scale (assuming transform-origin is 0,0 for the scaled group)
        let scaledX = rawX / scale;
        let scaledY = rawY / scale;

        // TODO: Account for panning (translation) if implemented via transform
        // TODO: Account for transform-origin if not 0 0

        return new Point(scaledX, scaledY);
        */
    }
}
