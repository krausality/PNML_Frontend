import {Injectable} from "@angular/core";
import {Point} from "../tr-classes/petri-net/point";

@Injectable({
    providedIn: 'root'
})


export class SvgCoordinatesService {
    constructor() {}

    // gets the current pointer coordinates relative to the SVG bounding rect
    getRelativeEventCoords(event: MouseEvent, drawingArea: HTMLElement): Point {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;

        return new Point(x, y);
    }

}