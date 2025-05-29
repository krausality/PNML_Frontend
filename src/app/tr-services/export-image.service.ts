import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';

/**
 * @service ExportImageService
 * @description This service provides functionality to export the current view of the Petri net
 * (represented as an SVG) to an image file (e.g., PNG, JPEG).
 * It uses the `html2canvas` library to render the SVG onto a canvas and then converts
 * the canvas content to a data URL, which is then used to trigger a download.
 * This modularization encapsulates the image export logic, keeping it separate from
 * display or data management concerns.
 */
@Injectable({
    providedIn: 'root',
})
export class ExportImageService {
    constructor() {}

    /**
     * @description Exports the SVG element with the ID 'drawingArea' as an image.
     * @param fileType The desired image file type (e.g., 'image/png', 'image/jpeg').
     * @param fileName The desired name for the downloaded image file.
     */
    public exportAsImage(fileType: string, fileName: string) {
        const svgElement = document.getElementById('drawingArea');

        if (svgElement) {
            let svg = svgElement as unknown as SVGGraphicsElement;
            let clonedSvgElement = svg.cloneNode(true) as any as HTMLElement;
            let outerHTML = clonedSvgElement.outerHTML;

            const wrapper = document.createElement('div');
            const myHTMLString = outerHTML;
            wrapper.insertAdjacentHTML('afterbegin', myHTMLString);
            document.body.appendChild(wrapper);

            html2canvas(wrapper, {}).then((canvas) => {
                let image = canvas.toDataURL(fileType);
                // Create anchor element with Blob object and programmatically
                // trigger a click event on the anchor to initiate the download
                const link = document.createElement('a');
                link.href = image;
                link.download = fileName; // Added to set the filename for download
                link.click();

                // Free up resources
                URL.revokeObjectURL(link.href);
            });

            wrapper.remove();
        }
    }
}
