import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
    providedIn: 'root',
})
export class ExportSvgService {
    public petrinetCss: string = '';

    constructor(private httpClient: HttpClient) {
        this.httpClient
            .get('assets/petri-net.component.css', { responseType: 'text' })
            .subscribe((data) => {
                // console.log(data),
                this.petrinetCss = data;
            });
    }

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
                //add name spaces
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
                //add xml declaration
                source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
                //convert svg source to URI data scheme
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
