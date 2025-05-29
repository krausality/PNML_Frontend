import {Injectable} from '@angular/core';
import {Diagram} from '../classes/diagram/diagram';
import {Element} from '../classes/diagram/element';

/**
 * @service SvgService
 * @description This service is responsible for creating SVG elements that represent
 * the components of a Petri net diagram.
 * It takes a Diagram object as input and generates the corresponding SVG DOM elements.
 * This isolates the SVG generation logic, making it easier to manage and modify
 * how diagram elements are visually represented.
 */
@Injectable({
    providedIn: 'root'
})
export class SvgService {

    /**
     * @description Creates an array of SVG elements for all elements in the given diagram.
     * @param diagram The Diagram object to render.
     * @returns An array of SVGElement objects.
     */
    public createSvgElements(diagram: Diagram): Array<SVGElement> {
        const result: Array<SVGElement> = [];
        diagram.elements.forEach(el => {
            result.push(this.createSvgForElement(el))
        });
        return result;
    }

    /**
     * @description Creates an SVG element (a circle) for a single diagram element.
     * It sets the attributes of the SVG circle based on the element's properties (id, x, y).
     * It also registers the created SVG element with the diagram element.
     * @param element The Element object to create an SVG representation for.
     * @returns The created SVGElement.
     * @private
     */
    private createSvgForElement(element: Element): SVGElement {
        const svg = this.createSvgElement('circle');

        svg.setAttribute('cx', `${element.x}`);
        svg.setAttribute('cy', `${element.y}`);
        svg.setAttribute('r', '25');
        svg.setAttribute('fill', 'black');

        element.registerSvg(svg);

        return svg;
    }

    /**
     * @description A helper method to create an SVG element with a given name (tag).
     * @param name The tag name of the SVG element to create (e.g., 'circle', 'rect').
     * @returns The created SVGElement.
     * @private
     */
    private createSvgElement(name: string): SVGElement {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
}
