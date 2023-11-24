import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';

@Injectable({
    providedIn: 'root'
})
export class ExportImageService {

    constructor() { }

    public exportAsImage(fileType: string, fileName: string) {

        const svgElement = document.getElementById('drawingArea');

        if(svgElement) {
            let svg = (svgElement as unknown) as SVGGraphicsElement;
            let clonedSvgElement = (svg.cloneNode(true) as any) as HTMLElement;
            let outerHTML = clonedSvgElement.outerHTML;

            const wrapper = document.createElement("div");
            const myHTMLString = outerHTML;
            wrapper.insertAdjacentHTML("afterbegin", myHTMLString);
            document.body.appendChild(wrapper);

            html2canvas(wrapper,
                {

                }
                ).then((canvas) => {
                let image = canvas.toDataURL(fileType);
                // Create anchor element with Blob object and programmatically
                // trigger a click event on the anchor to initiate the download
                const link = document.createElement("a");
                link.href = image;
                link.download = fileName;
                link.click();

                // Free up resources
                URL.revokeObjectURL(link.href);
            })

            wrapper.remove();
        }
    }
}
