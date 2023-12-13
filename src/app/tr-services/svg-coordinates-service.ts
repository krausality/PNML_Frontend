import {Injectable} from "@angular/core";
import {Point} from "../tr-classes/petri-net/point";

@Injectable({
    providedIn: 'root'
})


export class SvgCoordinatesService {
    constructor() {
    }

    getSVGViewBox(svg: HTMLElement): number[] {
        const viewBox = svg.getAttribute('viewBox');
        const viewBoxValues = viewBox?.split(/\s+|,/);

        return viewBoxValues ? viewBoxValues.map((stringValue: string) => parseInt(stringValue)) : [];
    }

    // gets the current pointer coordinates relative to the SVG bounding rect
    getAbsoluteEventCoords(event: MouseEvent, drawingArea: HTMLElement): Point {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;

        return new Point(x, y);
    }

    // gets the current pointer coordinates relative to the SVG viewBox
    getRelativeEventCoords(event: MouseEvent, drawingArea: HTMLElement): Point {
        const svgRect = drawingArea.getBoundingClientRect();
        let x = event.clientX - svgRect.left;
        let y = event.clientY - svgRect.top;

        const viewBox = this.getSVGViewBox(drawingArea);
        x = viewBox[0] ? viewBox[0] + x : x;
        y = viewBox[1] ? viewBox[1] + y : y;

        return new Point(x, y);
    }

}