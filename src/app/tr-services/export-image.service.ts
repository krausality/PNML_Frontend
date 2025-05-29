import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';

/**
 * @Injectable
 * @providedIn 'root'
 *
 * @description
 * Service responsible for exporting a specific SVG element from the DOM as an image.
 * This service encapsulates the logic for finding an SVG element by a predefined ID ('drawingArea'),
 * rendering it onto an HTML canvas using the `html2canvas` library, and then triggering a
 * download of that canvas content as an image file (e.g., PNG).
 *
 * @remarks
 * Modularity:
 * This service modularizes the image export functionality by:
 * 1. Encapsulation: It bundles all logic for capturing and downloading an SVG as an image.
 *    This promotes reusability across different parts of the application that might need
 *    to export the main drawing area.
 * 2. Defined Responsibility: Its sole responsibility is image export, adhering to the
 *    Single Responsibility Principle.
 * 3. Clear Interface: It exposes a simple public method `exportAsImage` which abstracts
 *    the underlying complexities of DOM manipulation, canvas rendering, and file download.
 *
 * The choice of this service as a module allows other components to delegate the task of
 * image exportation, keeping them cleaner and more focused on their primary responsibilities.
 * It relies on the `html2canvas` library for the HTML-to-canvas rendering.
 */
@Injectable({
    providedIn: 'root',
})
export class ExportImageService {
    constructor() {}

    /**
     * @public
     * @description
     * Exports the SVG element with the ID 'drawingArea' as an image.
     *
     * The process involves:
     * 1. Locating the SVG element with `id="drawingArea"`.
     * 2. Cloning the SVG element to avoid altering the original.
     * 3. Creating a temporary `div` wrapper, inserting the cloned SVG's HTML into it,
     *    and appending this wrapper to the `document.body`. This is done because `html2canvas`
     *    typically requires the element to be part of the live DOM for rendering.
     * 4. Using `html2canvas` to render the wrapper (containing the SVG) onto an HTML `<canvas>`.
     * 5. Converting the canvas content to a data URL representing the image in the specified `fileType`.
     * 6. Dynamically creating an anchor (`<a>`) element, setting its `href` to the image data URL
     *    and its `download` attribute to the `fileName`.
     * 7. Programmatically triggering a click on the anchor to initiate the browser's download.
     * 8. Revoking the object URL to free up resources.
     * 9. Removing the temporary wrapper `div` from the DOM.
     *
     * @param {string} fileType - The MIME type of the image to be created (e.g., 'image/png', 'image/jpeg').
     * @param {string} fileName - The desired name for the downloaded image file.
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
                link.download = fileName;
                link.click();

                // Free up resources
                URL.revokeObjectURL(link.href);
            });

            wrapper.remove();
        }
    }
}
