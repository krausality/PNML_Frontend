import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/**
 * @Injectable
 * @providedIn 'root'
 *
 * @description
 * Service responsible for exporting an SVG element from the DOM as a downloadable .svg file.
 * It fetches dedicated CSS styles for Petri net components and embeds them into the SVG
 * to ensure the exported image accurately reflects its appearance in the application.
 *
 * @remarks
 * The service relies on a specific DOM structure, expecting an SVG element with the ID 'drawingArea'.
 * The modularity of this service is achieved by:
 * 1. Encapsulating the export logic within a dedicated Angular service.
 * 2. Utilizing Angular's HttpClient for fetching external resources (CSS styles),
 *    separating data retrieval from the export mechanism.
 * 3. Externalizing SVG styles into `assets/petri-net.component.css`, allowing style
 *    modifications without altering the service's code. This CSS file acts as a
 *    style module for Petri net visual components.
 */
@Injectable({
    providedIn: 'root',
})
export class ExportSvgService {
    /**
     * @description
     * Stores the CSS content fetched from 'assets/petri-net.component.css'.
     * This CSS is injected into the SVG before export to ensure correct styling.
     * @public
     * @type {string}
     */
    public petrinetCss: string = '';

    /**
     * @description
     * Constructs the ExportSvgService.
     * It immediately initiates an HTTP GET request to fetch the Petri net CSS styles
     * from 'assets/petri-net.component.css'. These styles are stored for later use
     * during the SVG export process.
     *
     * @param {HttpClient} httpClient - Angular's HttpClient for making HTTP requests.
     */
    constructor(private httpClient: HttpClient) {
        this.httpClient
            .get('assets/petri-net.component.css', { responseType: 'text' })
            .subscribe((data) => {
                this.petrinetCss = data;
            });
    }

    /**
     * @description
     * Exports the SVG element with the ID 'drawingArea' as a .svg file.
     * The method performs the following steps:
     * 1. Retrieves the SVG element from the DOM.
     * 2. Creates an SVG `<style>` element and populates it with the `petrinetCss`.
     * 3. Inserts this style element as the first child of the SVG to apply the styles.
     * 4. Serializes the styled SVG element to an XML string.
     * 5. Ensures necessary XML namespaces (xmlns and xmlns:xlink) are present.
     * 6. Prepends an XML declaration to the string.
     * 7. Converts the SVG string to a data URI.
     * 8. Creates a temporary anchor (`<a>`) element, sets its `href` to the data URI
     *    and `download` attribute to 'svgExport.svg'.
     * 9. Programmatically clicks the anchor to trigger the file download.
     * 10. Revokes the object URL (though for data URIs, this has limited effect but is good practice for cleanup).
     *
     * @public
     * @returns {void}
     */
    public exportAsSvg() {
        var svg = document.getElementById('drawingArea');
        if (svg) {
            var style = document.createElementNS(
                'http://www.w3.org/2000/svg',
                'style',
            );
            style.textContent = this.petrinetCss;
            if (svg) {
                svg.insertBefore(style, svg.firstChild);
            }
            var serializer = new XMLSerializer();
            if (svg) {
                var source = serializer.serializeToString(svg);
                // Add name spaces
                if (
                    !source.match(
                        /^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/,
                    )
                ) {
                    source = source.replace(
                        /^<svg/,
                        '<svg xmlns="http://www.w3.org/2000/svg"',
                    );
                }
                if (
                    !source.match(
                        /^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/,
                    )
                ) {
                    source = source.replace(
                        /^<svg/,
                        '<svg xmlns:xlink="http://www.w3.org/1999/xlink"',
                    );
                }
                // Add xml declaration
                source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
                // Convert svg source to URI data scheme
                var url =
                    'data:image/svg+xml;charset=utf-8,' +
                    encodeURIComponent(source);
                // Create anchor element with Blob object and programmatically
                // trigger a click event on the anchor to initiate the download
                const link = document.createElement('a');
                link.href = url;
                link.download = 'svgExport.svg';
                link.click();

                // Free up resources
                URL.revokeObjectURL(link.href);
            }
        }
    }
}
